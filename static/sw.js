const CACHE_NAME = 'fitness-v1.1.2';
const STATIC_ASSETS = [
    '/static/css/tailwind.css',
    '/static/js/api.js',
    '/static/js/app.js',
    '/static/js/admin.js',
    '/static/manifest.json',
    'https://unpkg.com/lucide@0.472.0'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Activate immediately — don't wait for old tabs to close
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Skip API calls — always go to network
    if (event.request.url.includes('/api/')) {
        return;
    }

    // Network-first strategy: try network, fall back to cache
    event.respondWith(
        fetch(event.request).then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone);
                });
            }
            return response;
        }).catch(() => {
            return caches.match(event.request).then((cached) => {
                if (cached) return cached;
                // Offline fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return new Response('离线状态，请连接网络后重试', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    });
                }
                return new Response('', { status: 408 });
            });
        })
    );
});
