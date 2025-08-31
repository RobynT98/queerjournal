// sw.js – Queer Journal (robust GH Pages + lokal)
/* v31 */
const CACHE_PREFIX = 'qj-cache-';
const VERSION = 'v38-2025-08-31';
const CACHE = `${CACHE_PREFIX}${VERSION}`;

// Räkna ut BASE-path dynamiskt (t.ex. "/queerjournal/" på GH Pages eller "/" lokalt)
const BASE = new URL(self.registration.scope).pathname; // ex: "/queerjournal/"

// Lista på filer vi vill ha offline direkt
const ASSETS = [
  BASE,                         // mappens rot
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',
  BASE + 'styles.css',
  BASE + 'app.js',
  BASE + 'favicon-16x16.png',
  BASE + 'favicon-32x32.png',
  BASE + 'android-chrome-192x192.png',
  BASE + 'android-chrome-512x512.png'
];

// ---- Install: precache ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (c) => {
      try {
        await c.addAll(ASSETS);
      } catch (e) {
        // Fortsätt ändå om en fil skulle fallera (t.ex. under dev)
        console.warn('[SW] Precache miss:', e);
      }
    })
  );
  self.skipWaiting();
});

// ---- Activate: rensa gamla versioner ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---- Möjlighet att hoppa över waiting från klient ----
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ---- Fetch-strategier ----
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Bara GET bör cachas/hanteras
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Endast samma origin (GH Pages + lokalt)
  if (url.origin !== location.origin) return;

  // Navigeringar (sidor) -> network-first med fallback
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Explicit HTML
  if (req.destination === 'document' || url.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Övriga resurser (CSS/JS/bilder) -> stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

// ---- Strategier ----
async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    const cache = await caches.open(CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // Offline-fallback till startsidan om inget hittas
    return caches.match(BASE + 'index.html');
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((resp) => {
      // Spara endast lyckade svar (status 200, typ 'basic')
      if (resp && resp.status === 200 && resp.type === 'basic') {
        cache.put(req, resp.clone());
      }
      return resp;
    })
    .catch(() => cached); // vid offline, ge cached

  return cached || fetchPromise;
}
