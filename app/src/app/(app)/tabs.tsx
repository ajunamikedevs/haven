'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/icon';
import { plural } from '@/lib/week';

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/week', label: 'This Week', icon: 'cal' },
  { href: '/grocery', label: 'Grocery', icon: 'list' },
  { href: '/household', label: 'Household', icon: 'people' },
];

/** Main navigation: a row in the header on desktop, a bottom bar on phones. */
export function Tabs({ groceryLeft = 0 }: { groceryLeft?: number }) {
  const pathname = usePathname();
  return (
    <nav className="tabs" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} className="tab" href={t.href} aria-current={pathname.startsWith(t.href) ? 'page' : undefined}>
          <Icon name={t.icon} />{t.label}
          {t.href === '/grocery' && groceryLeft > 0 && <span className="count" id="groceryCount" aria-label={plural(groceryLeft, 'item') + ' left'}>{groceryLeft}</span>}
        </Link>
      ))}
    </nav>
  );
}
