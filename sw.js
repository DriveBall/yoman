/* Bump C whenever a file in CORE or EX changes: vendor/, ex/ and icons are served cache-first. index.html is network-first. */
const C='yoman-v6',FONTS='yoman-fonts-v1';
const CORE=['./','manifest.json','icon-180.png','icon-192.png','icon-512.png','vendor/firebase-app-compat.js','vendor/firebase-firestore-compat.js','vendor/barcode-ponyfill.js','vendor/zxing_reader.wasm'];
const EX=Array.from({length:78},(_,i)=>'ex/'+String(i).padStart(2,'0')+'.jpg');
const fresh=u=>new Request(u,{cache:'reload'});
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(async k=>{
  await k.addAll(CORE.map(fresh));
  /* a missing picture must not cost the whole offline start */
  await Promise.all(EX.map(u=>k.add(fresh(u)).catch(()=>{})));
}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(n=>n!==C&&n!==FONTS).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
const noFrag=u=>u.split('#')[0];
function fromNet(r,e){return fetch(r).then(x=>{if(x.ok&&x.type==='basic'){const c=x.clone();e.waitUntil(caches.open(C).then(k=>k.put(noFrag(r.url),c)))}return x})}
function navigate(e){const r=e.request;
  const net=fromNet(r,e);
  const cached=()=>caches.match(noFrag(r.url),{ignoreSearch:true}).then(m=>m||caches.match('./'));
  /* bad reception: after 3 seconds show the saved page. The network answer still refreshes the cache for next time. */
  const timeout=new Promise(ok=>setTimeout(()=>cached().then(m=>{if(m)ok(m)}),3000));
  e.waitUntil(net.catch(()=>{}));
  return Promise.race([net.then(x=>x.ok?x:cached().then(m=>m||x)).catch(()=>cached().then(m=>m||Response.error())),timeout]);
}
function cacheFirst(e){const r=e.request;return caches.match(noFrag(r.url),{ignoreSearch:true}).then(m=>m||fromNet(r,e))}
function fonts(e){return caches.open(FONTS).then(k=>k.match(e.request.url).then(m=>m||fetch(e.request).then(x=>{if(x.ok){const c=x.clone();e.waitUntil(k.put(e.request.url,c))}return x})))}
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){e.respondWith(fonts(e));return}
  if(u.origin!==location.origin)return;
  if(r.mode==='navigate'){e.respondWith(navigate(e));return}
  e.respondWith(cacheFirst(e));
});
