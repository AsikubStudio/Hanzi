// Service worker: app shell w cache, działa offline. Podbij VERSION po każdej zmianie plików.
const VERSION = 'bothanzi-v8';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/styles.css',
  'js/app.js', 'js/data.js', 'js/store.js', 'js/srs.js', 'js/search.js', 'js/ui.js', 'js/quiz.js', 'js/strokes.js', 'js/sentences.js',
  'icons/logo.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then(async (c) => {
        await c.addAll(SHELL);
        // Dane kresek (lista z tools/build-strokes.mjs) — żeby animacje działały offline.
        try {
          const res = await fetch('strokes/index.json');
          const list = await res.clone().json();
          await c.put('strokes/index.json', res);
          await c.addAll(list.map((h) => `strokes/${h}.json`));
        } catch { /* brak danych kresek nie blokuje instalacji */ }
      })
      .then(() => self.skipWaiting())
  );
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
