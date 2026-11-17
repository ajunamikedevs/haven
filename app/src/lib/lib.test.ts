import { describe, expect, it } from 'vitest';
import { getAccess, trialEndsAt, type SubscriptionState } from './access';
import { fillOpenNights, suggestMeal } from './fill';
import { groupByAisle, guessAisle, listAsText, listItems, remaining } from './grocery';
import { headsUp } from './heads-up';
import { importPrototypeWeek } from './import';
import { LIBRARY, mealById, mealCopy } from './meals';
import { sampleWeek } from './sample';
import { addDays, fmtDay, fmtQty, fmtTime, isBusyEvening, zonedToday, type Today } from './week';
import { nextWeek, wrapStats } from './wrap-up';

const WEEK_OF = '2026-11-02'; // a Monday
const on = (dayIndex: number, weekOf = WEEK_OF): Today => ({ iso: addDays(weekOf, dayIndex), dayIndex, hour: 10, weekOf });

describe('week', () => {
  it('finds today and the Monday of the week in the household time zone', () => {
    // 2026-11-09 02:30 UTC is still Sunday evening in New York, already Monday in Lagos
    const now = new Date('2026-11-09T02:30:00Z');
    expect(zonedToday('America/New_York', now)).toMatchObject({ iso: '2026-11-08', dayIndex: 6, weekOf: '2026-11-02', hour: 21 });
    expect(zonedToday('Africa/Lagos', now)).toMatchObject({ iso: '2026-11-09', dayIndex: 0, weekOf: '2026-11-09', hour: 3 });
  });
  it('formats days, times and quantities like the prototype', () => {
    expect(fmtDay(WEEK_OF, 3)).toBe('Thursday, Nov 5');
    expect(fmtTime('17:00')).toBe('5:00 pm');
    expect(fmtTime('00:05')).toBe('12:05 am');
    expect(fmtTime('')).toBe('Any time');
    expect(fmtQty(1.5)).toBe('1½');
    expect(fmtQty(0.5)).toBe('½');
    expect(fmtQty(null)).toBe('');
  });
  it('treats an event at 5 pm or later as a busy evening', () => {
    const { events } = sampleWeek();
    expect(isBusyEvening(events, 0)).toBe(true); // piano at 17:00
    expect(isBusyEvening(events, 5)).toBe(false); // morning only
  });
});

describe('grocery', () => {
  it('adds up the same ingredient across dinners and names the days', () => {
    const items = listItems(sampleWeek());
    const spinach = items.find((it) => it.key === 'spinach|bag')!;
    expect(spinach.label).toBe('2 bag spinach');
    expect(spinach.from).toBe('For Sat, Sun');
    expect(items.find((it) => it.key === 'mozzarella|lb')!.label).toBe('1½ lb mozzarella');
    expect(items).toHaveLength(26);
  });
  it('guesses a store section for typed items', () => {
    expect(guessAisle('Milk')).toBe('Dairy & Eggs');
    expect(guessAisle('coconut milk')).toBe('Pantry');
    expect(guessAisle('frozen peas')).toBe('Frozen');
    expect(guessAisle('Paper towels')).toBe('Other');
  });
  it('sinks ticked items, counts what is left, and copies only what is left', () => {
    const week = sampleWeek();
    week.checks = ['avocados|'];
    week.extras = [{ id: '1', name: 'Milk', got: false }, { id: '2', name: 'Dish soap', got: true }];
    const items = listItems(week);
    expect(remaining(items)).toBe(26);
    const produce = groupByAisle(items).find((g) => g.aisle === 'Produce')!;
    expect(produce.items.at(-1)!.label).toBe('2 avocados');
    const { text, count } = listAsText(items, WEEK_OF);
    expect(count).toBe(26);
    expect(text).toContain('Grocery list, week of Nov 2');
    expect(text).toContain('- Milk');
    expect(text).not.toContain('avocados');
    expect(text).not.toContain('Dish soap');
  });
});

describe('heads up', () => {
  it('flags the one open night with its late event, and the shop day', () => {
    const items = headsUp(sampleWeek(), WEEK_OF, on(2));
    expect(items.map((i) => i.text)).toEqual([
      'Thursday has no dinner yet, and Parent–teacher evening is at 6:00 pm.',
      'Grocery shop is Saturday, and 26 items are still to buy.',
    ]);
    expect(items[0]).toMatchObject({ action: 'open-dinner', day: 3 });
  });
  it('offers to fill several open nights and never shows more than three things', () => {
    const week = sampleWeek();
    week.dinners = {};
    week.extras = [{ id: '1', name: 'Milk', got: false }];
    const items = headsUp(week, WEEK_OF, on(0));
    expect(items).toHaveLength(3);
    expect(items[0].text).toBe('Tonight has no dinner yet, and Piano lesson is at 5:00 pm.');
    expect(items[1]).toMatchObject({ text: '6 nights still open this week.', action: 'fill-week' });
  });
  it('leads with wrap-up on Sunday and after the week rolls over', () => {
    expect(headsUp(sampleWeek(), WEEK_OF, on(6))[0].action).toBe('wrap-week');
    expect(headsUp(sampleWeek(), WEEK_OF, on(1, '2026-11-09'))[0].text).toMatch(/new week has started/);
  });
  it('is empty when the week is covered', () => {
    const week = sampleWeek();
    week.dinners[3] = mealCopy('pancakes');
    week.events = week.events.filter((e) => e.title !== 'Grocery shop');
    expect(headsUp(week, WEEK_OF, on(4))).toEqual([]);
  });
});

describe('fill open nights', () => {
  it('fills only nights after today, quick meals on busy evenings, without repeats', () => {
    const week = sampleWeek();
    week.dinners = { 0: mealCopy('bean-tacos') };
    const picks = fillOpenNights(week, 1, () => 0);
    expect(Object.keys(picks).map(Number)).toEqual([2, 3, 4, 5, 6]);
    expect(mealById(picks[2])!.effort).toBe('quick'); // Wednesday has soccer at 18:00
    expect(mealById(picks[3])!.effort).toBe('quick'); // Thursday has the 18:00 meeting
    const ids = Object.values(picks);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('bean-tacos');
  });
  it('suggests something that fits the filter and differs from the last suggestion', () => {
    const id = suggestMeal({ dinners: {} }, 'involved', 'pizza-night', () => 0);
    expect(mealById(id)!.effort).toBe('involved');
    expect(id).not.toBe('pizza-night');
    expect(LIBRARY.some((m) => m.id === id)).toBe(true);
  });
});

describe('wrap-up', () => {
  it('counts past days as done and carries repeating plans forward', () => {
    const week = sampleWeek();
    week.checks = ['avocados|'];
    week.extras = [{ id: '1', name: 'Milk', got: false }, { id: '2', name: 'Dish soap', got: true }];
    const stats = wrapStats(week, WEEK_OF, on(2));
    expect(stats).toMatchObject({ dinnersEaten: 2, dinnersPlanned: 6, groceriesBought: 2, groceriesTotal: 28, plansDone: 5, plansTotal: 11 });
    expect(stats.keeps.map((e) => e.title)).toEqual(['School drop-off', 'Soccer practice', 'Piano lesson', 'Swim class', 'Soccer practice']);

    const next = nextWeek(week, WEEK_OF, on(2));
    expect(next.weekOf).toBe('2026-11-09');
    expect(next.week.events).toHaveLength(5);
    expect(next.week.events.every((e) => !e.done)).toBe(true);
    expect(next.week.dinners).toEqual({});
    expect(next.week.checks).toEqual([]);
    expect(next.week.extras.map((x) => x.name)).toEqual(['Milk']);
  });
  it('catches up to the current week after a rollover', () => {
    const late = on(3, '2026-11-23');
    expect(wrapStats(sampleWeek(), WEEK_OF, late).dinnersEaten).toBe(6);
    expect(nextWeek(sampleWeek(), WEEK_OF, late).weekOf).toBe('2026-11-23');
  });
});

describe('access', () => {
  const created = new Date('2026-11-01T00:00:00Z');
  const trial = trialEndsAt(created);
  const sub = (status: SubscriptionState['status'], end: string | null = '2026-12-20T00:00:00Z', cancel = false): SubscriptionState =>
    ({ status, currentPeriodEnd: end ? new Date(end) : null, cancelAtPeriodEnd: cancel });
  const at = (iso: string, subscription: SubscriptionState | null = null) => getAccess({ trialEndsAt: trial, subscription, now: new Date(iso) });

  it('gives 14 days of full access with no card', () => {
    expect(at('2026-11-01T00:00:01Z')).toEqual({ level: 'full', reason: 'trial', trialDaysLeft: 14 });
    expect(at('2026-11-14T12:00:00Z')).toEqual({ level: 'full', reason: 'trial', trialDaysLeft: 1 });
  });
  it('goes read-only when the trial ends without a subscription', () => {
    expect(at('2026-11-15T00:00:00Z')).toEqual({ level: 'read_only', reason: 'trial_ended' });
    expect(at('2026-11-20T00:00:00Z', sub('incomplete'))).toEqual({ level: 'read_only', reason: 'trial_ended' });
  });
  it('keeps full access while subscribed, and while a failed payment is retried', () => {
    expect(at('2026-12-01T00:00:00Z', sub('active'))).toEqual({ level: 'full', reason: 'subscribed', endsOn: null });
    expect(at('2026-12-01T00:00:00Z', sub('active', '2026-12-20T00:00:00Z', true))).toMatchObject({ reason: 'subscribed', endsOn: new Date('2026-12-20T00:00:00Z') });
    expect(at('2026-12-01T00:00:00Z', sub('past_due'))).toEqual({ level: 'full', reason: 'payment_retrying' });
  });
  it('honours the paid period after a cancellation, then goes read-only', () => {
    expect(at('2026-12-10T00:00:00Z', sub('canceled'))).toMatchObject({ level: 'full', reason: 'paid_until' });
    expect(at('2026-12-21T00:00:00Z', sub('canceled'))).toEqual({ level: 'read_only', reason: 'subscription_ended' });
    expect(at('2026-12-01T00:00:00Z', sub('unpaid'))).toEqual({ level: 'read_only', reason: 'subscription_ended' });
  });
});

describe('import from the prototype', () => {
  it('maps a saved week, remapping member ids and keeping only valid data', () => {
    const saved = {
      members: [{ id: 'm7', name: '  Ana ', role: 'Parent', color: '#4F6A85' }, { id: 'm9', name: '', color: 'red' }, { id: 'm10', name: 'Bo', color: 'javascript:alert(1)' }],
      events: [
        { id: 'e1', day: 2, time: '18:30', title: 'Choir', note: 'Hall', who: 'm7', done: true, repeat: true },
        { id: 'e2', day: 9, time: '10:00', title: 'Bad day' },
        { id: 'e3', day: 1, time: '25:99', title: 'Odd time', who: 'all' },
      ],
      dinners: { 3: { libId: 'bean-tacos', name: 'Black bean tacos', minutes: 20, effort: 'quick', tags: ['Vegetarian'], ing: [['black beans', 2, 'cans', 'Pantry'], ['x'.repeat(500), -4, '', 'Nowhere']], cooked: true }, 8: { name: 'Out of range' }, 4: { name: '' } },
      got: { 'black beans|cans': true, 'salsa|jar': false },
      extras: [{ id: 'x1', name: 'Milk', got: true }, { id: 'x2' }],
      isExample: false,
    };
    const result = importPrototypeWeek(saved)!;
    expect(result.isExample).toBe(false);
    expect(result.week.members).toEqual([
      { id: 'm1', name: 'Ana', role: 'Parent', color: '#4F6A85' },
      { id: 'm2', name: 'Bo', role: '', color: '#4F6A85' },
    ]);
    expect(result.week.events).toEqual([
      { id: 'e1', day: 2, time: '18:30', title: 'Choir', note: 'Hall', who: 'm1', done: true, repeat: true },
      { id: 'e2', day: 1, time: '', title: 'Odd time', note: '', who: null, done: false, repeat: false },
    ]);
    expect(Object.keys(result.week.dinners)).toEqual(['3']);
    const dinner = result.week.dinners[3]!;
    expect(dinner.cooked).toBe(true);
    expect(dinner.ing[1]).toEqual(['x'.repeat(80), null, '', 'Other']);
    expect(result.week.checks).toEqual(['black beans|cans']);
    expect(result.week.extras).toEqual([{ id: 'x1', name: 'Milk', got: true }]);
  });
  it('rejects anything that is not a saved week', () => {
    expect(importPrototypeWeek(null)).toBeNull();
    expect(importPrototypeWeek('haven')).toBeNull();
    expect(importPrototypeWeek({ members: 'nope' })).toBeNull();
  });
});
