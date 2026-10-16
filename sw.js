/* SiBaCa PWA: prefer online updates; offline fallback for previously visited local files. */
const CACHE = 'sibaca-pwa-2026-10-17-controls-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/sibaca.svg'];
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate', event => {event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sibaca-pwa-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]));});
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin||req.headers.has('range'))return;
  const url=new URL(req.url);
  if(!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith(fetch(req).then(response=>{
    if(response.ok && response.type==='basic' && !/\.(?:mp3|wav|mp4|webm|ogg|m4a)(?:$|\?)/i.test(url.pathname)){
      const copy=response.clone();self.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));
    }
    return response;
  }).catch(()=>caches.match(req).then(cached=>cached|| (req.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
