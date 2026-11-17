'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { guessAisle } from '@/lib/grocery';
import { addExtra } from './actions';

/** "Add to list" in the header: one field, no amounts or dates, stays open for several items. */
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = input.current?.value.trim();
    if (!name || busy) return;
    setBusy(true);
    const result = await addExtra(name);
    setBusy(false);
    if (!result.ok) { toast(result.message); return; }
    setAdded((a) => [...a, `${name} · ${guessAisle(name)}`]);
    if (input.current) { input.current.value = ''; input.current.focus(); }
  }

  return (
    <>
      <button className="btn btn-quiet btn-sm quick-btn" type="button" onClick={() => { setAdded([]); setOpen(true); }} aria-label="Add something to the grocery list">
        <Icon name="plus" /><span className="ql">Add to list</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add to the grocery list" titleId="captureTitle" id="captureDialog">
        <form className="sheet-body" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="captureName">What do you need?</label>
            <div className="inline-form">
              <input className="input" id="captureName" ref={input} name="name" required autoComplete="off" enterKeyHint="send" placeholder="Milk, dish soap…" autoFocus />
              <button className="btn btn-primary" type="submit" disabled={busy}>Add</button>
            </div>
            <p className="hint">No amounts or dates needed. Haven puts it in the right aisle.</p>
          </div>
          <ul className="just-added" id="justAdded" aria-live="polite" aria-label="Just added">
            {added.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
          <div className="sheet-foot">
            <button className="btn btn-quiet" type="button" onClick={() => setOpen(false)}>Done</button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
