import 'server-only';

/**
 * The current time. End-to-end tests pin it with HAVEN_FAKE_NOW so "today" is always the same
 * weekday; the override is ignored in production.
 */
export function now(): Date {
  const fake = process.env.NODE_ENV !== 'production' ? process.env.HAVEN_FAKE_NOW : undefined;
  return fake ? new Date(fake) : new Date();
}
