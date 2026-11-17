'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Keeps links from the old single-page Haven working. Those put everything after a "#":
 *   #week, #grocery, #household  → the matching screen
 *   #s=…                         → a snapshot someone was sent (shown read-only at /s/old)
 *   #w=…                         → a saved week handed over by the old site's redirect page,
 *                                  kept in this browser so it can be offered after sign-in
 * Nothing after a "#" is ever sent to the server.
 */
export function LegacyLinks() {
  const router = useRouter();
  useEffect(() => {
    const hash = location.hash;
    if (hash === '#week' || hash === '#grocery' || hash === '#household') {
      router.replace('/' + hash.slice(1));
    } else if (hash.startsWith('#s=')) {
      location.replace('/s/old' + hash);
    } else if (hash.startsWith('#w=')) {
      try {
        const bin = atob(hash.slice(3).replace(/-/g, '+').replace(/_/g, '/'));
        const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
        if (Array.isArray(JSON.parse(json).members) && !localStorage.getItem('haven.v1')) localStorage.setItem('haven.v1', json);
      } catch { /* not a saved week: ignore it */ }
      history.replaceState(null, '', location.pathname);
    }
  }, [router]);
  return null;
}
