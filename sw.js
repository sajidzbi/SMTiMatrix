/* SM TiMatrix service worker
   Network-first: whenever the device is online the newest files from GitHub are used
   (and cached for offline). Offline, the last cached copy is used.
   You never need to edit this file when you change index.html. */
const CACHE = 'sm-timatrix-shell';
const SCOPE = self.registration.scope;
const INDEX = new URL('index.html', SCOPE).href;
const CORE = ['index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png',
              'icons/maskable-512.png','icons/apple-touch-icon.png','icons/icon.svg','icons/favicon-32.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u =>
    fetch(new URL(u, SCOPE).href, { cache: 'reload' }).then(r => r.ok && c.put(new URL(u, SCOPE).href, r)).catch(() => {})
  ))));
});

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isNav = req.mode === 'navigate';
    const key = req.url;
    const net = fetch(req.url, { cache: 'no-cache' }).then(r => {
      if (r && r.ok) {
        cache.put(key, r.clone());
        if (isNav) cache.put(INDEX, r.clone());
      }
      return r;
    });
    const cached = (await cache.match(key, { ignoreSearch: true })) || (isNav ? await cache.match(INDEX) : undefined);
    if (!cached) return net.catch(() => Response.error());
    const wait = new Promise(res => setTimeout(() => res(null), 5000));   /* slow network → show cached, refresh behind */
    e.waitUntil(net.catch(() => {}));
    const r = await Promise.race([net.catch(() => null), wait]);
    return r && r.ok ? r : cached;
  })());
});
