import Link from 'next/link';
import { Suspense } from 'react';
import { Icon } from '@/components/icon';
import { loadWeek, requireHousehold } from '@/lib/dal';
import { SignOutButton } from './sign-out-button';

// Shell for the signed-in app. The header is static; anything that reads the session
// (avatars, the pages themselves) streams in behind a Suspense boundary.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="app">
      <header className="app-top">
        <div className="wrap">
          <Link className="brand" href="/week" aria-label="Haven, this week">
            <span className="brand-mark"><Icon name="home" /></span>Haven
          </Link>
          <nav className="tabs" aria-label="Main">
            <Link className="tab" href="/week" aria-current="page"><Icon name="cal" />This Week</Link>
          </nav>
          <div className="top-right">
            <Suspense fallback={null}><Avatars /></Suspense>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="wrap view">{children}</main>
    </div>
  );
}

async function Avatars() {
  const { household } = await requireHousehold();
  const { members } = await loadWeek(household.id);
  return (
    <div className="avatars" aria-hidden>
      {members.slice(0, 5).map((m) => (
        <span key={m.id} className="avatar" style={{ '--c': m.color } as React.CSSProperties}>{(m.name.trim()[0] || '?').toUpperCase()}</span>
      ))}
    </div>
  );
}
