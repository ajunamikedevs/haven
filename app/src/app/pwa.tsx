'use client';

import { useEffect } from 'react';

/** Registers the service worker in production builds. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* offline reading is a bonus, never a blocker */ });
  }, []);
  return null;
}

/** Forgets the pages kept for offline reading (on sign-out or account deletion). */
export function clearSavedPages() {
  try { navigator.serviceWorker?.controller?.postMessage('clear-pages'); } catch { /* no service worker */ }
}
