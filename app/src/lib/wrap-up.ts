import { listItems } from './grocery';
import type { EventItem, Week } from './types';
import { addDays, weekRolled, type Today } from './week';

export type WrapStats = {
  dinnersEaten: number; dinnersPlanned: number;
  groceriesBought: number; groceriesTotal: number;
  plansDone: number; plansTotal: number;
  /** Repeating events that carry into next week, in day and time order. */
  keeps: EventItem[];
};

/** The week in three numbers. Past days count as done without anyone ticking them. */
export function wrapStats(week: Week, weekOf: string, today: Today): WrapStats {
  const rolled = weekRolled(weekOf, today);
  const past = (day: number) => rolled || day < today.dayIndex;
  const days = Object.keys(week.dinners).map(Number);
  const items = listItems(week);
  return {
    dinnersEaten: days.filter((d) => week.dinners[d]!.cooked || past(d)).length,
    dinnersPlanned: days.length,
    groceriesBought: items.filter((it) => it.got).length,
    groceriesTotal: items.length,
    plansDone: week.events.filter((e) => e.done || past(e.day)).length,
    plansTotal: week.events.length,
    keeps: week.events.filter((e) => e.repeat).sort((a, b) => a.day - b.day || (a.time || '').localeCompare(b.time || '')),
  };
}

/**
 * The week after wrapping up: repeating events stay (unticked), dinners and ticks are cleared,
 * and hand-added groceries that weren't bought stay on the list.
 */
export function nextWeek(week: Week, weekOf: string, today: Today): { week: Week; weekOf: string } {
  return {
    week: {
      members: week.members,
      events: week.events.filter((e) => e.repeat).map((e) => ({ ...e, done: false })),
      dinners: {},
      checks: [],
      extras: week.extras.filter((x) => !x.got),
    },
    // Wrapping up early (on Sunday) moves on to next Monday; after a rollover it catches up to now
    weekOf: weekRolled(weekOf, today) ? today.weekOf : addDays(today.weekOf, 7),
  };
}
