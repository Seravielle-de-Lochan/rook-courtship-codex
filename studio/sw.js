// Codex Studio service worker: precache the app shell, serve it cache-first,
// and let the page decide when to activate an update.
const VERSION = 'codex-studio-v11';
const SHELL = [
  './', './index.html', './css/studio.css', './manifest.webmanifest',
  './js/main.js', './js/engine.js', './js/db.js', './js/theme.js', './js/fx.js', './js/forge.js', './js/zip.js',
  './packs/rook-courtship.json', './packs/tideglass/theme.json', './packs/moth-lantern.json', './PACK_FORMAT.md',
  './fonts/atkinson-hyperlegible-latin-400-normal.woff2', './fonts/atkinson-hyperlegible-latin-700-normal.woff2', './fonts/atkinson-hyperlegible-latin-400-italic.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  // the built-in Tideglass look uses the classic edition's SpriteCook kit
  '../assets/tideglass/book_icon_button.png',
  '../assets/tideglass/chain_banner_decoration.png',
  '../assets/tideglass/cormorant-garamond.ttf',
  '../assets/tideglass/crescent_moon_ornament.png',
  '../assets/tideglass/frame_star_garland.png',
  '../assets/tideglass/rook_medallion.png',
  '../assets/tideglass/side_chain_drop_clean.png',
  '../assets/tideglass/side_chain_swag_clean.png',
  '../assets/tideglass/flower_ornament.png',
  '../assets/tideglass/gear_icon_button.png',
  '../assets/tideglass/large_frame_empty.png',
  '../assets/tideglass/list_icon_button.png',
  '../assets/tideglass/lock_icon_button.png',
  '../assets/tideglass/long_divider_1.png',
  '../assets/tideglass/pill_button_normal_1.png',
  '../assets/tideglass/pill_button_normal_2.png',
  '../assets/tideglass/pill_button_normal_3.png',
  '../assets/tideglass/pill_button_normal_4.png',
  '../assets/tideglass/round_medallion_1.png',
  '../assets/tideglass/small_star_icon.png',
  '../assets/tideglass/star_icon.png',
  '../assets/tideglass/star_icon_button.png',
  '../assets/tideglass/teardrop_pendant_1.png',
  '../assets/tideglass/teardrop_pendant_2.png',
  '../assets/tideglass/water-garden.png',
  '../assets/tideglass/wide_frame_empty.png',
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
