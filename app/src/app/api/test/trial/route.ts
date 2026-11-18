import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { households } from '@/db/schema';
import { now } from '@/lib/clock';
import { getHousehold, getUser } from '@/lib/dal';

// End-to-end tests only (HAVEN_E2E=1, never in production): moves the signed-in household's
// trial end to `days` from now (and, with `ageDays`, its sign-up to that many days ago), so expiry and
// the daily emails can be tested without waiting. It also forgets which of those emails were sent.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.HAVEN_E2E !== '1') notFound();
  const user = await getUser();
  const household = user && (await getHousehold(user.id));
  if (!household) return Response.json({ error: 'sign in first' }, { status: 401 });
  const { days, ageDays } = (await req.json()) as { days: number; ageDays?: number };
  const t = now().getTime();
  await db.update(households).set({
    trialEndsAt: new Date(t + days * 86_400_000),
    ...(ageDays === undefined ? {} : { createdAt: new Date(t - ageDays * 86_400_000) }),
    trialReminderSentAt: null, nudgeSentAt: null, trialEndedSentAt: null,
  }).where(eq(households.id, household.id));
  return Response.json({ ok: true });
}
