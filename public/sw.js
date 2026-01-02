// Service Worker for 3Iconic Admin Dashboard PWA
const CACHE_NAME = '3iconic-admin-v1';

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Use current origin to avoid domain mismatch errors (www vs non-www)
        const origin = self.location.origin;
        const urlsToCache = [
          origin + '/',
          origin + '/admin/login',
          origin + '/manifest.json',
          origin + '/icon.svg',
          origin + '/icon-192x192.svg',
          origin + '/icon-512x512.svg',
        ];
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients to ensure service worker takes control
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Bypass service worker for:
  // 1. Navigation requests to admin routes (may redirect)
  // 2. OAuth callback routes (must not be cached)
  // 3. API auth routes (must not be cached)
  if (
    (event.request.mode === 'navigate' && url.pathname.startsWith('/admin')) ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.includes('/callback/')
  ) {
    // Let the browser handle these requests directly
    // This allows OAuth callbacks and middleware redirects to work properly
    return;
  }
  
  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        // Use redirect: 'follow' to handle redirects properly
        return response || fetch(event.request, { redirect: 'follow' });
      })
      .catch(() => {
        // If both fail, return offline page or error
        if (event.request.destination === 'document') {
          const origin = new URL(event.request.url).origin;
          return caches.match(origin + '/admin/login');
        }
      })
  );
});

