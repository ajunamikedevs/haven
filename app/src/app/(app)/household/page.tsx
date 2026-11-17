import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { now } from '@/lib/clock';
import { loadWeek, requireHousehold } from '@/lib/dal';
import { weekRolled, zonedToday } from '@/lib/week';
import { wrapStats } from '@/lib/wrap-up';
import { HouseholdClient } from './household-client';

export const metadata: Metadata = { title: 'Household' };

export default function HouseholdPage() {
  return (
    <Suspense fallback={<p className="muted" aria-busy="true">Loading your household…</p>}>
      <HouseholdData />
    </Suspense>
  );
}

async function HouseholdData() {
  const { user, household } = await requireHousehold();
  const week = await loadWeek(household.id);
  const today = zonedToday(household.timeZone, now());
  return (
    <>
      <HouseholdClient week={week} stats={wrapStats(week, household.weekOf, today)} rolled={weekRolled(household.weekOf, today)} />
      <section className="narrow account-panel" aria-labelledby="accountTitle">
        <div className="panel reset-panel">
          <h2 id="accountTitle" style={{ fontSize: 16 }}>Account</h2>
          <p className="muted" style={{ fontSize: 14 }}>Signed in as {user.email}</p>
          <div className="row"><Link className="btn btn-quiet btn-sm" href="/settings">Settings and shared links</Link></div>
        </div>
      </section>
    </>
  );
}
