import { and, eq, isNull, lt } from 'drizzle-orm';
import { db } from '@/db';
import { checkoutSessions, households, subscriptions, undoLog } from '@/db/schema';
import { appUrl, emailOwner } from '@/lib/billing';
import { needsTrialReminder } from '@/lib/billing/rules';
import { now } from '@/lib/clock';
import { trialEndingEmail } from '@/lib/email';

// Runs once a day (vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get('authorization') !== `Bearer ${secret}` : process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const at = now();

  // 1. One "your trial ends soon" email, in the last three days of a trial
  const candidates = await db.select({ id: households.id, timeZone: households.timeZone, trialEndsAt: households.trialEndsAt, trialReminderSentAt: households.trialReminderSentAt, subscriptionStatus: subscriptions.status })
    .from(households).leftJoin(subscriptions, eq(subscriptions.householdId, households.id))
    .where(isNull(households.trialReminderSentAt));
  let reminded = 0;
  for (const h of candidates) {
    if (!needsTrialReminder(h, at)) continue;
    const endsOn = h.trialEndsAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: h.timeZone });
    try {
      await emailOwner(h.id, trialEndingEmail(endsOn, `${appUrl()}/billing`));
      await db.update(households).set({ trialReminderSentAt: at }).where(eq(households.id, h.id));
      reminded++;
    } catch (e) {
      console.error('trial reminder not sent', h.id, e instanceof Error ? e.message : e);
    }
  }

  // 2. Housekeeping: Undo only reaches back 10 minutes; unpaid checkouts expire after a day
  await db.delete(undoLog).where(lt(undoLog.expiresAt, at));
  await db.update(checkoutSessions).set({ status: 'expired' })
    .where(and(eq(checkoutSessions.status, 'pending'), lt(checkoutSessions.createdAt, new Date(at.getTime() - 86_400_000))));

  return Response.json({ reminded });
}
