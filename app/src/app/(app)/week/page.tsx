import type { Metadata } from 'next';
import { Suspense } from 'react';
import { now } from '@/lib/clock';
import { loadWeek, requireHousehold } from '@/lib/dal';
import { headsUp } from '@/lib/heads-up';
import { weekRolled, zonedToday } from '@/lib/week';
import { wrapStats } from '@/lib/wrap-up';
import { WeekClient } from './week-client';

export const metadata: Metadata = { title: 'This Week' };

export default function WeekPage() {
  return (
    <Suspense fallback={<p className="muted" aria-busy="true">Loading your week…</p>}>
      <WeekData />
    </Suspense>
  );
}

// Everything is worked out on the server in the household's time zone, so the screen never
// disagrees with the server about what "today" is.
async function WeekData() {
  const { user, household, access } = await requireHousehold();
  const week = await loadWeek(household.id);
  const today = zonedToday(household.timeZone, now());
  return (
    <WeekClient
      week={week}
      weekOf={household.weekOf}
      today={today}
      heads={headsUp(week, household.weekOf, today)}
      stats={wrapStats(week, household.weekOf, today)}
      userName={user.name || week.members[0]?.name || ''}
      isExample={household.isExample}
      welcomed={household.welcomed}
      rolled={weekRolled(household.weekOf, today)}
      trialDaysLeft={access.level === 'full' && access.reason === 'trial' ? access.trialDaysLeft : null}
    />
  );
}
