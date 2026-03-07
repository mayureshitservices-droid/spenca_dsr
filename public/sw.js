const CACHE_NAME = 'spenca-dsr-v7';

// Base assets to cache
const ASSETS_TO_CACHE = [
  '/login',
  '/css/style.css',
  '/css/input.css',
  '/js/charts.js',
  '/js/autocomplete.js',
  '/js/gps.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Don't fail the whole install if one asset fails
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log('Asset cache error:', url, err)))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Static Assets (CSS, JS, Fonts, Images)
  // Strategy: Stale-While-Revalidate
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff2?|ttf|eot)$/) || url.hostname === 'fonts.googleapis.com' || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      // ignoreSearch: true is critical here so style.css?v=2 still matches the base cached style.css
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        }).catch(() => { });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. HTML Pages & API Data Requests
  // Strategy: Network-First, falling back to Cache
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      // If the network fails (offline), fall back to the cache
      return caches.match(event.request, { ignoreSearch: true });
    })
  );
});
