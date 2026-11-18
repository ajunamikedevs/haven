import type { SubscriptionStatus } from './access';
import { isLive, PRICES } from './billing/rules';
import type { ProductEvent } from './product-events';

// The owner's metrics, worked out from the product events, households and subscriptions.
// Pure functions so they can be unit tested; the page loads the rows and passes them in.

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** Things only the organizer does. Opening a share link is someone else, and converting is billing. */
const ORGANIZER_ACTIVITY: ProductEvent[] = ['week_planned', 'fill_open_nights', 'share_link_created', 'wrap_up_completed', 'imported_prototype_week'];

/** Weeks after signup that retention is measured at. Week 0 is the signup week itself. */
export const RETENTION_WEEKS = [1, 4, 8] as const;

export type MetricsInput = {
  households: { id: string; createdAt: Date; trialEndsAt: Date }[];
  subscriptions: { householdId: string; plan: 'monthly' | 'annual'; status: SubscriptionStatus }[];
  events: { householdId: string; name: string; at: Date }[];
  now: Date;
};

export type FunnelStep = { label: string; count: number; share: number };
export type Cohort = { weekOf: string; size: number; retention: (null | { active: number; eligible: number })[] };

export type Metrics = {
  totals: { households: number; newLast7: number; newLast30: number; inTrial: number; paying: number; endedUnpaid: number; mrr: number };
  funnel: FunnelStep[];
  conversion: { trialsEnded: number; converted: number; rate: number | null };
  cohorts: Cohort[];
};

/** Monday (UTC) of the week a date falls in, as 'YYYY-MM-DD'. */
export function mondayOf(d: Date): string {
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

export function computeMetrics({ households, subscriptions, events, now }: MetricsInput, maxCohorts = 12): Metrics {
  const ids = new Set(households.map((h) => h.id));
  const subOf = new Map(subscriptions.filter((s) => ids.has(s.householdId)).map((s) => [s.householdId, s]));
  const evs = events.filter((e) => ids.has(e.householdId));
  const did = (name: ProductEvent) => new Set(evs.filter((e) => e.name === name).map((e) => e.householdId));

  // Paid at some point: the conversion event, or a subscription row (a sale before events existed still counts)
  const paid = new Set([...did('trial_converted'), ...subOf.keys()]);
  const live = [...subOf.values()].filter((s) => isLive(s.status));
  const mrr = live.reduce((sum, s) => sum + (s.plan === 'annual' ? PRICES.annual.amount / 12 : PRICES.monthly.amount), 0);

  const t = now.getTime();
  const inTrial = households.filter((h) => h.trialEndsAt.getTime() > t && !live.some((s) => s.householdId === h.id)).length;
  const trialsEnded = households.filter((h) => h.trialEndsAt.getTime() <= t);
  const endedUnpaid = trialsEnded.filter((h) => !live.some((s) => s.householdId === h.id)).length;
  const convertedOfEnded = trialsEnded.filter((h) => paid.has(h.id)).length;

  const total = households.length;
  const step = (label: string, set: Set<string>): FunnelStep => ({ label, count: set.size, share: total ? set.size / total : 0 });
  const funnel = [
    step('Signed up', ids),
    step('Planned all seven dinners', did('week_planned')),
    step('Shared a link', did('share_link_created')),
    step('Someone opened a link', did('share_link_opened')),
    step('Paid', paid),
  ];

  // Organizer retention: active in week N means any organizer event in days [7N, 7N + 7) after signup
  const activity = new Map<string, number[]>();
  for (const e of evs) if ((ORGANIZER_ACTIVITY as string[]).includes(e.name)) activity.set(e.householdId, [...(activity.get(e.householdId) ?? []), e.at.getTime()]);
  const byWeek = new Map<string, typeof households>();
  for (const h of households) { const k = mondayOf(h.createdAt); byWeek.set(k, [...(byWeek.get(k) ?? []), h]); }
  const cohorts: Cohort[] = [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, maxCohorts)
    .map(([weekOf, hs]) => ({
      weekOf,
      size: hs.length,
      retention: RETENTION_WEEKS.map((n) => {
        const eligible = hs.filter((h) => t >= h.createdAt.getTime() + (n + 1) * WEEK); // the whole of week N has passed
        if (!eligible.length) return null;
        const active = eligible.filter((h) => {
          const from = h.createdAt.getTime() + n * WEEK;
          return (activity.get(h.id) ?? []).some((at) => at >= from && at < from + WEEK);
        }).length;
        return { active, eligible: eligible.length };
      }),
    }));

  return {
    totals: {
      households: total,
      newLast7: households.filter((h) => h.createdAt.getTime() > t - 7 * DAY).length,
      newLast30: households.filter((h) => h.createdAt.getTime() > t - 30 * DAY).length,
      inTrial,
      paying: live.length,
      endedUnpaid,
      mrr: Math.round(mrr * 100) / 100,
    },
    funnel,
    conversion: { trialsEnded: trialsEnded.length, converted: convertedOfEnded, rate: trialsEnded.length ? convertedOfEnded / trialsEnded.length : null },
    cohorts,
  };
}

/** Owner emails from OWNER_EMAILS (comma-separated), lower-cased. */
export function ownerEmails(raw = process.env.OWNER_EMAILS ?? ''): string[] {
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}
