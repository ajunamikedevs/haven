'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { clearSavedPages } from './pwa';

const noop = () => () => {};

/** Confirms, on the static landing page, that an account was just deleted (/?deleted=1). */
export function DeletedNotice() {
  const deleted = useSyncExternalStore(noop, () => new URLSearchParams(location.search).get('deleted') === '1', () => false);
  useEffect(() => { if (deleted) clearSavedPages(); }, [deleted]);
  if (!deleted) return null;
  return <p className="note wrap" role="status" style={{ marginTop: 16 }}>Your account and everything in it have been deleted.</p>;
}
