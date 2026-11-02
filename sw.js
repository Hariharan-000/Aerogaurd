// Service Worker for AeroSense PWA Mobile Application
const CACHE_NAME = 'aerosense-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through for real-time sensor streams and assets
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
