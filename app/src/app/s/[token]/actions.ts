'use server';

import { and, eq } from 'drizzle-orm';
import { refresh } from 'next/cache';
import { db } from '@/db';
import { extras, groceryChecks } from '@/db/schema';
import { allowWrite, openLink } from '@/lib/share';

export type ShareTickResult = { ok: true } | { ok: false; message: string };

/**
 * Ticks or unticks one grocery item through a share link. There is no session here: the token
 * is the only credential, so it is checked on every call, only list links may write, the write
 * is limited to that link's household, and each link has a per-minute allowance.
 */
export async function shareSetGot(token: string, key: string, got: boolean): Promise<ShareTickResult> {
  const open = await openLink(token);
  if (!open || open.link.kind !== 'list') return { ok: false, message: 'This link no longer works. Ask for a new one.' };
  if (!open.canWrite) return { ok: false, message: 'This list can’t be changed right now.' };
  if (typeof key !== 'string' || !key || key.length > 160) return { ok: false, message: 'That didn’t look right. Nothing was changed.' };
  if (!(await allowWrite(open.link))) return { ok: false, message: 'Too many changes at once. Give it a minute.' };

  const householdId = open.household.id;
  if (key.startsWith('x:')) {
    const id = key.slice(2);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: 'That didn’t look right. Nothing was changed.' };
    await db.update(extras).set({ got: got === true }).where(and(eq(extras.id, id), eq(extras.householdId, householdId)));
  } else if (got) {
    await db.insert(groceryChecks).values({ householdId, itemKey: key }).onConflictDoNothing();
  } else {
    await db.delete(groceryChecks).where(and(eq(groceryChecks.householdId, householdId), eq(groceryChecks.itemKey, key)));
  }
  refresh();
  return { ok: true };
}
