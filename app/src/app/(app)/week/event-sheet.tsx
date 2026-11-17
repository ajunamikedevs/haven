'use client';

import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { useAct } from '@/components/toast';
import { DAY_NAMES } from '@/lib/meals';
import type { EventItem, Week } from '@/lib/types';
import { fmtDay } from '@/lib/week';
import { deleteEvent, saveEvent } from '../actions';

export type EventTarget = { mode: 'add'; day: number } | { mode: 'edit'; event: EventItem };

/** Add or edit something on the calendar. */
export function EventSheet({ target, week, weekOf, onClose }: { target: EventTarget | null; week: Week; weekOf: string; onClose: () => void }) {
  const ev = target?.mode === 'edit' ? target.event : null;
  return (
    <Sheet open={target !== null} onClose={onClose} title={ev ? 'Edit event' : 'Add an event'} titleId="eventTitle" id="eventDialog">
      {target && <EventForm key={ev?.id ?? 'new-' + (target.mode === 'add' ? target.day : '')} target={target} week={week} weekOf={weekOf} onClose={onClose} />}
    </Sheet>
  );
}

function EventForm({ target, week, weekOf, onClose }: { target: EventTarget; week: Week; weekOf: string; onClose: () => void }) {
  const ev = target.mode === 'edit' ? target.event : null;
  const day = ev ? ev.day : target.mode === 'add' ? target.day : 0;
  const { act, pending } = useAct();
  const close = (ok: boolean) => { if (ok) onClose(); };

  return (
    <form className="sheet-body" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const who = String(data.get('who') || '');
      act(() => saveEvent({
        id: ev?.id, title: String(data.get('title') || ''), day: Number(data.get('day')), time: String(data.get('time') || ''),
        who: who === 'all' ? null : who, note: String(data.get('note') || ''), repeat: data.get('repeat') === 'on',
      }), (r) => close(r.ok));
    }}>
      <div className="field">
        <label htmlFor="evTitle">What’s happening?</label>
        <input className="input" id="evTitle" name="title" required placeholder="Soccer practice" defaultValue={ev?.title ?? ''} autoComplete="off" autoFocus={!ev} />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="evDay">Day</label>
          <select className="input" id="evDay" name="day" defaultValue={day}>
            {DAY_NAMES.map((n, i) => <option key={n} value={i}>{fmtDay(weekOf, i)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="evTime">Time <span className="muted">(optional)</span></label>
          <input className="input" id="evTime" name="time" type="time" defaultValue={ev?.time ?? ''} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="evWho">Who is it for?</label>
        <select className="input" id="evWho" name="who" defaultValue={ev?.who ?? 'all'}>
          <option value="all">Everyone</option>
          {week.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="evNote">Where or notes <span className="muted">(optional)</span></label>
        <input className="input" id="evNote" name="note" placeholder="Riverside Park" defaultValue={ev?.note ?? ''} autoComplete="off" />
      </div>
      <label className="toggle-row">
        <span className="check"><input type="checkbox" name="repeat" defaultChecked={ev?.repeat ?? false} /><span className="box"><Icon name="check" /></span></span>
        <span><strong>Repeats every week</strong><span className="hint">Carried into next week when you wrap up.</span></span>
      </label>
      <div className="sheet-foot">
        {ev && (
          <button className="btn btn-danger left" type="button" disabled={pending} onClick={() => act(() => deleteEvent(ev.id), (r) => close(r.ok))}>
            <Icon name="trash" size="sm" />Delete
          </button>
        )}
        <button className="btn btn-quiet" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" type="submit" disabled={pending}>{ev ? 'Save changes' : 'Add event'}</button>
      </div>
    </form>
  );
}
