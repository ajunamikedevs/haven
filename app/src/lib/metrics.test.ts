import { describe, expect, it } from 'vitest';
import { computeMetrics, mondayOf, ownerEmails, type MetricsInput } from './metrics';

const NOW = new Date('2026-11-18T12:00:00Z'); // a Wednesday
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const hh = (id: string, ageDays: number) => ({ id, createdAt: daysAgo(ageDays), trialEndsAt: daysAgo(ageDays - 14) });

describe('metrics', () => {
  it('finds the Monday of a week in UTC', () => {
    expect(mondayOf(new Date('2026-11-18T12:00:00Z'))).toBe('2026-11-16');
    expect(mondayOf(new Date('2026-11-16T00:00:00Z'))).toBe('2026-11-16');
    expect(mondayOf(new Date('2026-11-22T23:59:00Z'))).toBe('2026-11-16');
  });

  it('counts totals, revenue and trial conversion', () => {
    const input: MetricsInput = {
      now: NOW,
      households: [hh('a', 2), hh('b', 20), hh('c', 40), hh('d', 60)],
      subscriptions: [
        { householdId: 'b', plan: 'monthly', status: 'active' },
        { householdId: 'c', plan: 'annual', status: 'active' },
        { householdId: 'd', plan: 'monthly', status: 'canceled' },
      ],
      events: [{ householdId: 'b', name: 'trial_converted', at: daysAgo(10) }],
    };
    const m = computeMetrics(input);
    expect(m.totals).toEqual({ households: 4, newLast7: 1, newLast30: 2, inTrial: 1, paying: 2, endedUnpaid: 1, mrr: 9 });
    // b, c and d had trials end; all three paid at some point (d has since cancelled)
    expect(m.conversion).toEqual({ trialsEnded: 3, converted: 3, rate: 1 });
  });

  it('builds the funnel as a share of signups, counting each household once', () => {
    const m = computeMetrics({
      now: NOW,
      households: [hh('a', 3), hh('b', 3)],
      subscriptions: [],
      events: [
        { householdId: 'a', name: 'week_planned', at: daysAgo(2) },
        { householdId: 'a', name: 'week_planned', at: daysAgo(1) },
        { householdId: 'a', name: 'share_link_created', at: daysAgo(1) },
      ],
    });
    expect(m.funnel.map((s) => [s.label, s.count, s.share])).toEqual([
      ['Signed up', 2, 1], ['Planned all seven dinners', 1, 0.5], ['Shared a link', 1, 0.5], ['Someone opened a link', 0, 0], ['Paid', 0, 0],
    ]);
  });

  it('measures organizer retention only once a week has fully passed', () => {
    const created = daysAgo(36); // weeks 0-4 are over, week 8 is not
    const m = computeMetrics({
      now: NOW,
      households: [{ id: 'a', createdAt: created, trialEndsAt: daysAgo(22) }, { id: 'b', createdAt: created, trialEndsAt: daysAgo(22) }],
      subscriptions: [],
      events: [
        { householdId: 'a', name: 'week_planned', at: new Date(created.getTime() + 8 * 86_400_000) }, // week 1
        { householdId: 'a', name: 'wrap_up_completed', at: new Date(created.getTime() + 29 * 86_400_000) }, // week 4
        { householdId: 'b', name: 'share_link_opened', at: new Date(created.getTime() + 9 * 86_400_000) }, // someone else: not the organizer
      ],
    });
    expect(m.cohorts).toHaveLength(1);
    expect(m.cohorts[0].size).toBe(2);
    expect(m.cohorts[0].retention).toEqual([{ active: 1, eligible: 2 }, { active: 1, eligible: 2 }, null]);
  });

  it('handles no households at all', () => {
    const m = computeMetrics({ now: NOW, households: [], subscriptions: [], events: [] });
    expect(m.totals.households).toBe(0);
    expect(m.conversion.rate).toBeNull();
    expect(m.funnel[0].share).toBe(0);
    expect(m.cohorts).toEqual([]);
  });

  it('reads owner emails from a comma-separated list', () => {
    expect(ownerEmails(' Me@Example.com, ,other@example.com ')).toEqual(['me@example.com', 'other@example.com']);
    expect(ownerEmails('')).toEqual([]);
  });
});
