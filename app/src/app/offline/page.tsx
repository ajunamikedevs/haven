import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icon';

export const metadata: Metadata = { title: 'Offline', robots: { index: false } };

/** Shown by the service worker when there's no connection and no saved copy of the page. */
export default function OfflinePage() {
  return (
    <main className="wrap view">
      <div className="narrow">
        <div className="card empty">
          <span className="pot"><Icon name="phone" size="lg" /></span>
          <h1 style={{ fontSize: 22 }}>You’re offline</h1>
          <p className="muted">Pages you’ve opened recently, like this week and the grocery list, can still be read. Changes need a connection.</p>
          <Link className="btn btn-primary" href="/week">Open this week</Link>
        </div>
      </div>
    </main>
  );
}
