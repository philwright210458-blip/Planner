const APP_VERSION = 'v49';
const APP_CACHE = `sailing-planner-app-${APP_VERSION}`;
const TILE_CACHE = `sailing-planner-tiles-${APP_VERSION}`;
const RUNTIME_CACHE = `sailing-planner-runtime-${APP_VERSION}`;

const APP_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon.png',
    './icon-splash.png',
    './sw.js',
    'https://unpkg.com/leaflet/dist/leaflet.css',
    'https://unpkg.com/leaflet/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE).then(async (cache) => {
            await Promise.allSettled(APP_ASSETS.map((asset) => cache.add(asset)));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => ![APP_CACHE, TILE_CACHE, RUNTIME_CACHE].includes(key))
                .map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});


self.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const isTileRequest = url.hostname.includes('basemaps.cartocdn.com');
    const isWindfinder = url.hostname.includes('windfinder.com');
    const isNavigation = request.mode === 'navigate';

    if (isNavigation) {
        event.respondWith(networkFirstWithFallback(request, APP_CACHE, './index.html'));
        return;
    }

    if (isTileRequest) {
        event.respondWith(staleWhileRevalidate(request, TILE_CACHE));
        return;
    }

    if (isWindfinder) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
        return;
    }

    if (url.origin === self.location.origin || url.hostname.includes('unpkg.com')) {
        event.respondWith(cacheFirst(request, APP_CACHE));
        return;
    }

    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const fallback = await cache.match('./index.html');
        if (fallback && request.mode === 'navigate') return fallback;
        throw error;
    }
}

async function networkFirstWithFallback(request, cacheName, fallbackUrl) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        const fallback = await cache.match(fallbackUrl);
        if (fallback) return fallback;
        throw error;
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, { ignoreSearch: true });
    const networkFetch = fetch(request)
        .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    return cached || networkFetch || fetch(request);
}
