const CACHE_NAME = "app-shell-v17";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      self.clients.claim();
    })()
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function hasAuthHeaders(request) {
  const auth = request.headers.get("Authorization");
  const tenant = request.headers.get("X-Tenant-ID");
  return Boolean(auth) || Boolean(tenant);
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (req.method !== "GET") return;

  if (isApiRequest(url)) {
    event.respondWith(fetch(req));
    return;
  }

  if (hasAuthHeaders(req)) {
    event.respondWith(fetch(req));
    return;
  }

  const isNav = req.mode === "navigate";

  if (isNav) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          return res;
        } catch (e) {
          const cache = await caches.open(CACHE_NAME);
          const offline = await cache.match(OFFLINE_URL);
          return offline || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain" } });
        }
      })()
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;

        const res = await fetch(req);
        if (res && res.status === 200 && res.type === "basic") {
          cache.put(req, res.clone());
        }
        return res;
      })()
    );
  }
});
