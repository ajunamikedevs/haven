import { and, eq, inArray, lt } from 'drizzle-orm';
import { db } from '@/db';
import { checkoutSessions, dinners, households, productEvents, subscriptions, undoLog } from '@/db/schema';
import { appUrl, emailOwner } from '@/lib/billing';
import { needsFirstWeekNudge, needsTrialEndedEmail, needsTrialReminder } from '@/lib/billing/rules';
import { now } from '@/lib/clock';
import { firstWeekNudgeEmail, trialEndedEmail, trialEndingEmail } from '@/lib/email';

// Organizer actions that count as having planned something of their own
const PLANNING_EVENTS = ['week_planned', 'fill_open_nights', 'share_link_created', 'wrap_up_completed', 'imported_prototype_week'];

// Runs once a day (vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get('authorization') !== `Bearer ${secret}` : process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const at = now();
  const day = (d: Date, timeZone: string) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone });

  /** Sends one email and marks it sent, so a failure for one household never stops the rest. */
  async function send(householdId: string, kind: string, email: Parameters<typeof emailOwner>[1], mark: Partial<typeof households.$inferInsert>) {
    try {
      await emailOwner(householdId, email);
      await db.update(households).set(mark).where(eq(households.id, householdId));
      return 1;
    } catch (e) {
      console.error(`${kind} not sent`, householdId, e instanceof Error ? e.message : e);
      return 0;
    }
  }

  const rows = await db.select({
    id: households.id, timeZone: households.timeZone, createdAt: households.createdAt, isExample: households.isExample,
    trialEndsAt: households.trialEndsAt, trialReminderSentAt: households.trialReminderSentAt,
    nudgeSentAt: households.nudgeSentAt, trialEndedSentAt: households.trialEndedSentAt, subscriptionStatus: subscriptions.status,
  }).from(households).leftJoin(subscriptions, eq(subscriptions.householdId, households.id));

  // 1. One "your trial ends soon" email, in the last three days of a trial
  let reminded = 0;
  for (const h of rows) {
    if (needsTrialReminder(h, at)) reminded += await send(h.id, 'trial reminder', trialEndingEmail(day(h.trialEndsAt, h.timeZone), `${appUrl()}/billing`), { trialReminderSentAt: at });
  }

  // 2. One "plan your first week" nudge, a day or two after signing up, if nothing has been planned
  const young = rows.filter((h) => needsFirstWeekNudge({ ...h, hasPlanned: false }, at));
  let nudged = 0;
  if (young.length) {
    const ids = young.map((h) => h.id);
    const acted = new Set((await db.selectDistinct({ id: productEvents.householdId }).from(productEvents)
      .where(and(inArray(productEvents.householdId, ids), inArray(productEvents.name, PLANNING_EVENTS)))).map((r) => r.id));
    const withDinners = new Set((await db.selectDistinct({ id: dinners.householdId }).from(dinners).where(inArray(dinners.householdId, ids))).map((r) => r.id));
    for (const h of young) {
      // Their own dinners count as planning; the example family's don't
      const hasPlanned = acted.has(h.id) || (!h.isExample && withDinners.has(h.id));
      if (needsFirstWeekNudge({ ...h, hasPlanned }, at)) nudged += await send(h.id, 'first-week nudge', firstWeekNudgeEmail(`${appUrl()}/week`), { nudgeSentAt: at });
    }
  }

  // 3. One "your trial has ended" email, in the first days after a trial ends without a plan
  let ended = 0;
  for (const h of rows) {
    if (needsTrialEndedEmail(h, at)) ended += await send(h.id, 'trial-ended email', trialEndedEmail(day(h.trialEndsAt, h.timeZone), `${appUrl()}/billing`), { trialEndedSentAt: at });
  }

  // 4. Housekeeping: Undo only reaches back 10 minutes; unpaid checkouts expire after a day
  await db.delete(undoLog).where(lt(undoLog.expiresAt, at));
  await db.update(checkoutSessions).set({ status: 'expired' })
    .where(and(eq(checkoutSessions.status, 'pending'), lt(checkoutSessions.createdAt, new Date(at.getTime() - 86_400_000))));

  return Response.json({ reminded, nudged, ended });
}
