// Real compat SDK from vendor/, real sw.js, Firestore unreachable (hosts NOTFOUND) so nothing reaches the real project.
const L=require('./lib.js');let fails=0;const check=(l,ok,x)=>{console.log((ok?'PASS ':'FAIL ')+l,x===undefined?'':JSON.stringify(x));if(!ok)fails++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const st=await L.server();const {browser,ctx}=await L.launch(st);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_|Failed to load|Could not reach|net::/.test(m.text()))errs.push(m.text())});
 await p.goto(L.URL);await sleep(1500);
 check('firebase from vendor',await p.evaluate(()=>firebase.SDK_VERSION)==='10.14.1');
 check('no gstatic/jsdelivr request',!st.log.some(x=>/gstatic|jsdelivr/.test(x)),st.log.filter(x=>/gstatic|jsdelivr/.test(x)));
 // first visit precache
 await p.evaluate(()=>navigator.serviceWorker.ready);await sleep(1500);
 const CN=require('fs').readFileSync(require('path').resolve(__dirname,'../../sw.js'),'utf8').match(/const C='([^']+)'/)[1];const keys=await p.evaluate(async CN=>{const k=await caches.open(CN);return (await k.keys()).map(r=>r.url)},CN);
 check('precache complete',keys.length>=59&&keys.some(k=>k.endsWith('zxing_reader.wasm'))&&keys.some(k=>k.endsWith('ex/49.jpg'))&&keys.some(k=>k.endsWith('firebase-firestore-compat.js')),keys.length);
 // seed legacy-shaped docs through the real SDK (local only, offline)
 await p.evaluate(()=>{const f=firebase.firestore(),r='spaces/auditcode1/people/',t=new Date(),pad=n=>String(n).padStart(2,'0'),T=t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());window.__T=T;
   f.doc(r+'victor').set({name:'ויקטור',slot:0,goals:{workouts:3}});f.doc(r+'racheli').set({name:'רחלי',slot:1,goals:{}});
   f.doc(r+'victor/days/'+T).set({date:T,weight:null,workouts:[],note:'',meals:[{id:'leg1',at:'2026-01-01T01:00:00.000Z',meal:'בוקר',name:'ישן',kcal:'150',protein:null}],exercises:[]})});
 await sleep(800);await p.reload();await sleep(2500);
 check('opens offline-with-seed',await p.locator('#open-food').isVisible());
 const T=await p.evaluate(()=>{const t=new Date(),pad=n=>String(n).padStart(2,'0');return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())});
 const read=()=>p.evaluate(async T=>{const d=await firebase.firestore().doc('spaces/auditcode1/people/victor/days/'+T).get({source:'cache'});return d.data()},T);
 await L.addMeal(p,'A');await L.addMeal(p,'B');await L.addMeal(p,'C');let d=await read();
 check('D1 union local x3',d.meals.map(m=>m.name).join()==='ישן,A,B,C',d.meals.map(m=>m.name));
 await p.click('[data-del="meals"][data-i="leg1"]');await sleep(300);d=await read();check('arrayRemove exact legacy entry with string kcal',!d.meals.some(m=>m.id==='leg1'),d.meals.length);
 const aId=d.meals.find(m=>m.name==='A').id;await p.click(`[data-edit="meals"][data-i="${aId}"]`);await p.evaluate(()=>{const d=document.getElementById('m-manual');if(d)d.open=true}).then(()=>p.fill('#m-name','A2'));await p.click('#m-add');await sleep(300);d=await read();check('edit batch',d.meals.some(m=>m.name==='A2')&&!d.meals.some(m=>m.name==='A')&&d.meals.length===3,d.meals.map(m=>m.name));
 await p.click('#open-weight');await p.fill('#f-weight','80.5');await p.locator('#f-weight').blur();await sleep(300);await p.click('#w-done');d=await read();check('weight merge',d.weight===80.5&&d.meals.length===3);
 await p.click('#open-food');await p.evaluate(()=>{const d=document.getElementById('m-manual');if(d)d.open=true});await p.check('#share-on');await (p.fill('#m-name','pizza'));await p.fill('#m-kcal','101');await p.click('#m-add');await sleep(300);
 const pd=await p.evaluate(async T=>(await firebase.firestore().doc('spaces/auditcode1/people/racheli/days/'+T).get({source:'cache'})).data(),T);d=await read();
 check('share split add',pd&&pd.date===T&&pd.meals[0].kcal===50&&d.meals.find(m=>m.name==='pizza').kcal===51,pd&&pd.meals);
 // goals: dotted update with dashes
 await p.click('#tab-progress');await sleep(200);await p.click('#goals-open');await p.fill('#g-workouts','5');await p.click('#g-save');await sleep(200);
 const per=await p.evaluate(async()=>(await firebase.firestore().doc('spaces/auditcode1/people/victor').get({source:'cache'})).data());check('goal dotted update + history',per.goals.workouts===5&&Object.values(per.goalHistory).includes(5)&&per.name==='ויקטור',per);
 check('toast shows without ack',await p.locator('#toast').isVisible());
 await p.click('#tab-log');await sleep(200);
 // template + increment FieldPath
 await p.click('#live-open');await p.click('[data-l=empty]');await p.click('[data-l=addex]');await p.fill('#pk-q','תרגיל.עם נקודה');await p.locator('#pk-grid .pk').last().click();await sleep(100);await p.fill('#l-r0','5');await p.fill('#l-k0','40');await p.click('.tick');await p.click('[data-l=finish]');await sleep(400);
 check('D2 live finished offline, backup cleared',await p.evaluate(()=>localStorage.getItem('fit_live_victor'))===null);await p.click('[data-l=close]');await sleep(100);
 // reload offline: everything persists (D1,D2)
 await sleep(500);await p.reload();await sleep(2500);d=await read();
 check('after reload',d.meals.length===4&&d.exercises.length===1&&d.weight===80.5,{m:d.meals.map(x=>x.name),e:d.exercises.length,w:d.weight});
 check('screen after reload',(await p.$$eval('.panel.mine .ml li .it',e=>e.length))===4);
 const f=await p.evaluate(async()=>{const r=await firebase.firestore().collection('spaces/auditcode1/people/victor/days').get({source:'cache'});return r.size});check('days query',f>=1,f);
 // the SW: server fully off
 st.mode='off';st.kill();await sleep(200);const t0=Date.now();await p.reload();await sleep(800);check('offline start',await p.locator('#open-food').isVisible(),Date.now()-t0);
 const imgs=await p.evaluate(async()=>{const r=await fetch('ex/07.jpg');return r.ok});check('picture offline',imgs);
 // hanging server: 3s timeout
 st.mode='hang';const t1=Date.now();await p.goto(L.URL,{waitUntil:'domcontentloaded',timeout:8000}).catch(e=>console.log(e.message));const nav=Date.now()-t1;check('hang: navigation under ~3.5s',nav<3800,nav);await sleep(700);check('hang: app usable',await p.locator('#open-food').isVisible());
 // fragment keys
 st.mode='on';await p.goto(L.URL+'#k=auditcode1');await sleep(1200);const ks=await p.evaluate(async()=>{const out=[];for(const n of await caches.keys()){for(const r of await (await caches.open(n)).keys())out.push(r.url)}return out});check('no # in cache keys',!ks.some(k=>k.includes('#')),ks.filter(k=>k.includes('#')));
 check('hash stripped',await p.evaluate(()=>location.hash)==='');
 console.log('errors',errs);check('no console errors',!errs.length);
 await browser.close();st.close();console.log(fails?'FAILS '+fails:'ALL PASS');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
