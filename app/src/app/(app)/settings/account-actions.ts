'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { user as users } from '@/db/schema';
import { cancelAtPeriodEnd, getSubscriptionRow } from '@/lib/billing';
import { isLive } from '@/lib/billing/rules';
import { requireHousehold } from '@/lib/dal';

/**
 * Deletes the organizer's account and everything in the household. A live subscription is
 * cancelled with AgentaOS first, so nothing is charged again; if that fails, nothing is deleted.
 */
export async function deleteAccount(confirmEmail: string): Promise<{ ok: false; message: string }> {
  const { user, household } = await requireHousehold();
  if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, message: 'Type the email address on your account to confirm.' };
  }
  const sub = await getSubscriptionRow(household.id);
  if (sub && isLive(sub.status) && !sub.cancelAtPeriodEnd) {
    try {
      await cancelAtPeriodEnd(household.id);
    } catch (e) {
      console.error('cancel before delete failed', e instanceof Error ? e.message : e);
      return { ok: false, message: 'Your subscription couldn’t be cancelled just now, so nothing was deleted. Try again in a moment.' };
    }
  }
  // Sessions, the household and everything in it are removed by the database's cascades
  await db.delete(users).where(eq(users.id, user.id));
  redirect('/?deleted=1');
}
