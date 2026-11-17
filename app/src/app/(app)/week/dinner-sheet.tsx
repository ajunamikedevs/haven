'use client';

import { useState } from 'react';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { buzz, useAct } from '@/components/toast';
import { suggestMeal } from '@/lib/fill';
import { DAY_NAMES, LIBRARY, mealMeta } from '@/lib/meals';
import type { Week } from '@/lib/types';
import { fmtDay, fmtQty, isBusyEvening } from '@/lib/week';
import { chooseMeal, clearDinner, saveOwnMeal } from '../actions';

type EffortFilter = 'all' | 'quick' | 'normal' | 'involved';
const FILTERS: [EffortFilter, string][] = [['all', 'All'], ['quick', 'Quick'], ['normal', 'Normal'], ['involved', 'Takes longer']];

/** Plan, change or clear one night's dinner: type your own first, or pick a family favorite. */
export function DinnerSheet({ day, week, weekOf, onClose }: { day: number | null; week: Week; weekOf: string; onClose: () => void }) {
  return (
    <Sheet open={day !== null} onClose={onClose} title={day !== null ? 'Dinner for ' + fmtDay(weekOf, day) : ''} titleId="dinnerTitle" id="dinnerDialog">
      {/* Keyed by day so filters, suggestion and typed text start fresh for each night */}
      {day !== null && <DinnerBody key={day} day={day} week={week} onClose={onClose} />}
    </Sheet>
  );
}

function DinnerBody({ day, week, onClose }: { day: number; week: Week; onClose: () => void }) {
  const current = week.dinners[day];
  const own = current && !current.libId ? current : null;
  const busy = isBusyEvening(week.events, day);
  const [filter, setFilter] = useState<EffortFilter>(busy ? 'quick' : 'all');
  const [suggested, setSuggested] = useState<string | null>(null);
  const [openIng, setOpenIng] = useState<string | null>(null);
  const { act, pending } = useAct();

  let list = LIBRARY.filter((m) => filter === 'all' || m.effort === filter);
  if (suggested) list = list.slice().sort((a, b) => Number(b.id === suggested) - Number(a.id === suggested));

  const done = (ok: boolean) => { if (ok) { buzz(); onClose(); } };

  return (
    <div className="sheet-body">
      {current && (
        <div className="current">
          <span className="pot"><Icon name="pot" /></span>
          <div className="text"><span className="tag">Planned now</span><span className="name">{current.name}</span></div>
          <button className="btn btn-danger btn-sm" type="button" disabled={pending} onClick={() => act(() => clearDinner(day), (r) => { if (r.ok) onClose(); })}>
            <Icon name="trash" size="sm" />Clear
          </button>
        </div>
      )}

      <form className="card own-form sheet-section" onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        act(() => saveOwnMeal(day, String(data.get('name') || ''), String(data.get('ing') || '')), (r) => done(r.ok));
      }}>
        <h3><label htmlFor="ownName">{current ? 'Change it to something else' : 'What’s for dinner?'}</label></h3>
        <input className="input" id="ownName" name="name" required placeholder="Type a meal, like Grandma’s chili" autoComplete="off" enterKeyHint="done" defaultValue={own?.name ?? ''} />
        <details className="more" open={!!own?.ing.length}>
          <summary>Add ingredients for the grocery list (optional)</summary>
          <textarea className="input" id="ownIng" name="ing" aria-label="Ingredients, one per line" placeholder={'One per line, for example\nground beef\nkidney beans\nchili powder'} defaultValue={own ? own.ing.map((r) => r[0]).join('\n') : ''} />
        </details>
        <button className="btn btn-primary btn-block" type="submit" disabled={pending}><Icon name="check" />Save dinner</button>
      </form>

      <section className="sheet-section" aria-labelledby="favTitle">
        <h3 id="favTitle">Or pick a family favorite</h3>
        {busy && <div className="note"><Icon name="clock" size="sm" /><span>{DAY_NAMES[day]} has plans after 5 pm, so quick meals are shown first.</span></div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="chips" role="group" aria-label="Show meals by effort">
            {FILTERS.map(([k, label]) => (
              <button key={k} className="chip" type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); setSuggested(null); }}>{label}</button>
            ))}
          </div>
          <button className="btn btn-text" type="button" onClick={() => setSuggested(suggestMeal(week, filter, suggested))}>
            <Icon name="shuffle" size="sm" />Suggest one
          </button>
        </div>
        <ul className="meals">
          {list.map((m) => {
            const isCurrent = current?.libId === m.id;
            const isSuggested = suggested === m.id;
            const open = openIng === m.id;
            return (
              <li key={m.id} className={'meal-row' + (isCurrent ? ' current-row' : '') + (isSuggested ? ' suggested' : '')}>
                <div className="meal-line">
                  <button className="meal" type="button" data-id={m.id} aria-current={isCurrent ? 'true' : undefined} disabled={pending} onClick={() => act(() => chooseMeal(day, m.id), (r) => done(r.ok))}>
                    <span className="text">
                      {isSuggested && <span className="tag" style={{ color: 'var(--warn-ink)' }}>Suggested</span>}
                      {isCurrent && <span className="tag">Planned now</span>}
                      <span className="name">{m.name}</span>
                      <span className="meta">{mealMeta(m)}</span>
                    </span>
                    <span className="go"><Icon name={isCurrent ? 'check' : 'plus'} size="sm" /></span>
                  </button>
                  <button className="icon-btn ghost" type="button" aria-expanded={open} aria-label={(open ? 'Hide' : 'Show') + ' ingredients for ' + m.name} onClick={() => setOpenIng(open ? null : m.id)}>
                    <Icon name="down" />
                  </button>
                </div>
                {open && (
                  <div className="ing" aria-label="Ingredients">
                    {m.ing.map((r) => <span key={r[0]}>{[fmtQty(r[1]), r[2], r[0]].filter(Boolean).join(' ')}</span>)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
