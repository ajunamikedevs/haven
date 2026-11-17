'use client';

import { createContext, use, useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { undo, type ActionResult } from '@/app/(app)/actions';

type ToastAction = { label: string; run: () => void };
type ToastState = { message: string; action?: ToastAction; id: number } | null;

const ToastContext = createContext<((message: string, action?: ToastAction) => void) | null>(null);

/** Polite status messages at the bottom of the screen: 3.5s, or 6s with an action; paused on hover or focus. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>(null);
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arm = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), ms);
  }, []);
  const toast = useCallback((message: string, action?: ToastAction) => {
    setState({ message, action, id: Date.now() });
    setShown(true);
    arm(action ? 6000 : 3500);
  }, [arm]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const pause = () => { if (timer.current) clearTimeout(timer.current); };
  const resume = () => { if (shown) arm(state?.action ? 6000 : 3500); };

  return (
    <ToastContext value={toast}>
      {children}
      <div className={shown ? 'toast show' : 'toast'} id="toast" role="status" aria-live="polite" onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume}>
        <span className="msg" id="toastMsg">{state?.message}</span>
        {state?.action && (
          <button type="button" id="toastAction" onClick={() => { const run = state.action!.run; setShown(false); run(); }}>
            {state.action.label}
          </button>
        )}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const toast = use(ToastContext);
  if (!toast) throw new Error('useToast must be used inside ToastProvider');
  return toast;
}

/**
 * Runs a server action and reports what happened: its message, an Undo button when the
 * action can be taken back, or the reason it was refused.
 */
export function useAct() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const act = useCallback((fn: () => Promise<ActionResult>, onDone?: (result: ActionResult) => void) => {
    start(async () => {
      let result: ActionResult;
      try {
        result = await fn();
      } catch (e) {
        // A change needs the server: say so plainly when the phone is offline
        if (typeof navigator !== 'undefined' && !navigator.onLine) { toast('You’re offline. This will work again when you’re connected.'); return; }
        throw e;
      }
      if (!result.ok) toast(result.message);
      else if (result.message) {
        const undoId = result.undoId;
        toast(result.message, undoId ? { label: 'Undo', run: () => start(async () => { toast((await undo(undoId)).message ?? 'Undone.'); }) } : undefined);
      }
      onDone?.(result);
    });
  }, [toast]);
  return { act, pending };
}

/** A tiny confirmation buzz on phones that support it. */
export function buzz() {
  try { navigator.vibrate?.(10); } catch { /* not supported */ }
}
