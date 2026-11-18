import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { db } from '@/db';
import { households, productEvents, subscriptions, user } from '@/db/schema';
import { now } from '@/lib/clock';
import { requireUser } from '@/lib/dal';
import { computeMetrics, ownerEmails, RETENTION_WEEKS, type Metrics } from '@/lib/metrics';

// For the owner only (OWNER_EMAILS). Anyone else gets a plain 404, so the page's existence isn't revealed.
export const metadata: Metadata = { title: 'Metrics', robots: { index: false, follow: false } };

export default function MetricsPage() {
  return (
    <Suspense fallback={<p className="muted" aria-busy="true">Counting…</p>}>
      <OwnerMetrics />
    </Suspense>
  );
}

async function OwnerMetrics() {
  const me = await requireUser();
  const owners = ownerEmails();
  if (!owners.includes(me.email.toLowerCase())) notFound();

  // The owner's own households are left out so testing doesn't skew the numbers
  const rows = await db.select({ id: households.id, createdAt: households.createdAt, trialEndsAt: households.trialEndsAt, email: user.email })
    .from(households).innerJoin(user, eq(households.ownerUserId, user.id));
  const customers = rows.filter((r) => !owners.includes(r.email.toLowerCase()));
  const m = computeMetrics({
    now: now(),
    households: customers,
    subscriptions: await db.select({ householdId: subscriptions.householdId, plan: subscriptions.plan, status: subscriptions.status }).from(subscriptions),
    events: await db.select({ householdId: productEvents.householdId, name: productEvents.name, at: productEvents.at }).from(productEvents),
  });
  return <MetricsView m={m} excluded={rows.length - customers.length} />;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const usd = (x: number) => x.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: x % 1 ? 2 : 0 });
const weekLabel = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function MetricsView({ m, excluded }: { m: Metrics; excluded: number }) {
  const t = m.totals;
  const stats: [string, string, string?][] = [
    ['Monthly revenue', usd(t.mrr), `${t.paying} paying`],
    ['Households', String(t.households), `${t.newLast7} new this week, ${t.newLast30} in 30 days`],
    ['In free trial', String(t.inTrial)],
    ['Trial to paid', m.conversion.rate === null ? '–' : pct(m.conversion.rate), m.conversion.trialsEnded ? `${m.conversion.converted} of ${m.conversion.trialsEnded} ended trials` : 'No trials have ended yet'],
  ];
  return (
    <div className="metrics">
      <div className="page-head">
        <div>
          <h1>Metrics</h1>
          <p className="sub">Only you can see this page.{excluded ? ` Your own household${excluded === 1 ? ' is' : 's are'} left out.` : ''}</p>
        </div>
      </div>

      <section className="metric-tiles" aria-label="Totals">
        {stats.map(([label, value, note]) => (
          <div className="card metric-tile" key={label}>
            <p className="metric-label">{label}</p>
            <p className="metric-value">{value}</p>
            {note && <p className="metric-note">{note}</p>}
          </div>
        ))}
      </section>
      {t.endedUnpaid > 0 && <p className="muted">{t.endedUnpaid} {t.endedUnpaid === 1 ? 'household has' : 'households have'} a finished trial and no plan, so they are read-only.</p>}

      <section className="card metric-section" aria-labelledby="funnel-h">
        <h2 id="funnel-h">From sign-up to paid</h2>
        <p className="metric-note">Each step counts a household once, at any time since it signed up.</p>
        {m.funnel[0].count === 0 ? <p className="muted">No sign-ups yet.</p> : (
          <ol className="funnel">
            {m.funnel.map((s) => (
              <li key={s.label}>
                <div className="funnel-row"><span>{s.label}</span><span><strong>{s.count}</strong> <span className="muted">· {pct(s.share)}</span></span></div>
                <div className="funnel-bar" aria-hidden><span style={{ width: `${Math.max(s.share * 100, s.count ? 2 : 0)}%` }} /></div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card metric-section" aria-labelledby="ret-h">
        <h2 id="ret-h">Organizers who come back</h2>
        <p className="metric-note">Households grouped by sign-up week. A household counts as back in a week if the organizer planned all seven dinners, filled open nights, shared a link or finished a wrap-up that week. A cell stays empty until that week has fully passed.</p>
        {m.cohorts.length === 0 ? <p className="muted">No sign-ups yet.</p> : (
          <div className="table-scroll">
            <table className="cohorts">
              <thead>
                <tr><th scope="col">Signed up</th><th scope="col">Households</th>{RETENTION_WEEKS.map((n) => <th scope="col" key={n}>Week {n}</th>)}</tr>
              </thead>
              <tbody>
                {m.cohorts.map((c) => (
                  <tr key={c.weekOf}>
                    <th scope="row">Week of {weekLabel(c.weekOf)}</th>
                    <td>{c.size}</td>
                    {c.retention.map((r, i) => (
                      <td key={RETENTION_WEEKS[i]}>{r ? <><strong>{pct(r.active / r.eligible)}</strong> <span className="muted">{r.active}/{r.eligible}</span></> : <span className="muted" aria-label="not yet">–</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
