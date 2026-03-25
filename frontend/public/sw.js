const CACHE_NAME = 'pharmaflow-v3';
const urlsToCache = [
    '/login',
    '/manifest.json',
];

const BACKGROUND_CACHE = [
    '/logo.png',
    '/icon-192x192.png',
    '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // First cache the critical path (only public pages)
            return cache.addAll(urlsToCache).then(() => {
                // Background cache (icons)
                cache.addAll(BACKGROUND_CACHE).catch(err => console.log('Background cache failed', err));
                return self.skipWaiting();
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames.map((cacheName) => {
                if (!cacheWhitelist.includes(cacheName)) {
                    return caches.delete(cacheName);
                }
                return Promise.resolve();
            })
        ))
    );
    self.clients.claim();
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'PharmaFlow Pro', {
            body: data.body || 'You have a new notification.',
            icon: '/logo.png',
            badge: '/logo.png',
            data: {
                url: data.url || '/',
            },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }

            return Promise.resolve();
        })
    );
});
