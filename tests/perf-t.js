const {open,root}=require('./harness.js');
const mk=(days)=>`(()=>{const s=window.__store,root='${root}';const pad=n=>String(n).padStart(2,'0');const K=i=>{const d=new Date();d.setDate(d.getDate()-i);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
 s.set(root+'people/victor',{name:'ויקטור',slot:0,goals:{workouts:3}});s.set(root+'people/racheli',{name:'רחלי',slot:1,goals:{workouts:3}});
 const NAMES=['סקוואט','דדליפט','מתח','לחיצת חזה במוט'];
 for(const w of ['victor','racheli'])for(let i=${days};i>=0;i--){const at=new Date(Date.now()-i*864e5).toISOString();s.set(root+'people/'+w+'/days/'+K(i),{date:K(i),weight:80-i*.01,weightAt:at,note:'',exercises:NAMES.map((n,j)=>({id:w+i+'_'+j,at,name:n,sets:3,rows:[1,2,3].map(()=>({reps:8,kg:n==='מתח'?null:40+(${days}-i)*.05+j}))})),meals:[{id:w+'m'+i,at,meal:'ערב',name:'אוכל '+(i%20),kcal:600,protein:40}]})}
})();`;
(async()=>{for(const days of [180,730]){
 const {browser,page,errors}=await open({seed:false,preinit:mk(days),expose:true});await page.waitForTimeout(1500);
 const cdp=await page.context().newCDPSession(page);
 const run=async()=>page.evaluate(()=>{const out=[];for(let i=0;i<6;i++){__t.bumpAll&&i===0&&__t.bumpAll();const t=performance.now();__t.render();out.push(Math.round(performance.now()-t))}return out});
 console.log(days,'days desktop cold,warm...',await run());
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 const r=await run();console.log(days,'days 4x log tab cold,warm...',r);
 const e=await page.evaluate(()=>{const out=[];for(let i=0;i<5;i++){__t.bump('victor');const t=performance.now();__t.render();out.push(Math.round(performance.now()-t))}return out});console.log(days,'days 4x after one person changed',e);
 await page.click('#tab-progress');await page.waitForTimeout(800);console.log(days,'days 4x progress',await run());
 console.log('errors',errors);await browser.close()}})();
