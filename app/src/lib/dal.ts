import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/db';
import { dinners, events, extras, groceryChecks, households, members, subscriptions } from '@/db/schema';
import { getAccess, type Access } from './access';
import { auth } from './auth';
import type { Week } from './types';

// The data access layer. Everything that reads or writes household data goes through here,
// and every query is scoped to the household that belongs to the signed-in user: an id
// from the browser is never trusted to say whose data to touch.

export type SessionUser = { id: string; name: string; email: string };
export type Household = typeof households.$inferSelect;

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/signin');
  return user;
}

export const getHousehold = cache(async (userId: string): Promise<Household | null> => {
  const [row] = await db.select().from(households).where(eq(households.ownerUserId, userId)).limit(1);
  return row ?? null;
});

/** The signed-in user's household. Sends new accounts to set one up first. */
export async function requireHousehold(): Promise<{ user: SessionUser; household: Household; access: Access }> {
  const user = await requireUser();
  const household = await getHousehold(user.id);
  if (!household) redirect('/welcome');
  return { user, household, access: await accessFor(household) };
}

/** As requireHousehold, but refuses when the household is read-only. Every write action starts here. */
export async function requireWriteAccess() {
  const ctx = await requireHousehold();
  if (ctx.access.level !== 'full') throw new ReadOnlyError();
  return ctx;
}

export class ReadOnlyError extends Error {
  constructor() {
    super('This household is read-only until it has a subscription.');
    this.name = 'ReadOnlyError';
  }
}

const accessFor = cache(async (household: Household): Promise<Access> => {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.householdId, household.id)).limit(1);
  return getAccess({
    trialEndsAt: household.trialEndsAt,
    subscription: sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd } : null,
  });
});

/** The household's current week in the shape the logic in src/lib works with. */
export async function loadWeek(householdId: string): Promise<Week> {
  const [m, e, d, c, x] = await Promise.all([
    db.select().from(members).where(eq(members.householdId, householdId)).orderBy(asc(members.position), asc(members.createdAt)),
    db.select().from(events).where(eq(events.householdId, householdId)),
    db.select().from(dinners).where(eq(dinners.householdId, householdId)),
    db.select({ itemKey: groceryChecks.itemKey }).from(groceryChecks).where(eq(groceryChecks.householdId, householdId)),
    db.select().from(extras).where(eq(extras.householdId, householdId)).orderBy(asc(extras.createdAt)),
  ]);
  const week: Week = {
    members: m.map((r) => ({ id: r.id, name: r.name, role: r.role, color: r.color })),
    events: e.map((r) => ({ id: r.id, day: r.day, time: r.time, title: r.title, note: r.note, who: r.memberId, done: r.done, repeat: r.repeat })),
    dinners: {},
    checks: c.map((r) => r.itemKey),
    extras: x.map((r) => ({ id: r.id, name: r.name, got: r.got })),
  };
  for (const r of d) {
    week.dinners[r.day] = { libId: r.libId, name: r.name, minutes: r.minutes, effort: r.effort, tags: r.tags, ing: r.ingredients, cooked: r.cooked };
  }
  return week;
}
