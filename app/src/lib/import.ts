import { AISLES, COLORS, mealById } from './meals';
import type { Dinner, Effort, EventItem, Extra, Ingredient, Member, Week } from './types';

// Turns a week saved by the prototype (localStorage 'haven.v1') into a clean Week.
// The input comes from a browser, so it is untrusted: every field is checked, trimmed and capped,
// and anything that doesn't fit is dropped rather than guessed at.

const MAX = { members: 12, events: 200, extras: 200, ingredients: 40, name: 80, title: 120, note: 200, tags: 6 };

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDay = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 6;
const isTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const EFFORTS: Effort[] = ['quick', 'normal', 'involved'];

export type ImportResult = { week: Week; isExample: boolean } | null;

export function importPrototypeWeek(raw: unknown): ImportResult {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (!Array.isArray(s.members)) return null;

  const idMap = new Map<string, string>();
  const members: Member[] = [];
  for (const m of s.members.slice(0, MAX.members)) {
    if (!m || typeof m !== 'object') continue;
    const r = m as Record<string, unknown>;
    const name = str(r.name, MAX.name);
    if (!name) continue;
    const id = 'm' + (members.length + 1);
    if (typeof r.id === 'string') idMap.set(r.id, id);
    const color = typeof r.color === 'string' && COLORS.includes(r.color) ? r.color : COLORS[members.length % COLORS.length];
    members.push({ id, name, role: str(r.role, MAX.name), color });
  }

  const events: EventItem[] = [];
  for (const e of (Array.isArray(s.events) ? s.events : []).slice(0, MAX.events)) {
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    const title = str(r.title, MAX.title);
    if (!title || !isDay(r.day)) continue;
    events.push({
      id: 'e' + (events.length + 1), day: r.day, time: isTime(r.time) ? r.time : '', title, note: str(r.note, MAX.note),
      who: typeof r.who === 'string' ? idMap.get(r.who) ?? null : null, done: r.done === true, repeat: r.repeat === true,
    });
  }

  const dinners: Week['dinners'] = {};
  const rawDinners = s.dinners && typeof s.dinners === 'object' ? (s.dinners as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(rawDinners)) {
    const day = Number(k);
    if (!isDay(day) || !v || typeof v !== 'object') continue;
    const d = importDinner(v as Record<string, unknown>);
    if (d) dinners[day] = d;
  }

  const checks: string[] = [];
  if (s.got && typeof s.got === 'object') {
    for (const [k, v] of Object.entries(s.got as Record<string, unknown>)) if (v === true && k.length <= 160 && checks.length < 400) checks.push(k);
  }

  const extras: Extra[] = [];
  for (const x of (Array.isArray(s.extras) ? s.extras : []).slice(0, MAX.extras)) {
    if (!x || typeof x !== 'object') continue;
    const name = str((x as Record<string, unknown>).name, MAX.name);
    if (name) extras.push({ id: 'x' + (extras.length + 1), name, got: (x as Record<string, unknown>).got === true });
  }

  return { week: { members, events, dinners, checks, extras }, isExample: s.isExample === true };
}

function importDinner(r: Record<string, unknown>): Dinner | null {
  const name = str(r.name, MAX.title);
  if (!name) return null;
  const libId = typeof r.libId === 'string' && mealById(r.libId) ? r.libId : null;
  const ing: Ingredient[] = [];
  for (const row of (Array.isArray(r.ing) ? r.ing : []).slice(0, MAX.ingredients)) {
    if (!Array.isArray(row)) continue;
    const iname = str(row[0], MAX.name);
    if (!iname) continue;
    const qty = typeof row[1] === 'number' && Number.isFinite(row[1]) && row[1] > 0 && row[1] < 1000 ? row[1] : null;
    const aisle = typeof row[3] === 'string' && (AISLES as readonly string[]).includes(row[3]) ? row[3] : 'Other';
    ing.push([iname, qty, str(row[2], 20), aisle]);
  }
  return {
    libId, name,
    minutes: typeof r.minutes === 'number' && r.minutes > 0 && r.minutes < 1000 ? Math.round(r.minutes) : null,
    effort: EFFORTS.includes(r.effort as Effort) ? (r.effort as Effort) : null,
    tags: (Array.isArray(r.tags) ? r.tags : []).map((t) => str(t, 30)).filter(Boolean).slice(0, MAX.tags),
    ing, cooked: r.cooked === true,
  };
}
