// service-worker.js
// Caches all image types using a cache-first strategy
// Best practices: versioned cache, cleanup, only image requests, error handling

// Set to true to enable detailed logging, false to disable
const DEBUG = true;

// Allowed domains for caching - only include the local hostname
// CloudFront domains will be handled separately
const ALLOWED_DOMAINS = [
    self.location.hostname
];

// Helper function for conditional logging
function log(message, ...args) {
    if (DEBUG) {
        console.log(message, ...args);
    }
}

log('[Service Worker] Script loaded!');

const CACHE_VERSION = 'v1-image-cache';
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const IMAGE_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.avif', '.jfif', '.pjpeg', '.pjp', '.apng'
];

// Utility: check if request is for an image
function isImageRequest(request) {
    const url = request.url.split('?')[0].split('#')[0];
    return IMAGE_EXTENSIONS.some(ext => url.endsWith(ext));
}

// Utility: check if request is from allowed domain or is a CloudFront URL
function isAllowedDomain(request) {
    const url = new URL(request.url);

    // Check if it's from an allowed domain
    if (ALLOWED_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) {
        return true;
    }

    // Check if it's any CloudFront domain
    if (url.hostname.endsWith('.cloudfront.net')) {
        return true;
    }

    return false;
}

self.addEventListener('install', event => {
    log('[Service Worker] Installing service worker...');
    // Activate worker immediately after install
    self.skipWaiting();
    log('[Service Worker] Installation complete, skipped waiting!');
});

self.addEventListener('activate', event => {
    log('[Service Worker] Activating service worker...');
    // Clean up old caches
    event.waitUntil(
        caches.keys().then(keys => {
            log('[Service Worker] Found caches:', keys);
            return Promise.all(
                keys.filter(key => key !== IMAGE_CACHE).map(key => {
                    log(`[Service Worker] Deleting old cache: ${key}`);
                    return caches.delete(key);
                })
            );
        }).then(() => {
            log(`[Service Worker] Cache ${IMAGE_CACHE} is now ready to handle requests!`);
        })
    );
    self.clients.claim();
    log('[Service Worker] Claimed all clients!');
});

self.addEventListener('fetch', event => {
    const { request } = event;
    // Only process GET requests for images from allowed domains
    if (request.method !== 'GET' || !isImageRequest(request) || !isAllowedDomain(request)) {
        return;
    }

    log(`[Service Worker] Fetching image: ${request.url}`);

    event.respondWith(
        caches.open(IMAGE_CACHE).then(cache =>
            cache.match(request).then(response => {
                if (response) {
                    log(`[Service Worker] Serving image from cache: ${request.url}`);
                    return response;
                }

                log(`[Service Worker] Image not in cache, fetching from network: ${request.url}`);

                // Check if this is a CloudFront URL
                const isCloudFrontUrl = new URL(request.url).hostname.endsWith('.cloudfront.net');

                // Create a new request with no-cors mode for CloudFront URLs
                const fetchRequest = isCloudFrontUrl ?
                    new Request(request.url, { mode: 'no-cors' }) : request;

                // Fetch and cache
                return fetch(fetchRequest).then(networkResponse => {
                    // For no-cors requests, response type is 'opaque' and ok is always false
                    // We need to cache it anyway
                    const shouldCache = networkResponse.ok ||
                        (isCloudFrontUrl && networkResponse.type === 'opaque');

                    if (shouldCache) {
                        log(`[Service Worker] Caching image: ${request.url}`);
                        cache.put(request, networkResponse.clone());
                    } else {
                        if (DEBUG) {
                            console.warn(`[Service Worker] Network response not OK for: ${request.url}`,
                                { status: networkResponse.status, type: networkResponse.type });
                        }
                    }
                    return networkResponse;
                }).catch(error => {
                    if (DEBUG) {
                        console.error(`[Service Worker] Fetch failed for: ${request.url}`, error);
                    }
                    // Optionally, return a fallback image here
                    return Response.error();
                });
            })
        )
    );
});
