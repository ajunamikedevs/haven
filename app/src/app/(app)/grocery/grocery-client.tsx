'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { copyText } from '@/components/confirm-sheet';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { buzz, useAct, useToast } from '@/components/toast';
import { groupByAisle, listAsText, listItems } from '@/lib/grocery';
import { AISLE_COLOR } from '@/lib/meals';
import type { Week } from '@/lib/types';
import { plural } from '@/lib/week';
import { addExtra, removeExtra, setItemGot, uncheckAll } from '../actions';

/** The grocery list: built from the week's dinners, sorted by store section, ticked off while shopping. */
export function GroceryClient({ week, weekOf }: { week: Week; weekOf: string }) {
  // Ticks show at once; the server copy catches up a moment later
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [copyBox, setCopyBox] = useState<string | null>(null);
  const { act, pending } = useAct();
  const toast = useToast();
  const extraInput = useRef<HTMLInputElement>(null);

  const items = listItems(week).map((it) => ({ ...it, got: local[it.key] ?? it.got }));
  const planned = Object.keys(week.dinners).length;
  const total = items.length;
  const inCart = items.filter((it) => it.got).length;

  function toggle(key: string, got: boolean) {
    setLocal((l) => ({ ...l, [key]: got }));
    if (got) buzz();
    act(() => setItemGot(key, got), (r) => { if (!r.ok) setLocal((l) => { const next = { ...l }; delete next[key]; return next; }); });
  }
  async function copyList() {
    const { text, count } = listAsText(items, weekOf);
    if (!count) { toast('Everything is checked off. Nothing left to copy.'); return; }
    if (await copyText(text)) toast(`Copied ${plural(count, 'item')}. Paste them into a text or note.`);
    else setCopyBox(text);
  }
  const addForm = (
    <form className="add-item" onSubmit={(e) => {
      e.preventDefault();
      const name = extraInput.current?.value.trim();
      if (!name) return;
      act(() => addExtra(name), (r) => { if (r.ok && extraInput.current) { extraInput.current.value = ''; extraInput.current.focus(); } });
    }}>
      <label className="label" htmlFor="extraName">Need something else?</label>
      <div className="inline-form">
        <input className="input" id="extraName" ref={extraInput} name="name" placeholder="Paper towels, milk…" autoComplete="off" enterKeyHint="done" required />
        <button className="btn btn-quiet" type="submit" disabled={pending}><Icon name="plus" />Add</button>
      </div>
    </form>
  );

  return (
    <div className="narrow">
      <div className="page-head">
        <div>
          <h1>Grocery list</h1>
          <p className="sub">{planned ? `Made from ${plural(planned, 'planned dinner')} this week` : 'Plan a dinner and its ingredients appear here'}</p>
        </div>
      </div>

      {!total ? (
        <div className="card list">
          <div className="empty">
            <span className="pot"><Icon name="bag" size="lg" /></span>
            <h2 style={{ fontSize: 19 }}>Your list is empty</h2>
            <p className="muted">Plan a dinner on This Week and everything you need shows up here, added up and sorted by store section.</p>
            <Link className="btn btn-primary" href="/week">Plan dinners</Link>
          </div>
          {addForm}
        </div>
      ) : (
        <>
          <section className="panel list-summary" aria-label="Shopping progress">
            <div className="summary-line">
              <strong>{inCart} of {total} in the cart</strong>
              {inCart > 0 && <button className="btn btn-text btn-sm" type="button" disabled={pending} onClick={() => { setLocal({}); act(() => uncheckAll(), () => setLocal({})); }}>Uncheck all</button>}
            </div>
            <div className="bar" role="img" aria-label={`${inCart} of ${total} items checked off`}><span style={{ width: Math.round((inCart / total) * 100) + '%' }} /></div>
            <button className="btn btn-primary" type="button" onClick={copyList}><Icon name="share" />Copy list</button>
            <p className="hint">Copies what’s still left to buy, ready to paste into a text or note.</p>
          </section>

          <div className="card list">
            {groupByAisle(items).map((g) => (
              <section className="aisle" key={g.aisle} aria-label={g.aisle}>
                <h2>
                  <i style={{ '--c': `var(--aisle-${AISLE_COLOR[g.aisle]})` } as React.CSSProperties} />{g.aisle}
                  <span className="n">· {g.left ? g.left + ' left' : 'all done'}</span>
                </h2>
                <ul className="items">
                  {g.items.map((it) => {
                    const id = 'g-' + it.key.replace(/[^a-z0-9]+/gi, '-');
                    return (
                      <li className={it.got ? 'item got' : 'item'} key={it.key}>
                        <label className="check">
                          <input type="checkbox" id={id} checked={it.got} onChange={(e) => toggle(it.key, e.target.checked)} />
                          <span className="box"><Icon name="check" /></span>
                        </label>
                        <label className="text" htmlFor={id}><span className="name">{it.label}</span><span className="from">{it.from}</span></label>
                        {it.extraId && (
                          <button className="icon-btn ghost" type="button" disabled={pending} onClick={() => act(() => removeExtra(it.extraId!))} aria-label={`Remove ${it.label} from the list`}><Icon name="x" /></button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {addForm}
          </div>
        </>
      )}

      <Sheet open={copyBox !== null} onClose={() => setCopyBox(null)} title="Copy this" titleId="copyTitle">
        <div className="sheet-body">
          <label className="muted" htmlFor="copyBox">Copying is blocked here. Press and hold, or select all, then copy:</label>
          <textarea className="input" id="copyBox" readOnly value={copyBox ?? ''} onFocus={(e) => e.target.select()} autoFocus />
          <div className="sheet-foot"><button className="btn btn-primary" type="button" onClick={() => setCopyBox(null)}>Done</button></div>
        </div>
      </Sheet>
    </div>
  );
}
