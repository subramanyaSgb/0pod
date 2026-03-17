const CACHE_VERSION = 'v1.2.0';
const STATIC_CACHE = `0pod-static-${CACHE_VERSION}`;
const API_CACHE = `0pod-api-${CACHE_VERSION}`;
const ARTWORK_CACHE = `0pod-artwork-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

const STATIC_EXTENSIONS = /\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|ico)$/;
const API_PATTERN = /\/api\//;
const ARTWORK_PATTERN = /\.(jpg|jpeg|png|webp)$/i;

// --- Install: precache core assets ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// --- Activate: clean up old caches ---
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, API_CACHE, ARTWORK_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !currentCaches.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// --- Fetch: strategy-based caching ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // API calls: network-first
  if (API_PATTERN.test(url.pathname)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // External artwork/images: stale-while-revalidate
  if (url.origin !== self.location.origin && ARTWORK_PATTERN.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, ARTWORK_CACHE));
    return;
  }

  // Navigation requests (HTML pages): network-first so new builds get fresh asset references
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // Static assets (same origin): cache-first
  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Default: network with cache fallback
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// --- Caching strategies ---

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

function offlineFallback() {
  return caches.match('/index.html').then(
    (cached) => cached || new Response('Offline', { status: 503, statusText: 'Offline' })
  );
}
