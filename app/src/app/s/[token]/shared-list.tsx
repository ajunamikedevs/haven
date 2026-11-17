'use client';

import { useState, useTransition } from 'react';
import { Icon } from '@/components/icon';
import { groupByAisle, type ListItem } from '@/lib/grocery';
import { AISLE_COLOR } from '@/lib/meals';
import { shareSetGot } from './actions';

/** The grocery list as someone without an account sees it: tick things off, and the organizer sees it too. */
export function SharedList({ token, items, canWrite }: { token: string; items: ListItem[]; canWrite: boolean }) {
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const shown = items.map((it) => ({ ...it, got: local[it.key] ?? it.got }));
  const left = shown.filter((it) => !it.got).length;

  function toggle(key: string, got: boolean) {
    setLocal((l) => ({ ...l, [key]: got }));
    setError(null);
    start(async () => {
      const result = await shareSetGot(token, key, got);
      if (!result.ok) {
        setLocal((l) => { const next = { ...l }; delete next[key]; return next; });
        setError(result.message);
      }
    });
  }

  return (
    <>
      <p className="sub" id="sharedLeft" aria-live="polite">{left ? `${left} left to buy` : 'All done'}</p>
      {error && <p className="note" role="alert"><Icon name="clock" size="sm" /><span>{error}</span></p>}
      <div className="card list">
        {groupByAisle(shown).map((g) => (
          <section className="aisle" key={g.aisle} aria-label={g.aisle}>
            <h2><i style={{ '--c': `var(--aisle-${AISLE_COLOR[g.aisle]})` } as React.CSSProperties} />{g.aisle}</h2>
            <ul className="items">
              {g.items.map((it) => {
                const id = 's-' + it.key.replace(/[^a-z0-9]+/gi, '-');
                return (
                  <li className={it.got ? 'item got' : 'item'} key={it.key}>
                    <label className="check">
                      <input type="checkbox" id={id} checked={it.got} disabled={!canWrite} onChange={(e) => toggle(it.key, e.target.checked)} />
                      <span className="box"><Icon name="check" /></span>
                    </label>
                    <label className="text" htmlFor={id}><span className="name">{it.label}</span></label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="hint" style={{ textAlign: 'center' }}>{canWrite ? 'Ticks show up for everyone who has this list.' : 'This list is read-only right now.'}</p>
    </>
  );
}
