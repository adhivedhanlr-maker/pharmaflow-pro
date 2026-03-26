const CACHE_NAME = "pharmaflow-static-v4";
const STATIC_ASSETS = [
    "/login",
    "/manifest.json",
    "/logo.png",
    "/icon-192x192.png",
    "/icon-512x512.png",
];

function isStaticAsset(requestUrl) {
    const url = new URL(requestUrl);

    if (url.origin !== self.location.origin) {
        return false;
    }

    return (
        STATIC_ASSETS.includes(url.pathname) ||
        url.pathname.startsWith("/_next/static/")
    );
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames.map((cacheName) => {
                if (cacheName !== CACHE_NAME) {
                    return caches.delete(cacheName);
                }

                return Promise.resolve();
            }),
        )),
    );
    self.clients.claim();
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cachedPage = await caches.match(event.request);
                if (cachedPage) {
                    return cachedPage;
                }

                const loginFallback = await caches.match("/login");
                if (loginFallback) {
                    return loginFallback;
                }

                throw new Error("Navigation request failed and no fallback page is cached.");
            }),
        );
        return;
    }

    if (!isStaticAsset(event.request.url)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(async (cachedResponse) => {
            try {
                const networkResponse = await fetch(event.request);

                if (networkResponse.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, networkResponse.clone());
                } else if (cachedResponse) {
                    return cachedResponse;
                }

                return networkResponse;
            } catch (error) {
                if (cachedResponse) {
                    return cachedResponse;
                }

                throw error;
            }
        }),
    );
});

self.addEventListener("push", (event) => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || "PharmaFlow Pro", {
            body: data.body || "You have a new notification.",
            icon: "/logo.png",
            badge: "/logo.png",
            data: {
                url: data.url || "/",
            },
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && "focus" in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }

            return Promise.resolve();
        }),
    );
});
