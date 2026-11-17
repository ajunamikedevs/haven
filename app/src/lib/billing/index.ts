import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { WebhookEvent } from '@agentaos/pay';
import { db } from '@/db';
import { checkoutSessions, households, subscriptions, user, webhookEvents } from '@/db/schema';
import { now } from '../clock';
import { paymentFailedEmail, sendEmail } from '../email';
import { recordEvent } from '../product-events';
import { gateway, linkIdFor, planForLinkId, subscriptionIdOf, type Plan, type Receipt } from './gateway';
import { eventKey, isConversion, shouldApply } from './rules';

// Billing, AgentaOS as merchant of record. The rules this file keeps:
//  - Access is unlocked only from AgentaOS's own word: a verified webhook or checkouts.retrieve,
//    never from someone landing on the return page.
//  - Subscription state is always re-read from AgentaOS before it's stored, so deliveries that
//    arrive late, twice or out of order can't leave the household in the wrong state.
//  - A checkout is tied to a household by the session we created and its metadata.customerId.

export function appUrl(): string {
  const url = process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return url.replace(/\/$/, '');
}

/** Starts a checkout for the household and returns where to send the organizer to pay. */
export async function startCheckout(householdId: string, email: string, plan: Plan): Promise<string> {
  const checkout = await gateway().createCheckout({
    linkId: linkIdFor(plan),
    buyerEmail: email,
    householdId,
    successUrl: `${appUrl()}/billing/return`,
    cancelUrl: `${appUrl()}/billing`,
  });
  await db.insert(checkoutSessions).values({ householdId, sessionId: checkout.sessionId, plan });
  return checkout.checkoutUrl;
}

export type ConfirmResult = 'paid' | 'waiting' | 'not_paid' | 'unknown';

/** On return from checkout: asks AgentaOS whether this household's session really completed. */
export async function confirmCheckout(householdId: string, sessionId: string): Promise<ConfirmResult> {
  const [row] = await db.select().from(checkoutSessions)
    .where(and(eq(checkoutSessions.sessionId, sessionId), eq(checkoutSessions.householdId, householdId))).limit(1);
  if (!row) return 'unknown';
  const checkout = await gateway().retrieveCheckout(sessionId);
  if (checkout.status === 'expired' || checkout.status === 'cancelled') {
    await db.update(checkoutSessions).set({ status: 'expired' }).where(eq(checkoutSessions.id, row.id));
    return 'not_paid';
  }
  if (checkout.status !== 'completed' || checkout.metadata.customerId !== householdId) return 'waiting';
  await db.update(checkoutSessions).set({ status: 'completed' }).where(eq(checkoutSessions.id, row.id));
  const subId = subscriptionIdOf(checkout.metadata);
  if (!subId) return 'waiting';
  await syncSubscription(householdId, subId);
  return 'paid';
}

/** Re-reads one subscription from AgentaOS and stores it on the household. */
export async function syncSubscription(householdId: string, subscriptionId: string): Promise<void> {
  const remote = await gateway().getSubscription(subscriptionId);
  if (!remote) return;
  const [stored] = await db.select().from(subscriptions).where(eq(subscriptions.householdId, householdId)).limit(1);
  const incoming = { id: remote.id, status: remote.status };
  if (!shouldApply(stored ? { id: stored.agentaosSubscriptionId, status: stored.status } : null, incoming)) return;

  const values = {
    agentaosSubscriptionId: remote.id,
    plan: planForLinkId(remote.linkId) ?? stored?.plan ?? 'monthly',
    status: remote.status,
    currentPeriodEnd: remote.currentPeriodEnd ? new Date(remote.currentPeriodEnd) : null,
    cancelAtPeriodEnd: remote.cancelAtPeriodEnd,
    lastEventAt: now(),
  };
  await db.insert(subscriptions).values({ householdId, ...values })
    .onConflictDoUpdate({ target: subscriptions.householdId, set: values });
  if (isConversion(stored ? { status: stored.status } : null, incoming)) await recordEvent(householdId, 'trial_converted');
}

/** Handles one verified webhook delivery. Returns false when it was already handled. */
export async function handleWebhook(event: WebhookEvent, rawBody: string): Promise<boolean> {
  const sessionId = event.type === 'checkout.session.completed' ? event.data.sessionId : null;
  const key = eventKey(event.type, sessionId, createHash('sha256').update(rawBody).digest('hex'));
  const [claimed] = await db.insert(webhookEvents).values({ eventKey: key, type: event.type }).onConflictDoNothing().returning({ id: webhookEvents.id });
  if (!claimed) return false;

  try {
    await apply(event);
    return true;
  } catch (e) {
    // Let AgentaOS retry: forget the claim so the next delivery runs again
    await db.delete(webhookEvents).where(eq(webhookEvents.id, claimed.id));
    throw e;
  }
}

async function apply(event: WebhookEvent) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const { sessionId, metadata } = event.data;
      const subId = subscriptionIdOf(metadata);
      const householdId = typeof metadata?.customerId === 'string' ? metadata.customerId : null;
      if (householdId) {
        // Only a session this household started counts
        const [row] = await db.select().from(checkoutSessions)
          .where(and(eq(checkoutSessions.sessionId, sessionId), eq(checkoutSessions.householdId, householdId))).limit(1);
        if (!row) return;
        await db.update(checkoutSessions).set({ status: 'completed' }).where(eq(checkoutSessions.id, row.id));
        if (subId) await syncSubscription(householdId, subId);
      } else if (subId) {
        // Renewals carry no customerId: match them by the subscription we already know
        await syncKnown(subId);
      }
      return;
    }
    case 'subscription.created':
    case 'subscription.renewed':
    case 'subscription.updated':
    case 'subscription.canceled':
      await syncKnown(event.data.id);
      return;
    case 'subscription.payment_failed': {
      const householdId = await syncKnown(event.data.id);
      if (householdId) await emailOwner(householdId, paymentFailedEmail(`${appUrl()}/billing`));
      return;
    }
    case 'dispute.created':
    case 'dispute.closed':
      console.warn(`AgentaOS ${event.type}: dispute ${event.data.disputeId} (${event.data.status})`);
      return;
    default:
      return;
  }
}

/** Syncs a subscription the app already has on file. Unknown ones are linked when their checkout completes. */
async function syncKnown(subscriptionId: string): Promise<string | null> {
  const [row] = await db.select({ householdId: subscriptions.householdId }).from(subscriptions)
    .where(eq(subscriptions.agentaosSubscriptionId, subscriptionId)).limit(1);
  if (!row) return null;
  await syncSubscription(row.householdId, subscriptionId);
  return row.householdId;
}

export async function emailOwner(householdId: string, email: { subject: string; text: string; html: string }) {
  const [owner] = await db.select({ email: user.email }).from(households).innerJoin(user, eq(user.id, households.ownerUserId))
    .where(eq(households.id, householdId)).limit(1);
  if (owner) await sendEmail({ to: owner.email, ...email });
}

export async function getSubscriptionRow(householdId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.householdId, householdId)).limit(1);
  return row ?? null;
}

/** Stops the next renewal; the household keeps access until the paid period ends. */
export async function cancelAtPeriodEnd(householdId: string): Promise<void> {
  const sub = await getSubscriptionRow(householdId);
  if (!sub) return;
  await gateway().cancelAtPeriodEnd(sub.agentaosSubscriptionId);
  await syncSubscription(householdId, sub.agentaosSubscriptionId);
}

export async function receiptsFor(householdId: string): Promise<Receipt[] | null> {
  const sub = await getSubscriptionRow(householdId);
  if (!sub) return [];
  try {
    return await gateway().receipts(sub.agentaosSubscriptionId);
  } catch (e) {
    console.error('receipts unavailable', e instanceof Error ? e.message : e);
    return null;
  }
}
