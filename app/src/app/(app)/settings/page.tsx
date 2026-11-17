import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireHousehold } from '@/lib/dal';
import { listLinks, tokenFor } from '@/lib/share';
import { SignOutButton } from '../sign-out-button';
import { getSubscriptionRow } from '@/lib/billing';
import { isLive } from '@/lib/billing/rules';
import { DeleteAccount } from './delete-account';
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
  const sub = await getSubscriptionRow(household.id);
  const paying = !!sub && isLive(sub.status) && !sub.cancelAtPeriodEnd;
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
      <section className="panel reset-panel" aria-labelledby="dataTitle">
        <h2 id="dataTitle" style={{ fontSize: 16 }}>Your data</h2>
        <p className="muted" style={{ fontSize: 14 }}>Download everything in your household as a file, or delete your account and all of it.</p>
        <div className="row">
          <a className="btn btn-quiet btn-sm" href="/api/export" download>Export my data</a>
          <DeleteAccount email={user.email} paying={paying} />
        </div>
      </section>
    </div>
  );
}
