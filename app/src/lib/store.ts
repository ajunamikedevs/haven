import 'server-only';
import { and, eq, lt } from 'drizzle-orm';
import type { Db } from '@/db';
import { dinners, events, extras, groceryChecks, households, members, undoLog } from '@/db/schema';
import type { Week } from './types';

// Whole-household writes used by setup, import, bulk resets and Undo.
// Callers pass a transaction and a household id that already came from the signed-in session.

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Inserts a Week (as the logic in src/lib describes one) for a household that has no data yet. */
export async function insertWeek(tx: Tx, householdId: string, week: Week): Promise<void> {
  const memberId = new Map<string, string>();
  if (week.members.length) {
    const rows = await tx.insert(members).values(
      week.members.map((m, i) => ({ householdId, name: m.name, role: m.role, color: m.color, position: i })),
    ).returning({ id: members.id });
    week.members.forEach((m, i) => memberId.set(m.id, rows[i].id));
  }
  if (week.events.length) {
    await tx.insert(events).values(week.events.map((e) => ({
      householdId, day: e.day, time: e.time, title: e.title, note: e.note,
      memberId: e.who ? memberId.get(e.who) ?? null : null, done: e.done, repeat: e.repeat,
    })));
  }
  const days = Object.entries(week.dinners);
  if (days.length) {
    await tx.insert(dinners).values(days.map(([day, d]) => ({
      householdId, day: Number(day), libId: d!.libId, name: d!.name, minutes: d!.minutes,
      effort: d!.effort, tags: d!.tags, ingredients: d!.ing, cooked: d!.cooked,
    })));
  }
  if (week.checks.length) await tx.insert(groceryChecks).values(week.checks.map((itemKey) => ({ householdId, itemKey })));
  if (week.extras.length) await tx.insert(extras).values(week.extras.map((x) => ({ householdId, name: x.name, got: x.got })));
}

/** Removes the week's contents. Members go too only when asked. */
export async function clearWeek(tx: Tx, householdId: string, opts: { members: boolean }): Promise<void> {
  await tx.delete(events).where(eq(events.householdId, householdId));
  await tx.delete(dinners).where(eq(dinners.householdId, householdId));
  await tx.delete(groceryChecks).where(eq(groceryChecks.householdId, householdId));
  await tx.delete(extras).where(eq(extras.householdId, householdId));
  if (opts.members) await tx.delete(members).where(eq(members.householdId, householdId));
}

/* ---------- Undo ---------- */

// Undo works like the prototype's: remember everything just before a destructive change, and put
// it all back if asked. A household's week is small, so a full snapshot is simpler and safer than
// per-action inverses. Snapshots expire after ten minutes.

const UNDO_MINUTES = 10;

type Snapshot = {
  household: { weekOf: string; welcomed: boolean; isExample: boolean };
  members: (typeof members.$inferSelect)[];
  events: (typeof events.$inferSelect)[];
  dinners: (typeof dinners.$inferSelect)[];
  checks: (typeof groceryChecks.$inferSelect)[];
  extras: (typeof extras.$inferSelect)[];
};

/** Saves the household's current state and returns the id Undo needs. */
export async function takeSnapshot(tx: Tx, householdId: string): Promise<string> {
  const [h] = await tx.select({ weekOf: households.weekOf, welcomed: households.welcomed, isExample: households.isExample }).from(households).where(eq(households.id, householdId));
  const snapshot: Snapshot = {
    household: h,
    members: await tx.select().from(members).where(eq(members.householdId, householdId)),
    events: await tx.select().from(events).where(eq(events.householdId, householdId)),
    dinners: await tx.select().from(dinners).where(eq(dinners.householdId, householdId)),
    checks: await tx.select().from(groceryChecks).where(eq(groceryChecks.householdId, householdId)),
    extras: await tx.select().from(extras).where(eq(extras.householdId, householdId)),
  };
  await tx.delete(undoLog).where(and(eq(undoLog.householdId, householdId), lt(undoLog.expiresAt, new Date())));
  const [row] = await tx.insert(undoLog).values({ householdId, payload: snapshot, expiresAt: new Date(Date.now() + UNDO_MINUTES * 60_000) }).returning({ id: undoLog.id });
  return row.id;
}

/** Puts a snapshot back. Returns false if it has expired or belongs to someone else. */
export async function restoreSnapshot(tx: Tx, householdId: string, undoId: string): Promise<boolean> {
  const [row] = await tx.select().from(undoLog).where(and(eq(undoLog.id, undoId), eq(undoLog.householdId, householdId)));
  if (!row || row.expiresAt < new Date()) return false;
  const s = row.payload as Snapshot;
  // JSON turned the timestamps into strings; rows go back with their original ids so references still line up
  const revive = <T extends { createdAt: Date | string }>(r: T) => ({ ...r, householdId, createdAt: new Date(r.createdAt) });

  await clearWeek(tx, householdId, { members: true });
  await tx.update(households).set(s.household).where(eq(households.id, householdId));
  if (s.members.length) await tx.insert(members).values(s.members.map(revive));
  if (s.events.length) await tx.insert(events).values(s.events.map(revive));
  if (s.dinners.length) await tx.insert(dinners).values(s.dinners.map(revive));
  if (s.checks.length) await tx.insert(groceryChecks).values(s.checks.map(revive));
  if (s.extras.length) await tx.insert(extras).values(s.extras.map(revive));
  await tx.delete(undoLog).where(eq(undoLog.id, row.id));
  return true;
}
