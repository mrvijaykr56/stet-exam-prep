/**
 * sw.js — Service Worker for Bihar STET 2026 CS Prep App
 * Provides offline-first caching for core assets.
 */

const CACHE_NAME = 'stet-2026-v3';


const CORE_ASSETS = [
  './',
  './index.html',
  './syllabus.html',
  './materials.html',
  './practice.html',
  './mock-exam.html',
  './progress.html',
  './css/styles.css',
  './css/components.css',
  './js/app.js',
  './js/storage.js',
  './js/syllabus.js',
  './js/practice.js',
  './js/exam.js',
  './js/progress.js',
  './data/syllabus.json',
  './data/questions.json',
  './data/materials.json',
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for data/assets, network-first for pages
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Data JSON: network-first, fall back to cache for offline support.
  // This ensures new questions/materials reach users without a cache version bump.
  if (url.pathname.includes('/data/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // JS & CSS: stale-while-revalidate (fast load + background refresh)
  if (url.pathname.includes('/css/') || url.pathname.includes('/js/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // HTML pages: network-first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
