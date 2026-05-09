/* DEV VERSION — no caching, always loads fresh files.
   Replace with the original sw.js before submitting to Google Play. */

const APP_VERSION = 'v77-dev';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
