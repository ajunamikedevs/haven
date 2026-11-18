import { describe, expect, it } from 'vitest';
import { needsFirstWeekNudge, needsTrialEndedEmail } from './billing/rules';
import { firstWeekNudgeEmail, trialEndedEmail } from './email';

const NOW = new Date('2026-11-18T08:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);
const daysFromNow = (d: number) => new Date(NOW.getTime() + d * 86_400_000);

describe('first-week nudge', () => {
  const fresh = { createdAt: hoursAgo(30), nudgeSentAt: null, trialEndsAt: daysFromNow(12), subscriptionStatus: null, hasPlanned: false };

  it('goes to organizers a day or more in who have planned nothing', () => {
    expect(needsFirstWeekNudge(fresh, NOW)).toBe(true);
    expect(needsFirstWeekNudge({ ...fresh, createdAt: hoursAgo(24) }, NOW)).toBe(true);
    expect(needsFirstWeekNudge({ ...fresh, createdAt: hoursAgo(95) }, NOW)).toBe(true);
  });

  it('waits a day, and leaves accounts older than four days alone', () => {
    expect(needsFirstWeekNudge({ ...fresh, createdAt: hoursAgo(23) }, NOW)).toBe(false);
    expect(needsFirstWeekNudge({ ...fresh, createdAt: hoursAgo(96) }, NOW)).toBe(false);
  });

  it('is sent once, and never to people who planned, subscribed or whose trial is over', () => {
    expect(needsFirstWeekNudge({ ...fresh, nudgeSentAt: hoursAgo(1) }, NOW)).toBe(false);
    expect(needsFirstWeekNudge({ ...fresh, hasPlanned: true }, NOW)).toBe(false);
    expect(needsFirstWeekNudge({ ...fresh, subscriptionStatus: 'active' }, NOW)).toBe(false);
    expect(needsFirstWeekNudge({ ...fresh, trialEndsAt: hoursAgo(1) }, NOW)).toBe(false);
  });
});

describe('trial-ended email', () => {
  const ended = { trialEndsAt: hoursAgo(5), trialEndedSentAt: null, subscriptionStatus: null };

  it('goes out in the first three days after a trial ends without a plan', () => {
    expect(needsTrialEndedEmail(ended, NOW)).toBe(true);
    expect(needsTrialEndedEmail({ ...ended, trialEndsAt: NOW }, NOW)).toBe(true);
    expect(needsTrialEndedEmail({ ...ended, trialEndsAt: hoursAgo(71) }, NOW)).toBe(true);
  });

  it('not before the end, not for old trials, not twice, and not after any subscription', () => {
    expect(needsTrialEndedEmail({ ...ended, trialEndsAt: daysFromNow(1) }, NOW)).toBe(false);
    expect(needsTrialEndedEmail({ ...ended, trialEndsAt: hoursAgo(72) }, NOW)).toBe(false);
    expect(needsTrialEndedEmail({ ...ended, trialEndedSentAt: hoursAgo(1) }, NOW)).toBe(false);
    expect(needsTrialEndedEmail({ ...ended, subscriptionStatus: 'canceled' }, NOW)).toBe(false);
    expect(needsTrialEndedEmail({ ...ended, subscriptionStatus: 'active' }, NOW)).toBe(false);
  });
});

describe('lifecycle emails', () => {
  it('link to the right place in text and HTML, and say they are one-offs', () => {
    const nudge = firstWeekNudgeEmail('https://havenweek.app/week');
    expect(nudge.subject).toBe('Plan your first week in Haven');
    expect(nudge.text).toContain('Plan this week: https://havenweek.app/week');
    expect(nudge.html).toContain('href="https://havenweek.app/week"');
    expect(nudge.text).toContain('We won’t send another one like it.');

    const ended = trialEndedEmail('Wednesday, November 18', 'https://havenweek.app/billing');
    expect(ended.subject).toBe('Your Haven trial has ended');
    expect(ended.text).toContain('ended Wednesday, November 18');
    expect(ended.text).toContain('$5 a month, or $48 a year');
    expect(ended.html).toContain('href="https://havenweek.app/billing"');
  });
});
