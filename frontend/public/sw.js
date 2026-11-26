/**
 * TradeJournal Service Worker (sw.js)
 *
 * Provides offline app shell caching and offline story media support.
 * Ensures that navigating to /stories or reloading while offline renders seamlessly.
 */

const APP_SHELL_CACHE = 'tradejournal-app-shell-v1';
const MEDIA_CACHE = 'tradejournal-story-media-v1';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache assets warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== APP_SHELL_CACHE && key !== MEDIA_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. Navigation requests (HTML SPA route changes like /stories, /dashboard, etc.)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => {
              cache.put(request, clone);
              cache.put('/index.html', response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: return cached index.html so React client-side router handles the route
          return caches.match('/index.html').then((cached) => {
            if (cached) return cached;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 2. Story media and images (/storage/... or image extensions)
  const isImageRequest =
    url.pathname.startsWith('/storage/') ||
    request.destination === 'image' ||
    /\.(png|jpe?g|gif|webp|svg|ico)(\?.*)?$/i.test(url.pathname);

  if (isImageRequest) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Return cached image if available, else fetch and cache
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(MEDIA_CACHE).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. API requests: network-first, pass-through (frontend handles offline IndexedDB fallback)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 4. Static assets (JS, CSS, Web Fonts)
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    /\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Return cached asset immediately, update in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cached;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cached);
      })
    );
    return;
  }
});
