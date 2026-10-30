// CLASSIUM Service Worker & Web Push Engine
const CACHE_NAME = 'classium-app-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle push notifications when app is in background or closed
self.addEventListener('push', (event) => {
  let data = {
    title: 'Classium Comunicação',
    body: 'Você recebeu um novo comunicado escolar.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'classium-notification',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'classium-comm',
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200],
    requireInteraction: data.tag === 'urgent'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click with deep linking
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE_TO', url: targetUrl });
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Never intercept non-GET, cross-origin requests, API endpoints, or Supabase calls
  const url = event.request.url;
  if (
    event.request.method !== 'GET' ||
    !url.startsWith(self.location.origin) ||
    url.includes('/api/') ||
    url.includes('supabase.co') ||
    url.includes('/rest/v1')
  ) {
    return;
  }

  // Handle SPA navigation requests: network first with offline fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
