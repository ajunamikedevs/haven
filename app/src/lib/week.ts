import { DAY_NAMES } from './meals';
import type { EventItem } from './types';

// Weeks run Monday to Sunday in the household's time zone. Dates travel as ISO strings
// ('2026-11-02') so the server and the browser can never disagree about what day it is.

const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type Today = {
  iso: string; // today's date in the household's zone
  dayIndex: number; // 0 = Monday
  hour: number; // 0–23
  weekOf: string; // Monday of the current week
};

export function isValidTimeZone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

export function zonedToday(timeZone: string, now: Date = new Date()): Today {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const iso = `${get('year')}-${get('month')}-${get('day')}`;
  const dayIndex = WEEKDAY.indexOf(get('weekday'));
  return { iso, dayIndex, hour: Number(get('hour')), weekOf: addDays(iso, -dayIndex) };
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 'Nov 2' */
export function fmtShort(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** 'Monday, Nov 2' for day i of the week starting at weekOf. */
export function fmtDay(weekOf: string, i: number): string {
  return DAY_NAMES[i] + ', ' + fmtShort(addDays(weekOf, i));
}

export function dayOfMonth(weekOf: string, i: number): number {
  return Number(addDays(weekOf, i).slice(8, 10));
}

/** '17:00' → '5:00 pm'; '' → 'Any time'. */
export function fmtTime(t: string): string {
  if (!/^\d{1,2}:\d{2}$/.test(t)) return 'Any time';
  const [h, m] = t.split(':').map(Number);
  return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'pm' : 'am');
}

export function fmtQty(q: number | null): string {
  if (q == null) return '';
  const whole = Math.floor(q), frac = q - whole;
  const f = Math.abs(frac - 0.5) < 0.01 ? '½' : Math.abs(frac - 0.25) < 0.01 ? '¼' : Math.abs(frac - 0.75) < 0.01 ? '¾' : '';
  return f ? (whole || '') + f : String(Math.round(q * 100) / 100);
}

export function greeting(hour: number): string {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function eventsFor(events: EventItem[], day: number): EventItem[] {
  return events.filter((e) => e.day === day).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

/** A busy evening has something at 5 pm or later. */
export function isBusyEvening(events: EventItem[], day: number): boolean {
  return events.some((e) => e.day === day && !!e.time && e.time >= '17:00');
}

/** The saved week is behind the calendar: time to wrap up. */
export function weekRolled(weekOf: string, today: Today): boolean {
  return weekOf < today.weekOf;
}

export const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');
