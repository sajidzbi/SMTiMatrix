/* ISLMS service worker — change VER when you publish a new version of the files */
const VER = 'islms-66';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'fonts/JameelNooriNastaleeq.woff',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.allSettled(CORE.map(u => c.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VER).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isPage) {            // program file: always try the newest, fall back to saved copy when offline
    e.respondWith(fetch(req, { cache: 'no-store' }).then(r => {
      const copy = r.clone(); caches.open(VER).then(c => c.put(req, copy)); return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html') || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {   // fonts, icons: saved copy first, refreshed in background
    const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VER).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
