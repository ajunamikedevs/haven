'use client';

import { useEffect, useRef } from 'react';
import { Icon } from './icon';

/**
 * A native <dialog>: a centered sheet on desktop, a bottom sheet with a grab handle on phones.
 * Esc and a tap on the backdrop close it, and the browser returns focus to whatever opened it.
 */
export function Sheet({ open, onClose, title, titleId, id, children, plain }: {
  open: boolean; onClose: () => void; title: string; titleId: string; id?: string; children: React.ReactNode;
  /** No grab handle or close button: used for confirmations. */
  plain?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); d.scrollTop = 0; }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} id={id} aria-labelledby={titleId} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      {open && (
        <>
          {!plain && <div className="grab" aria-hidden />}
          <div className="sheet-head">
            <h2 id={titleId}>{title}</h2>
            {!plain && <button className="icon-btn ghost" type="button" onClick={onClose} aria-label="Close"><Icon name="x" /></button>}
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}
