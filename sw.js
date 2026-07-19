/**
 * 姓名和盤 — Service Worker
 * Cache-First 策略，支援離線使用
 */

var CACHE_NAME = 'name-harmony-v1';

var ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/data/stroke-db.js',
  './js/data/fortune-81.js',
  './js/data/english-number-meanings.js',
  './js/chinese-numerology.js',
  './js/english-numerology.js',
  './js/harmony.js',
  './js/app.js'
];

// Install: 快取所有靜態資源
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: 清除舊快取
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-First, Network Fallback
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        // 快取新資源（排除 Google Fonts 等外部資源）
        if (response.status === 200 && event.request.url.indexOf(location.origin) === 0) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
