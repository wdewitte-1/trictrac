const CACHE='trictrac-v2';
const ASSETS=['/','/index.html','/css/style.css','/js/game.js','/js/ui.js','/js/multiplayer.js','/js/firebase-config.js','/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.url.includes('firebase')||e.request.url.includes('gstatic')){e.respondWith(fetch(e.request));return;}
  e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});
