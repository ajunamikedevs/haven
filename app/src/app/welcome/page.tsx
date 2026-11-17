import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Icon } from '@/components/icon';
import { getHousehold, requireUser } from '@/lib/dal';
import { createHousehold } from './actions';
import { TimeZoneField } from './time-zone-field';

export const metadata: Metadata = { title: 'Welcome' };

export default function WelcomePage() {
  return (
    <main className="auth-page">
      <span className="brand"><span className="brand-mark"><Icon name="home" /></span>Haven</span>
      <Suspense fallback={<section className="card auth-card" aria-busy="true"><p className="muted">Getting things ready…</p></section>}>
        <Setup />
      </Suspense>
    </main>
  );
}

async function Setup() {
  const user = await requireUser();
  if (await getHousehold(user.id)) redirect('/week');
  return (
    <section className="card auth-card" aria-labelledby="welcomeTitle">
      <h1 id="welcomeTitle">Welcome to Haven</h1>
      <p className="muted">One question, then you’re in. Haven uses your time zone to know what “today” and “tonight” mean for your household.</p>
      <form className="auth-form" action={createHousehold}>
        <TimeZoneField />
        <button className="btn btn-primary btn-block" type="submit">Start my free 14 days</button>
      </form>
      <p className="hint">No card needed. You can change the time zone later in Settings.</p>
    </section>
  );
}
