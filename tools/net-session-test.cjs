'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../js/net-engine.js'),S=require('../js/net-session.js');
for(let level=1;level<=20;level++){
 const b=E.generateLevel(level,42);E.turn(b,0,-1);E.hint(b);const r=S.restore(S.encode(b),E);assert.deepEqual(r,b);
 const bad=JSON.parse(S.encode(b));bad.masks[0]=0;assert.equal(S.restore(JSON.stringify(bad),E),null);
 for(const [key,value] of [['seed',-1],['moves',-1],['hintsLeft',4],['level',21]]){const d=JSON.parse(S.encode(b));d[key]=value;assert.equal(S.restore(JSON.stringify(d),E),null);}
}
assert.equal(S.restore('{',E),null);assert.equal(S.restore('x'.repeat(13000),E),null);
(async()=>{
 const {Window}=await import('happy-dom');
 const KEY='mylog-net-run-v1';
 function boot(saved,shared){const w=new Window({url:'https://test.invalid/game/net.html',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});w.document.write(fs.readFileSync('game/net.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));if(shared)Object.defineProperty(w,'localStorage',{value:{
 getItem(key){if(shared.failReads>0){shared.failReads--;throw Error('read denied');}return shared.items.get(key)??null;},
 setItem(key,value){shared.attempts++;if(shared.failWrite)throw Error('write denied');shared.items.set(key,String(value));}
 }});if(saved)w.localStorage.setItem(KEY,saved);for(const p of ['js/net-engine.js','js/net-session.js','game/js/workshop-session.js','js/net.js'])w.eval(fs.readFileSync(p,'utf8'));return w;}
 let w=boot(),d=w.document;d.querySelector('#net-board button').click();assert.equal(d.querySelector('#move-count').textContent,'1');
 const save=w.localStorage.getItem('mylog-net-run-v1');d.querySelector('#undo-board').click();assert.equal(Number(d.querySelector('#move-count').textContent),0);
 d.querySelector('#turn-direction').click();assert.equal(d.querySelector('#turn-direction').getAttribute('aria-pressed'),'true');
 d.querySelector('#net-board button').click();d.querySelector('#reset-board').click();assert.equal(d.querySelector('dialog').open,true);d.querySelector('.workshop-sheet-actions button').click();assert.equal(d.querySelector('#move-count').textContent,'1');
 await w.happyDOM.abort();w=boot(save);d=w.document;assert.equal(d.querySelector('#move-count').textContent,'1');assert.match(d.querySelector('#net-status').textContent,/已恢复/);await w.happyDOM.abort();
 const model=(raw)=>({items:new Map(raw===null?[]:[[KEY,raw]]),attempts:0,failReads:0});
 const el=(w,id)=>w.document.getElementById(id);
 const switchTo=(w,level)=>{const control=el(w,'board-level');control.value=String(level);control.dispatchEvent(new w.Event('change'));};
 const rotate=(w)=>el(w,'net-board').querySelector('button').click();
 {
  const b=E.generateLevel(1,0), fixed=b.masks.findIndex(m=>m===15);
  assert.equal(fixed,13);
  assert.equal(E.turn(b,fixed,1),false);
  assert.equal(E.turn(b,fixed,-1),false);
  assert.equal(b.moves,0);
  E.hint(b); const shared=model(S.encode(b)), w=boot(undefined,shared);
  try{
   const tile=i=>el(w,'net-board').children[i];
   const fixedTile=tile(fixed);
   fixedTile.focus();
   fixedTile.click();
   fixedTile.dispatchEvent(new w.KeyboardEvent('keydown',{key:'r',bubbles:true}));
   assert.match(el(w,'net-status').textContent,/不计步/);
   assert.equal(w.document.activeElement,fixedTile);
   assert.equal(shared.attempts,0);
   assert.equal(el(w,'undo-board').disabled,true);
   const real=tile(0);real.click(); const one=shared.items.get(KEY);
   assert.equal(JSON.parse(one).moves,b.moves+1);
   fixedTile.click();
   assert.equal(shared.items.get(KEY),one);
   assert.equal(shared.attempts,1);
   el(w,'undo-board').click();
   assert.deepEqual(JSON.parse(shared.items.get(KEY)).masks,b.masks);
   assert.equal(JSON.parse(shared.items.get(KEY)).moves,b.moves);
   assert.equal(shared.attempts,2);
  } finally { await w.happyDOM.abort(); }
 }
 const first=S.encode(E.generateLevel(1,42));
 const withHint=E.generateLevel(2,100);E.hint(withHint);
 {
  const existing=S.encode(withHint), shared=model(existing);shared.failReads=1;
  const a=boot(undefined,shared);
  assert.equal(shared.items.get(KEY),existing,'a failed initial read cannot overwrite the existing save');
  assert.equal(shared.attempts,0);assert.match(el(a,'save-status').textContent,/无法读取/);
  el(a,'hint-board').click();assert.equal(shared.attempts,0,'unknown baseline cannot write even if a later read would work');
  await a.happyDOM.abort();
 }
 for(const action of ['new-board','hint-board']){
  const shared=model(first), a=boot(undefined,shared), b=boot(undefined,shared);
  try{
   assert.equal(shared.attempts,0,'both restores are read-only');
   el(b,'reset-board').click();assert.equal(shared.attempts,0,'resetting an untouched board does not write');
   switchTo(a,2);el(a,'hint-board').click();
   const latest=shared.items.get(KEY);assert.equal(JSON.parse(latest).level,2);
   assert.equal(JSON.parse(latest).hintsLeft,2);assert.equal(shared.attempts,2);
   const oldTile=el(b,'net-board').children[0].innerHTML;
   el(b,action).click();
   assert.equal(shared.items.get(KEY),latest,'stale zero-move '+action+' must preserve newer bytes');
   assert.equal(shared.attempts,2);assert.equal(el(b,'board-level').value,'1');
   if(action==='new-board')assert.equal(el(b,'net-board').children[0].innerHTML,oldTile);
   else assert.equal(Number(el(b,'hint-count').textContent),2,'stale hints remain local and use normal budget');
   assert.match(el(b,'save-status').textContent,/另一个页面已更改存档.*未保存/);
   el(b,'turn-direction').click();assert.match(el(b,'save-status').textContent,/未保存/);
   const reload=boot(undefined,shared);assert.equal(el(reload,'board-level').value,'2');await reload.happyDOM.abort();
  }finally{await a.happyDOM.abort();await b.happyDOM.abort();}
 }
 {
  const shared=model(first), a=boot(undefined,shared);
  el(a,'hint-board').click();rotate(a);el(a,'undo-board').click();
  assert.equal(JSON.parse(shared.items.get(KEY)).hintsLeft,2);
  rotate(a);el(a,'reset-board').click();
  assert(a.document.querySelector('dialog').open);
  a.document.querySelector('.workshop-sheet-actions button:last-child').click();
  assert.equal(JSON.parse(shared.items.get(KEY)).moves,0);
  assert.equal(JSON.parse(shared.items.get(KEY)).hintsLeft,2,'confirmed reset does not refund hints');
  const before=shared.items.get(KEY);
  shared.failWrite=true;rotate(a);assert.equal(shared.items.get(KEY),before);
  assert.match(el(a,'save-status').textContent,/无法保存/);
  shared.failWrite=false;rotate(a);
  assert.equal(JSON.parse(shared.items.get(KEY)).moves,2,'both local actions save after a successful retry');
  el(a,'reset-board').click();assert(a.document.querySelector('dialog').open);
  shared.items.delete(KEY);
  const notify=(key,storageArea)=>{const e=new a.Event('storage');Object.assign(e,{key,storageArea});a.dispatchEvent(e);};
  notify(null,{});notify('unrelated',a.localStorage);assert.match(el(a,'save-status').textContent,/自动保存/);
  notify(null,a.localStorage);assert.match(el(a,'save-status').textContent,/另一个页面已更改/);
  a.document.querySelector('.workshop-sheet-actions button:last-child').click();
  assert.equal(Number(el(a,'move-count').textContent),2,'stale-confirmed reset keeps local board');
  rotate(a);assert.equal(shared.items.has(KEY),false,'cleared storage stays cleared');
  await a.happyDOM.abort();
 }
 {
  const won=E.generateLevel(1,42);won.masks=won.solution.slice();
  const shared=model(S.encode(won)), a=boot(undefined,shared), b=boot(undefined,shared);
  try {
   assert.equal(el(a,'victory').hidden,false);assert.equal(shared.attempts,0);
   el(a,'next-level').click();assert.equal(JSON.parse(shared.items.get(KEY)).level,2);
   el(b,'next-level').click();assert.equal(el(b,'board-level').value,'1');
   assert.equal(el(b,'victory').hidden,false);assert.equal(shared.attempts,1);
  }finally{await a.happyDOM.abort();await b.happyDOM.abort();}
 }
 for(const raw of [null,'{invalid','{"version":2,"level":3}']){
  const shared=model(raw), a=boot(undefined,shared);
  assert.equal(shared.items.get(KEY)??null,raw);assert.equal(shared.attempts,0);
  el(a,'reset-board').click();assert.equal(shared.attempts,0,'untouched Reset cannot create or repair a save');
  el(a,'hint-board').click();
  if(raw?.includes('"version":2')) {
   assert.equal(shared.items.get(KEY),raw);assert.equal(shared.attempts,0);assert.match(el(a,'save-status').textContent,/较新版本/);
  }else assert.equal(JSON.parse(shared.items.get(KEY)).hintsLeft,2);
  await a.happyDOM.abort();
 }
 console.log('Net session: all 20 levels restore/validation, rotation undo/direction, restart cancel and real UI reload passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
