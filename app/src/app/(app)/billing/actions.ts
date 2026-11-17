'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { cancelAtPeriodEnd, getSubscriptionRow, startCheckout } from '@/lib/billing';
import { isLive } from '@/lib/billing/rules';
import { requireHousehold } from '@/lib/dal';

/** Sends the organizer to AgentaOS's checkout for the chosen plan. */
export async function subscribe(formData: FormData) {
  const plan = formData.get('plan');
  if (plan !== 'monthly' && plan !== 'annual') return;
  const { user, household } = await requireHousehold();
  // One subscription at a time: someone already paying can't start a second by accident
  const current = await getSubscriptionRow(household.id);
  if (current && isLive(current.status) && !current.cancelAtPeriodEnd) redirect('/billing');
  if (current?.status === 'canceled' && current.currentPeriodEnd && current.currentPeriodEnd > new Date()) redirect('/billing');
  redirect(await startCheckout(household.id, user.email, plan));
}

export async function cancelSubscription(): Promise<{ ok: boolean; message: string }> {
  const { household } = await requireHousehold();
  try {
    await cancelAtPeriodEnd(household.id);
  } catch (e) {
    console.error('cancel failed', e instanceof Error ? e.message : e);
    return { ok: false, message: 'That didn’t go through. Try again in a moment.' };
  }
  refresh();
  return { ok: true, message: 'Your plan won’t renew. You keep everything until the end of this period.' };
}
