const CACHE = 'sendeketo-shell-v31';
const APP_SHELL = [
  './',
  './index.html',
  './menu.html',
  './restaurant.html',
  './driver.html',
  './driver-settings.html',
  './admin.html',
  './assets/css/bootstrap.css',
  './assets/css/styles.css',
  './assets/css/theme-2026.css',
  './assets/js/app.js',
  './assets/js/driver.js',
  './assets/js/driver-settings.js',
  './assets/js/admin.js',
  './assets/js/driver-map.js',
  './assets/js/webmcp.js',
  './assets/js/firebase-config.js',
  './assets/js/stripe-config.js',
  './assets/js/maps-config.js',
  './assets/data/sweetfin_menu_clean.json',
  './assets/img/icon.svg',
  './assets/img/favicon.ico',
  './assets/img/apple-touch-icon.png',
  './assets/manifest.webmanifest'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Network first for HTML documents and scripts to guarantee latest code updates
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || event.request.destination === 'script') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Cache first with network fallback for static assets
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, clone));
      return response;
    }))
  );
});
