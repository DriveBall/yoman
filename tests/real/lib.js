// Real Firebase compat SDK 10.14.1 (from npm), real service worker, site served at its real URL via local HTTPS.
// All Firestore hosts are mapped to NOTFOUND, so nothing can reach the real project.
const https=require('https'),fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const H=__dirname,SITE=path.resolve(__dirname,'../..');
if(!fs.existsSync(H+'/k.pem'))require('child_process').execSync('openssl req -x509 -newkey rsa:2048 -nodes -keyout k.pem -out c.pem -days 30 -subj /CN=localhost',{cwd:H,stdio:'ignore'});
const CT={'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.jpg':'image/jpeg','.png':'image/png'};
exports.server=async()=>{const st={mode:'on',patch:null,log:[]};const socks=new Set();
 const srv=https.createServer({key:fs.readFileSync(H+'/k.pem'),cert:fs.readFileSync(H+'/c.pem')},(q,r)=>{const host=q.headers.host,u=new URL(q.url,'https://x');st.log.push(host+u.pathname);
  if(st.mode==='off'){q.socket.destroy();return} if(st.mode==='hang')return;
  let f=null;if(host.includes('gstatic'))f=SITE+'/vendor/'+path.basename(u.pathname);
  else if(u.pathname.startsWith('/yoman/')){let p=u.pathname.slice(7)||'index.html';f=SITE+'/'+p}
  if(!f||!fs.existsSync(f)){r.writeHead(404);r.end();return}
  let body=fs.readFileSync(f);if(st.patch&&f.endsWith('index.html'))body=st.patch(body.toString());
  r.writeHead(200,{'content-type':CT[path.extname(f)]||'application/octet-stream','cache-control':'no-cache'});r.end(body)});
 srv.on('connection',s=>{socks.add(s);s.on('close',()=>socks.delete(s))});
 await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));st.port=srv.address().port;
 st.close=()=>{socks.forEach(s=>s.destroy());srv.close()};st.kill=()=>socks.forEach(s=>s.destroy());return st};
exports.launch=async(st,{camera=false}={})=>{const S=path.join(__dirname,'..','fixtures');
 const args=['--ignore-certificate-errors',`--host-resolver-rules=MAP www.gstatic.com 127.0.0.1:${st.port}, MAP driveball.github.io 127.0.0.1:${st.port}, MAP * ~NOTFOUND, EXCLUDE localhost`];
 if(camera)args.push('--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+S+'/ean.mjpeg');
 const browser=await chromium.launch({args,proxy:undefined,env:{...process.env,HTTPS_PROXY:'',HTTP_PROXY:'',https_proxy:'',http_proxy:''}});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,ignoreHTTPSErrors:true,permissions:camera?['camera']:[]});
 await ctx.addInitScript(()=>{try{if(!localStorage.getItem('__seeded')){localStorage.setItem('fit_code','auditcode1');localStorage.setItem('fit_me','victor');localStorage.setItem('__seeded','1')}}catch(e){}});
 return{browser,ctx}};
exports.URL='https://driveball.github.io/yoman/';
exports.seed=async p=>p.evaluate(()=>{const f=firebase.firestore();const r='spaces/auditcode1/people/';f.doc(r+'victor').set({name:'ויקטור',slot:0,goals:{}});f.doc(r+'racheli').set({name:'רחלי',slot:1,goals:{}})});
exports.addMeal=async(p,n)=>{if(!await p.locator('#dr-food').isVisible())await p.click('#open-food');await p.evaluate(()=>{const d=document.getElementById('m-manual');if(d)d.open=true});await p.fill('#m-name',n);await p.click('#m-add');await p.waitForTimeout(250)};
exports.meals=p=>p.$$eval('.panel.mine .ml li strong',e=>e.length).then(async c=>({n:c,txt:await p.$$eval('.panel.mine .ml li .it',e=>e.map(x=>x.textContent.split(',')[1]?.trim()))}));
