'use strict';
(async()=>{const {Window}=await import('happy-dom');const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),root=path.join(__dirname,'..');const w=new Window({url:'http://localhost/game/sheep-triple.html'});w.document.write(fs.readFileSync(path.join(root,'game/sheep-triple.html'),'utf8').replace(/<script[\s\S]*?<\/script>/g,''));w.eval(fs.readFileSync(path.join(root,'game/js/sheep-triple-engine.js'),'utf8'));const E=w.SheepTriple,create=E.create;let current;E.create=(level,seed,previousLayout)=>current=create(level,200+(calls++),previousLayout);let calls=0;let audioToggle=0,audioVolume=0;const audioCues=[];w.SheepTripleAudio={create:({onChange})=>({getState:()=>({supported:true,enabled:false,status:"off"}),toggle:()=>{audioToggle++;onChange({supported:true,enabled:true,status:"playing"});},setVolume:v=>audioVolume=v,cue:kind=>audioCues.push(kind)})};w.eval(fs.readFileSync(path.join(root,'game/js/sheep-triple.js'),'utf8'));const $=id=>w.document.getElementById(id);assert.equal(w.document.querySelectorAll('.tile').length,36);$('music-toggle').click();assert.equal(audioToggle,1);assert.equal($('music-toggle').getAttribute('aria-pressed'),'true');$('music-volume').value='40';$('music-volume').dispatchEvent(new w.Event('input'));assert.equal(audioVolume,.4);assert.equal($('rack').children.length,7);assert.equal($('holding').children.length,3);assert.equal($('remaining').textContent,'36 张待消除');
for(let level=0;level<5;level++){w.document.querySelectorAll('.level')[level].click();assert.equal(current.level,level);for(const t of ['remove','undo','shuffle'])assert.equal($('count-'+t).textContent,String(E.LEVELS[level].tools));const family=current.layout;const old=current.tiles.map(t=>[t.x,t.y]);$('restart').click();assert.notEqual(current.layout,family);assert.notDeepEqual(current.tiles.map(t=>[t.x,t.y]),old);}
w.document.querySelectorAll('.level')[0].click();const cert=current.certificate.slice();let first=cert[0];w.document.querySelector(`[data-id="${first}"]`).click();assert.equal(current.removed.length,1);assert.equal(audioCues.at(-1),'tap');assert.equal(w.document.querySelectorAll('.meadow-tile-feedback').length,1);assert.equal(JSON.parse(w.localStorage.getItem('mylog-meadow-run-v1')).steps.length,1);const before=w.localStorage.getItem('mylog-meadow-run-v1'),beforeCalls=calls;const chips=w.document.querySelectorAll('.level');chips[0].click();assert.equal(calls,beforeCalls,'active level is a no-op');assert.equal(w.localStorage.getItem('mylog-meadow-run-v1'),before);chips[1].click();assert.equal($('leave-dialog').open,true);assert.equal(w.document.activeElement,$('leave-cancel'));assert.equal(w.localStorage.getItem('mylog-meadow-run-v1'),before);const during=restoreRun(before);assert.equal(during.__state().removed.length,1);await during.happyDOM.abort();$('leave-dialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal($('leave-dialog').open,false);assert.equal(w.document.activeElement,chips[1]);assert.equal(current.level,0);assert.equal(w.localStorage.getItem('mylog-meadow-run-v1'),before);$('restart').click();$('leave-cancel').click();assert.equal(w.document.activeElement,$('restart'));assert.equal(w.localStorage.getItem('mylog-meadow-run-v1'),before);$('tool-undo').click();assert.equal(w.document.querySelector('.meadow-tile-feedback'),null);assert.equal(current.removed.length,0);assert.equal($('count-undo').textContent,'2');w.document.querySelector(`[data-id="${first}"]`).click();$('tool-remove').click();assert.equal(current.holding.length,1);$('holding').querySelector('button').click();assert.equal(current.holding.length,0);assert.equal(current.rack.length,1);$('tool-shuffle').click();assert.equal($('count-shuffle').textContent,'2');assert(E.verify(current,current.certificate).valid);assert($('message').textContent.includes('验证有可行解'));
$('restart').click();assert.equal($('leave-dialog').open,true);$('leave-confirm').click();for(const id of current.certificate.slice()){const b=w.document.querySelector(`[data-id="${id}"]`);assert(b&&!b.disabled);b.click();await new Promise(r=>setImmediate(r));}assert.equal(current.status,'won');assert.equal(audioCues.at(-1),'win');assert($('result').classList.contains('result-won'));assert(audioCues.includes('match'));assert.equal($('remaining').textContent,'0 张待消除');assert.equal($('result').hidden,false);$('next').click();assert.equal(current.level,1);assert.equal(current.tiles.length,54);assert.equal(current.status,'playing');assert.equal($('count-shuffle').textContent,'3');
w.document.querySelectorAll('.level')[4].click();assert.equal(current.level,4);assert.equal($('leave-dialog').open,false);for(const id of current.certificate.slice()){const b=w.document.querySelector(`[data-id="${id}"]`);assert(b&&!b.disabled);b.click();await new Promise(r=>setImmediate(r));}assert.equal(current.status,'won');assert.equal($('result-title').textContent,'第 5 关完成');assert.doesNotMatch($('result-text').textContent,/五关全部/);w.document.querySelectorAll('.level')[3].click();assert.equal(current.level,3);assert.equal($('leave-dialog').open,false);
w.document.querySelector('.tile.available').click();w.document.querySelectorAll('.level')[1].click();assert.equal($('leave-dialog').open,true);$('leave-confirm').click();assert.equal(current.level,1);assert.equal(current.removed.length,0);
// Rehydrate a genuine old 288-tile action log, then reload its migrated envelope.
const F=require('../game/js/sheep-triple-engine.js'),legacy=F.create(2,42,0,1),steps=[];
for(const id of legacy.certificate.slice(0,5)){assert(F.take(legacy,id));steps.push(['take',id]);}
assert(F.tool(legacy,'undo'));steps.push(['tool','undo']);
if(F.tool(legacy,'remove'))steps.push(['tool','remove']);
assert(F.tool(legacy,'shuffle'));steps.push(['tool','shuffle']);
const raw=JSON.stringify({version:1,level:2,seed:42,previousLayout:0,steps});
function restoreRun(saved,reduced=false,shared){const rw=new Window({url:'https://example.test/game/sheep-triple.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});rw.document.write(fs.readFileSync(path.join(root,'game/sheep-triple.html'),'utf8').replace(/<script[\s\S]*?<\/script>/g,''));rw.matchMedia=()=>({matches:reduced});if(shared)Object.defineProperty(rw,'localStorage',{value:{
getItem:key=>{if(shared.readFails)throw Error('read denied');return shared.items.get(key)??null;},
setItem:(key,value)=>{if(shared.writeFails)throw Error('write denied');shared.items.set(key,String(value));shared.writes++;}
}});else rw.localStorage.setItem('mylog-meadow-run-v1',saved);rw.eval(fs.readFileSync(path.join(root,'game/js/sheep-triple-engine.js'),'utf8'));let source=fs.readFileSync(path.join(root,'game/js/sheep-triple.js'),'utf8');source=source.replace(/\}\)\(\);\s*$/,'window.__state=()=>JSON.parse(JSON.stringify(state));})();');rw.eval(source);return rw;}
const key='mylog-meadow-run-v1';
const open=(shared)=>restoreRun(undefined,true,shared);
const get=(win,id)=>win.document.getElementById(id);
const pick=(win,id)=>{const b=win.document.querySelector(`[data-id="${id}"]`);assert(b&&!b.disabled,`tile ${id} is selectable`);b.click();};
const fixture=(boardVersion,version=boardVersion)=>{const board=F.create(4,42,null,boardVersion);return JSON.stringify({
 version,...(version===2?{boardVersion}:{}),level:4,seed:42,previousLayout:null,steps:board.certificate.slice(0,24).map(id=>['take',id])
});};
for(const [boardVersion,run,alternate] of [[2,[92,14,66,99],14],[1,[246,277,284,261],186]]) {
 const initial=fixture(boardVersion), shared={items:new Map([[key,initial]]),writes:0}, a=open(shared), b=open(shared);
 try {
  run.forEach(id=>pick(a,id));
  const latest=shared.items.get(key);
  assert.equal(JSON.parse(latest).steps.length,28);
  pick(b,alternate);
  assert.equal(shared.items.get(key),latest,'older legal move must preserve the newer saved bytes');
  assert.equal(b.__state().removed.length,25,'older board remains locally playable');
  assert.match(get(b,'save-status').textContent,/另一个页面已更改存档.*未保存/);
  const r=open(shared); assert.equal(JSON.stringify(r.__state()),JSON.stringify(a.__state())); await r.happyDOM.abort();
  get(b,'restart').click(); get(b,'leave-confirm').click();
  assert.equal(b.__state().removed.length,25,'stale restart cannot discard the local board');
  b.document.querySelectorAll('.level')[3].click(); get(b,'leave-confirm').click();
  assert.equal(b.__state().level,4,'stale switch cannot discard the local board');
  assert.equal(shared.items.get(key),latest);
  assert.equal(shared.writes,4,'no passive write (including legacy resume) or rejected write');
 } finally {await a.happyDOM.abort();await b.happyDOM.abort();}
}
{
 const initial=fixture(2), shared={items:new Map([[key,initial]]),writes:0}, a=open(shared);
 try {
  get(a,'restart').click(); assert(get(a,'leave-dialog').open);
  shared.items.delete(key); // Clear happened while confirmation was open.
  const event=new a.Event('storage'); Object.defineProperty(event,'key',{value:null});
  a.dispatchEvent(event);
  assert.match(get(a,'save-status').textContent,/另一个页面已更改存档/);
  get(a,'leave-confirm').click(); assert.equal(a.__state().removed.length,24);
  pick(a,14); assert.equal(a.__state().removed.length,25);
  assert.equal(shared.items.has(key),false,'never resurrect a cleared save');
  shared.items.set(key,initial); // Even exact old bytes cannot unmark an already seen conflict.
  get(a,'tool-undo').click(); assert.equal(shared.writes,0);
 } finally {await a.happyDOM.abort();}
}
{
 const initial=fixture(2), shared={items:new Map([[key,initial]]),writes:0}, a=open(shared);
 try {
  shared.writeFails=true; pick(a,92);
  assert.match(get(a,'save-status').textContent,/无法保存/);
  assert.equal(shared.items.get(key),initial);
  shared.writeFails=false; pick(a,14);
  assert.equal(JSON.parse(shared.items.get(key)).steps.length,26,'retry includes both local actions');
  assert.match(get(a,'save-status').textContent,/自动保存/);
  const r=open(shared); assert.equal(JSON.stringify(r.__state()),JSON.stringify(a.__state())); await r.happyDOM.abort();
 } finally {await a.happyDOM.abort();}
}
{
 const initial=fixture(2), shared={items:new Map([[key,initial]]),writes:0,readFails:true}, a=open(shared);
 try {
  assert.match(get(a,'save-status').textContent,/无法保存/);
  shared.readFails=false;
  const first=a.document.querySelector('.tile.available');first.click();
  assert.equal(a.__state().removed.length,1);
  assert.equal(shared.items.get(key),initial,'initial unavailable read does not establish save ownership');
 } finally {await a.happyDOM.abort();}
}
for(const starting of [null,'{invalid']){
 const shared={items:new Map(starting===null?[]:[[key,starting]]),writes:0}, a=open(shared), b=open(shared);
 try {
  assert.equal(shared.items.get(key)??null,starting,'loading does not replace missing or malformed bytes');
  assert.equal(shared.writes,0);
  a.document.querySelector('.tile.available').click();
  const first=shared.items.get(key);
  assert.equal(JSON.parse(first).steps.length,1);
  b.document.querySelector('.tile.available').click();
  assert.equal(shared.items.get(key),first,'first committed move wins from vacant or malformed baseline');
  assert.equal(shared.writes,1);
  assert.match(get(b,'save-status').textContent,/另一个页面已更改存档/);
 } finally {await a.happyDOM.abort();await b.happyDOM.abort();}
}
{
 const seed=88, picks=[24,20,22,6,35,23,25,30,27,19,18,0,5,2,34,4,12,32,1,33,26,9,28,21,14,31];
 const steps=picks.map(id=>['take',id]);
 const initial=JSON.stringify({version:2,boardVersion:2,level:0,seed,previousLayout:null,steps});
 const shared={items:new Map([[key,initial]]),writes:0}, a=open(shared);
 try {
  const s=a.__state(), full=JSON.stringify({...s,message:''});
  assert(s.history.length>0);
  get(a,'tool-shuffle').focus();
  get(a,'tool-shuffle').click();
  assert.equal(JSON.stringify({...s,message:''}),full,'new unchanged shuffle is inert');
  assert.equal(shared.writes,0);
  assert.equal(shared.items.get(key),initial);
  assert.equal(a.document.activeElement.id,'tool-shuffle');
  assert.match(get(a,'message').textContent,/未扣洗牌次数/);
  get(a,'tool-undo').click();
  assert.equal(shared.writes,1);
  assert.deepEqual(JSON.parse(shared.items.get(key)).steps,[...steps,['tool','undo']]);
 } finally { await a.happyDOM.abort(); }
 const oldRaw=JSON.stringify({...JSON.parse(initial),steps:[...steps,['tool','shuffle']]});
 const old=restoreRun(oldRaw);
 try {
  assert.equal(old.__state().counts.shuffle,2);
  assert.equal(old.__state().history.length,0,'historical unchanged shuffle still replays');
  assert.equal(old.localStorage.getItem(key),oldRaw);
 } finally { await old.happyDOM.abort(); }
 const changed=F.create(0,1,null,2); F.take(changed,changed.certificate[0]);
 assert(F.shufflePlan(changed).assignments.some(([id,t])=>changed.tiles[id].type!==t));
 assert(F.tool(changed,'shuffle',{requireChanged:true}));
 assert(F.verify(changed,changed.certificate).valid);
}
for(const status of ['won','lost']){
 const seed=1, board=F.create(0,seed,null,2);
 const play=status==='won'?board.certificate.slice():[18,19,20,0,2,21,1,3,22,23,5,24,4,25,7,26];
 const initial=JSON.stringify({version:2,boardVersion:2,level:0,seed,previousLayout:null,steps:play.slice(0,-1).map(id=>['take',id])});
 const shared={items:new Map([[key,initial]]),writes:0}, a=open(shared);
 try {
  pick(a,play.at(-1));
  assert.equal(a.__state().status,status);
  const r=open(shared); assert.equal(JSON.stringify(r.__state()),JSON.stringify(a.__state())); await r.happyDOM.abort();
  if(status==='won') {
   shared.items.delete(key);
   get(a,'next').click();
   assert.equal(a.__state().level,0); assert.equal(a.__state().status,'won');
   assert.equal(shared.items.has(key),false);
  }
 } finally {await a.happyDOM.abort();}
}
const migrated=restoreRun(raw);assert.equal(JSON.stringify(migrated.__state()),JSON.stringify(legacy));assert.match(migrated.document.getElementById('message').textContent,/旧版 288/);
assert.equal(migrated.localStorage.getItem(key),raw,'opening a legacy save must not rewrite it');
const migrationMove=Number(migrated.document.querySelector('.tile.available').dataset.id);
migrated.document.querySelector('[data-id="'+migrationMove+'"]').click();
assert(F.take(legacy,migrationMove));steps.push(['take',migrationMove]);
const migratedSave=JSON.parse(migrated.localStorage.getItem(key));assert.equal(migratedSave.version,2);assert.equal(migratedSave.boardVersion,1);assert.deepEqual(migratedSave.steps,steps);
const again=restoreRun(JSON.stringify(migratedSave));assert.equal(JSON.stringify(again.__state()),JSON.stringify(legacy));
again.document.getElementById('restart').click();again.document.getElementById('leave-confirm').click();assert.equal(again.__state().boardVersion,2);assert.equal(again.__state().tiles.length,72);assert.equal(JSON.parse(again.localStorage.getItem('mylog-meadow-run-v1')).boardVersion,2);
const quiet=restoreRun(raw,true);const available=quiet.document.querySelector('.tile.available');available.click();assert.equal(quiet.document.querySelector('.meadow-tile-feedback'),null);assert(!quiet.document.getElementById('rack').classList.contains('match-pop'));assert.equal(quiet.__state().removed.length,legacy.removed.length);await quiet.happyDOM.abort();
await migrated.happyDOM.abort();await again.happyDOM.abort();
assert(!w.document.documentElement.innerHTML.includes('初始布局相同'));await w.happyDOM.abort();console.log('sheep-triple UI: five budgets, fresh restart, undo/remove/shuffle, full 36-click win and next-level PASS');})();
