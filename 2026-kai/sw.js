'use strict';
const CACHE='kai-calendar-shell-20261119-install-right';
const SHELL=['./calendar.html','./a.html','./b.html','./app.js?v=20261119-device-install','./app.css?v=20261119-install-right','./html2canvas.min.js','./qrcode.min.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('kai-calendar-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location.href).pathname))return;
  if(!/\.(?:html|js|css|png|webmanifest)$/.test(url.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{const response=await fetch(event.request,{cache:'no-store'});if(response.ok)await cache.put(event.request,response.clone());return response;}
    catch{const saved=await cache.match(event.request)||await cache.match(event.request,{ignoreSearch:true});return saved||Response.error();}
  })());
});
