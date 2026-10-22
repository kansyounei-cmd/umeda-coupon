/* 大丸・松坂屋 优惠券演示 PWA — Service Worker
   作用：① 离线可用 ② Android Chrome 识别为可安装应用
   每次更换图片后请把 CACHE 版本号 +1，用户端才会拿到新图。 */
const CACHE = 'umeda-pwa-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-daimaru-180.png',
  './icon-daimaru-192.png',
  './icon-daimaru-512.png',
  './icon-daimaru-1024.png',
  './page1.jpg',
  './page2.jpg',
  './page4.png',
  './page5.jpg',
  './page6.png',
  './page7.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面：网络优先，离线回落到缓存首页
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if (r && r.status === 200) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
