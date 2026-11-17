// Haven's service worker: lets the week and grocery list be read offline.
//  - Built assets (/_next/static, icons): cache-first; they're content-hashed.
//  - Pages: network-first. The last good copy of /week, /grocery and /household is kept for
//    offline reading; anything else falls back to /offline.
//  - Never touches API routes, server actions (POST) or other sites. Writes need a connection.
const VERSION = 'haven-v1';
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const READABLE = ['/week', '/grocery', '/household'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add('/offline')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (!key.startsWith(VERSION)) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Signing out clears saved pages so the next person on this phone can't read them
self.addEventListener('message', (event) => {
  if (event.data === 'clear-pages') event.waitUntil(caches.delete(PAGES));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && READABLE.includes(url.pathname)) { const copy = res.clone(); (await caches.open(PAGES)).put(url.pathname, copy); }
        return res;
      } catch {
        const cache = await caches.open(PAGES);
        return (await cache.match(url.pathname)) || (await cache.match('/offline')) || Response.error();
      }
    })());
  }
});
