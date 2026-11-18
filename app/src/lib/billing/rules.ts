import type { SubscriptionStatus } from '../access';

// Pure decisions about subscriptions, kept apart from the database so they can be unit tested.

export const PRICES = { monthly: { amount: 5, per: 'month' }, annual: { amount: 48, per: 'year' } } as const;

const LIVE: SubscriptionStatus[] = ['active', 'trialing', 'past_due'];
export const isLive = (status: SubscriptionStatus) => LIVE.includes(status);

/**
 * Whether news about subscription `incoming` should be written over the household's stored one.
 * A household has one subscription row. A late event about an old, ended subscription must not
 * replace a newer live one; anything about the stored subscription itself always applies.
 */
export function shouldApply(stored: { id: string; status: SubscriptionStatus } | null, incoming: { id: string; status: SubscriptionStatus }): boolean {
  if (!stored || stored.id === incoming.id) return true;
  return !(isLive(stored.status) && !isLive(incoming.status));
}

/** True the first time a household goes from never having paid to a live subscription. */
export function isConversion(stored: { status: SubscriptionStatus } | null, incoming: { status: SubscriptionStatus }): boolean {
  return !stored && isLive(incoming.status);
}

/** The trial reminder goes out once, during the last three days, to households that haven't subscribed. */
export function needsTrialReminder(h: { trialEndsAt: Date; trialReminderSentAt: Date | null; subscriptionStatus: SubscriptionStatus | null }, now: Date): boolean {
  if (h.trialReminderSentAt) return false;
  if (h.subscriptionStatus && isLive(h.subscriptionStatus)) return false;
  const left = h.trialEndsAt.getTime() - now.getTime();
  return left > 0 && left <= 3 * 86_400_000;
}

const DAY = 86_400_000;

/**
 * One "plan your first week" nudge, for organizers who signed up a day or more ago and haven't
 * planned anything of their own yet. Accounts older than
 * four days are left alone, so a late or first run of the daily job doesn't email stale sign-ups.
 */
export function needsFirstWeekNudge(h: { createdAt: Date; nudgeSentAt: Date | null; trialEndsAt: Date; subscriptionStatus: SubscriptionStatus | null; hasPlanned: boolean }, now: Date): boolean {
  if (h.nudgeSentAt || h.hasPlanned) return false;
  if (h.subscriptionStatus && isLive(h.subscriptionStatus)) return false;
  if (h.trialEndsAt.getTime() <= now.getTime()) return false;
  const age = now.getTime() - h.createdAt.getTime();
  return age >= DAY && age < 4 * DAY;
}

/**
 * One "your trial has ended" email, for households whose trial ended in the last three days and
 * that never subscribed. Someone whose paid plan ended isn't a trial ending, so any subscription
 * row rules it out.
 */
export function needsTrialEndedEmail(h: { trialEndsAt: Date; trialEndedSentAt: Date | null; subscriptionStatus: SubscriptionStatus | null }, now: Date): boolean {
  if (h.trialEndedSentAt || h.subscriptionStatus) return false;
  const since = now.getTime() - h.trialEndsAt.getTime();
  return since >= 0 && since < 3 * DAY;
}

/** Webhook deliveries are retried, so each gets a stable key: the checkout session, or a hash of the body. */
export function eventKey(type: string, sessionId: string | null, bodyHash: string): string {
  return type === 'checkout.session.completed' && sessionId ? `checkout:${sessionId}` : `${type}:${bodyHash}`;
}
