import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { AgentaOS, WebhooksResource, type WebhookEvent } from '@agentaos/pay';
import type { SubscriptionStatus } from '../access';
import { now } from '../clock';

// The only file that talks to AgentaOS. Everything else uses the Gateway interface, so the
// rest of billing reads the same whether it's the real API or the local stand-in below.
//
// With AGENTAOS_API_KEY set (sk_test_… while building, sk_live_… at launch) it calls AgentaOS.
// Without it, outside production, a stand-in keeps fake checkouts and subscriptions in
// .data/fake-agentaos.json and its "hosted checkout" is the dev-only page /dev/checkout/[id].
// That lets the whole purchase run locally and in end-to-end tests with no network.

export type Plan = 'monthly' | 'annual';

export type GatewayCheckout = {
  sessionId: string;
  checkoutUrl: string;
  status: 'open' | 'completed' | 'expired' | 'cancelled';
  metadata: Record<string, unknown>;
};

export type GatewaySubscription = {
  id: string;
  linkId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type Receipt = { id: string; number: string; issuedAt: string; amount: number; currency: string; status: string };

export interface Gateway {
  readonly kind: 'agentaos' | 'local';
  createCheckout(p: { linkId: string; buyerEmail: string; householdId: string; successUrl: string; cancelUrl: string }): Promise<GatewayCheckout>;
  retrieveCheckout(sessionId: string): Promise<GatewayCheckout>;
  getSubscription(id: string): Promise<GatewaySubscription | null>;
  cancelAtPeriodEnd(id: string): Promise<void>;
  receipts(id: string): Promise<Receipt[]>;
}

/** Plan ↔ AgentaOS product (link) id. The ids come from env so test and live products can differ. */
export function linkIdFor(plan: Plan): string {
  const id = plan === 'monthly' ? process.env.AGENTAOS_LINK_MONTHLY : process.env.AGENTAOS_LINK_ANNUAL;
  if (id) return id;
  if (gateway().kind === 'local') return `local-${plan}`;
  throw new Error(`AGENTAOS_LINK_${plan === 'monthly' ? 'MONTHLY' : 'ANNUAL'} is not set`);
}

export function planForLinkId(linkId: string): Plan | null {
  if (linkId === process.env.AGENTAOS_LINK_MONTHLY || linkId === 'local-monthly') return 'monthly';
  if (linkId === process.env.AGENTAOS_LINK_ANNUAL || linkId === 'local-annual') return 'annual';
  return null;
}

/** Checks the X-AgentaOS-Signature header against the raw body. Throws if it doesn't match. */
export function verifyWebhook(rawBody: string, signature: string | null): WebhookEvent {
  const secret = process.env.AGENTAOS_WEBHOOK_SECRET;
  if (!secret) throw new Error('AGENTAOS_WEBHOOK_SECRET is not set');
  return new WebhooksResource().verify(rawBody, signature ?? '', secret);
}

/** The subscription id AgentaOS puts on a checkout for a plan (the SDK camel-cases keys; accept both). */
export function subscriptionIdOf(metadata: Record<string, unknown> | undefined): string | null {
  const v = metadata?.subscriptionId ?? metadata?.subscription_id;
  return typeof v === 'string' && v ? v : null;
}

let cached: Gateway | null = null;
export function gateway(): Gateway {
  if (cached) return cached;
  const key = process.env.AGENTAOS_API_KEY;
  if (key) cached = agentaos(new AgentaOS(key));
  else if (process.env.NODE_ENV !== 'production') cached = local();
  else throw new Error('AGENTAOS_API_KEY is not set');
  return cached;
}

/* ---------- AgentaOS ---------- */

function agentaos(client: AgentaOS): Gateway {
  const toCheckout = (c: { sessionId: string; checkoutUrl: string; status: GatewayCheckout['status']; metadata: Record<string, unknown> | null }): GatewayCheckout =>
    ({ sessionId: c.sessionId, checkoutUrl: c.checkoutUrl, status: c.status, metadata: c.metadata ?? {} });

  return {
    kind: 'agentaos',
    async createCheckout({ linkId, buyerEmail, householdId, successUrl, cancelUrl }) {
      return toCheckout(await client.checkouts.create({ linkId, buyerEmail, metadata: { customerId: householdId }, successUrl, cancelUrl }));
    },
    async retrieveCheckout(sessionId) {
      return toCheckout(await client.checkouts.retrieve(sessionId));
    },
    async getSubscription(id) {
      // There is no retrieve-by-id, so page through the list. Fine at Haven's size; revisit past a few thousand subscribers.
      for (let offset = 0; ; offset += 100) {
        const page = await client.subscriptions.list({ limit: 100, offset });
        const s = page.items.find((x) => x.id === id);
        if (s) return { id: s.id, linkId: s.linkId, status: s.status, currentPeriodEnd: s.currentPeriodEnd, cancelAtPeriodEnd: s.cancelAtPeriodEnd };
        if (!page.hasMore || page.items.length === 0) return null;
      }
    },
    async cancelAtPeriodEnd(id) {
      await client.subscriptions.cancel(id, { atPeriodEnd: true });
    },
    async receipts(id) {
      return (await client.subscriptions.invoices(id)).map((i) => ({ id: i.id, number: i.invoiceNumber, issuedAt: i.issuedAt, amount: i.amount, currency: i.currency, status: i.status }));
    },
  };
}

/* ---------- Local stand-in (development and tests only) ---------- */

type LocalCheckout = GatewayCheckout & { linkId: string; successUrl: string };
type LocalSub = GatewaySubscription & { receipts: Receipt[] };
type LocalStore = { checkouts: Record<string, LocalCheckout>; subscriptions: Record<string, LocalSub> };

const STORE = '.data/fake-agentaos.json';
export async function readLocalStore(): Promise<LocalStore> {
  try { return JSON.parse(await readFile(STORE, 'utf8')) as LocalStore; } catch { return { checkouts: {}, subscriptions: {} }; }
}
async function writeLocalStore(s: LocalStore) {
  await mkdir('.data', { recursive: true });
  await writeFile(STORE, JSON.stringify(s, null, 2));
}

function local(): Gateway {
  return {
    kind: 'local',
    async createCheckout({ linkId, householdId, successUrl }) {
      const s = await readLocalStore();
      const sessionId = 'cs_local_' + randomUUID().replace(/-/g, '');
      s.checkouts[sessionId] = { sessionId, checkoutUrl: `/dev/checkout/${sessionId}`, status: 'open', metadata: { customerId: householdId }, linkId, successUrl };
      await writeLocalStore(s);
      return s.checkouts[sessionId];
    },
    async retrieveCheckout(sessionId) {
      const c = (await readLocalStore()).checkouts[sessionId];
      if (!c) throw new Error('No such checkout');
      return c;
    },
    async getSubscription(id) {
      const sub = (await readLocalStore()).subscriptions[id];
      return sub ? { id: sub.id, linkId: sub.linkId, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd } : null;
    },
    async cancelAtPeriodEnd(id) {
      const s = await readLocalStore();
      if (s.subscriptions[id]) s.subscriptions[id].cancelAtPeriodEnd = true;
      await writeLocalStore(s);
    },
    async receipts(id) {
      return (await readLocalStore()).subscriptions[id]?.receipts ?? [];
    },
  };
}

/** What the stand-in's checkout page does when "Pay" is pressed: completes the session and starts a subscription. */
export async function completeLocalCheckout(sessionId: string): Promise<string> {
  if (gateway().kind !== 'local') throw new Error('Not available');
  const s = await readLocalStore();
  const c = s.checkouts[sessionId];
  if (!c) throw new Error('No such checkout');
  if (c.status !== 'completed') {
    const annual = c.linkId.endsWith('annual');
    const start = now();
    const end = new Date(start);
    if (annual) end.setUTCFullYear(end.getUTCFullYear() + 1); else end.setUTCMonth(end.getUTCMonth() + 1);
    const id = 'sub_local_' + randomUUID().replace(/-/g, '');
    s.subscriptions[id] = {
      id, linkId: c.linkId, status: 'active', currentPeriodEnd: end.toISOString(), cancelAtPeriodEnd: false,
      receipts: [{ id: 'inv_' + id, number: 'HAVEN-TEST-0001', issuedAt: start.toISOString(), amount: annual ? 48 : 5, currency: 'USD', status: 'paid' }],
    };
    c.status = 'completed';
    c.metadata = { ...c.metadata, subscriptionId: id };
    await writeLocalStore(s);
  }
  const url = new URL(c.successUrl);
  url.searchParams.set('sessionId', sessionId);
  return url.toString();
}
