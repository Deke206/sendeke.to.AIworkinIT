const CACHE = 'sendeketo-sovereign-v31';
const APP_SHELL = [
  './',
  './index.html',
  './menu.html',
  './tacos.html',
  './sandwiches.html',
  './doughroom.html',
  './simpang.html',
  './mizlala.html',
  './checkout.html',
  './receipt.html',
  './request.html',
  './track.html',
  './driver.html',
  './driver-settings.html',
  './restaurant.html',
  './admin.html',
  './assets/css/bootstrap.min.css',
  './assets/css/site.css',
  './assets/css/admin.css',
  './assets/css/courier-ebike.css',
  './assets/js/bootstrap.bundle.min.js',
  './assets/js/dispatch-engine.js',
  './assets/js/courier-ebike.js',
  './assets/js/webmcp.js',
  './assets/js/stripe-config.js',
  './assets/js/privacy-and-handshake.js',
  './assets/data/agent-feed.json',
  './assets/brand/sendeketo-logo-vector.svg',
  './assets/brand/sendeketo-icon.svg',
  './favicon.svg',
  './favicon.ico',
  './apple-touch-icon.png',
  './manifest.webmanifest'
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
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, clone));
      return response;
    }))
  );
});
