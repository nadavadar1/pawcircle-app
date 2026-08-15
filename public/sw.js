const CACHE_NAME = "pawcircle-static-v1";
const STATIC_ASSETS = ["/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Only ever serves the small static icon set from cache — every page and API
// request always goes to the network. This app is a live marketplace with
// per-user auth state; caching dynamic pages risks showing one user another
// user's stale data, so the cache is deliberately scoped to assets only.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!STATIC_ASSETS.includes(url.pathname)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
