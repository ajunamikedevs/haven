'use client';

import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/icon';
import { useAct } from '@/components/toast';
import { importWeek } from '../actions';

const SAVED = 'haven.v1'; // where the old single-page Haven kept its week
const HANDLED = 'haven.import'; // set once the offer has been accepted or declined

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const changed = () => listeners.forEach((fn) => fn());

/** The saved week as text, if there is one of the person's own that hasn't been dealt with yet. */
function read(): string | null {
  try {
    if (localStorage.getItem(HANDLED)) return null;
    const raw = localStorage.getItem(SAVED);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.members) && parsed.isExample !== true ? raw : null;
  } catch {
    return null;
  }
}

/** Offers, once, to bring over a week planned in the old Haven on this device. */
export function ImportPrompt() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const { act, pending } = useAct();
  if (!raw) return null;

  const finish = () => { try { localStorage.setItem(HANDLED, 'done'); } catch { /* private window */ } changed(); };

  return (
    <section className="card welcome" aria-labelledby="importTitle">
      <span className="eyebrow">From this device</span>
      <h2 id="importTitle">Bring over the week you planned here?</h2>
      <p className="muted">Haven found a week saved in this browser from before you had an account. Bringing it over replaces what’s on this page, and you can undo it.</p>
      <div className="row">
        <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => act(() => importWeek(JSON.parse(raw)), (r) => { if (r.ok) finish(); })}>
          <Icon name="arrow" />Bring it over
        </button>
        <button className="btn btn-text" type="button" disabled={pending} onClick={finish}>No thanks</button>
      </div>
    </section>
  );
}
