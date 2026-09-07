// public/sw.js
// Service Worker for PWA
// ⚠️ IMPORTANT: Bump this version number every time you deploy new code.
// This forces old caches to be cleared and users to get the new version.
const CACHE_VERSION = 'build-1788712366359';
const CACHE_NAME = `tms-${CACHE_VERSION}`;

const urlsToCache = [
    '/',
];

// Install event - cache essential resources and immediately activate
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Opened cache:', CACHE_NAME);
            return cache.addAll(urlsToCache);
        })
    );
    // Skip waiting forces the new SW to become active immediately
    // The PwaRegister component will then show the "Update Available" banner
    self.skipWaiting();
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('tms-') && name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control of all open pages immediately
    self.clients.claim();
});

// Fetch event - Network First for HTML pages, Cache First for static assets
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Ignore non-GET requests
    if (request.method !== 'GET') return;

    // Ignore cross-origin requests (e.g., Supabase, API calls)
    if (!request.url.startsWith(self.location.origin)) return;

    // Ignore API routes - always go to network for fresh data
    if (request.url.includes('/api/')) return;

    const isHTMLPage = request.headers.get('accept')?.includes('text/html');

    if (isHTMLPage) {
        // NETWORK FIRST for HTML pages - always try to get fresh page from server
        // Fall back to cache if offline
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
    } else {
        // CACHE FIRST for static assets (JS, CSS, images, fonts)
        // These are content-hashed by Next.js so they are safe to cache aggressively
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;

                return fetch(request).then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return networkResponse;
                });
            })
        );
    }
});

// ─────────────────────────────────────────────────────────────
// Push Notification Handlers
// ─────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    let data = { title: 'TMS Notification', body: 'You have a new alert.', url: '/dashboard' };

    if (event.data) {
        try { data = JSON.parse(event.data.text()); } catch (_) {}
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            tag: 'tms-alert',               // replaces previous notification of same tag
            renotify: true,                  // vibrate even if replacing same tag
            data: { url: data.url || '/dashboard' },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it and navigate
            for (const client of clientList) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            // Otherwise open a new window
            return clients.openWindow(targetUrl);
        })
    );
});
