/* Keep offline navigation on the requested page, including embedded missions. */
const CACHE = 'sibaca-pwa-2026-10-18-mission5-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/sibaca.svg', './misi5-percubaan.html?embedded=1&v=red-audio-complete-v2'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('sibaca-pwa-') && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || req.headers.has('range')) return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  const navigation = req.mode === 'navigate';
  event.respondWith((async () => {
    try {
      const response = await fetch(req);
      if (navigation && !response.ok) throw new Error('Page unavailable');
      if (response.ok && response.type === 'basic' && !/\.(?:mp3|wav|mp4|webm|ogg|m4a)$/i.test(url.pathname)) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {}));
      }
      return response;
    } catch (_) {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req) || (navigation ? await cache.match(req, {ignoreSearch: true}) : undefined);
      if (cached) return cached;
      // Only the actual home URL may fall back to the home page.
      if (navigation && (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html')) {
        const home = await cache.match('./index.html');
        if (home) return home;
      }
      if (!navigation) return Response.error();
      return new Response('<!doctype html><html lang="ms"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cuba semula</title><body style="font:20px Arial;text-align:center;padding:40px;background:#082e54;color:white"><h1>Halaman belum dapat dimuatkan</h1><p>Semak sambungan Internet dan cuba semula. Kemajuan kamu masih disimpan.</p><button onclick="location.reload()" style="font:inherit;padding:12px 24px">Cuba semula</button></body></html>', {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8'}});
    }
  })());
});
