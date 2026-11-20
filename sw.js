// Service worker: app shell w cache, działa offline. Podbij VERSION po każdej zmianie plików.
const VERSION = 'bothanzi-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/styles.css',
  'js/app.js', 'js/data.js', 'js/store.js', 'js/srs.js', 'js/search.js', 'js/ui.js',
  'icons/logo.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
