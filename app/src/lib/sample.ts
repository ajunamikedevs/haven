import { COLORS, mealCopy } from './meals';
import type { Week } from './types';

/** The example family new households can look around before planning their own week. */
export function sampleWeek(): Week {
  return {
    members: [
      { id: 'm1', name: 'Sarah', role: 'Parent', color: COLORS[0] },
      { id: 'm2', name: 'Dan', role: 'Parent', color: COLORS[1] },
      { id: 'm3', name: 'Maya', role: 'Age 12', color: COLORS[2] },
      { id: 'm4', name: 'Leo', role: 'Age 8', color: COLORS[3] },
    ],
    events: [
      { id: 'e1', day: 0, time: '07:45', title: 'School drop-off', note: 'Lincoln Elementary', who: 'm2', done: false, repeat: true },
      { id: 'e2', day: 0, time: '15:30', title: 'Soccer practice', note: 'Riverside Park, until 5:00', who: 'm3', done: false, repeat: true },
      { id: 'e3', day: 0, time: '17:00', title: 'Piano lesson', note: '', who: 'm4', done: false, repeat: true },
      { id: 'e4', day: 1, time: '09:00', title: 'Dentist', note: 'Bright Smile Dental', who: 'm1', done: false, repeat: false },
      { id: 'e5', day: 1, time: '17:00', title: 'Working late', note: 'Home around 7:30', who: 'm2', done: false, repeat: false },
      { id: 'e6', day: 2, time: '16:00', title: 'Swim class', note: 'Community pool', who: 'm4', done: false, repeat: true },
      { id: 'e7', day: 2, time: '18:00', title: 'Soccer practice', note: 'Riverside Park', who: 'm3', done: false, repeat: true },
      { id: 'e8', day: 3, time: '18:00', title: 'Parent–teacher evening', note: 'Lincoln Elementary, until 7:30', who: null, done: false, repeat: false },
      { id: 'e9', day: 5, time: '09:00', title: 'Soccer match', note: 'Away game at Oak Hill', who: 'm3', done: false, repeat: false },
      { id: 'e10', day: 5, time: '11:00', title: 'Grocery shop', note: '', who: 'm1', done: false, repeat: false },
      { id: 'e11', day: 6, time: '13:00', title: 'Lunch at Grandma’s', note: '', who: null, done: false, repeat: false },
    ],
    dinners: { 0: mealCopy('lemon-chicken'), 1: mealCopy('bean-tacos'), 2: mealCopy('beef-ragu'), 4: mealCopy('pizza-night'), 5: mealCopy('salmon-rice'), 6: mealCopy('ragu-bake') },
    checks: [],
    extras: [],
  };
}
