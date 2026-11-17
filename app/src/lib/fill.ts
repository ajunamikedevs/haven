import { LIBRARY } from './meals';
import type { Week } from './types';
import { isBusyEvening } from './week';

/**
 * Picks a meal for every open night from tomorrow on: quick meals on busy evenings,
 * and nothing already on the week until the library runs out.
 * Returns day → meal id; the caller saves them.
 */
export function fillOpenNights(week: Pick<Week, 'dinners' | 'events'>, todayIndex: number, random: () => number = Math.random): Record<number, string> {
  const used = Object.values(week.dinners).map((d) => d?.libId).filter(Boolean) as string[];
  const picks: Record<number, string> = {};
  for (let i = todayIndex + 1; i < 7; i++) {
    if (week.dinners[i]) continue;
    const fresh = LIBRARY.filter((m) => !used.includes(m.id));
    let pool = isBusyEvening(week.events, i) ? fresh.filter((m) => m.effort === 'quick') : fresh;
    if (!pool.length) pool = fresh.length ? fresh : LIBRARY;
    const m = pool[Math.floor(random() * pool.length)];
    used.push(m.id);
    picks[i] = m.id;
  }
  return picks;
}

/** A suggestion for one night that fits the effort filter and avoids repeats where it can. */
export function suggestMeal(week: Pick<Week, 'dinners'>, effort: 'all' | 'quick' | 'normal' | 'involved', previous: string | null, random: () => number = Math.random): string {
  const used = Object.values(week.dinners).map((d) => d?.libId);
  const fits = (m: (typeof LIBRARY)[number]) => effort === 'all' || m.effort === effort;
  let pool = LIBRARY.filter((m) => fits(m) && !used.includes(m.id));
  if (!pool.length) pool = LIBRARY.filter(fits);
  const others = pool.filter((m) => m.id !== previous);
  const from = others.length ? others : pool;
  return from[Math.floor(random() * from.length)].id;
}
