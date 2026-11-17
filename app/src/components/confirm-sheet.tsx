'use client';

import { Sheet } from './sheet';

export type Confirm = { title: string; body: string; label: string; run: () => void };

/** In-page confirmation for bulk resets. Single destructive actions use Undo instead. */
export function ConfirmSheet({ confirm, onClose }: { confirm: Confirm | null; onClose: () => void }) {
  return (
    <Sheet open={confirm !== null} onClose={onClose} title={confirm?.title ?? ''} titleId="confirmTitle" id="confirmDialog" plain>
      {confirm && (
        <div className="sheet-body">
          <p className="muted">{confirm.body}</p>
          <div className="sheet-foot">
            <button className="btn btn-quiet" type="button" onClick={onClose}>Keep it</button>
            <button className="btn btn-primary" type="button" onClick={() => { onClose(); confirm.run(); }}>{confirm.label}</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/** Copies text, falling back to the older selection method; returns whether it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
