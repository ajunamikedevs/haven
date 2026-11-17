import { AISLES, DAY_NAMES, type Aisle } from './meals';
import type { Week } from './types';
import { fmtQty, fmtShort } from './week';

// Best-guess store section for things people type themselves. First match wins.
const AISLE_WORDS: [Aisle, string[]][] = [
  ['Pantry', ['peanut butter', 'coconut milk', 'tomato sauce', 'pasta sauce', 'chili powder', 'canned']],
  ['Frozen', ['frozen', 'ice cream']],
  ['Bakery', ['bread', 'bun', 'roll', 'tortilla', 'naan', 'bagel', 'pita', 'dough', 'croissant', 'wrap']],
  ['Meat & Seafood', ['chicken', 'beef', 'pork', 'turkey', 'bacon', 'sausage', 'ham', 'lamb', 'steak', 'mince', 'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn']],
  ['Dairy & Eggs', ['milk', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'butter', 'yogurt', 'yoghurt', 'cream', 'egg', 'ricotta']],
  ['Produce', ['apple', 'banana', 'berr', 'grape', 'orange', 'lemon', 'lime', 'avocado', 'lettuce', 'spinach', 'kale', 'salad', 'tomato', 'onion', 'garlic', 'potato', 'carrot', 'celery', 'pepper', 'mushroom', 'broccoli', 'cucumber', 'zucchini', 'squash', 'corn', 'green bean', 'herb', 'cilantro', 'parsley', 'basil', 'ginger', 'fruit', 'veg']],
  ['Pantry', ['rice', 'pasta', 'spaghetti', 'noodle', 'bean', 'lentil', 'chickpea', 'flour', 'sugar', 'oil', 'sauce', 'salt', 'spice', 'powder', 'stock', 'broth', 'cereal', 'oat', 'honey', 'vinegar', 'salsa', 'coffee', 'tea', 'can ', 'jar']],
];

export function guessAisle(name: string): Aisle {
  const n = ' ' + name.toLowerCase() + ' ';
  const hit = AISLE_WORDS.find(([, words]) => words.some((w) => n.includes(w)));
  return hit ? hit[0] : 'Other';
}

export type ListItem = {
  key: string; // `name|unit` for dinner ingredients, `x:<id>` for hand-added items
  extraId?: string;
  label: string;
  aisle: Aisle;
  from: string;
  got: boolean;
};

export const itemKey = (name: string, unit: string) => name.toLowerCase() + '|' + unit;

/** Everything on the list: dinner ingredients (merged and added up) plus hand-added items. */
export function listItems(week: Pick<Week, 'dinners' | 'checks' | 'extras'>): ListItem[] {
  const map = new Map<string, { key: string; name: string; qty: number | null; unit: string; aisle: Aisle; days: string[] }>();
  Object.keys(week.dinners).map(Number).sort((a, b) => a - b).forEach((day) => {
    week.dinners[day]!.ing.forEach(([name, qty, unit, aisle]) => {
      const key = itemKey(name, unit);
      if (!map.has(key)) {
        const known = (AISLES as readonly string[]).includes(aisle) && aisle !== 'Other';
        map.set(key, { key, name, qty: null, unit, aisle: known ? (aisle as Aisle) : guessAisle(name), days: [] });
      }
      const item = map.get(key)!;
      if (qty != null) item.qty = (item.qty || 0) + qty;
      const short = DAY_NAMES[day].slice(0, 3);
      if (!item.days.includes(short)) item.days.push(short);
    });
  });
  const checked = new Set(week.checks);
  const fromMeals: ListItem[] = Array.from(map.values()).map((it) => ({
    key: it.key,
    label: [fmtQty(it.qty), it.unit, it.name].filter(Boolean).join(' '),
    aisle: it.aisle,
    from: 'For ' + it.days.join(', '),
    got: checked.has(it.key),
  }));
  const extras: ListItem[] = week.extras.map((x) => ({ key: 'x:' + x.id, extraId: x.id, label: x.name, aisle: guessAisle(x.name), from: 'Added by you', got: x.got }));
  return fromMeals.concat(extras);
}

export type AisleGroup = { aisle: Aisle; items: ListItem[]; left: number };

/** Items grouped by store section, unticked first then alphabetical; empty sections dropped. */
export function groupByAisle(items: ListItem[]): AisleGroup[] {
  return AISLES.map((aisle) => {
    const group = items.filter((it) => it.aisle === aisle).sort((a, b) => (Number(a.got) - Number(b.got)) || a.label.localeCompare(b.label));
    return { aisle, items: group, left: group.filter((it) => !it.got).length };
  }).filter((g) => g.items.length);
}

export const remaining = (items: ListItem[]) => items.filter((it) => !it.got).length;

/** What's still left to buy, as plain text for a message or note. */
export function listAsText(items: ListItem[], weekOf: string): { text: string; count: number } {
  const left = items.filter((it) => !it.got);
  let out = 'Grocery list, week of ' + fmtShort(weekOf) + '\n';
  AISLES.forEach((aisle) => {
    const group = left.filter((it) => it.aisle === aisle).sort((a, b) => a.label.localeCompare(b.label));
    if (group.length) out += '\n' + aisle + '\n' + group.map((it) => '- ' + it.label).join('\n') + '\n';
  });
  return { text: out, count: left.length };
}
