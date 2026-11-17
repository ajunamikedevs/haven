'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/icon';
import { AISLES, AISLE_COLOR, type Aisle } from '@/lib/meals';
import { fmtTime } from '@/lib/week';

// The old link format: { k: 'list', w, a: [[aisle, [labels]]] } or
// { k: 'week', w, d: [[dayLabel, [[time, title, who, color]], dinner]] }, base64url-encoded after "#s=".
// It arrives from a URL, so every field is checked before it is shown.

type OldList = { k: 'list'; w: string; a: [Aisle, string[]][] };
type OldWeek = { k: 'week'; w: string; d: { label: string; events: { time: string; title: string; who: string; color: string }[]; dinner: string }[] };

const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');

function parse(hash: string): OldList | OldWeek | null {
  try {
    if (!hash.startsWith('#s=')) return null;
    const bin = atob(hash.slice(3).replace(/-/g, '+').replace(/_/g, '/'));
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (p?.k === 'list' && Array.isArray(p.a)) {
      return {
        k: 'list', w: str(p.w, 20),
        a: p.a.slice(0, 10).filter((g: unknown) => Array.isArray(g) && Array.isArray(g[1])).map((g: [unknown, unknown[]]) => [
          (AISLES as readonly string[]).includes(g[0] as string) ? (g[0] as Aisle) : 'Other', g[1].slice(0, 200).map((l) => str(l)).filter(Boolean),
        ]),
      };
    }
    if (p?.k === 'week' && Array.isArray(p.d)) {
      return {
        k: 'week', w: str(p.w, 20),
        d: p.d.slice(0, 7).filter(Array.isArray).map((day: unknown[]) => ({
          label: str(day[0], 40),
          events: (Array.isArray(day[1]) ? day[1] : []).slice(0, 50).filter(Array.isArray).map((e: unknown[]) => ({
            time: str(e[0], 5), title: str(e[1]), who: str(e[2], 80) || 'Everyone',
            color: /^#[0-9a-f]{6}$/i.test(str(e[3])) ? str(e[3]) : 'var(--everyone)',
          })),
          dinner: str(day[2]),
        })),
      };
    }
  } catch { /* fall through */ }
  return null;
}

const subscribe = (fn: () => void) => { addEventListener('hashchange', fn); return () => removeEventListener('hashchange', fn); };

export function OldSnapshot() {
  const hash = useSyncExternalStore(subscribe, () => location.hash, () => '');
  const data = parse(hash);
  const note = <p className="note"><Icon name="clock" size="sm" /><span>This is an older link, so it shows the plan as it was when it was sent. Ask for a new link to see the current one.</span></p>;

  if (!data) {
    return (
      <div className="narrow">
        <div className="card empty">
          <span className="pot"><Icon name="link" size="lg" /></span>
          <h1 style={{ fontSize: 22 }}>This link didn’t open</h1>
          <p className="muted">It may have been cut off when it was copied. Ask for the link again.</p>
          <Link className="btn btn-quiet" href="/">Go to Haven</Link>
        </div>
      </div>
    );
  }
  if (data.k === 'list') {
    return (
      <div className="narrow">
        <div className="page-head"><div><h1>Grocery list</h1><p className="sub">Week of {data.w}</p></div></div>
        {note}
        <div className="card list">
          {data.a.map(([aisle, labels]) => (
            <section className="aisle" key={aisle} aria-label={aisle}>
              <h2><i style={{ '--c': `var(--aisle-${AISLE_COLOR[aisle]})` } as React.CSSProperties} />{aisle}</h2>
              <ul className="items">{labels.map((l) => <li className="item" key={l}><span className="name">{l}</span></li>)}</ul>
            </section>
          ))}
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="page-head"><div><h1>This week</h1><p className="sub">Week of {data.w}</p></div></div>
      <div style={{ marginTop: 16, maxWidth: 720 }}>{note}</div>
      <div className="days" style={{ marginTop: 20 }}>
        {data.d.map((day) => (
          <section className="day" key={day.label}>
            <div className="day-head"><h2>{day.label}</h2></div>
            <div className="card day-card">
              {day.events.length ? (
                <ul className="events">
                  {day.events.map((e, i) => (
                    <li className="ev" key={i}>
                      <span className="ev-time">{fmtTime(e.time)}</span>
                      <div className="ev-main"><span className="ev-title">{e.title}</span></div>
                      <span className="who" style={{ '--c': e.color } as React.CSSProperties} title={e.who}>
                        <span aria-hidden>{e.who === 'Everyone' ? 'All' : (e.who.trim()[0] || '?').toUpperCase()}</span><span className="sr">{e.who}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="quiet-row">Nothing on the calendar.</p>}
              {day.dinner
                ? <div className="dinner"><div className="dinner-main"><span className="pot"><Icon name="pot" /></span><span className="dinner-text"><span className="tag">Dinner</span><span className="dinner-name">{day.dinner}</span></span></div></div>
                : <p className="quiet-row" style={{ border: 0 }}>No dinner planned yet.</p>}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
