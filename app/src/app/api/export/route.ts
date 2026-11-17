import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { dinners, events, extras, groceryChecks, members, shareLinks, subscriptions } from '@/db/schema';
import { getHousehold, getUser } from '@/lib/dal';

// Everything Haven holds about the signed-in organizer's household, as one JSON file.
// Share-link tokens are not included (only their hashes are stored, and those aren't useful).
export async function GET() {
  const user = await getUser();
  const household = user && (await getHousehold(user.id));
  if (!user || !household) return Response.json({ error: 'sign in first' }, { status: 401 });
  const id = household.id;
  const [m, e, d, c, x, links, subs] = await Promise.all([
    db.select().from(members).where(eq(members.householdId, id)).orderBy(asc(members.position)),
    db.select().from(events).where(eq(events.householdId, id)),
    db.select().from(dinners).where(eq(dinners.householdId, id)),
    db.select().from(groceryChecks).where(eq(groceryChecks.householdId, id)),
    db.select().from(extras).where(eq(extras.householdId, id)),
    db.select({ kind: shareLinks.kind, createdAt: shareLinks.createdAt, revokedAt: shareLinks.revokedAt, lastOpenedAt: shareLinks.lastOpenedAt }).from(shareLinks).where(eq(shareLinks.householdId, id)),
    db.select({ plan: subscriptions.plan, status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd, cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd }).from(subscriptions).where(eq(subscriptions.householdId, id)),
  ]);
  const strip = <T extends Record<string, unknown>>(rows: T[]) => rows.map((row) => { const copy: Record<string, unknown> = { ...row }; delete copy.householdId; return copy; });
  const data = {
    exportedAt: new Date().toISOString(),
    format: 'haven-export-v1',
    account: { email: user.email, name: user.name },
    household: { timeZone: household.timeZone, weekOf: household.weekOf, trialEndsAt: household.trialEndsAt, createdAt: household.createdAt },
    members: strip(m), events: strip(e), dinners: strip(d), groceryChecks: strip(c), extras: strip(x),
    shareLinks: links, subscription: subs[0] ?? null,
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="haven-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
