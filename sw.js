// sw.js
const CACHE = 'qj-cache-v3-2025-08-29';
const ASSETS = [
  './',
  './index.html',
  './site.webmanifest',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png',
];

// Network-first för index.html så nya ändringar slår igenom
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // nätverks-först för startsidan
  if (new URL(req.url).pathname.endsWith('/') || new URL(req.url).pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // cache-först för övrigt
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return resp;
    }))
  );
});

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
