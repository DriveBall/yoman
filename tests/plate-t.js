// Plates, #ai= import, shared tables. Uses the fix2 harness (mock Firestore only).
const {open,root}=require('./harness.js');let fails=0;const check=(l,ok,x)=>{console.log((ok?'PASS ':'FAIL ')+l,x===undefined?'':JSON.stringify(x));if(!ok)fails++};
const pad=n=>String(n).padStart(2,'0');const d0=new Date(),T=d0.getFullYear()+'-'+pad(d0.getMonth()+1)+'-'+pad(d0.getDate()),Y=(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())})();
const store=(p,path)=>p.evaluate(x=>__view().get(x),path);
const pre=(docs)=>`(()=>{const d=${JSON.stringify(docs)};for(const k in d)window.__store.set('${root}'+k,d[k])})();`;
const docs={'people/victor':{name:'ויקטור',slot:0,goals:{}},'people/racheli':{name:'רחלי',slot:1,goals:{}},
 'products/7290000011111':{barcode:'7290000011111',name:'קוטג׳ תנובה',kcal100:90,protein100:11,units:[],lastUnit:'גרם',lastQty:100},
 'recipes/r1':{name:'מרק',servings:2,ingredients:[{name:'a',grams:400,kcal100:50,protein100:5}]},
 ['people/victor/days/'+Y]:{date:Y,meals:[{id:'pz',at:new Date(Date.now()-864e5).toISOString(),meal:'ערב',name:'פיצה',kcal:800,protein:30}]},
 ['people/racheli/days/'+T]:{date:T,meals:[{id:'keep',at:new Date().toISOString(),meal:'בוקר',name:'קפה',kcal:50}]}};
const j=o=>encodeURIComponent(JSON.stringify(o));
const noX=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
const AI={v:1,kind:'meal',name:'ארוחת ערב',shared:true,items:[{name:'קוטג',amount:'גביע',grams:250,kcal:200,protein:20},{name:'פסטה',amount:'סיר',grams:800,kcal:'1200',protein:40},{name:'רוטב',kcal:{x:1},protein:-3},null,{kcal:5}]};
(async()=>{for(const [w,h] of [[390,844],[320,568]]){console.log('===',w);const full=w===390;
 const {browser,page:p,errors}=await open({user:'victor',width:w,height:h,seed:false,expose:true,preinit:pre(docs)});p.setDefaultTimeout(5000);
 const set=async v=>{await p.evaluate(x=>{location.hash=x},v);await p.waitForTimeout(120)};
 try{
 if(full){
  // manual plate
  await p.click('#open-food');check('one Claude link, no old buttons',await p.locator('#claude-link').isVisible()&&!(await p.locator('#photo-link').count())&&(await p.getAttribute('#claude-link','href'))==='https://claude.ai/artifact/SJ29RfbqxbbN9kdiLwrpZN');
  await p.evaluate(()=>{document.getElementById('food-more').open=true}).then(()=>p.click('#pt-open'));const ty=await p.inputValue('#m-type');check('default name by meal type',(await p.inputValue('#pt-name'))===(ty==='נשנוש'?'נשנוש':'ארוחת '+ty),await p.inputValue('#pt-name'));
  await p.locator('[data-pt-food="פיצה"]').click();await p.locator('[data-pt-size="0"][data-v="1.5"]').click();await p.locator('[data-pt-rc="r1"]').click();
  await p.fill('#pt-fn','סלט');await p.fill('#pt-fk','100');await p.fill('#pt-fp','2');await p.click('#pt-fadd');
  await p.fill('#pt-q','קוטג');await p.click('#pt-go');await p.waitForTimeout(150);await p.locator('[data-pt-res]').first().click();
  check('running total',/1,490/.test(await p.locator('#pt-total').innerText()),await p.locator('#pt-total').innerText());
  await p.click('#pt-save');await p.waitForTimeout(60);let d=await store(p,root+'people/victor/days/'+T);let m=d&&d.meals.find(x=>x.parts);
  check('plate saved with sums',m&&m.parts.length===4&&m.kcal===1490&&m.protein===45+10+2+11&&m.parts[0].size===1.5&&m.parts.map(x=>x.src).join()==='usual,recipe,manual,product',m);
  check('list shows N items',/4 פריטים/.test(await p.locator('.panel.mine .ml').innerText()));
  check('toast with undo',await p.locator('#toast button').isVisible());
  // edit
  await p.locator(`.panel.mine [data-edit=meals][data-i="${m.id}"]`).click();check('edit opens plate',(await p.locator('#pt-t').innerText())==='עריכת צלחת'&&(await p.locator('#pt-parts .dish').count())===4);
  await p.locator('[data-pt-size="0"][data-v="1"]').click();await p.click('#pt-save');await p.waitForTimeout(60);d=await store(p,root+'people/victor/days/'+T);
  check('edit replaces, kcal 1090',d.meals.length===1&&d.meals[0].kcal===1090&&d.meals[0].id===m.id,d.meals.map(x=>[x.name,x.kcal]));
  // undo of a new plate
  await p.click('#open-food');await p.evaluate(()=>{document.getElementById('food-more').open=true}).then(()=>p.click('#pt-open'));await p.fill('#pt-fn','x');await p.click('#pt-fadd');await p.click('#pt-save');await p.waitForTimeout(40);await p.click('#toast button');await p.waitForTimeout(40);d=await store(p,root+'people/victor/days/'+T);check('undo removes plate',d.meals.length===1);
 }
 // #ai= meal, shared
 await set('ai='+j(AI));check('ai opens plate',await p.locator('#pt-card').isVisible()&&(await p.locator('#pt-parts .dish').count())===3);check('hash removed',await p.evaluate(()=>location.hash)==='');
 check('shared preselected',await p.isChecked('#pt-share'));check('kept in session',/plate/.test(await p.evaluate(()=>sessionStorage.getItem('fit_import'))));
 check('product match offered',(await p.locator('[data-pt-prod]').count())===1);
 await p.screenshot({path:`shots/plate-${w}.png`});check(w+' plate no h-scroll',(await noX(p))<=0);
 if(full){
  await p.reload();await p.waitForTimeout(600);check('ai plate survives reload',await p.locator('#pt-card').isVisible()&&(await p.locator('#pt-parts .dish').count())===3);
  await p.click('[data-pt-prod="0"]');await p.locator('[data-pt-size="1"][data-v="0.5"]').click();await p.click('#pt-save');await p.waitForTimeout(80);
  let d=await store(p,root+'people/victor/days/'+T);const m=d.meals.find(x=>x.table);const tb=m&&await store(p,root+'tables/'+m.table);
  check('owner plate: product values and own portion',m&&m.kcal===225+600&&m.parts[0].src==='product'&&m.sharedWith==='racheli',m);
  check('table doc full amounts',tb&&tb.by==='victor'&&tb.date===T&&tb.parts.length===3&&tb.parts[1].kcal===1200&&JSON.stringify(tb.taken)==='{}',tb);
  check('import dropped on save',!(await p.evaluate(()=>sessionStorage.getItem('fit_import'))));
  check('owner sees no table card',await p.locator('#tables').isHidden());
  // partner
  await p.evaluate(()=>{document.getElementById('toast').hidden=true});await p.click('#tab-progress');await p.click('#switchme');await p.click('#who-r');await p.waitForTimeout(150);
  check('partner card',/שולחן משותף מויקטור: ארוחת ערב/.test(await p.locator('#tables').innerText()));
  await p.screenshot({path:`shots/table-${w}.png`,fullPage:false});
  await p.locator('[data-tb-size][data-i="1"][data-v="1.5"]').click();await p.locator('[data-tb-size][data-i="0"][data-v="0"]').click();await p.click('[data-tb-save]');await p.waitForTimeout(80);
  d=await store(p,root+'people/racheli/days/'+T);let t2=await store(p,root+'tables/'+m.table);const rm=d.meals.find(x=>x.table);
  check('partner plate added, other meal kept',d.meals.length===2&&d.meals.some(x=>x.id==='keep')&&rm.kcal===1800&&rm.parts.length===2&&rm.sharedBy==='victor',d.meals);
  check('taken marked',t2.taken.racheli===true&&await p.locator('#tables').isHidden());
  await p.click('#toast button');await p.waitForTimeout(80);d=await store(p,root+'people/racheli/days/'+T);t2=await store(p,root+'tables/'+m.table);
  check('undo: meal out, card back',d.meals.length===1&&t2.taken.racheli===null&&await p.locator('#tables').isVisible());
  await p.click('[data-tb-skip]');await p.waitForTimeout(60);t2=await store(p,root+'tables/'+m.table);check('dismiss',t2.taken.racheli===false&&await p.locator('#tables').isHidden());
  // ai recipe
  await set('ai='+j({v:1,kind:'recipe',name:'עוגה',servings:4,items:[{name:'קמח',grams:200,kcal:700,protein:20},{name:'ביצה',kcal:70}]}));
  check('recipe form prefilled',await p.locator('#rc-form').isVisible()&&(await p.locator('#rc-ings .ing').count())===2&&(await p.locator('#rc-ings .i-k').first().inputValue())==='350'&&(await p.locator('#rc-ings .i-k').nth(1).inputValue())==='');
  check('needs filling note',/חסרה/.test(await p.locator('#rc-note').innerText()));await p.click('#rc-x');
  await set('ai='+j({v:2,kind:'meal',items:[{name:'a'}]}));check('bad version toast',/לא תקין/.test(await p.locator('#toast').innerText()));
 }else{
  await p.click('#pt-save');await p.waitForTimeout(80);await p.evaluate(()=>{document.getElementById('toast').hidden=true});await p.click('#tab-progress');await p.click('#switchme');await p.click('#who-r');await p.waitForTimeout(150);
  check('320 card',await p.locator('#tables .tablecard').isVisible());await p.locator('#tables').scrollIntoViewIfNeeded();await p.screenshot({path:`shots/table-${w}.png`});check('320 table no h-scroll',(await noX(p))<=0);
 }
 }catch(e){console.log('FAIL exception',e.message.slice(0,500));fails++}
 check('no console errors',!errors.length,errors);await browser.close()}
 console.log(fails?'FAILS '+fails:'ALL PASS');process.exit(0)})();
