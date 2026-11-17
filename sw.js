const CACHE = 'kitab-reader-v19';

const SHELL = [
  './',
  './index.html',
  './install.html',
  './drive-auth.html',
  './drive-pick.html',
  './privacy.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './lib/pdf.min.js',
  './lib/pdf.worker.min.js',
  './lib/pdf-lib.min.js',
  './lib/jszip.min.js',
  './lib/epub.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.add('./').catch(() => {});
      await cache.add('./index.html').catch(() => {});
      await cache.add('./install.html').catch(() => {});
      await cache.add('./manifest.json').catch(() => {});
      await cache.add('./icon-192.png').catch(() => {});
      await cache.add('./icon-512.png').catch(() => {});
      for (const url of SHELL.slice(5)) {
        try { await cache.add(new Request(url, { mode: 'no-cors' })); } catch (err) {}
      }
      // Safety: only take over if the new copy is actually complete.
      // If index.html did not make it into the cache (weak network),
      // this install FAILS and the old working version stays in charge.
      const ok = await cache.match('./index.html');
      if (!ok) throw new Error('shell incomplete — keeping old version');
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      const ok = await cache.match('./index.html');
      if (ok) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      }
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  /* phone.local is the Android app's private file bridge — the native shell
     serves those bytes itself. Never cache them, never fall back for them. */
  try { if (new URL(e.request.url).host === 'phone.local') return; } catch (err) {}
  /* Cross-origin traffic (Google Drive API) is never cached and never falls
     back to the app shell: a cached Drive file list would hide new books
     forever, and book downloads would be stored twice. Straight through. */
  try { if (new URL(e.request.url).origin !== self.location.origin) return; } catch (err) {}
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(async () => {
        // Last resort for page loads: any cached copy of the app shell,
        // from ANY cache generation, is better than a white screen.
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      });
    })
  );
});
