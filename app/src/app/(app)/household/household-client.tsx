'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ConfirmSheet, type Confirm } from '@/components/confirm-sheet';
import { Icon } from '@/components/icon';
import { useAct } from '@/components/toast';
import { initialOf } from '@/components/who-chip';
import type { Member, Week } from '@/lib/types';
import { plural } from '@/lib/week';
import type { WrapStats } from '@/lib/wrap-up';
import { addMember, clearThisWeek, removeMember, renameMember, restoreExample, setMemberRole } from '../actions';
import { WrapSheet } from '../wrap-sheet';

/** Everyone who shares the week: rename in place, add, remove, and start fresh. */
export function HouseholdClient({ week, stats, rolled }: { week: Week; stats: WrapStats; rolled: boolean }) {
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [wrapOpen, setWrapOpen] = useState(false);
  const { act, pending } = useAct();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const toWeek = (ok: boolean) => { if (ok) router.push('/week'); };

  return (
    <div className="narrow">
      <div className="page-head">
        <div><h1>Your household</h1><p className="sub">Everyone who shares this week. Tap a name to change it.</p></div>
      </div>

      <section className="card h-section" aria-labelledby="peopleTitle">
        <h2 id="peopleTitle">People</h2>
        {week.members.length ? (
          <ul className="members">
            {week.members.map((m) => (
              <MemberRow key={m.id} member={m} events={week.events.filter((e) => e.who === m.id).length} />
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ paddingBlock: 12 }}>No one here yet. Add the people you live with below.</p>
        )}
      </section>

      <form className="card h-section add-person" ref={form} onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        act(() => addMember(String(data.get('name') || ''), String(data.get('role') || '')), (r) => {
          if (r.ok) { form.current?.reset(); form.current?.querySelector<HTMLInputElement>('#newName')?.focus(); }
        });
      }}>
        <h2>Add someone</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="newName">Name</label><input className="input" id="newName" name="name" placeholder="Grandma Rose" autoComplete="off" required /></div>
          <div className="field"><label htmlFor="newRole">Role or age <span className="muted">(optional)</span></label><input className="input" id="newRole" name="role" placeholder="Age 6, Nanny…" autoComplete="off" /></div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}><Icon name="plus" />Add to household</button>
      </form>

      <section className="panel reset-panel" aria-labelledby="resetTitle">
        <h2 id="resetTitle" style={{ fontSize: 16 }}>Start fresh</h2>
        <p className="muted" style={{ fontSize: 14 }}>Wrap up the week to carry repeating plans forward, clear everything but keep everyone above, or bring back the example family.</p>
        <div className="row">
          <button className="btn btn-quiet btn-sm" type="button" onClick={() => setWrapOpen(true)}><Icon name="repeat" size="sm" />Wrap up the week</button>
          <button className="btn btn-quiet btn-sm" type="button" onClick={() => setConfirm({
            title: 'Clear this week?', body: 'All events, dinners and grocery items go away. Your household stays.', label: 'Clear the week',
            run: () => act(() => clearThisWeek(), (r) => toWeek(r.ok)),
          })}>Clear this week</button>
          <button className="btn btn-text btn-sm" type="button" onClick={() => setConfirm({
            title: 'Restore the example week?', body: 'This replaces your household, events and dinners with the example family.', label: 'Restore example',
            run: () => act(() => restoreExample(), (r) => toWeek(r.ok)),
          })}>Restore the example</button>
        </div>
      </section>

      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} />
      <WrapSheet open={wrapOpen} onClose={() => setWrapOpen(false)} stats={stats} rolled={rolled} members={week.members} />
    </div>
  );
}

function MemberRow({ member: m, events }: { member: Member; events: number }) {
  const [initial, setInitial] = useState(initialOf(m.name));
  const { act, pending } = useAct();
  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };

  return (
    <li className="member">
      <span className="avatar" style={{ '--c': m.color } as React.CSSProperties} aria-hidden>{initial}</span>
      <div className="field m-name">
        <label htmlFor={'mn-' + m.id}>Name</label>
        <input className="input" id={'mn-' + m.id} defaultValue={m.name} autoComplete="off" enterKeyHint="done" onKeyDown={blurOnEnter}
          onChange={(e) => { if (e.target.value.trim()) setInitial(initialOf(e.target.value)); }}
          onBlur={(e) => {
            const input = e.currentTarget, value = input.value.trim();
            if (value === m.name) { input.value = m.name; return; }
            // An empty name is refused by the server too; put the old one back straight away
            act(() => renameMember(m.id, value), (r) => { if (!r.ok) { input.value = m.name; setInitial(initialOf(m.name)); } });
          }} />
      </div>
      <div className="field m-role">
        <label htmlFor={'mr-' + m.id}>Role or age <span className="muted">(optional)</span></label>
        <input className="input" id={'mr-' + m.id} defaultValue={m.role} placeholder="Parent, Age 8…" autoComplete="off" enterKeyHint="done" onKeyDown={blurOnEnter}
          onBlur={(e) => { const value = e.currentTarget.value.trim(); if (value !== m.role) act(() => setMemberRole(m.id, value)); }} />
      </div>
      <button className="btn btn-danger btn-sm m-remove" type="button" disabled={pending} onClick={() => act(() => removeMember(m.id))} aria-label={'Remove ' + m.name}>
        <Icon name="trash" />Remove
      </button>
      <p className="m-meta">{events ? plural(events, 'event') + ' this week' : 'No events this week'}</p>
    </li>
  );
}
