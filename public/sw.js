// Service Worker for 3Iconic Admin Dashboard PWA
const CACHE_NAME = '3iconic-admin-v1';
const urlsToCache = [
  '/',
  '/admin/login',
  '/manifest.json',
  '/icon.svg',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
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
    })
  );
  return self.clients.claim(); // Take control of all pages
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Bypass service worker for navigation requests to admin routes
  // These routes may redirect and need to be handled by the server/middleware
  if (event.request.mode === 'navigate' && url.pathname.startsWith('/admin')) {
    // Let the browser handle navigation requests to admin routes directly
    // This allows middleware redirects to work properly
    return;
  }
  
  // For non-navigation requests, use cache-first strategy
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
          return caches.match('/admin/login');
        }
      })
  );
});

