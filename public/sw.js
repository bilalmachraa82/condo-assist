const CACHE_NAME = 'luvimg-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação',
    icon: '/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png',
    badge: '/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png',
    tag: 'luvimg-notification',
    renotify: true,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Luvimg', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});