import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireHousehold } from '@/lib/dal';
import { listLinks, tokenFor } from '@/lib/share';
import { SignOutButton } from '../sign-out-button';
import { SettingsClient } from './settings-client';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="muted" aria-busy="true">Loading settings…</p>}>
      <SettingsData />
    </Suspense>
  );
}

async function SettingsData() {
  const { user, household } = await requireHousehold();
  const links = (await listLinks(household.id)).map((l) => ({
    id: l.id, kind: l.kind, path: '/s/' + tokenFor(l.id),
    lastOpened: l.lastOpenedAt ? l.lastOpenedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: household.timeZone }) : null,
  }));
  return (
    <div className="narrow">
      <div className="page-head"><div><h1>Settings</h1><p className="sub">Your time zone, shared links and account.</p></div></div>
      <SettingsClient timeZone={household.timeZone} links={links} />
      <section className="panel reset-panel" aria-labelledby="accountTitle">
        <h2 id="accountTitle" style={{ fontSize: 16 }}>Account</h2>
        <p className="muted" style={{ fontSize: 14 }}>Signed in as {user.email}</p>
        <div className="row">
          <Link className="btn btn-quiet btn-sm" href="/billing">Plan and billing</Link>
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
