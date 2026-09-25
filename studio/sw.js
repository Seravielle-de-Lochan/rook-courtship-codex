// Codex Studio service worker: precache the app shell, serve it cache-first,
// and let the page decide when to activate an update.
const VERSION = 'codex-studio-v1';
const SHELL = [
  './', './index.html', './css/studio.css', './manifest.webmanifest',
  './js/main.js', './js/engine.js', './js/db.js', './js/theme.js', './js/fx.js', './js/forge.js', './js/zip.js',
  './packs/rook-courtship.json', './packs/moth-lantern.json', './PACK_FORMAT.md',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('codex-studio-') && k !== VERSION).map((k) => caches.delete(k)))),
  ]));
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Anthropic API / CDN go straight to the network
  if (req.mode === 'navigate') {
    // Network first for the page itself so updates are noticed, cache when offline.
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return r;
  })));
});
