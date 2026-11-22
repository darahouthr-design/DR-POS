const CACHE_NAME = 'drpos-shell-v4';
const FONT_CACHE_NAME = 'drpos-fonts-v1';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/assets/aistudio/Modern_DR-POS_Retail_Logo_d82ce2c2.png',
  '/assets/aistudio/khmervoice_Kore__1__359e4228.mp3',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => undefined))
      .catch(() => undefined)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== FONT_CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldBypass(url) {
  const path = url.pathname;
  // Never intercept API calls, Vite dev modules, or realtime Firebase/Firestore endpoints
  if (
    path.startsWith('/api/') ||
    path.startsWith('/@') ||
    path.startsWith('/src/') ||
    path.startsWith('/node_modules/') ||
    path.includes('hot-update')
  ) {
    return true;
  }
  const host = url.hostname;
  if (
    host.includes('firestore.googleapis.com') ||
    host.includes('firebaseio.com') ||
    host.includes('identitytoolkit.googleapis.com') ||
    host.includes('securetoken.googleapis.com') ||
    host.includes('googleapis.com') && !host.includes('fonts.googleapis.com')
  ) {
    return true;
  }
  return false;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  if (shouldBypass(url)) return;

  // Stale-While-Revalidate for Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) {
              cache.put(req, res.clone()).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  // Only cache same-origin app shell & static assets
  if (url.origin !== self.location.origin) return;

  // Cache-First for immutable Vite hashed bundles & static brand assets
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res && res.ok) {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      })
    );
    return;
  }

  // Network-First with instant cache fallback for HTML navigation (fresh deploys + fast weak-signal open)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const networkRes = await fetch(req);
          if (networkRes && networkRes.ok) {
            cache.put(req, networkRes.clone()).catch(() => {});
          }
          return networkRes;
        } catch {
          const cached = (await cache.match(req)) || (await cache.match('/'));
          if (cached) return cached;
          throw new Error('Offline');
        }
      })
    );
  }
});
