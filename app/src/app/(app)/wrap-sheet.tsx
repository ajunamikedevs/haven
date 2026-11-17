'use client';

import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/sheet';
import { useAct } from '@/components/toast';
import { WhoChip } from '@/components/who-chip';
import { DAY_NAMES } from '@/lib/meals';
import type { Member } from '@/lib/types';
import type { WrapStats } from '@/lib/wrap-up';
import { startNextWeek } from './actions';

/** The week in three numbers, what carries over, and one button to start the next one. */
export function WrapSheet({ open, onClose, stats, rolled, members }: { open: boolean; onClose: () => void; stats: WrapStats; rolled: boolean; members: Member[] }) {
  const { act, pending } = useAct();
  const router = useRouter();
  return (
    <Sheet open={open} onClose={onClose} title={rolled ? 'Last week, wrapped up' : 'Wrap up the week'} titleId="weekTitle" id="weekDialog">
      <div className="sheet-body">
        <div className="stats">
          <Stat n={stats.dinnersEaten} of={stats.dinnersPlanned} label="dinners eaten" />
          <Stat n={stats.groceriesBought} of={stats.groceriesTotal} label="groceries bought" />
          <Stat n={stats.plansDone} of={stats.plansTotal} label="plans done" />
        </div>
        <section className="sheet-section">
          <h3>Next week keeps</h3>
          {stats.keeps.length ? (
            <ul className="keeps">
              {stats.keeps.map((e) => (
                <li key={e.id}>
                  <span className="d">{DAY_NAMES[e.day].slice(0, 3)}</span>
                  <span className="t">{e.title}</span>
                  <WhoChip member={members.find((m) => m.id === e.who)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ fontSize: 14 }}>No repeating plans yet. Tick “Repeats every week” on an event to carry it forward.</p>
          )}
        </section>
        <p className="muted" style={{ fontSize: 14 }}>Dinners, ticks and one-off plans are cleared. Anything you added to the grocery list and haven’t bought stays on it.</p>
        <div className="sheet-foot">
          <button className="btn btn-quiet" type="button" onClick={onClose}>Not yet</button>
          <button className="btn btn-primary" type="button" disabled={pending} onClick={() => act(() => startNextWeek(), (r) => { if (r.ok) { onClose(); router.push('/week'); } })}>
            Start next week
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Stat({ n, of, label }: { n: number; of: number; label: string }) {
  return (
    <div className="stat">
      <strong>{n}<span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}> / {of}</span></strong>
      <span>{label}</span>
    </div>
  );
}
