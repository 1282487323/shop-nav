/* 希音店铺导航 - Service Worker
 * 让 GitHub Pages 离线可用：预缓存站点静态资源，导航/静态资源走 stale-while-revalidate。
 * 跨域数据请求（GitHub API / jsDelivr 的 shops.json）不拦截，交给页面自身的 fetch + localStorage 兜底。
 */
const CACHE = 'shop-nav-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'sortable.min.js',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 只处理同源请求；跨域（GitHub API / CDN）放行，不缓存
  if (url.origin !== self.location.origin) return;

  // 导航请求：优先网络，失败回退缓存的 index.html（保证离线打开）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // 其他同源静态资源：stale-while-revalidate
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
