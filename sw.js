importScripts("./editor-assets.js", "./offering-art.js");
const CACHE_PREFIX = "rook-courtship-codex-";
const CACHE = `${CACHE_PREFIX}v12-offering-art`;
const ASSETS = [...new Set([
  "./assets/tideglass/cormorant-garamond.ttf", "./assets/tideglass/water-garden.png",
  "./", "./index.html", "./styles.css", "./tideglass.css", "./layout-editor.css", "./tideglass-extras.css", "./data-core.js",
  "./data-extra.js", "./offering-art.js", "./app.js", "./editor-assets.js", "./layout-editor.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
  ...globalThis.TIDEGLASS_EDITOR_ASSETS.map(asset => `./${asset.file}`),
  ...Object.values(globalThis.TIDEGLASS_OFFERING_ART).map(file => `./${file}`)
])];
self.addEventListener("install", event => {
  // Activate only when the complete app and its artwork are available offline.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      return await fetch(event.request);
    } catch (error) {
      // An HTML fallback is valid for a page, never a missing image or script.
      if (event.request.mode === "navigate") return cache.match("./index.html");
      throw error;
    }
  }));
});
