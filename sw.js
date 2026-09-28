/**
 * 姓名和盤 — Service Worker
 * Cache-First 策略，支援離線使用
 */

var CACHE_NAME = 'name-harmony-v31';

var ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  // fonts:start（由 tools/gen-fonts.py 產生；其餘切片用到時才下載，下載後由 fetch 存進快取）
  './fonts/fonts.css',
  './fonts/NotoSansTC-0.6dc4e297.woff2',
  './fonts/NotoSansTC-1.b975e85b.woff2',
  './fonts/NotoSansTC-2.5d64f9ff.woff2',
  './fonts/NotoSansTC-3.aa19e3cb.woff2',
  './fonts/NotoSansTC-4.cf7c7414.woff2',
  './fonts/NotoSerifTC-0.98c7c8c8.woff2',
  './fonts/NotoSerifTC-1.814e0703.woff2',
  './fonts/Bakudai-0.1dcb5821.woff2',
  './fonts/Bakudai-1.3772fe74.woff2',
  // fonts:end
  './js/data/stroke-db.js',
  './js/data/s2t-map.js',
  './js/data/pinyin-db.js',
  './js/data/english-phonetics.js',
  './js/phonetics.js',
  './js/data/name-chars.js',
  './js/data/char-element.js',
  './js/data/english-translit.js',
  './js/foreign-name.js',
  './js/baby-name.js',
  './js/naming-extensions.js',
  './js/data/name-trends.js',
  './js/ai-reading.js',
  './js/data/fortune-81.js',
  './js/data/english-names.js',
  './js/data/english-number-meanings.js',
  './js/zodiac-bazi.js',
  './js/name-generator.js',
  './js/share-card.js',
  './js/fun-extras.js',
  './js/iching.js',
  './js/data/iching-yao.js',
  './js/deep-readings.js',
  './js/smart-insights.js',
  './js/lucky-items.js',
  './js/lucky-days.js',
  './js/lunar.js',
  './js/ziwei.js',
  './js/ziwei-reading.js',
  './js/vendor/astronomy.browser.min.js',
  './js/astrology.js',
  './js/professional.js',
  './js/chinese-numerology.js',
  './js/english-numerology.js',
  './js/harmony.js',
  './js/pair-harmony.js',
  './js/i18n.js',
  './js/birth-place.js',
  './js/app.js',
  './js/naming-tools.js'
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

// Periodic Background Sync: 每日運勢推播（僅安裝為PWA且瀏覽器授權時觸發，屬best-effort）
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'daily-fortune') {
    event.waitUntil(
      self.registration.showNotification('🔮 姓名和盤 · 今日運勢', {
        body: '新的一天，打開 APP 查看今日幸運色、方位與數字。',
        icon: 'img/icon-192.png'
      })
    );
  }
});

// 點擊通知：聚焦或開啟 App
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// Fetch: Cache-First
self.addEventListener('fetch', function(event) {
  // API 呼叫（POST）與串流回覆不經過快取
  if (event.request.method !== 'GET') return;

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
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
