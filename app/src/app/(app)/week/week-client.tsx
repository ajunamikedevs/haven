'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/icon';
import { sendLink } from '@/components/send-link';
import { buzz, useAct, useToast } from '@/components/toast';
import { WhoChip } from '@/components/who-chip';
import { listItems } from '@/lib/grocery';
import type { HeadsUpItem } from '@/lib/heads-up';
import { DAY_NAMES, mealMeta } from '@/lib/meals';
import type { Week } from '@/lib/types';
import { addDays, dayOfMonth, eventsFor, fmtDay, fmtShort, fmtTime, greeting, isBusyEvening, plural, type Today } from '@/lib/week';
import type { WrapStats } from '@/lib/wrap-up';
import { dismissWelcome, fillWeek, setCooked, setEventDone, startBlank } from '../actions';
import { WrapSheet } from '../wrap-sheet';
import { DinnerSheet } from './dinner-sheet';
import { EventSheet, type EventTarget } from './event-sheet';
import { ImportPrompt } from './import-prompt';

export type WeekProps = {
  week: Week; weekOf: string; today: Today; heads: HeadsUpItem[]; stats: WrapStats;
  userName: string; isExample: boolean; welcomed: boolean; rolled: boolean; trialDaysLeft: number | null;
};

/** This Week: Heads up, tonight, progress, the day strip and seven day cards. */
export function WeekClient(p: WeekProps) {
  const { week, weekOf, today } = p;
  const t = today.dayIndex;
  const [dinnerDay, setDinnerDay] = useState<number | null>(null);
  const [eventTarget, setEventTarget] = useState<EventTarget | null>(null);
  const [wrapOpen, setWrapOpen] = useState(false);
  const { act, pending } = useAct();
  const toast = useToast();
  const router = useRouter();

  const planned = Object.keys(week.dinners).length;
  const items = listItems(week);
  const openDays = DAY_NAMES.map((_, i) => i).filter((i) => !week.dinners[i]);
  const memberOf = (id: string | null) => week.members.find((m) => m.id === id);
  const jump = (day: number) => document.getElementById('day-' + day)?.scrollIntoView({ block: 'start' });

  function onHead(h: HeadsUpItem) {
    if (h.action === 'wrap-week') setWrapOpen(true);
    else if (h.action === 'open-dinner') setDinnerDay(h.day!);
    else if (h.action === 'fill-week') act(() => fillWeek());
    else if (h.action === 'see-list') router.push('/grocery');
    else jump(h.day!);
  }
  async function shareWeek() {
    const message = await sendLink('week');
    if (message) toast(message);
  }

  const tonight = week.dinners[t];
  const tonightEvents = eventsFor(week.events, t).filter((e) => !e.done);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="sub">{greeting(today.hour)}{p.userName ? ', ' + p.userName : ''}</p>
          <h1>This week</h1>
          <p className="sub">{fmtDay(weekOf, 0)} – {fmtDay(weekOf, 6)}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          {p.isExample && <span className="example">Example week. Change anything you like.</span>}
          <span className="saved"><Icon name="check" size="sm" />{p.trialDaysLeft != null ? `Saved to your account · free trial, ${plural(p.trialDaysLeft, 'day')} left` : 'Saved to your account'}</span>
        </div>
      </div>

      {!p.welcomed && (
        <section className="card welcome" aria-labelledby="welcomeTitle">
          <span className="eyebrow">Welcome to Haven</span>
          <h2 id="welcomeTitle">Start with one thing: this week’s dinners.</h2>
          <p className="muted">Calendars and the household can wait. Plan the dinners and Haven writes the grocery list for you.</p>
          <div className="row">
            <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => act(() => startBlank())}><Icon name="pot" />Plan my dinners</button>
            <button className="btn btn-text" type="button" disabled={pending} onClick={() => act(() => dismissWelcome())}>Look around the example first</button>
          </div>
        </section>
      )}

      <ImportPrompt />

      {p.heads.length ? (
        <section className="heads" aria-labelledby="headsTitle">
          <h2 className="eyebrow" id="headsTitle"><Icon name="bell" size="sm" />Heads up</h2>
          <ul>
            {p.heads.map((h) => (
              <li key={h.text}>
                <button className="head-item" type="button" data-act={h.action} onClick={() => onHead(h)}>
                  <span className="t">{h.text}</span>
                  <span className="act">{h.label}<Icon name="chev" size="sm" /></span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="heads calm"><Icon name="check" size="sm" />Nothing needs you right now. The week is covered.</p>
      )}

      <div className="week-top">
        <section className="card tonight" aria-labelledby="tonightTitle">
          <div className="tonight-head"><span className="eyebrow" style={{ color: 'var(--primary-ink)' }}>Tonight · {fmtDay(weekOf, t)}</span></div>
          {tonight ? (
            <>
              <div className="tonight-meal">
                <span className="pot"><Icon name="pot" size="lg" /></span>
                <div><h2 id="tonightTitle">{tonight.name}</h2><p className="muted" style={{ fontSize: 14 }}>{mealMeta(tonight) || 'Dinner'}</p></div>
              </div>
              <div className="tonight-actions">
                <CookButton cooked={tonight.cooked} onToggle={() => { if (!tonight.cooked) buzz(); act(() => setCooked(t, !tonight.cooked)); }} />
                <button className="btn btn-quiet btn-sm" type="button" onClick={() => setDinnerDay(t)}><Icon name="pencil" size="sm" />Change</button>
              </div>
            </>
          ) : (
            <>
              <div className="tonight-meal">
                <span className="pot" style={{ borderStyle: 'dashed' }}><Icon name="pot" size="lg" /></span>
                <div>
                  <h2 id="tonightTitle">No dinner planned yet</h2>
                  <p className="muted" style={{ fontSize: 14 }}>{isBusyEvening(week.events, t) ? 'Busy evening, so something quick might help.' : 'Pick a favorite or type your own.'}</p>
                </div>
              </div>
              <div className="tonight-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setDinnerDay(t)}><Icon name="plus" />Plan tonight’s dinner</button>
              </div>
            </>
          )}
          <ul className="today-list" aria-label="Still on today">
            {tonightEvents.length ? tonightEvents.slice(0, 3).map((e) => (
              <li key={e.id}><time>{fmtTime(e.time)}</time><span className="t">{e.title}</span><WhoChip member={memberOf(e.who)} /></li>
            )) : <li className="muted">Nothing else on today.</li>}
            {tonightEvents.length > 3 && <li className="muted">+ {plural(tonightEvents.length - 3, 'more thing')}</li>}
          </ul>
        </section>

        <section className="panel summary" aria-label="Week summary">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="summary-line">
              <strong>{planned} of 7 dinners planned</strong>
              {openDays.length
                ? <a href={'#day-' + openDays[0]} onClick={(e) => { e.preventDefault(); jump(openDays[0]); }}>{openDays.length === 1 ? DAY_NAMES[openDays[0]] + ' is open' : openDays.length + ' nights open'}</a>
                : <span className="muted">Every night covered</span>}
            </div>
            <div className="bar" role="img" aria-label={planned + ' of 7 dinners planned'}><span style={{ width: Math.round((planned / 7) * 100) + '%' }} /></div>
          </div>
          <div className="summary-actions">
            <Link className="btn btn-primary" href="/grocery"><Icon name="bag" />Grocery list · {plural(items.length, 'item')}</Link>
            <button className="icon-btn" type="button" onClick={shareWeek} aria-label="Send this week to your household as a link" style={{ width: 48, height: 48 }}><Icon name="share" /></button>
          </div>
        </section>
      </div>

      <div className="strip-wrap">
        <nav className="strip" aria-label="Jump to a day">
          {DAY_NAMES.map((name, i) => (
            <a key={name} href={'#day-' + i} className={i === t && !p.rolled ? 'today' : undefined} aria-current={i === t && !p.rolled ? 'date' : undefined}
              aria-label={fmtDay(weekOf, i) + (week.dinners[i] ? ', dinner planned' : ', dinner not planned')} onClick={(e) => { e.preventDefault(); jump(i); }}>
              <span className="l" aria-hidden>{name.slice(0, 3)}</span>
              <span className="n" aria-hidden>{dayOfMonth(weekOf, i)}</span>
              <span className={week.dinners[i] ? 'dot' : 'dot open'} />
            </a>
          ))}
        </nav>
      </div>

      {week.members.length > 0 && (
        <div className="legend" aria-label="Color key">
          {week.members.map((m) => (
            <span key={m.id}><i style={{ '--c': m.color } as React.CSSProperties} />{m.name}{m.role && /age/i.test(m.role) ? ', ' + m.role.replace(/age\s*/i, '') : ''}</span>
          ))}
          <span><i style={{ '--c': 'var(--everyone)' } as React.CSSProperties} />Everyone</span>
        </div>
      )}

      <div className="days">
        {DAY_NAMES.map((name, i) => {
          const evs = eventsFor(week.events, i);
          const dinner = week.dinners[i];
          return (
            <section className="day" key={name} id={'day-' + i} aria-labelledby={'dh-' + i}>
              <div className="day-head">
                <h2 id={'dh-' + i}>{name}</h2>
                <span className="date">{fmtShort(addDays(weekOf, i))}</span>
                {i === t && !p.rolled && <span className="badge">Today</span>}
                <span className="spacer" />
                <button className="icon-btn ghost" type="button" onClick={() => setEventTarget({ mode: 'add', day: i })} aria-label={'Add an event on ' + name}><Icon name="plus" /></button>
              </div>
              <div className="card day-card">
                {evs.length ? (
                  <ul className="events">
                    {evs.map((e) => (
                      <li className={e.done ? 'ev done' : 'ev'} key={e.id}>
                        <label className="check">
                          <input type="checkbox" checked={e.done} onChange={(ev) => act(() => setEventDone(e.id, ev.target.checked))} />
                          <span className="box"><Icon name="check" /></span>
                          <span className="sr">Mark {e.title} as done</span>
                        </label>
                        <span className="ev-time">{fmtTime(e.time)}</span>
                        <button className="ev-main" type="button" onClick={() => setEventTarget({ mode: 'edit', event: e })} aria-label={'Edit ' + e.title}>
                          <span className="ev-title">{e.title}</span>
                          {(e.note || e.repeat) && <span className="ev-note">{[e.note, e.repeat ? 'Every week' : ''].filter(Boolean).join(' · ')}</span>}
                        </button>
                        <WhoChip member={memberOf(e.who)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="quiet-row">Nothing on the calendar. A slower evening.</p>
                )}
                {dinner ? (
                  <div className={dinner.cooked ? 'dinner cooked' : 'dinner'}>
                    <button className="dinner-main" type="button" onClick={() => setDinnerDay(i)} aria-label={`Change dinner for ${name}: ${dinner.name}`}>
                      <span className="pot"><Icon name="pot" /></span>
                      <span className="dinner-text">
                        <span className="tag">Dinner</span>
                        <span className="dinner-name">{dinner.name}</span>
                        <span className="dinner-meta">{mealMeta(dinner)}</span>
                      </span>
                    </button>
                    <CookButton cooked={dinner.cooked} onToggle={() => { if (!dinner.cooked) buzz(); act(() => setCooked(i, !dinner.cooked)); }} />
                  </div>
                ) : (
                  <button className="dinner-add" type="button" onClick={() => setDinnerDay(i)}>
                    <span className="plus"><Icon name="plus" /></span>
                    <span>
                      <strong>No dinner planned yet. Tap to add.</strong>
                      <span className="hint">{isBusyEvening(week.events, i) ? 'Busy evening, so a quick meal might help' : 'Pick a family favorite or type your own'}</span>
                    </span>
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <DinnerSheet day={dinnerDay} week={week} weekOf={weekOf} onClose={() => setDinnerDay(null)} />
      <EventSheet target={eventTarget} week={week} weekOf={weekOf} onClose={() => setEventTarget(null)} />
      <WrapSheet open={wrapOpen} onClose={() => setWrapOpen(false)} stats={p.stats} rolled={p.rolled} members={week.members} />
    </>
  );
}

function CookButton({ cooked, onToggle }: { cooked: boolean; onToggle: () => void }) {
  return (
    <button className="cook-btn" type="button" aria-pressed={cooked} onClick={onToggle}>
      {cooked ? <><Icon name="check" size="sm" />Cooked</> : 'Mark cooked'}
    </button>
  );
}
