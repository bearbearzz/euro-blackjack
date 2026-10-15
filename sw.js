/* Service Worker：第一次開啟時把所有檔案存進快取，之後離線也能使用。
 * 策略：先用快取回應（秒開、可離線），同時在背景向網路抓新版更新快取，
 * 所以推送新版到 GitHub 後，使用者「下一次」開啟就會看到新版。
 * 修改檔案清單或想強制所有人重新下載時，把 CACHE 的版本號加一。
 */
const CACHE = 'euro-bj-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './engine.js',
  './app.js',
  './manifest.webmanifest',
  './chart.png',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' 略過瀏覽器的 HTTP 快取，確保存進來的是伺服器上的最新檔案
      .then((c) => c.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
      // 背景更新：no-cache 會向伺服器確認是否有新版（沒變就只回 304，很省流量）
      const network = (async () => {
        try {
          const res = await fetch(req.mode === 'navigate' ? req : new Request(req, { cache: 'no-cache' }));
          if (res && res.ok && res.type === 'basic') await cache.put(req, res.clone());
          return res;
        } catch (e) {
          return null; // 離線
        }
      })();

      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      const res = await network;
      if (res) return res;
      if (req.mode === 'navigate') {
        const page = await cache.match('./index.html', { ignoreVary: true });
        if (page) return page;
      }
      return Response.error();
    })
  );
});
