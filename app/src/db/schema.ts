import { relations } from 'drizzle-orm';
import { boolean, date, index, integer, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { Ingredient } from '../lib/types';

/* ---------- Sign-in (Better Auth's tables; names and columns follow its core schema) ---------- */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (t) => [index('session_user_idx').on(t.userId)]);

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('account_user_idx').on(t.userId)]);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('verification_identifier_idx').on(t.identifier)]);

/* ---------- Haven ---------- */

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const household = () => uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' });

/** One household per account: only the organizer signs in. */
export const households = pgTable('households', {
  id: id(),
  ownerUserId: text('owner_user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  timeZone: text('time_zone').notNull(),
  /** Monday of the week currently being planned, as 'YYYY-MM-DD'. */
  weekOf: date('week_of').notNull(),
  welcomed: boolean('welcomed').notNull().default(false),
  isExample: boolean('is_example').notNull().default(true),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }).notNull(),
  /** When the "trial ends soon" email went out, so the daily job sends it once. */
  trialReminderSentAt: timestamp('trial_reminder_sent_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const subscriptions = pgTable('subscriptions', {
  id: id(),
  householdId: uuid('household_id').notNull().unique().references(() => households.id, { onDelete: 'cascade' }),
  agentaosSubscriptionId: text('agentaos_subscription_id').notNull().unique(),
  plan: text('plan', { enum: ['monthly', 'annual'] }).notNull(),
  status: text('status', { enum: ['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'] }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  /** Newest AgentaOS event applied, so late or repeated deliveries can't move state backwards. */
  lastEventAt: timestamp('last_event_at', { withTimezone: true }),
  createdAt: createdAt(),
});

/** Checkouts we started, so a completed payment can be tied to the household that began it. */
export const checkoutSessions = pgTable('checkout_sessions', {
  id: id(),
  householdId: household(),
  sessionId: text('session_id').notNull().unique(),
  plan: text('plan', { enum: ['monthly', 'annual'] }).notNull(),
  status: text('status', { enum: ['pending', 'completed', 'expired'] }).notNull().default('pending'),
  createdAt: createdAt(),
});

/** Every AgentaOS delivery handled, so a retry does nothing the second time. */
export const webhookEvents = pgTable('webhook_events', {
  id: id(),
  eventKey: text('event_key').notNull().unique(),
  type: text('type').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable('members', {
  id: id(),
  householdId: household(),
  name: text('name').notNull(),
  role: text('role').notNull().default(''),
  color: text('color').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index('members_household_idx').on(t.householdId)]);

export const events = pgTable('events', {
  id: id(),
  householdId: household(),
  day: smallint('day').notNull(), // 0 = Monday
  time: text('time').notNull().default(''), // 'HH:MM' or ''
  title: text('title').notNull(),
  note: text('note').notNull().default(''),
  /** null means Everyone. */
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' }),
  done: boolean('done').notNull().default(false),
  repeat: boolean('repeat').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index('events_household_idx').on(t.householdId)]);

export const dinners = pgTable('dinners', {
  id: id(),
  householdId: household(),
  day: smallint('day').notNull(),
  libId: text('lib_id'),
  name: text('name').notNull(),
  minutes: integer('minutes'),
  effort: text('effort', { enum: ['quick', 'normal', 'involved'] }),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  ingredients: jsonb('ingredients').$type<Ingredient[]>().notNull().default([]),
  cooked: boolean('cooked').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('dinners_household_day_idx').on(t.householdId, t.day)]);

/** Dinner ingredients that have been ticked off, keyed `name|unit` like the prototype. */
export const groceryChecks = pgTable('grocery_checks', {
  id: id(),
  householdId: household(),
  itemKey: text('item_key').notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('grocery_checks_household_key_idx').on(t.householdId, t.itemKey)]);

/** Things added to the grocery list by hand. */
export const extras = pgTable('extras', {
  id: id(),
  householdId: household(),
  name: text('name').notNull(),
  got: boolean('got').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index('extras_household_idx').on(t.householdId)]);

export const shareLinks = pgTable('share_links', {
  id: id(),
  householdId: household(),
  kind: text('kind', { enum: ['list', 'week'] }).notNull(),
  /** SHA-256 of the token. The token itself only ever lives in the link. */
  tokenHash: text('token_hash').notNull().unique(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
  /** Ticks made through the link in the current minute, to rate-limit signed-out writes. */
  writeCount: integer('write_count').notNull().default(0),
  writeWindowStart: timestamp('write_window_start', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index('share_links_household_idx').on(t.householdId)]);

/** What a destructive action removed or changed, kept briefly so Undo can put it back. */
export const undoLog = pgTable('undo_log', {
  id: id(),
  householdId: household(),
  payload: jsonb('payload').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [index('undo_log_household_idx').on(t.householdId)]);

/** Product analytics: which household did what, and when. Never any content. */
export const productEvents = pgTable('product_events', {
  id: id(),
  householdId: household(),
  name: text('name').notNull(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('product_events_name_at_idx').on(t.name, t.at)]);

export const householdsRelations = relations(households, ({ one, many }) => ({
  owner: one(user, { fields: [households.ownerUserId], references: [user.id] }),
  subscription: one(subscriptions, { fields: [households.id], references: [subscriptions.householdId] }),
  members: many(members),
  events: many(events),
  dinners: many(dinners),
  groceryChecks: many(groceryChecks),
  extras: many(extras),
}));
export const membersRelations = relations(members, ({ one }) => ({ household: one(households, { fields: [members.householdId], references: [households.id] }) }));
export const eventsRelations = relations(events, ({ one }) => ({ household: one(households, { fields: [events.householdId], references: [households.id] }) }));
export const dinnersRelations = relations(dinners, ({ one }) => ({ household: one(households, { fields: [dinners.householdId], references: [households.id] }) }));
export const groceryChecksRelations = relations(groceryChecks, ({ one }) => ({ household: one(households, { fields: [groceryChecks.householdId], references: [households.id] }) }));
export const extrasRelations = relations(extras, ({ one }) => ({ household: one(households, { fields: [extras.householdId], references: [households.id] }) }));
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({ household: one(households, { fields: [subscriptions.householdId], references: [households.id] }) }));
