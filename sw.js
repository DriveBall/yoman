const C='yoman-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  if(u.origin!==location.origin&&!(u.hostname==='www.gstatic.com'&&u.pathname.startsWith('/firebasejs/'))&&!u.pathname.includes('@zxing'))return;
  e.respondWith(fetch(r).then(x=>{if(x.ok||x.type==='opaque'){const c=x.clone();caches.open(C).then(k=>k.put(r,c))}return x}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('./'):Response.error()))));
});
