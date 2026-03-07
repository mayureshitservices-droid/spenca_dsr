const CACHE_NAME = 'spenca-dsr-v8';

// Base assets to cache
const ASSETS_TO_CACHE = [
  '/login',
  '/css/style.css',
  '/css/input.css',
  '/js/charts.js',
  '/js/autocomplete.js',
  '/js/gps.js',
  '/img/icon-192.png',
  '/img/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  console.log('SW: Install event');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log('Asset cache error:', url, err)))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activate event');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Static Assets (CSS, JS, Fonts, Images)
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff2?|ttf|eot)$/) || url.hostname === 'fonts.googleapis.com' || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            try {
              if (!networkResponse.bodyUsed) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache)).catch(err => console.log('SW: Cache put failed', err));
              }
            } catch (e) {
              console.error('SW: Static clone error', e);
            }
          }
          return networkResponse;
        }).catch(() => { });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. HTML Pages & API Data Requests
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        try {
          if (!networkResponse.bodyUsed) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache).catch(err => console.log('SW: API cache error', err));
              })
              .catch(err => console.log('SW: API cache open error', err));
          }
        } catch (e) {
          console.error('SW: API clone error', e);
        }
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request, { ignoreSearch: true });
    })
  );
});
