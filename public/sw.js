const CACHE_NAME = 'luvimg-v2';
const ASSETS_CACHE = 'luvimg-assets-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== ASSETS_CACHE) {
            return caches.delete(key);
          }
        })
      );
      self.clients.claim();
    })()
  );
});

// Stale-while-revalidate for Vite assets and runtime requests
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // App shell navigation fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put('/index.html', network.clone());
          return network;
        } catch (e) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match('/index.html');
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Cache-first for Vite-built assets under /assets/
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS_CACHE);
        const cached = await cache.match(req);
        const fetchAndCache = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fetchAndCache;
      })()
    );
    return;
  }

  // Default: try cache then network
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      return cached || fetch(req);
    })()
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação',
    icon: '/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png',
    badge: '/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png',
    tag: 'luvimg-notification',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Ver', icon: '/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png' }
    ]
  };

  event.waitUntil(self.registration.showNotification('Luvimg', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view') {
    event.waitUntil(clients.openWindow('/'));
  }
});