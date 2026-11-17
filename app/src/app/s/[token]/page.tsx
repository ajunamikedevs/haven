import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Icon } from '@/components/icon';
import { WhoChip } from '@/components/who-chip';
import { loadWeek } from '@/lib/dal';
import { listItems } from '@/lib/grocery';
import { DAY_NAMES } from '@/lib/meals';
import { markOpened, openLink } from '@/lib/share';
import { recordEvent } from '@/lib/product-events';
import { eventsFor, fmtDay, fmtShort, fmtTime } from '@/lib/week';
import { SharedList } from './shared-list';

// A page for people without an account. It must never be indexed, and the address (which holds
// the link's token) must not leak to other sites through the Referer header.
export const metadata: Metadata = { title: 'Shared with you', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <div id="shared" className="shared">
      <header className="app-top">
        <div className="wrap">
          <Link className="brand" href="/" aria-label="What is Haven?"><span className="brand-mark"><Icon name="home" /></span>Haven</Link>
          <span className="p-pill">Shared with you</span>
        </div>
      </header>
      <main className="wrap view" id="sharedView">
        <Suspense fallback={<p className="muted" aria-busy="true">Opening…</p>}>
          <Shared params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Shared({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const open = await openLink(token);
  if (!open) return <DeadLink />;

  // Only what the link is for leaves the server: no email, no account details, no other screens
  const week = await loadWeek(open.household.id);
  const weekOf = open.household.weekOf;
  if (await markOpened(open.link)) await recordEvent(open.household.id, 'share_link_opened');

  if (open.link.kind === 'list') {
    return (
      <div className="narrow">
        <div className="page-head"><div><h1>Grocery list</h1><p className="sub">Week of {fmtShort(weekOf)}</p></div></div>
        <SharedList token={token} items={listItems(week)} canWrite={open.canWrite} />
        <SharedFooter />
      </div>
    );
  }

  return (
    <>
      <div className="page-head"><div><h1>This week</h1><p className="sub">Week of {fmtShort(weekOf)}. Read-only, shared from Haven.</p></div></div>
      <div className="days" style={{ marginTop: 20 }}>
        {DAY_NAMES.map((name, i) => {
          const evs = eventsFor(week.events, i);
          const dinner = week.dinners[i];
          return (
            <section className="day" key={name}>
              <div className="day-head"><h2>{fmtDay(weekOf, i)}</h2></div>
              <div className="card day-card">
                {evs.length ? (
                  <ul className="events">
                    {evs.map((e) => (
                      <li className={e.done ? 'ev done' : 'ev'} key={e.id}>
                        <span className="ev-time">{fmtTime(e.time)}</span>
                        <div className="ev-main"><span className="ev-title">{e.title}</span>{e.note && <span className="ev-note">{e.note}</span>}</div>
                        <WhoChip member={week.members.find((m) => m.id === e.who)} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="quiet-row">Nothing on the calendar.</p>}
                {dinner ? (
                  <div className="dinner"><div className="dinner-main"><span className="pot"><Icon name="pot" /></span><span className="dinner-text"><span className="tag">Dinner</span><span className="dinner-name">{dinner.name}</span></span></div></div>
                ) : <p className="quiet-row" style={{ border: 0 }}>No dinner planned yet.</p>}
              </div>
            </section>
          );
        })}
      </div>
      <div style={{ marginTop: 28 }}><SharedFooter /></div>
    </>
  );
}

function SharedFooter() {
  return (
    <div className="panel shared-cta">
      <p><strong>Shared from Haven.</strong> One person plans the week; everyone else just opens a link.</p>
      <Link className="btn btn-text btn-sm" href="/">What’s Haven?</Link>
    </div>
  );
}

function DeadLink() {
  return (
    <div className="narrow">
      <div className="card empty">
        <span className="pot"><Icon name="link" size="lg" /></span>
        <h1 style={{ fontSize: 22 }}>This link didn’t open</h1>
        <p className="muted">It may have been switched off, or cut short when it was copied. Ask for the link again.</p>
        <Link className="btn btn-quiet" href="/">Go to Haven</Link>
      </div>
    </div>
  );
}
