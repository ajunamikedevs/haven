import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { households, shareLinks, subscriptions } from '@/db/schema';
import { getAccess } from './access';
import { now } from './clock';

// Share links let people without an account see (and, for the grocery list, tick off) one
// household's list or week. A link's token is the link's id plus a signature made with a server
// secret, so the same link can be shown to the organizer again without storing anything that
// would let someone who read the database open it.

export type ShareKind = 'list' | 'week';
type Link = typeof shareLinks.$inferSelect;

const WRITES_PER_MINUTE = 120;

function secret(): string {
  const s = process.env.SHARE_LINK_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error('SHARE_LINK_SECRET or BETTER_AUTH_SECRET must be set');
  return s;
}
const sign = (id: string) => createHmac('sha256', secret()).update('share:' + id).digest('base64url');
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export function tokenFor(linkId: string): string {
  return linkId.replace(/-/g, '') + sign(linkId);
}

function linkIdFrom(token: string): string | null {
  if (typeof token !== 'string' || token.length !== 32 + 43 || !/^[0-9a-f]{32}/.test(token)) return null;
  const hex = token.slice(0, 32);
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const given = Buffer.from(token.slice(32));
  const expected = Buffer.from(sign(id));
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}

/** The household's current link of this kind, made if there isn't one. */
export async function getOrCreateLink(householdId: string, kind: ShareKind): Promise<Link> {
  const [existing] = await db.select().from(shareLinks).where(and(eq(shareLinks.householdId, householdId), eq(shareLinks.kind, kind), isNull(shareLinks.revokedAt))).limit(1);
  if (existing) return existing;
  const id = crypto.randomUUID();
  const [created] = await db.insert(shareLinks).values({ id, householdId, kind, tokenHash: hash(tokenFor(id)) }).returning();
  return created;
}

export async function listLinks(householdId: string): Promise<Link[]> {
  return db.select().from(shareLinks).where(and(eq(shareLinks.householdId, householdId), isNull(shareLinks.revokedAt)));
}

export async function revokeLink(householdId: string, linkId: string): Promise<void> {
  await db.update(shareLinks).set({ revokedAt: new Date() }).where(and(eq(shareLinks.id, linkId), eq(shareLinks.householdId, householdId)));
}

export type OpenLink = { link: Link; household: typeof households.$inferSelect; canWrite: boolean };

/** Resolves a token from a URL. Null for anything forged, mistyped or switched off. */
export async function openLink(token: string): Promise<OpenLink | null> {
  const id = linkIdFrom(token);
  if (!id) return null;
  const [link] = await db.select().from(shareLinks).where(and(eq(shareLinks.id, id), isNull(shareLinks.revokedAt))).limit(1);
  if (!link) return null;
  const [household] = await db.select().from(households).where(eq(households.id, link.householdId)).limit(1);
  if (!household) return null;
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.householdId, household.id)).limit(1);
  const access = getAccess({
    trialEndsAt: household.trialEndsAt, now: now(),
    subscription: sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd } : null,
  });
  return { link, household, canWrite: access.level === 'full' };
}

/** Notes that the link was opened, at most once an hour. True when this is a newly counted visit. */
export async function markOpened(link: Link): Promise<boolean> {
  if (link.lastOpenedAt && Date.now() - link.lastOpenedAt.getTime() < 3_600_000) return false;
  await db.update(shareLinks).set({ lastOpenedAt: new Date() }).where(eq(shareLinks.id, link.id));
  return true;
}

/** Counts a signed-out write against the link's per-minute allowance. False when it is used up. */
export async function allowWrite(link: Link): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60_000);
  const [row] = await db.update(shareLinks).set({
    writeCount: sql`case when ${shareLinks.writeWindowStart} is null or ${shareLinks.writeWindowStart} < ${windowStart} then 1 else ${shareLinks.writeCount} + 1 end`,
    writeWindowStart: sql`case when ${shareLinks.writeWindowStart} is null or ${shareLinks.writeWindowStart} < ${windowStart} then now() else ${shareLinks.writeWindowStart} end`,
  }).where(eq(shareLinks.id, link.id)).returning({ writeCount: shareLinks.writeCount });
  return !!row && row.writeCount <= WRITES_PER_MINUTE;
}
