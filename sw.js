/* Service Worker for text2speech v2.2-PWA */
const CACHE = 't2s-v2-2-pwa-1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  // icons are optional but listed if present:
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Runtime cache: allow CDN libs & worker
const RUNTIME_ALLOWLIST = [
  'https://cdn.jsdelivr.net/',
  'https://unpkg.com/',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.3.0/',
  'https://unpkg.com/pdfjs-dist@2.16.105/',
  'https://cdn.jsdelivr.net/npm/mammoth@1.4.21/'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)));
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

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // App shell: cache-first
  if (url.origin === location.origin) {
    if (APP_SHELL.some(p => url.pathname.endsWith(p.replace('./','/')))) {
      e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
      );
      return;
    }
  }

  // Runtime: CDN libs — stale-while-revalidate
  if (RUNTIME_ALLOWLIST.some(prefix => e.request.url.startsWith(prefix))) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request)
        .then(resp => { cache.put(e.request, resp.clone()); return resp; })
        .catch(() => cached); // fallback to cache if offline
      return cached || networkFetch;
    })());
    return;
  }

  // Default: network-first with cache fallback
  e.respondWith((async () => {
    try {
      const resp = await fetch(e.request);
      const cache = await caches.open(CACHE);
      cache.put(e.request, resp.clone());
      return resp;
    } catch {
      const cached = await caches.match(e.request);
      return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
