// Fixed copy of the audit harness. Vendor Firebase is blocked so the mock stays on window.firebase; the mock has real-SDK write operations.
// open({user,width,height,camera,date,seed,deny,preinit,expose})
const {chromium}=require('playwright'),fs=require('fs');const path=require('path');const S=path.join(__dirname,'fixtures'),site=path.resolve(__dirname,'..'),F=__dirname;
const src=fs.readFileSync(S+'/seed-source.js','utf8');const seeded=src.match(/const mock=`([\s\S]*?)`;/)[1];
const seedPart=seeded.slice(seeded.indexOf("const root='spaces/testcode123/'"),seeded.indexOf('const fs={collection'));
const seedJS='(()=>{const store=window.__store;'+seedPart+'})();';
const emptyJS=`(()=>{})();`;
const OFF=u=>u.includes('search.pl')?{products:[{code:'7290000011111',product_name:'קוטג׳ תנובה',brands:'תנובה',nutriments:{'energy-kcal_100g':90,proteins_100g:11,carbohydrates_100g:3,fat_100g:5},serving_quantity:250}]}:u.includes('/7290000066318')?{status:1,product:{product_name:'שוקו',nutriments:{'energy-kcal_100g':80,proteins_100g:3,carbohydrates_100g:12,fat_100g:2},serving_quantity:200}}:{status:0};
const EXPOSE="window.__t={render,S,isPR,playerStats,prMap:typeof prMap==='function'?prMap:null,bumpAll:typeof bumpAll==='function'?bumpAll:null,bump:typeof bump==='function'?bump:null};";
exports.root='spaces/testcode123/';
exports.open=async function({user='victor',width=390,height=844,camera=false,date=null,seed=true,preinit=null,expose=false,code='testcode123',url='https://site.test/'}={}){
 const args=camera?['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+S+'/ean.mjpeg']:[];
 const browser=await chromium.launch({args});const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,permissions:camera?['camera']:[],serviceWorkers:'block'});const page=await c.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load|ERR_|fetching the script/.test(m.text()))errors.push(m.text())});
 if(date)await page.clock.setFixedTime(new Date(date));
 await page.addInitScript(fs.readFileSync(F+'/fsapply.js','utf8'));await page.addInitScript(fs.readFileSync(F+'/fsmock.js','utf8'));
 if(seed)await page.addInitScript(seedJS);
 if(preinit)await page.addInitScript(preinit);
 if(user)await page.addInitScript(u=>{try{if(!sessionStorage.getItem('__s')){localStorage.setItem('fit_me',u)}}catch(e){}},user);
 if(code)await page.addInitScript(cc=>{try{if(!sessionStorage.getItem('__s')){localStorage.setItem('fit_code',cc);sessionStorage.setItem('__s','1')}}catch(e){}},code);
 const html=()=>{let h=fs.readFileSync(site+'/index.html','utf8');if(expose){const n=h.lastIndexOf('boot();');h=h.slice(0,n)+EXPOSE+h.slice(n)}return h};
 await page.route('**/*',r=>{const u=r.request().url();
  if(u.includes('openfoodfacts'))return r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(OFF(u))});
  if(u.startsWith('https://site.test/')){const f=new URL(u).pathname.slice(1);if(/vendor\/firebase/.test(f))return r.fulfill({contentType:'text/javascript',body:'/*blocked: mock in use*/'});if(f&&f!=='index.html'&&fs.existsSync(site+'/'+f))return r.fulfill({path:site+'/'+f,contentType:f.endsWith('.wasm')?'application/wasm':undefined});return r.fulfill({contentType:'text/html',body:html()})}
  return r.abort()});
 await page.goto(url);await page.waitForTimeout(500);return{browser,page,errors}};
