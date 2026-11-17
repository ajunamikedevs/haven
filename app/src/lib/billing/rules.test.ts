import { createHmac } from 'node:crypto';
import { WebhooksResource, WebhookVerificationError } from '@agentaos/pay';
import { describe, expect, it } from 'vitest';
import { getAccess } from '../access';
import { eventKey, isConversion, needsTrialReminder, shouldApply } from './rules';

const DAY = 86_400_000;
const now = new Date('2026-11-18T10:00:00Z');

describe('shouldApply', () => {
  it('always applies news about the stored subscription, or when there is none', () => {
    expect(shouldApply(null, { id: 'a', status: 'active' })).toBe(true);
    expect(shouldApply({ id: 'a', status: 'active' }, { id: 'a', status: 'canceled' })).toBe(true);
  });
  it('never lets a late event about an old, ended subscription replace a live one', () => {
    expect(shouldApply({ id: 'new', status: 'active' }, { id: 'old', status: 'canceled' })).toBe(false);
    expect(shouldApply({ id: 'new', status: 'past_due' }, { id: 'old', status: 'unpaid' })).toBe(false);
  });
  it('lets a new live subscription replace an ended one', () => {
    expect(shouldApply({ id: 'old', status: 'canceled' }, { id: 'new', status: 'active' })).toBe(true);
  });
});

describe('isConversion', () => {
  it('counts only the first live subscription', () => {
    expect(isConversion(null, { status: 'active' })).toBe(true);
    expect(isConversion(null, { status: 'incomplete' })).toBe(false);
    expect(isConversion({ status: 'canceled' }, { status: 'active' })).toBe(false);
  });
});

describe('needsTrialReminder', () => {
  const base = { trialReminderSentAt: null, subscriptionStatus: null };
  it('sends once in the last three days of an unpaid trial', () => {
    expect(needsTrialReminder({ ...base, trialEndsAt: new Date(now.getTime() + 2 * DAY) }, now)).toBe(true);
    expect(needsTrialReminder({ ...base, trialEndsAt: new Date(now.getTime() + 5 * DAY) }, now)).toBe(false);
    expect(needsTrialReminder({ ...base, trialEndsAt: new Date(now.getTime() - DAY) }, now)).toBe(false);
    expect(needsTrialReminder({ ...base, trialEndsAt: new Date(now.getTime() + DAY), trialReminderSentAt: now }, now)).toBe(false);
    expect(needsTrialReminder({ ...base, trialEndsAt: new Date(now.getTime() + DAY), subscriptionStatus: 'active' }, now)).toBe(false);
  });
});

describe('eventKey', () => {
  it('keys checkouts by session so a retried delivery is recognised', () => {
    expect(eventKey('checkout.session.completed', 'cs_1', 'h')).toBe('checkout:cs_1');
    expect(eventKey('subscription.renewed', null, 'h')).toBe('subscription.renewed:h');
  });
});

describe('access after billing events', () => {
  const trialEndsAt = new Date(now.getTime() - DAY); // trial already over
  it('a paid subscription unlocks, a cancelled one keeps access to the period end, then read-only', () => {
    const end = new Date(now.getTime() + 10 * DAY);
    expect(getAccess({ trialEndsAt, now, subscription: { status: 'active', currentPeriodEnd: end, cancelAtPeriodEnd: false } }).level).toBe('full');
    expect(getAccess({ trialEndsAt, now, subscription: { status: 'canceled', currentPeriodEnd: end, cancelAtPeriodEnd: true } })).toMatchObject({ level: 'full', reason: 'paid_until' });
    expect(getAccess({ trialEndsAt, now: new Date(end.getTime() + 1), subscription: { status: 'canceled', currentPeriodEnd: end, cancelAtPeriodEnd: true } })).toMatchObject({ level: 'read_only', reason: 'subscription_ended' });
  });
  it('a failed renewal keeps access while the card is retried', () => {
    expect(getAccess({ trialEndsAt, now, subscription: { status: 'past_due', currentPeriodEnd: null, cancelAtPeriodEnd: false } })).toMatchObject({ level: 'full', reason: 'payment_retrying' });
  });
});

describe('webhook signatures', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ type: 'subscription.renewed', data: { id: 'sub_1', status: 'active', current_period_end: null } });
  const sign = (b: string, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${b}`).digest('hex')}`;

  it('accepts a correctly signed raw body and camel-cases it', () => {
    const event = new WebhooksResource().verify(body, sign(body), secret) as unknown as { data: { currentPeriodEnd: null } };
    expect(event.data).toHaveProperty('currentPeriodEnd', null);
  });
  it('rejects an altered body, a wrong secret and an old timestamp', () => {
    expect(() => new WebhooksResource().verify(body.replace('active', 'canceled'), sign(body), secret)).toThrow(WebhookVerificationError);
    expect(() => new WebhooksResource().verify(body, sign(body), 'other')).toThrow(WebhookVerificationError);
    expect(() => new WebhooksResource().verify(body, sign(body, Math.floor(Date.now() / 1000) - 3600), secret)).toThrow(WebhookVerificationError);
  });
});
