// sw.js – Queer Journal (GitHub Pages)
/* v6 */
const VERSION = 'v10-2025-08-30';
const BASE = '/queerjournal/';

const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',  // om din fil heter site.webmanifest, byt raden nedan
  BASE + 'site.webmanifest',
  BASE + 'favicon-16x16.png',
  BASE + 'favicon-32x32.png',
  BASE + 'android-chrome-192x192.png',
  BASE + 'android-chrome-512x512.png'
];

const CACHE = `qj-cache-${VERSION}`;

// Pre-cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Rensa gamla cache-ar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Tillåt “skip waiting” från klienten (frivilligt)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Fetch-strategier
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hantera bara samma-origin
  if (url.origin !== location.origin) return;

  // 1) Navigeringar (sidor): network-first med fallback till cache/offline
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  // 2) HTML explicit (t.ex. /index.html): network-first
  if (req.destination === 'document' || url.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 3) Övrigt (CSS/JS/bilder): stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

// --- Strategier ---
async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    const cache = await caches.open(CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // offline-fallback till startsidan om inget hittas
    return caches.match(BASE + 'index.html');
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((resp) => {
    cache.put(req, resp.clone());
    return resp;
  }).catch(() => cached);
  return cached || fetchPromise;
  }
