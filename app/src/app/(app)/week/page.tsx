import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Icon } from '@/components/icon';
import { loadWeek, requireHousehold } from '@/lib/dal';
import { headsUp } from '@/lib/heads-up';
import { DAY_NAMES, mealMeta } from '@/lib/meals';
import { eventsFor, fmtDay, fmtShort, fmtTime, greeting, addDays, zonedToday } from '@/lib/week';

export const metadata: Metadata = { title: 'This Week' };

export default function WeekPage() {
  return (
    <Suspense fallback={<p className="muted" aria-busy="true">Loading your week…</p>}>
      <WeekView />
    </Suspense>
  );
}

// Foundation milestone: a read-only view that proves sign-in, the household and its data
// load end to end. The interactive This Week screen (sheets, Undo, Tonight card, day strip)
// replaces this in the Parity milestone.
async function WeekView() {
  const { user, household, access } = await requireHousehold();
  const week = await loadWeek(household.id);
  const today = zonedToday(household.timeZone);
  const heads = headsUp(week, household.weekOf, today);
  const memberOf = (id: string | null) => week.members.find((m) => m.id === id);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="sub">{greeting(today.hour)}, {user.name || week.members[0]?.name || 'there'}</p>
          <h1>This week</h1>
          <p className="sub">{fmtDay(household.weekOf, 0)} – {fmtDay(household.weekOf, 6)}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          {household.isExample && <span className="example">Example week. Change anything you like.</span>}
          {access.level === 'full' && access.reason === 'trial' && (
            <span className="saved"><Icon name="check" size="sm" />Free trial: {access.trialDaysLeft} {access.trialDaysLeft === 1 ? 'day' : 'days'} left</span>
          )}
        </div>
      </div>

      {heads.length ? (
        <section className="heads" aria-labelledby="headsTitle">
          <h2 className="eyebrow" id="headsTitle"><Icon name="bell" size="sm" />Heads up</h2>
          <ul>
            {heads.map((h) => (
              <li key={h.text}><div className="head-item"><span className="t">{h.text}</span></div></li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="heads calm"><Icon name="check" size="sm" />Nothing needs you right now. The week is covered.</p>
      )}

      <div className="days" style={{ marginTop: 24 }}>
        {DAY_NAMES.map((name, i) => {
          const evs = eventsFor(week.events, i);
          const dinner = week.dinners[i];
          return (
            <section className="day" key={name} id={'day-' + i} aria-labelledby={'dh-' + i}>
              <div className="day-head">
                <h2 id={'dh-' + i}>{name}</h2>
                <span className="date">{fmtShort(addDays(household.weekOf, i))}</span>
                {i === today.dayIndex && household.weekOf === today.weekOf && <span className="badge">Today</span>}
              </div>
              <div className="card day-card">
                {evs.length ? (
                  <ul className="events">
                    {evs.map((e) => {
                      const m = memberOf(e.who);
                      return (
                        <li className={e.done ? 'ev done' : 'ev'} key={e.id}>
                          <span className="ev-time">{fmtTime(e.time)}</span>
                          <div className="ev-main">
                            <span className="ev-title">{e.title}</span>
                            {(e.note || e.repeat) && <span className="ev-note">{[e.note, e.repeat ? 'Every week' : ''].filter(Boolean).join(' · ')}</span>}
                          </div>
                          <span className="who" style={{ '--c': m?.color ?? 'var(--everyone)' } as React.CSSProperties} title={m?.name ?? 'Everyone'}>
                            <span aria-hidden>{m ? (m.name.trim()[0] || '?').toUpperCase() : 'All'}</span>
                            <span className="sr">{m?.name ?? 'Everyone'}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="quiet-row">Nothing on the calendar. A slower evening.</p>
                )}
                {dinner ? (
                  <div className="dinner">
                    <div className="dinner-main">
                      <span className="pot"><Icon name="pot" /></span>
                      <span className="dinner-text">
                        <span className="tag">Dinner</span>
                        <span className="dinner-name">{dinner.name}</span>
                        <span className="dinner-meta">{mealMeta(dinner)}</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="quiet-row" style={{ border: 0 }}>No dinner planned yet.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
