import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { OldSnapshot } from './old-snapshot';

export const metadata: Metadata = { title: 'Shared with you', robots: { index: false, follow: false } };

/** Read-only view of a snapshot link made by the old single-page Haven (everything is in the "#"). */
export default function OldLinkPage() {
  return (
    <div id="shared" className="shared">
      <header className="app-top">
        <div className="wrap">
          <Link className="brand" href="/" aria-label="What is Haven?"><span className="brand-mark"><Icon name="home" /></span>Haven</Link>
          <span className="p-pill">Shared with you</span>
        </div>
      </header>
      <main className="wrap view" id="sharedView">
        <OldSnapshot />
      </main>
    </div>
  );
}
