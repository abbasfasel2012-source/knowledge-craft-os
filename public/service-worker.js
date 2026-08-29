const CACHE_NAME = "mirqaa-v2-91d5fae";
const STATIC_ASSETS = ["/manifest.webmanifest", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.log("Cache addAll error - some resources may not be available offline");
      });
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { method, url } = request;

  // Skip POST/PUT/DELETE requests
  if (method !== "GET") {
    return;
  }

  // Skip external URLs
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  // Network-first for navigation (HTML page) requests and API/Supabase calls,
  // so a new deploy is always picked up instead of serving a stale cached shell.
  if (request.mode === "navigate" || url.includes("/api/") || url.includes("supabase")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches
            .match(request)
            .then((response) => response || new Response("Offline", { status: 503 }));
        }),
    );
    return;
  }

  // Cache-first strategy for hashed static assets (safe: each build produces new filenames)
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
      );
    }),
  );
});
