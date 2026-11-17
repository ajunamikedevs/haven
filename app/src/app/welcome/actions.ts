'use server';

import { redirect } from 'next/navigation';
import { db } from '@/db';
import { dinners, events, households, members } from '@/db/schema';
import { trialEndsAt } from '@/lib/access';
import { getHousehold, requireUser } from '@/lib/dal';
import { sampleWeek } from '@/lib/sample';
import { isValidTimeZone, zonedToday } from '@/lib/week';

/**
 * Sets up the signed-in user's household: their time zone, a 14-day trial, and the example
 * family to look around (the welcome card on This Week offers a blank week instead).
 */
export async function createHousehold(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (await getHousehold(user.id)) redirect('/week');

  const raw = String(formData.get('timeZone') || '');
  const timeZone = isValidTimeZone(raw) ? raw : 'UTC';
  const now = new Date();
  const sample = sampleWeek();

  await db.transaction(async (tx) => {
    const [household] = await tx.insert(households).values({
      ownerUserId: user.id, timeZone, weekOf: zonedToday(timeZone, now).weekOf, trialEndsAt: trialEndsAt(now),
    }).returning({ id: households.id });

    const inserted = await tx.insert(members).values(
      sample.members.map((m, i) => ({ householdId: household.id, name: m.name, role: m.role, color: m.color, position: i })),
    ).returning({ id: members.id });
    const memberId = new Map(sample.members.map((m, i) => [m.id, inserted[i].id]));

    await tx.insert(events).values(sample.events.map((e) => ({
      householdId: household.id, day: e.day, time: e.time, title: e.title, note: e.note,
      memberId: e.who ? memberId.get(e.who) ?? null : null, done: false, repeat: e.repeat,
    })));

    await tx.insert(dinners).values(Object.entries(sample.dinners).map(([day, d]) => ({
      householdId: household.id, day: Number(day), libId: d!.libId, name: d!.name, minutes: d!.minutes,
      effort: d!.effort, tags: d!.tags, ingredients: d!.ing, cooked: false,
    })));
  });

  redirect('/week');
}
