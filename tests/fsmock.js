// Fake Firestore with real-SDK write surface: FieldValue, FieldPath, set+merge, update (dotted, FieldPath), batch, docChanges, metadata.
// base = last server state, q = ordered pending writes, view = base + q. Online with no __srv binding: acks after a macrotask.
(()=>{const apply=window.__fsApply;
const base=new Map(),q=[],subs=new Set();let on=window.__fsOnline!==false,busy=false;
const noUndef=(v,w)=>{if(v===undefined)throw new Error('Unsupported field value: undefined ('+w+')');if(Array.isArray(v))v.forEach(x=>{if(Array.isArray(x))throw new Error('Nested arrays');noUndef(x,w)});else if(v&&typeof v==='object')for(const k in v)noUndef(v[k],w)};
const clone=v=>JSON.parse(JSON.stringify(v));
const view=()=>{const m=new Map(base);q.forEach(b=>b.ws.forEach(w=>{const c=m.get(w.p);let n;try{n=apply(c,w)}catch(e){return}if(n===undefined)m.delete(w.p);else m.set(w.p,n)}));return m};
const pendingPaths=()=>new Set(q.flatMap(b=>b.ws.map(w=>w.p)));
const fire=()=>subs.forEach(f=>f());
const flush=async()=>{if(busy||!on)return;busy=true;while(q.length&&on){const b=q[0];
  if(window.__denyWrites){q.shift();const e=new Error(window.__denyWrites);e.code=window.__denyWrites;fire();b.rej(e);continue}
  try{ if(window.__srv){const res=await window.__srv(b.ws);res.forEach(([p,d])=>{if(d==null)base.delete(p);else base.set(p,d)})} else {await new Promise(r=>setTimeout(r,window.__ackMs||0));b.ws.forEach(w=>{const n=apply(base.get(w.p),w);if(n===undefined)base.delete(w.p);else base.set(w.p,n)})}
   q.shift();fire();b.res()}catch(e){q.shift();fire();b.rej(e)}}busy=false};
const enqueue=ws=>new Promise((res,rej)=>{q.push({ws,res,rej});fire();flush()});
const mkSet=(p,d,opt)=>{noUndef(d,'set');return{op:'set',p,d:clone(d),merge:!!(opt&&opt.merge)}};
const mkUpd=(p,args)=>{let paths=[];if(args[0] instanceof FieldPath){for(let i=0;i<args.length;i+=2){noUndef(args[i+1],'update');paths.push([args[i].segs,clone(args[i+1])])}}else{const d=args[0];noUndef(d,'update');for(const k in d){if(/[~*\/\[\]]/.test(k))throw new Error('Invalid field path');paths.push([k.split('.'),clone(d[k])])}}return{op:'update',p,paths}};
class FieldPath{constructor(...s){this.segs=s}}
const doc=p=>({id:p.split('/').pop(),set:(d,o)=>enqueue([mkSet(p,d,o)]),update:(...a)=>enqueue([mkUpd(p,a)]),delete:()=>enqueue([{op:'delete',p}]),_p:p});
const col=c=>{const self={orderBy(){return self},limit(){return self},onSnapshot(a,b,cc){const inc=typeof a==='object'&&a.includeMetadataChanges;const next=typeof a==='function'?a:b;const err=typeof a==='function'?b:cc;let prev=new Map(),first=true,pendPrev=null,dead=false;
   const delay=/\/days$/.test(c)?(window.__coldDays||0):0;
   const f=()=>{if(dead)return;if(window.__failListen&&window.__failListen(c)){dead=true;subs.delete(f);const e=new Error('x');e.code=window.__failListen(c);err&&err(e);return}
     const v=view(),pp=pendingPaths(),cur=new Map();for(const[k,d]of v)if(k.startsWith(c+'/')&&k.split('/').length===c.split('/').length+1)cur.set(k,JSON.stringify(d));
     const ch=[];for(const[k,s]of cur){if(!prev.has(k))ch.push({type:'added',p:k});else if(prev.get(k)!==s)ch.push({type:'modified',p:k})}for(const k of prev.keys())if(!cur.has(k))ch.push({type:'removed',p:k});
     const pend=[...cur.keys()].some(k=>pp.has(k));
     if(!first&&!ch.length&&(!inc||pend===pendPrev))return;
     const mkDoc=k=>{const raw=v.get(k)||JSON.parse(prev.get(k)||'{}');return{id:k.split('/').pop(),exists:v.has(k),data:()=>clone(raw),metadata:{hasPendingWrites:pp.has(k),fromCache:false}}};
     const snap={docs:[...cur.keys()].map(mkDoc),metadata:{fromCache:!on,hasPendingWrites:pend},docChanges:()=>ch.map(x=>({type:x.type,doc:mkDoc(x.p)}))};
     prev=cur;first=false;pendPrev=pend;next(snap)};
   setTimeout(()=>{subs.add(f);f()},delay);return()=>{dead=true;subs.delete(f)}}};return self};
const fs={collection:col,doc,batch(){const ws=[];const B={set(r,d,o){ws.push(mkSet(r._p,d,o));return B},update(r,...a){ws.push(mkUpd(r._p,a));return B},delete(r){ws.push({op:'delete',p:r._p});return B},commit:()=>enqueue(ws)};return B},enablePersistence:async()=>{}};
const firestore=()=>fs;firestore.FieldValue={arrayUnion:(...items)=>{noUndef(items,'union');return{__fv:'union',items:clone(items)}},arrayRemove:(...items)=>{noUndef(items,'remove');return{__fv:'remove',items:clone(items)}}};firestore.FieldPath=FieldPath;
window.firebase={apps:[],initializeApp(){this.apps.push(1)},firestore};
window.__store=base;window.__view=view;window.__fire=fire;window.__model={online(v){on=v;flush();fire()},pending:()=>q.length,push(p,d){if(d==null)base.delete(p);else base.set(p,d);fire()}};
})();
