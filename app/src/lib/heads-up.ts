import { listItems, remaining } from './grocery';
import { DAY_NAMES } from './meals';
import type { Week } from './types';
import { eventsFor, fmtTime, isBusyEvening, plural, weekRolled, type Today } from './week';

export type HeadsUpItem = {
  text: string;
  label: string;
  /** What tapping it does. */
  action: 'wrap-week' | 'open-dinner' | 'fill-week' | 'see-list' | 'jump';
  day?: number;
};

/** What Haven noticed, most urgent first; never more than three things. */
export function headsUp(week: Week, weekOf: string, today: Today): HeadsUpItem[] {
  const out: HeadsUpItem[] = [];
  const t = today.dayIndex;

  if (weekRolled(weekOf, today)) out.push({ text: 'A new week has started. Close out last week in about a minute.', label: 'Wrap up', action: 'wrap-week' });
  else if (t === 6 && weekOf === today.weekOf) out.push({ text: 'It’s Sunday. Wrap up this week and carry repeating plans forward.', label: 'Wrap up', action: 'wrap-week' });

  const lateOn = (day: number) => eventsFor(week.events, day).find((e) => !e.done && e.time && e.time >= '17:00');
  if (!week.dinners[t]) {
    const late = lateOn(t);
    out.push({ text: 'Tonight has no dinner yet' + (late ? ', and ' + late.title + ' is at ' + fmtTime(late.time) + '.' : '.'), label: 'Plan it', action: 'open-dinner', day: t });
  }

  const open: number[] = [];
  for (let i = t + 1; i < 7; i++) if (!week.dinners[i]) open.push(i);
  if (open.length === 1) {
    const late = lateOn(open[0]);
    out.push({ text: DAY_NAMES[open[0]] + ' has no dinner yet' + (late ? ', and ' + late.title + ' is at ' + fmtTime(late.time) + '.' : '.'), label: 'Plan it', action: 'open-dinner', day: open[0] });
  } else if (open.length > 1) {
    out.push({ text: plural(open.length, 'night') + ' still open this week.', label: 'Fill them', action: 'fill-week' });
  }

  const shop = week.events.filter((e) => e.day >= t && !e.done && /grocer|shop/i.test(e.title)).sort((a, b) => a.day - b.day)[0];
  const left = remaining(listItems(week));
  if (shop && left) out.push({ text: shop.title + ' is ' + (shop.day === t ? 'today' : DAY_NAMES[shop.day]) + ', and ' + plural(left, 'item') + (left === 1 ? ' is' : ' are') + ' still to buy.', label: 'See list', action: 'see-list' });

  const busy: number[] = [];
  for (let i = t; i < 7; i++) if (isBusyEvening(week.events, i)) busy.push(i);
  if (busy.length >= 3) out.push({ text: plural(busy.length, 'busy evening') + ' ahead, so quick meals come first on those nights.', label: 'See ' + DAY_NAMES[busy[0]].slice(0, 3), action: 'jump', day: busy[0] });

  return out.slice(0, 3);
}
