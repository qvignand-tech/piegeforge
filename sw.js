// Piègeforge - service worker : jeu jouable hors ligne, mise à jour automatique
const V = 'pf-20261115-2353';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-mask.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== V && k.startsWith('pf-')).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable() } catch (err) {} }
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting() });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin !== location.origin) return;
  const isPage = r.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  e.respondWith((async () => {
    const cache = await caches.open(V);
    if (isPage) {
      try {
        const pre = await e.preloadResponse;
        const net = pre || await fetch(r);
        if (net && net.ok) cache.put(r, net.clone());
        return net;
      } catch (err) {
        return (await cache.match(r)) || (await cache.match('./index.html')) || Response.error();
      }
    }
    const hit = await cache.match(r);
    if (hit) { fetch(r).then(n => { if (n && n.ok) cache.put(r, n) }).catch(() => {}); return hit }
    try { const net = await fetch(r); if (net && net.ok) cache.put(r, net.clone()); return net }
    catch (err) { return Response.error() }
  })());
});
