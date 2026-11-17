const CACHE = 'kitab-reader-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './lib/pdf.min.js',
  './lib/pdf.worker.min.js',
  './lib/pdf-lib.min.js',
  './lib/jszip.min.js',
  './lib/epub.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.add('./').catch(() => {});
      await cache.add('./index.html').catch(() => {});
      await cache.add('./manifest.json').catch(() => {});
      await cache.add('./icon-192.png').catch(() => {});
      await cache.add('./icon-512.png').catch(() => {});
      // CDN libraries: cache best-effort (opaque responses allowed)
      for (const url of SHELL.slice(5)) {
        try { await cache.add(new Request(url, { mode: 'no-cors' })); } catch (err) {}
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
