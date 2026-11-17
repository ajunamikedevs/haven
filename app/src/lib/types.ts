// Shapes shared by the pure logic in src/lib. They mirror the prototype's state (haven.html)
// so behaviour carries over; the database rows are mapped into these before any logic runs.

export type Effort = 'quick' | 'normal' | 'involved';

/** [name, quantity, unit, aisle] — the prototype's ingredient tuple. */
export type Ingredient = [name: string, qty: number | null, unit: string, aisle: string];

export type Member = { id: string; name: string; role: string; color: string };

export type EventItem = {
  id: string;
  day: number; // 0 = Monday … 6 = Sunday
  time: string; // 'HH:MM', or '' for any time
  title: string;
  note: string;
  who: string | null; // member id, or null for Everyone
  done: boolean;
  repeat: boolean;
};

export type Dinner = {
  libId: string | null;
  name: string;
  minutes: number | null;
  effort: Effort | null;
  tags: string[];
  ing: Ingredient[];
  cooked: boolean;
};

export type Dinners = Partial<Record<number, Dinner>>;

export type Extra = { id: string; name: string; got: boolean };

export type Week = {
  members: Member[];
  events: EventItem[];
  dinners: Dinners;
  /** Keys (`name|unit`) of dinner ingredients already ticked off. */
  checks: string[];
  extras: Extra[];
};
