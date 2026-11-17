'use server';

import { redirect } from 'next/navigation';
import { db } from '@/db';
import { households } from '@/db/schema';
import { trialEndsAt } from '@/lib/access';
import { now } from '@/lib/clock';
import { getHousehold, requireUser } from '@/lib/dal';
import { recordEvent } from '@/lib/product-events';
import { sampleWeek } from '@/lib/sample';
import { insertWeek } from '@/lib/store';
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
  const at = now();

  const householdId = await db.transaction(async (tx) => {
    const [household] = await tx.insert(households).values({
      ownerUserId: user.id, timeZone, weekOf: zonedToday(timeZone, at).weekOf, trialEndsAt: trialEndsAt(at),
    }).returning({ id: households.id });
    await insertWeek(tx, household.id, sampleWeek());
    return household.id;
  });
  await recordEvent(householdId, 'signup');

  redirect('/week');
}
