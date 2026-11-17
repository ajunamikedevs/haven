import Link from 'next/link';
import { Suspense } from 'react';
import { Icon } from '@/components/icon';
import { ToastProvider } from '@/components/toast';
import { loadWeek, requireHousehold } from '@/lib/dal';
import { listItems, remaining } from '@/lib/grocery';
import { QuickCapture } from './quick-capture';
import { Tabs } from './tabs';

// Shell for the signed-in app. The header frame is static; anything that reads the session
// (grocery count, avatars, the read-only banner, the pages themselves) streams in behind Suspense.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div id="app">
        <header className="app-top">
          <div className="wrap">
            <Link className="brand" href="/week" aria-label="Haven, this week">
              <span className="brand-mark"><Icon name="home" /></span>Haven
            </Link>
            <Suspense fallback={<Tabs />}><TabsWithCount /></Suspense>
            <div className="top-right">
              <QuickCapture />
              <Suspense fallback={null}><Avatars /></Suspense>
            </div>
          </div>
        </header>
        <Suspense fallback={null}><ReadOnlyBanner /></Suspense>
        <main className="wrap view" id="view">{children}</main>
      </div>
    </ToastProvider>
  );
}

async function TabsWithCount() {
  const { household } = await requireHousehold();
  return <Tabs groceryLeft={remaining(listItems(await loadWeek(household.id)))} />;
}

async function Avatars() {
  const { household } = await requireHousehold();
  const { members } = await loadWeek(household.id);
  return (
    <div className="avatars" id="topAvatars" aria-hidden>
      {members.slice(0, 5).map((m) => (
        <span key={m.id} className="avatar" style={{ '--c': m.color } as React.CSSProperties}>{(m.name.trim()[0] || '?').toUpperCase()}</span>
      ))}
    </div>
  );
}

/** Shown when the trial or subscription has ended: everything stays visible, nothing can be changed. */
async function ReadOnlyBanner() {
  const { access } = await requireHousehold();
  if (access.level === 'full') return null;
  return (
    <div className="readonly-banner" role="status">
      <div className="wrap">
        <p>
          <strong>{access.reason === 'trial_ended' ? 'Your free trial has ended.' : 'Your subscription has ended.'}</strong>{' '}
          Everything you planned is still here to read. Subscribe to keep planning.
        </p>
        <Link className="btn btn-primary btn-sm" href="/billing">See plans</Link>
      </div>
    </div>
  );
}
