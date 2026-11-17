'use server';

import { and, eq, max } from 'drizzle-orm';
import { refresh } from 'next/cache';
import { db } from '@/db';
import { dinners, events, extras, groceryChecks, households, members } from '@/db/schema';
import { loadWeek, ReadOnlyError, requireWriteAccess, type Household } from '@/lib/dal';
import { fillOpenNights } from '@/lib/fill';
import { guessAisle } from '@/lib/grocery';
import { COLORS, DAY_NAMES, mealCopy, mealById } from '@/lib/meals';
import { sampleWeek } from '@/lib/sample';
import { clearWeek, insertWeek, restoreSnapshot, takeSnapshot, type Tx } from '@/lib/store';
import { nextWeek } from '@/lib/wrap-up';
import { plural, zonedToday } from '@/lib/week';
import { now } from '@/lib/clock';

// Every change to a household's week. Each action:
//  1. gets the household from the signed-in session (never from the browser) and refuses if it is read-only,
//  2. checks what the browser sent,
//  3. touches only rows that belong to that household,
//  4. refreshes the page, and for destructive changes returns an undoId for the Undo button.

export type ActionResult =
  | { ok: true; message?: string; undoId?: string }
  | { ok: false; error: 'read_only' | 'invalid' | 'expired'; message: string };

const invalid = (message = 'That didn’t look right. Nothing was changed.'): ActionResult => ({ ok: false, error: 'invalid', message });
const isDay = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 6;
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function run(fn: (household: Household) => Promise<ActionResult>): Promise<ActionResult> {
  try {
    const { household } = await requireWriteAccess();
    const result = await fn(household);
    if (result.ok) refresh();
    return result;
  } catch (e) {
    if (e instanceof ReadOnlyError) return { ok: false, error: 'read_only', message: 'Your trial has ended. Subscribe to keep planning.' };
    throw e;
  }
}

const notExample = (tx: Tx, householdId: string) => tx.update(households).set({ isExample: false }).where(eq(households.id, householdId));

/* ---------- Dinners ---------- */

async function putDinner(householdId: string, day: number, dinner: ReturnType<typeof mealCopy>) {
  await db.transaction(async (tx) => {
    await tx.delete(dinners).where(and(eq(dinners.householdId, householdId), eq(dinners.day, day)));
    await tx.insert(dinners).values({ householdId, day, libId: dinner.libId, name: dinner.name, minutes: dinner.minutes, effort: dinner.effort, tags: dinner.tags, ingredients: dinner.ing, cooked: false });
    await notExample(tx, householdId);
  });
}

export async function chooseMeal(day: number, mealId: string): Promise<ActionResult> {
  return run(async (h) => {
    if (!isDay(day) || !mealById(mealId)) return invalid();
    const dinner = mealCopy(mealId);
    await putDinner(h.id, day, dinner);
    return { ok: true, message: `${dinner.name} is on ${DAY_NAMES[day]}.` };
  });
}

export async function saveOwnMeal(day: number, name: string, ingredients: string): Promise<ActionResult> {
  return run(async (h) => {
    const title = clean(name, 120);
    if (!isDay(day) || !title) return invalid('Give the dinner a name first.');
    const ing = clean(ingredients, 4000).split('\n').map((s) => s.trim().slice(0, 80)).filter(Boolean).slice(0, 40)
      .map((n) => [n, null, '', 'Other'] as [string, null, string, string]);
    await putDinner(h.id, day, { libId: null, name: title, minutes: null, effort: null, tags: ['Your meal'], ing, cooked: false });
    return { ok: true, message: `${title} is on ${DAY_NAMES[day]}.` };
  });
}

export async function clearDinner(day: number): Promise<ActionResult> {
  return run(async (h) => {
    if (!isDay(day)) return invalid();
    const undoId = await db.transaction(async (tx) => {
      const id = await takeSnapshot(tx, h.id);
      await tx.delete(dinners).where(and(eq(dinners.householdId, h.id), eq(dinners.day, day)));
      return id;
    });
    return { ok: true, undoId, message: `${DAY_NAMES[day]}’s dinner cleared.` };
  });
}

export async function setCooked(day: number, cooked: boolean): Promise<ActionResult> {
  return run(async (h) => {
    if (!isDay(day)) return invalid();
    await db.update(dinners).set({ cooked: cooked === true }).where(and(eq(dinners.householdId, h.id), eq(dinners.day, day)));
    return { ok: true };
  });
}

/** Plans every open night from tomorrow on. */
export async function fillWeek(): Promise<ActionResult> {
  return run(async (h) => {
    const week = await loadWeek(h.id);
    const picks = fillOpenNights(week, zonedToday(h.timeZone, now()).dayIndex);
    const days = Object.keys(picks).map(Number);
    if (!days.length) return { ok: true, message: 'Every night from tomorrow on already has a dinner.' };
    const undoId = await db.transaction(async (tx) => {
      const id = await takeSnapshot(tx, h.id);
      await tx.insert(dinners).values(days.map((day) => {
        const d = mealCopy(picks[day]);
        return { householdId: h.id, day, libId: d.libId, name: d.name, minutes: d.minutes, effort: d.effort, tags: d.tags, ingredients: d.ing, cooked: false };
      }));
      await notExample(tx, h.id);
      return id;
    });
    return { ok: true, undoId, message: `Planned ${plural(days.length, 'night')}. Tap any dinner to swap it.` };
  });
}

/* ---------- Events ---------- */

export type EventInput = { id?: string; title: string; day: number; time: string; who: string | null; note: string; repeat: boolean };

export async function saveEvent(input: EventInput): Promise<ActionResult> {
  return run(async (h) => {
    const title = clean(input.title, 120);
    const time = typeof input.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ? input.time : '';
    if (!title || !isDay(input.day)) return invalid('Give the event a name first.');
    let memberId: string | null = null;
    if (input.who) {
      if (!isUuid(input.who)) return invalid();
      const [m] = await db.select({ id: members.id }).from(members).where(and(eq(members.id, input.who), eq(members.householdId, h.id)));
      if (!m) return invalid();
      memberId = m.id;
    }
    const fields = { title, day: input.day, time, memberId, note: clean(input.note, 200), repeat: input.repeat === true };
    if (input.id) {
      if (!isUuid(input.id)) return invalid();
      await db.update(events).set(fields).where(and(eq(events.id, input.id), eq(events.householdId, h.id)));
    } else {
      await db.insert(events).values({ householdId: h.id, ...fields });
    }
    await db.update(households).set({ isExample: false }).where(eq(households.id, h.id));
    return { ok: true, message: input.id ? 'Event updated.' : `Added to ${DAY_NAMES[input.day]}.` };
  });
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  return run(async (h) => {
    if (!isUuid(id)) return invalid();
    const undoId = await db.transaction(async (tx) => {
      const snap = await takeSnapshot(tx, h.id);
      await tx.delete(events).where(and(eq(events.id, id), eq(events.householdId, h.id)));
      return snap;
    });
    return { ok: true, undoId, message: 'Event deleted.' };
  });
}

export async function setEventDone(id: string, done: boolean): Promise<ActionResult> {
  return run(async (h) => {
    if (!isUuid(id)) return invalid();
    await db.update(events).set({ done: done === true }).where(and(eq(events.id, id), eq(events.householdId, h.id)));
    return { ok: true };
  });
}

/* ---------- Grocery list ---------- */

/** Ticks or unticks a list item. Keys are `name|unit` for dinner ingredients and `x:<id>` for hand-added items. */
export async function setItemGot(key: string, got: boolean): Promise<ActionResult> {
  return run(async (h) => {
    if (typeof key !== 'string' || !key || key.length > 160) return invalid();
    if (key.startsWith('x:')) {
      const id = key.slice(2);
      if (!isUuid(id)) return invalid();
      await db.update(extras).set({ got: got === true }).where(and(eq(extras.id, id), eq(extras.householdId, h.id)));
    } else if (got) {
      await db.insert(groceryChecks).values({ householdId: h.id, itemKey: key }).onConflictDoNothing();
    } else {
      await db.delete(groceryChecks).where(and(eq(groceryChecks.householdId, h.id), eq(groceryChecks.itemKey, key)));
    }
    return { ok: true };
  });
}

export async function addExtra(name: string): Promise<ActionResult> {
  return run(async (h) => {
    const item = clean(name, 80);
    if (!item) return invalid('Type what you need first.');
    await db.insert(extras).values({ householdId: h.id, name: item });
    return { ok: true, message: `${item} added to ${guessAisle(item)}.` };
  });
}

export async function removeExtra(id: string): Promise<ActionResult> {
  return run(async (h) => {
    if (!isUuid(id)) return invalid();
    const [x] = await db.select({ name: extras.name }).from(extras).where(and(eq(extras.id, id), eq(extras.householdId, h.id)));
    if (!x) return invalid();
    const undoId = await db.transaction(async (tx) => {
      const snap = await takeSnapshot(tx, h.id);
      await tx.delete(extras).where(and(eq(extras.id, id), eq(extras.householdId, h.id)));
      return snap;
    });
    return { ok: true, undoId, message: `${x.name} removed.` };
  });
}

export async function uncheckAll(): Promise<ActionResult> {
  return run(async (h) => {
    const undoId = await db.transaction(async (tx) => {
      const snap = await takeSnapshot(tx, h.id);
      await tx.delete(groceryChecks).where(eq(groceryChecks.householdId, h.id));
      await tx.update(extras).set({ got: false }).where(eq(extras.householdId, h.id));
      return snap;
    });
    return { ok: true, undoId, message: 'Everything is back on the list.' };
  });
}

/* ---------- Household ---------- */

export async function renameMember(id: string, name: string): Promise<ActionResult> {
  return run(async (h) => {
    const value = clean(name, 80);
    if (!isUuid(id)) return invalid();
    if (!value) return invalid('A name can’t be empty, so it stays as it was.');
    await db.update(members).set({ name: value }).where(and(eq(members.id, id), eq(members.householdId, h.id)));
    return { ok: true, message: `Saved. The week now shows ${value}.` };
  });
}

export async function setMemberRole(id: string, role: string): Promise<ActionResult> {
  return run(async (h) => {
    if (!isUuid(id)) return invalid();
    await db.update(members).set({ role: clean(role, 80) }).where(and(eq(members.id, id), eq(members.householdId, h.id)));
    return { ok: true, message: 'Saved.' };
  });
}

export async function addMember(name: string, role: string): Promise<ActionResult> {
  return run(async (h) => {
    const value = clean(name, 80);
    if (!value) return invalid('Type a name first.');
    const existing = await db.select({ color: members.color }).from(members).where(eq(members.householdId, h.id));
    if (existing.length >= 12) return invalid('A household can have up to 12 people.');
    const used = existing.map((m) => m.color);
    const color = COLORS.find((c) => !used.includes(c)) ?? COLORS[existing.length % COLORS.length];
    const [{ last }] = await db.select({ last: max(members.position) }).from(members).where(eq(members.householdId, h.id));
    await db.insert(members).values({ householdId: h.id, name: value, role: clean(role, 80), color, position: (last ?? -1) + 1 });
    return { ok: true, message: `${value} joined the household.` };
  });
}

export async function removeMember(id: string): Promise<ActionResult> {
  return run(async (h) => {
    if (!isUuid(id)) return invalid();
    const [m] = await db.select({ name: members.name }).from(members).where(and(eq(members.id, id), eq(members.householdId, h.id)));
    if (!m) return invalid();
    const theirs = await db.select({ id: events.id }).from(events).where(and(eq(events.householdId, h.id), eq(events.memberId, id)));
    const undoId = await db.transaction(async (tx) => {
      const snap = await takeSnapshot(tx, h.id);
      // Their events stay on the week and become Everyone's (member_id is set to null by the database)
      await tx.delete(members).where(and(eq(members.id, id), eq(members.householdId, h.id)));
      return snap;
    });
    const n = theirs.length;
    return { ok: true, undoId, message: m.name + ' removed' + (n ? `. Their ${n === 1 ? 'event is' : 'events are'} now marked Everyone.` : '.') };
  });
}

/* ---------- Whole-week changes ---------- */

export async function dismissWelcome(): Promise<ActionResult> {
  return run(async (h) => {
    await db.update(households).set({ welcomed: true }).where(eq(households.id, h.id));
    return { ok: true };
  });
}

/** Dinners-first start: an empty week and household, ready for seven dinners. */
export async function startBlank(): Promise<ActionResult> {
  return run(async (h) => {
    const undoId = await db.transaction(async (tx) => {
      const snap = await takeSnapshot(tx, h.id);
      await clearWeek(tx, h.id, { members: true });
      await tx.update(households).set({ isExample: false, welcomed: true, weekOf: zonedToday(h.timeZone, now()).weekOf }).where(eq(households.id, h.id));
      return snap;
    });
    return { ok: true, undoId, message: 'Blank week ready. Tap any night to plan its dinner.' };
  });
}

export async function clearThisWeek(): Promise<ActionResult> {
  return run(async (h) => {
    const undoId = await db.transaction(async (tx) => {
      const snap = await takeSnapshot(tx, h.id);
      await clearWeek(tx, h.id, { members: false });
      await notExample(tx, h.id);
      return snap;
    });
    return { ok: true, undoId, message: 'This week is clear.' };
  });
}

export async function restoreExample(): Promise<ActionResult> {
  return run(async (h) => {
    const undoId = await db.transaction(async (tx) => {
      const snap = await takeSnapshot(tx, h.id);
      await clearWeek(tx, h.id, { members: true });
      await insertWeek(tx, h.id, sampleWeek());
      await tx.update(households).set({ isExample: true, welcomed: true, weekOf: zonedToday(h.timeZone, now()).weekOf }).where(eq(households.id, h.id));
      return snap;
    });
    return { ok: true, undoId, message: 'Example week restored.' };
  });
}

/** Wrap-up: repeating plans carry over, everything else resets. */
export async function startNextWeek(): Promise<ActionResult> {
  return run(async (h) => {
    const week = await loadWeek(h.id);
    const next = nextWeek(week, h.weekOf, zonedToday(h.timeZone, now()));
    const kept = next.week.events.length;
    const undoId = await db.transaction(async (tx) => {
      const snap = await takeSnapshot(tx, h.id);
      await tx.delete(events).where(and(eq(events.householdId, h.id), eq(events.repeat, false)));
      await tx.update(events).set({ done: false }).where(eq(events.householdId, h.id));
      await tx.delete(dinners).where(eq(dinners.householdId, h.id));
      await tx.delete(groceryChecks).where(eq(groceryChecks.householdId, h.id));
      await tx.delete(extras).where(and(eq(extras.householdId, h.id), eq(extras.got, true)));
      await tx.update(households).set({ weekOf: next.weekOf, isExample: false, welcomed: true }).where(eq(households.id, h.id));
      return snap;
    });
    return { ok: true, undoId, message: 'Next week is ready' + (kept ? `, with ${plural(kept, 'repeating plan')} carried over.` : '.') };
  });
}

/* ---------- Undo ---------- */

export async function undo(undoId: string): Promise<ActionResult> {
  return run(async (h) => {
    if (!isUuid(undoId)) return invalid();
    const restored = await db.transaction((tx) => restoreSnapshot(tx, h.id, undoId));
    return restored ? { ok: true, message: 'Undone.' } : { ok: false, error: 'expired', message: 'That can’t be undone any more.' };
  });
}
