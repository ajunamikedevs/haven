import type { Dinner, Effort, Ingredient } from './types';

export const COLORS = ['#A65D40', '#4F6A85', '#8A5A7A', '#5C7356', '#8A6428', '#5B6B8C', '#7A5C4A'];
export const AISLES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry', 'Frozen', 'Other'] as const;
export type Aisle = (typeof AISLES)[number];
export const AISLE_COLOR: Record<Aisle, string> = {
  'Produce': 'produce', 'Meat & Seafood': 'meat', 'Dairy & Eggs': 'dairy', 'Bakery': 'bakery',
  'Pantry': 'pantry', 'Frozen': 'frozen', 'Other': 'other',
};
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const EFFORT_LABEL: Record<Effort, string> = { quick: 'Quick', normal: 'Normal', involved: 'Takes longer' };

export type Meal = { id: string; name: string; minutes: number; effort: Effort; tags: string[]; ing: Ingredient[] };

export const LIBRARY: Meal[] = [
  { id: 'lemon-chicken', name: 'Sheet-pan lemon chicken & potatoes', minutes: 35, effort: 'normal', tags: [],
    ing: [['chicken thighs', 2, 'lb', 'Meat & Seafood'], ['baby potatoes', 1.5, 'lb', 'Produce'], ['lemons', 2, '', 'Produce'], ['garlic', 1, 'head', 'Produce'], ['green beans', 1, 'lb', 'Produce'], ['olive oil', null, '', 'Pantry']] },
  { id: 'bean-tacos', name: 'Black bean tacos', minutes: 20, effort: 'quick', tags: ['Vegetarian'],
    ing: [['black beans', 2, 'cans', 'Pantry'], ['corn tortillas', 1, 'pack', 'Bakery'], ['avocados', 2, '', 'Produce'], ['limes', 2, '', 'Produce'], ['shredded cheddar', 1, 'bag', 'Dairy & Eggs'], ['salsa', 1, 'jar', 'Pantry']] },
  { id: 'beef-ragu', name: 'Slow-cooker beef ragu', minutes: 15, effort: 'normal', tags: ['Makes leftovers'],
    ing: [['ground beef', 1.5, 'lb', 'Meat & Seafood'], ['crushed tomatoes', 2, 'cans', 'Pantry'], ['onion', 1, '', 'Produce'], ['carrots', 2, '', 'Produce'], ['garlic', 1, 'head', 'Produce'], ['pasta', 1, 'box', 'Pantry']] },
  { id: 'pizza-night', name: 'Homemade pizza night', minutes: 45, effort: 'involved', tags: ['Family favorite'],
    ing: [['pizza dough', 2, 'balls', 'Bakery'], ['mozzarella', 1, 'lb', 'Dairy & Eggs'], ['pizza sauce', 1, 'jar', 'Pantry'], ['bell peppers', 2, '', 'Produce'], ['mushrooms', 8, 'oz', 'Produce']] },
  { id: 'salmon-rice', name: 'Salmon, rice & greens', minutes: 30, effort: 'normal', tags: [],
    ing: [['salmon fillets', 4, '', 'Meat & Seafood'], ['rice', 1, 'bag', 'Pantry'], ['spinach', 1, 'bag', 'Produce'], ['lemons', 1, '', 'Produce'], ['soy sauce', null, '', 'Pantry']] },
  { id: 'ragu-bake', name: 'Leftover ragu pasta bake', minutes: 25, effort: 'quick', tags: ['Uses leftovers'],
    ing: [['pasta', 1, 'box', 'Pantry'], ['mozzarella', 0.5, 'lb', 'Dairy & Eggs'], ['spinach', 1, 'bag', 'Produce']] },
  { id: 'fried-rice', name: 'Veggie fried rice', minutes: 15, effort: 'quick', tags: ['Vegetarian'],
    ing: [['eggs', 6, '', 'Dairy & Eggs'], ['frozen peas & carrots', 1, 'bag', 'Frozen'], ['green onions', 1, 'bunch', 'Produce'], ['rice', 1, 'bag', 'Pantry'], ['soy sauce', null, '', 'Pantry']] },
  { id: 'chickpea-curry', name: 'Chickpea & spinach curry', minutes: 25, effort: 'quick', tags: ['Vegetarian'],
    ing: [['chickpeas', 2, 'cans', 'Pantry'], ['coconut milk', 1, 'can', 'Pantry'], ['spinach', 1, 'bag', 'Produce'], ['onion', 1, '', 'Produce'], ['curry paste', 1, 'jar', 'Pantry'], ['naan', 1, 'pack', 'Bakery']] },
  { id: 'turkey-burgers', name: 'Turkey burgers & sweet potato fries', minutes: 35, effort: 'normal', tags: [],
    ing: [['ground turkey', 1.5, 'lb', 'Meat & Seafood'], ['burger buns', 1, 'pack', 'Bakery'], ['sweet potatoes', 3, '', 'Produce'], ['lettuce', 1, 'head', 'Produce'], ['tomatoes', 2, '', 'Produce']] },
  { id: 'chicken-soup', name: 'Chicken noodle soup', minutes: 40, effort: 'normal', tags: ['Makes leftovers'],
    ing: [['chicken breasts', 1, 'lb', 'Meat & Seafood'], ['egg noodles', 1, 'bag', 'Pantry'], ['chicken broth', 2, 'cartons', 'Pantry'], ['carrots', 3, '', 'Produce'], ['celery', 1, 'bunch', 'Produce'], ['onion', 1, '', 'Produce']] },
  { id: 'pancakes', name: 'Breakfast for dinner', minutes: 20, effort: 'quick', tags: ['Kids love it'],
    ing: [['eggs', 6, '', 'Dairy & Eggs'], ['milk', 1, 'gallon', 'Dairy & Eggs'], ['pancake mix', 1, 'box', 'Pantry'], ['berries', 2, 'boxes', 'Produce'], ['bacon', 1, 'pack', 'Meat & Seafood']] },
  { id: 'lasagna', name: 'Weekend lasagna', minutes: 75, effort: 'involved', tags: ['Makes leftovers'],
    ing: [['lasagna noodles', 1, 'box', 'Pantry'], ['ricotta', 1, 'tub', 'Dairy & Eggs'], ['mozzarella', 1, 'lb', 'Dairy & Eggs'], ['ground beef', 1, 'lb', 'Meat & Seafood'], ['marinara', 2, 'jars', 'Pantry']] },
];

export function mealById(id: string): Meal | undefined {
  return LIBRARY.find((m) => m.id === id);
}

/** A fresh dinner made from a library meal. */
export function mealCopy(id: string): Dinner {
  const m = mealById(id);
  if (!m) throw new Error('Unknown meal: ' + id);
  return { libId: m.id, name: m.name, minutes: m.minutes, effort: m.effort, tags: m.tags.slice(), ing: m.ing.map((r) => r.slice() as Ingredient), cooked: false };
}

export function mealMeta(d: Pick<Dinner, 'minutes' | 'effort' | 'tags'>): string {
  return [d.minutes ? d.minutes + ' min' : null, d.effort ? EFFORT_LABEL[d.effort] : null, ...(d.tags || [])].filter(Boolean).join(' · ');
}
