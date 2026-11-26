const {open,root}=require('./harness.js');let fails=0;const check=(l,ok,x)=>{console.log((ok?'PASS ':'FAIL ')+l,x===undefined?'':JSON.stringify(x));if(!ok)fails++};
(async()=>{
 for(const [when,expect] of [['2026-11-26T05:30:00','2026-11-25'],['2026-11-26T06:05:00','2026-11-26'],['2026-11-26T23:30:00','2026-11-26']]){
  const {browser,page:p,errors}=await open({user:'victor',date:when,expose:true});await p.waitForTimeout(300);
  check(when+' selected day',await p.evaluate(()=>window.__t.S.sel)===expect,await p.evaluate(()=>window.__t.S.sel));
  await p.click('#open-food');await p.evaluate(()=>{const d=document.getElementById('m-manual');if(d)d.open=true});await p.fill('#m-name','לילה');await p.click('#m-add');await p.waitForTimeout(200);
  const keys=await p.evaluate(r=>[...window.__store.keys()].filter(k=>k.startsWith(r+'people/victor/days/')).filter(k=>(window.__store.get(k).meals||[]).some(m=>m.name==='לילה')),root);
  check(when+' meal saved to '+expect,keys.length===1&&keys[0].endsWith(expect),keys);check(when+' no errors',!errors.length,errors);await browser.close()}
 console.log(fails?'FAILS '+fails:'ALL PASS');process.exit(fails?1:0)})();
