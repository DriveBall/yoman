// Firestore write semantics used by both the page mock and the node-side "server".
(function(root){
const eq=(a,b)=>JSON.stringify(sortK(a))===JSON.stringify(sortK(b));
function sortK(v){if(Array.isArray(v))return v.map(sortK);if(v&&typeof v==='object'){const o={};Object.keys(v).sort().forEach(k=>o[k]=sortK(v[k]));return o}return v}
const isFV=v=>v&&typeof v==='object'&&v.__fv;
function res(cur,v){
 if(isFV(v)){const a=Array.isArray(cur)?cur.slice():[];if(v.__fv==='union'){v.items.forEach(i=>{if(!a.some(x=>eq(x,i)))a.push(i)});return a}if(v.__fv==='remove')return a.filter(x=>!v.items.some(i=>eq(x,i)))}
 return v}
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&!isFV(v);
function strip(d){const o={};for(const k in d){const v=d[k];o[k]=isFV(v)?res(undefined,v):plain(v)?strip(v):v}return o}
function merge(cur,d){const o=Object.assign({},cur);for(const k in d){const v=d[k];
  // an empty map in a merge is a leaf: it replaces, as in the real SDK
  if(plain(v)&&Object.keys(v).length)o[k]=merge(plain(o[k])?o[k]:{},v);else o[k]=res(o[k],v)}return o}
function setPath(o,segs,v){const c=Object.assign({},o);if(segs.length===1){c[segs[0]]=res(c[segs[0]],v);return c}c[segs[0]]=setPath(plain(c[segs[0]])?c[segs[0]]:{},segs.slice(1),v);return c}
function apply(cur,w){ // w:{op,d,merge,paths}
 if(w.op==='delete')return undefined;
 if(w.op==='set')return w.merge?merge(cur||{},w.d):strip(w.d);
 if(w.op==='update'){if(cur===undefined)throw Object.assign(new Error('not-found'),{code:'not-found'});let o=cur;w.paths.forEach(([segs,v])=>{o=setPath(o,segs,v)});return o}
 throw new Error('op')}
root.__fsApply=apply;
if(typeof module!=='undefined')module.exports={apply};
})(typeof window!=='undefined'?window:globalThis);
