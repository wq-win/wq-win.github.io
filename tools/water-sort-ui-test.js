'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../game/js/water-sort-engine');const {analyze}=require('./water-sort-analysis');const root=path.resolve(__dirname,'..');
(async()=>{const {Window}=await import('happy-dom');const windows=[];
function setup({saved,reduced=true,denied=false,shared}={}){
 const w=new Window({url:'https://example.test/game/water-sort.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});windows.push(w);
 w.document.write(fs.readFileSync(path.join(root,'game/water-sort.html'),'utf8'));w.matchMedia=()=>({matches:reduced});
 if(shared)Object.defineProperty(w,'localStorage',{value:shared});
 if(saved)w.localStorage.setItem('cozy-water-sort-v1',saved);
 if(denied)Object.defineProperty(w,'localStorage',{get(){throw new Error('Denied');}});
 for(const f of ['game/js/water-sort-levels.js','game/js/water-sort-engine.js','game/js/third-games-feedback.js','game/js/water-sort.js','js/game-view.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 return w;
}
const $=(w,id)=>w.document.getElementById(id),b=(w,n)=>w.document.querySelector(`[data-bottle="${n}"]`),clickMove=(w,m)=>{b(w,m.from).click();b(w,m.to).click();},savedState=w=>E.restore(w.localStorage.getItem('cozy-water-sort-v1'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const w=setup();assert.equal(w.document.querySelectorAll('.bottle').length,7);assert.equal($(w,'level-select').options.length,8);
 assert.equal(w.document.querySelectorAll('.liquid-symbol').length,20);assert.equal(w.document.querySelectorAll('.palette-chip').length,5);
 b(w,5).click();assert.match($(w,'feedback').textContent,/这是空瓶/);assert(b(w,5).classList.contains('invalid'));
 b(w,0).click();assert.equal(b(w,0).getAttribute('aria-pressed'),'true');assert(b(w,5).classList.contains('target'));
 b(w,1).click();assert.match($(w,'feedback').textContent,/已经满了/);assert(b(w,0).classList.contains('selected'));assert.equal(savedState(w).moves,0);
 b(w,0).click();assert.equal(w.document.querySelectorAll('.selected').length,0);assert.match($(w,'feedback').textContent,/取消/);
 b(w,0).click();b(w,0).dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(w.document.querySelectorAll('.selected').length,0);
 b(w,0).focus();b(w,0).dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(w.document.activeElement.dataset.bottle,'1');
 assert.equal($(w,'undo').disabled,true);const initial=E.create();const undoFirst=E.solve(initial)[0];clickMove(w,undoFirst);assert.equal(savedState(w).moves,1);assert.equal($(w,'undo').disabled,false);$(w,'undo').click();assert.deepEqual(savedState(w).bottles,initial.bottles);assert.equal($(w,'undo').disabled,true);
 for(const m of E.solve(E.create()))clickMove(w,m);
 assert.equal($(w,'win-card').hidden,false);assert.equal($(w,'sorted-count').textContent,'5');assert.equal(w.document.activeElement.id,'next-level');assert.equal($(w,'water-board').inert,true);
 const resume=setup({saved:w.localStorage.getItem('cozy-water-sort-v1')});assert.equal($(resume,'win-card').hidden,false);assert.match($(resume,'win-detail').textContent,/1 \/ 8/);
 $(w,'next-level').click();assert.equal($(w,'level-number').textContent,'02');assert.equal($(w,'win-card').hidden,true);assert.equal($(w,'water-board').inert,false);
 // A reachable dead end must explain how to replan, including after restore.
 const dead=setup();$(dead,'level-select').value='0';$(dead,'level-select').dispatchEvent(new dead.Event('change'));
 for(const [from,to] of analyze(E.create(0).bottles).deadPath)clickMove(dead,{from,to});
 assert.match($(dead,'feedback').textContent,/没有可倒的位置.*撤销一步.*重新规划/);assert.equal($(dead,'win-card').hidden,true);
 const deadResume=setup({saved:dead.localStorage.getItem('cozy-water-sort-v1')});assert.match($(deadResume,'feedback').textContent,/没有可倒的位置/);const trappedMoves=savedState(deadResume).moves;$(deadResume,'undo').click();assert.equal(savedState(deadResume).moves,trappedMoves-1);assert(E.legalMoves(savedState(deadResume).bottles).length);$(dead,'restart').click();assert.equal($(dead,'water-confirm').open,true);$(dead,'water-replace').click();assert(E.legalMoves(savedState(dead).bottles).length);
 const different=setup();clickMove(different,E.solve(E.create())[0]);
 const mixed=savedState(different).bottles;let mismatch;
 for(let from=0;from<mixed.length;from++)for(let to=0;to<mixed.length;to++)if(E.inspect(mixed,from,to).reason==='color')mismatch={from,to};
 assert(mismatch);clickMove(different,mismatch);assert.match($(different,'feedback').textContent,/顶部颜色不同/);assert.equal(savedState(different).moves,1);
 // All eight levels can be completed through the actual UI handlers.
 const all=setup();for(let i=0;i<8;i++){for(const m of E.solve(E.create(i)))clickMove(all,m);assert.equal($(all,'win-card').hidden,false);if(i<7)$(all,'next-level').click();}
 assert.match($(all,'win-title').textContent,/八份色彩，都收好/);assert.match($(all,'win-detail').textContent,/全部完成/);
 const direct=setup();$(direct,'level-select').value='7';$(direct,'level-select').dispatchEvent(new direct.Event('change'));assert.equal(direct.document.querySelectorAll('.bottle').length,9);assert.equal(direct.document.querySelectorAll('.bottle-row').length,2);
 for(const m of E.solve(E.create(7)))clickMove(direct,m);assert.match($(direct,'win-title').textContent,/最后一份/);assert.doesNotMatch($(direct,'win-title').textContent,/八份|全部/);assert.match($(direct,'win-detail').textContent,/1 \/ 8/);$(direct,'next-level').click();assert.equal($(direct,'level-number').textContent,'01');
 const legacy=setup({saved:JSON.stringify({v:1,level:3,history:[[0,4],[1,5]],completed:[0,2]})});
 assert.deepEqual(savedState(legacy),E.create(3,[0,2]));assert.equal($(legacy,'level-number').textContent,'04');assert.equal(JSON.parse(legacy.localStorage.getItem('cozy-water-sort-v1')).v,1);
 clickMove(legacy,E.solve(E.create(3))[0]);assert.equal(JSON.parse(legacy.localStorage.getItem('cozy-water-sort-v1')).v,2);assert.deepEqual(savedState(legacy).completed,[0,2]);
 const bad=setup({saved:'{broken'});assert.equal(bad.document.querySelectorAll('.bottle').length,7);
 const denied=setup({denied:true});clickMove(denied,E.solve(E.create())[0]);assert.equal(denied.document.querySelectorAll('.liquid').length,20);assert.match($(denied,'saved').textContent,/无法保存/);
 // Startup read failure must not let either boot or a fallback move overwrite an active run.
 const activeKey='cozy-water-sort-v1', bestKey='cozy-water-sort-records-v1';
 const start4=E.create(3,[0,2]), move4=E.solve(start4)[0], played4=E.act(start4,move4.from,move4.to).state;
 const activeRaw=' '+E.save(played4), bestRaw='{"0":16}';
 const faultedStorage=entries=>{
   const slots=new Map(entries), writes=[];let fail=true;
   const adapter={getItem:k=>{if(k===activeKey&&fail){fail=false;throw new Error('startup read failed');}return slots.get(k)??null;},
     setItem:(k,v)=>{writes.push(k);slots.set(k,String(v));}};
   return {slots,writes,adapter};
 };
 const occupied=faultedStorage([[activeKey,activeRaw],[bestKey,bestRaw]]), fallback=setup({shared:occupied.adapter});
 assert.equal(occupied.slots.get(activeKey),activeRaw);assert.deepEqual(occupied.writes,[]);
 assert.match($(fallback,'saved').textContent,/无法保存/);
 clickMove(fallback,E.solve(E.create())[0]);
 assert.equal($(fallback,'move-count').textContent,'1');
 assert.equal(occupied.slots.get(activeKey),activeRaw);assert.equal(occupied.slots.get(bestKey),bestRaw);
 assert.deepEqual(occupied.writes,[]);assert.match($(fallback,'saved').textContent,/无法保存/);
 const restored=setup({shared:occupied.adapter});
 assert.equal($(restored,'level-number').textContent,'04');assert.equal($(restored,'move-count').textContent,'1');
 assert.deepEqual(savedState(restored),played4);assert.equal(occupied.slots.get(bestKey),bestRaw);
 const vacant=faultedStorage([]), fresh=setup({shared:vacant.adapter});
 assert.equal(vacant.slots.has(activeKey),false);assert.deepEqual(vacant.writes,[]);
 assert.match($(fresh,'saved').textContent,/无法保存/);
 clickMove(fresh,E.solve(E.create())[0]);
 assert.equal(savedState(fresh).moves,1);assert.deepEqual(vacant.writes,[activeKey]);
 assert.match($(fresh,'saved').textContent,/进度自动保存/);
 // Loading only reads, even if a newer run arrives between the former read and write.
 const newer4=[[0,6],[0,7],[4,6]].reduce((run,[from,to])=>E.act(run,from,to).state,E.create(3,[0]));
 const previous1=E.act(E.create(0,[3]),1,5).state, newBytes=E.save(newer4);
 let bytes=E.save(previous1), activeReads=0, bootWrites=[];
 const interleaving={getItem(k){if(k!==activeKey)return null;const value=bytes;if(++activeReads===1)bytes=newBytes;return value;},
  setItem(k,v){bootWrites.push(k);if(k===activeKey)bytes=String(v);}};
 const fromOld=setup({shared:interleaving});
 assert.equal($(fromOld,'level-number').textContent,'01');assert.equal(activeReads,1);assert.deepEqual(bootWrites,[]);assert.equal(bytes,newBytes);
 const fromNew=setup({shared:interleaving});
 assert.equal($(fromNew,'level-number').textContent,'04');assert.equal($(fromNew,'move-count').textContent,'3');assert.deepEqual(bootWrites,[]);
 const bestDisk=new Map([[activeKey,newBytes],[bestKey,'{"3":15}']]);let denyBest=true;const applied=[];
 const bestFault={getItem(k){if(denyBest&&k===bestKey)throw Error('read');return bestDisk.get(k)??null;},
  setItem(k,v){applied.push(k);bestDisk.set(k,String(v));}};
 const pours=setup({shared:bestFault});clickMove(pours,{from:1,to:4});
 assert.equal(savedState(pours).moves,4);assert.deepEqual(applied,[activeKey]);assert.match($(pours,'saved').textContent,/最佳纪录暂不可用/);
 denyBest=false;$(pours,'undo').click();
 assert.deepEqual(applied,[activeKey,activeKey]);assert.equal(bestDisk.get(bestKey),'{"3":15}');assert.match($(pours,'personal-best').textContent,/15 步/);
 // Accepted moves save immediately; new input settles presentation without waiting.
 const racing=setup({reduced:false});const first=E.solve(E.create())[0];clickMove(racing,first);assert(racing.document.querySelector('.pour-ghost'));assert(!b(racing,0).disabled);assert.equal(savedState(racing).moves,1,'Accepted move saved before animation completes');b(racing,2).click();assert.equal(savedState(racing).moves,1);assert.equal(racing.document.querySelector('.pour-ghost'),null,'A new input settles the old effect');
 $(racing,'restart').click();assert.equal($(racing,'water-confirm').open,true);assert.equal(savedState(racing).moves,1,'Accepted pour survives pending confirmation');$(racing,'water-replace').click();assert.equal(racing.document.querySelectorAll('.pour-ghost').length,0);await delay(570);assert.deepEqual(savedState(racing).bottles,E.create().bottles);assert(!b(racing,0).disabled);
 clickMove(racing,first);$(racing,'level-select').value='7';$(racing,'level-select').dispatchEvent(new racing.Event('change'));assert.equal($(racing,'water-confirm').open,true);$(racing,'water-replace').click();await delay(570);assert.equal(savedState(racing).level,7);assert.deepEqual(savedState(racing).bottles,E.create(7).bottles);assert.equal(racing.document.querySelectorAll('.pour-ghost').length,0);
 $(racing,'level-select').value='0';$(racing,'level-select').dispatchEvent(new racing.Event('change'));clickMove(racing,first);await delay(240);assert(racing.document.querySelector('.pour-stream'));await delay(320);assert.equal(savedState(racing).moves,1);assert.equal(racing.document.querySelectorAll('.pour-ghost,.pour-stream').length,0);
 const next=E.solve(savedState(racing))[0];clickMove(racing,next);racing.dispatchEvent(new racing.Event('resize'));assert.equal(savedState(racing).moves,2);assert.equal(racing.document.querySelectorAll('.pour-ghost').length,0);await delay(560);assert.equal(savedState(racing).moves,2);
 // Hints point to a solver-verified continuation; they never perform a move.
 const hints=setup();$(hints,'hint').click();assert.equal($(hints,'hint').disabled,true);await delay(50);
 assert.equal(savedState(hints).moves,0);assert(hints.document.querySelector('.hint-target'));
 const hintSource=Number(hints.document.querySelector('.bottle.selected').dataset.bottle),hintTarget=Number(hints.document.querySelector('.hint-target').dataset.bottle);
 assert(E.inspect(savedState(hints).bottles,hintSource,hintTarget).ok);b(hints,hintTarget).click();assert.equal(savedState(hints).moves,1);assert.equal($(hints,'move-count').textContent,'1');
 $(hints,'hint').click();$(hints,'restart').click();$(hints,'water-replace').click();await delay(50);assert.equal(hints.document.querySelector('.hint-target'),null);assert.equal(savedState(hints).moves,0);assert.equal($(hints,'hint').disabled,false);
 for(const m of E.solve(E.create()))clickMove(hints,m);assert.equal($(hints,'level-progress').value,5);assert.match($(hints,'win-detail').textContent,/步/);assert.equal(JSON.parse(hints.localStorage.getItem('cozy-water-sort-records-v1'))[0],savedState(hints).moves);
 // Follow freshly requested hints through all levels, not a single cached trace.
 const guided=setup();
 for(let level=0;level<8;level++){
   const seen=new Set();let steps=0;
   while(!E.won(savedState(guided).bottles)){
     const oldSave=guided.localStorage.getItem('cozy-water-sort-v1'),key=JSON.stringify(savedState(guided).bottles);
     assert(!seen.has(key),'UI hint loop');seen.add(key);assert(++steps<40);
     $(guided,'hint').click();$(guided,'hint').click();await delay(50);
     assert.equal(guided.localStorage.getItem('cozy-water-sort-v1'),oldSave,'hint alone never changes save/history');
     const target=guided.document.querySelector('.hint-target');assert(target);target.click();
   }
   assert.equal($(guided,'win-card').hidden,false);if(level<7)$(guided,'next-level').click();
 }
 let old=E.create();for(const m of [[0,5],[4,0],[2,4]])old=E.act(old,...m).state;
 const resumedHints=setup({saved:E.save(old)});$(resumedHints,'hint').click();await delay(50);
 const firstTarget=resumedHints.document.querySelector('.hint-target');assert(firstTarget);firstTarget.click();
 $(resumedHints,'undo').click();assert.deepEqual(savedState(resumedHints),old);$(resumedHints,'hint').click();await delay(50);assert(resumedHints.document.querySelector('.hint-target'));
 const html=fs.readFileSync(path.join(root,'game/water-sort.html'),'utf8');
 assert(html.includes('js/water-sort-engine.js?v=20261115-hints'));assert(html.includes('js/water-sort.js?v=20261128-choices'));
 // A stale Undo stays local and does not arm a later pour to replace the newer run.
 {
  const key='cozy-water-sort-v1', best='cozy-water-sort-records-v1';
  const first=E.act(E.create(),1,5).state;
  const data=new Map([[key,E.save(first)],[best,'{"0":16}']]);let attempts=0;
  const guard={getItem:k=>data.get(k)??null,setItem:(k,v)=>{attempts++; data.set(k,v);}};
  const a=setup({shared:guard}), bTab=setup({shared:guard});
  for(const [from,to] of [[1,6],[2,6],[1,2]])clickMove(a,{from,to});
  const end=data.get(key);assert.equal(E.restore(end).moves,4);
  const prior=attempts;
  $(bTab,'undo').click();
  assert.equal($(bTab,'move-count').textContent,'0');
  assert.match($(bTab,'saved').textContent,/另一页面已更新存档.*未保存/);
  clickMove(bTab,{from:1,to:5});
  assert.equal($(bTab,'move-count').textContent,'1');
  assert.equal(data.get(key),end);assert.equal(data.get(best),'{"0":16}');assert.equal(attempts,prior);
  const recovered=setup({shared:guard});assert.equal($(recovered,'move-count').textContent,'4');
  $(recovered,'undo').click();assert.equal(E.restore(data.get(key)).moves,3,'same-session Undo still commits');
  await Promise.all([a,bTab,recovered].map(w=>w.happyDOM.abort()));
 }
 {
  const key='cozy-water-sort-v1', moves=[[0,5],[0,6],[1,0],[2,1],[2,6]];
  const state=moves.reduce((s,[f,t])=>E.act(s,f,t).state,E.create());
  const lab=setup({saved:E.save(state)});
  const raw=lab.localStorage.getItem(key);
  $(lab,'hint').click();await delay(50);
  assert.match($(lab,'feedback').textContent,/多撤销几步/);
  assert.equal(lab.localStorage.getItem(key),raw);
  $(lab,'undo').click();$(lab,'hint').click();await delay(50);
  assert.match($(lab,'feedback').textContent,/多撤销几步/);
  $(lab,'undo').click();$(lab,'hint').click();await delay(50);
  assert.equal(lab.document.querySelector('.hint-target').dataset.bottle,'6');
  assert.equal(savedState(lab).moves,3);
  await lab.happyDOM.abort();
 }
 // Model two tabs without storage events: completion data is shared, active boards are not.
 const slots=new Map(), shared={getItem:k=>slots.get(k)??null,setItem:(k,v)=>slots.set(k,String(v))};
 const tabA=setup({shared}),tabB=setup({shared});
 $(tabB,'level-select').value='1';$(tabB,'level-select').dispatchEvent(new tabB.Event('change'));
 for(const m of E.solve(E.create(0)))clickMove(tabA,m);
 assert.deepEqual(savedState(tabA).completed,[0]);
 for(const m of E.solve(E.create(1)))clickMove(tabB,m);
 assert.deepEqual([...savedState(tabB).completed].sort(),[0,1],'B finishing later cannot erase A’s completed level');
 assert.deepEqual(JSON.parse(shared.getItem('cozy-water-sort-records-v1')),{0:16,1:17});
 const reload=setup({shared});const level2=E.create(1);
 assert.equal(savedState(reload).level,1);assert.equal(savedState(reload).history.length,17);
 assert.match($(reload,'win-detail').textContent,/2 \/ 8/);
 assert.match($(reload,'personal-best').textContent,/17 步/);
 assert.deepEqual(savedState(reload).bottles,E.solve(level2).reduce((run,m)=>E.act(run,m.from,m.to).state,level2).bottles);
 // A stale, slower replay cannot overwrite a faster run in a different tab.
 slots.clear();
 const fast=setup({shared}),slow=setup({shared}), firstLevel=E.create(0);
 const detour=E.legalMoves(firstLevel.bottles).find(m=>E.solve(E.act(firstLevel,m.from,m.to).state)?.length>=16);
 assert(detour);const longer=E.solve(E.act(firstLevel,detour.from,detour.to).state);
 for(const m of E.solve(firstLevel))clickMove(fast,m);
 for(const m of [detour,...longer])clickMove(slow,m);
 assert(savedState(slow).moves>16);assert.match($(slow,'personal-best').textContent,/16 步/);
 assert.equal(JSON.parse(shared.getItem('cozy-water-sort-records-v1'))[0],16);
 // A legacy snapshot contributes valid completions but never replaces the current trace.
 slots.clear();const stale=setup({shared});
 shared.setItem('cozy-water-sort-v1',JSON.stringify({v:1,level:3,history:[[0,4]],completed:[2,2,99,'0']}));
 shared.setItem('cozy-water-sort-records-v1','{malformed');
 clickMove(stale,E.solve(E.create())[0]);
 const kept=savedState(stale);assert.deepEqual(kept.completed,[2]);assert.equal(kept.level,0);assert.equal(kept.history.length,1);
 const undone=setup({shared});$(undone,'undo').click();
 assert.deepEqual(savedState(undone),E.create(0,[2]));
 // An accepted winning pour saves its best immediately, not after presentation.
 const pathToWin=E.solve(firstLevel);
 const almost=pathToWin.slice(0,-1).reduce((run,m)=>E.act(run,m.from,m.to).state,firstLevel);
 const winsDisk=new Map([[activeKey,E.save(almost)],[bestKey,'{"0":15}']]);let winsBlocked=true;const winWrites=[];
 const winsStorage={getItem(k){if(winsBlocked&&k===bestKey)throw Error('read');return winsDisk.get(k)??null;},
  setItem(k,v){winWrites.push(k);winsDisk.set(k,String(v));}};
 const accepted=setup({shared:winsStorage,reduced:false});clickMove(accepted,pathToWin.at(-1));
 assert(accepted.document.querySelector('.pour-ghost'));assert.equal(savedState(accepted).moves,16);
 assert.deepEqual(savedState(accepted).completed,[0]);assert.deepEqual(winWrites,[activeKey]);
 winsBlocked=false;$(accepted,'next-level').click();
 assert.deepEqual(winWrites,[activeKey,activeKey]);assert.equal(winsDisk.get(bestKey),'{"0":15}');
 const winningAnimation=setup({saved:E.save(almost),reduced:false});
 clickMove(winningAnimation,pathToWin.at(-1));
 assert(winningAnimation.document.querySelector('.pour-ghost'));
 assert.equal(savedState(winningAnimation).moves,16);
 assert.equal(JSON.parse(winningAnimation.localStorage.getItem('cozy-water-sort-records-v1'))[0],16);
 // Undo is available during pouring; stale callbacks cannot reapply the move.
 const immediate=setup({reduced:false});clickMove(immediate,E.solve(E.create())[0]);assert.equal(savedState(immediate).moves,1);assert.equal($(immediate,'undo').disabled,false);$(immediate,'undo').click();assert.equal(savedState(immediate).moves,0);await delay(570);assert.equal(savedState(immediate).moves,0);assert.equal(immediate.document.querySelector('.pour-ghost'),null);
 // Reduced motion never creates particles or outcome animation classes.
 assert.equal(all.document.querySelector('.pour-ghost,.poured-now,.water-win-arrive'),null);
 // Cancellation, Escape and repeated requests keep the exact active run.
 const protectedRun=setup();clickMove(protectedRun,E.solve(E.create())[0]);const protectedSave=protectedRun.localStorage.getItem('cozy-water-sort-v1');
 $(protectedRun,'restart').click();assert.equal($(protectedRun,'water-confirm').open,true);assert.equal(protectedRun.document.activeElement.id,'water-keep');
 $(protectedRun,'water-keep').click();assert.equal(protectedRun.localStorage.getItem('cozy-water-sort-v1'),protectedSave);assert.equal(protectedRun.document.activeElement.id,'restart');
 $(protectedRun,'level-select').value='3';$(protectedRun,'level-select').dispatchEvent(new protectedRun.Event('change'));assert.equal($(protectedRun,'level-select').value,'0');
 $(protectedRun,'water-confirm').dispatchEvent(new protectedRun.Event('cancel',{cancelable:true}));assert.equal($(protectedRun,'water-confirm').open,false);assert.equal(protectedRun.localStorage.getItem('cozy-water-sort-v1'),protectedSave);
 $(protectedRun,'level-select').value='3';$(protectedRun,'level-select').dispatchEvent(new protectedRun.Event('change'));$(protectedRun,'restart').click();$(protectedRun,'water-replace').click();assert.equal(savedState(protectedRun).level,3);assert.equal(savedState(protectedRun).moves,0);$(protectedRun,'water-replace').click();assert.equal(savedState(protectedRun).level,3);
 const fsButton=w.document.querySelector('[data-game-fullscreen]');const before=E.save(savedState(w));fsButton.click();assert.equal(fsButton.getAttribute('aria-pressed'),'true');w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(fsButton.getAttribute('aria-pressed'),'false');assert.equal(E.save(savedState(w)),before);
 console.log('water-sort UI: all 8 wins, direct-final distinction, source cancel, invalid target, keyboard, restart/level/resize races, animation stream, blocked storage, resume and fullscreen PASS');
}finally{for(const w of windows)await w.happyDOM.abort();}
})().catch(e=>{console.error(e);process.exitCode=1;});
