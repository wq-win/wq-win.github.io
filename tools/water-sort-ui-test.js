'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../game/js/water-sort-engine');const root=path.resolve(__dirname,'..');
(async()=>{const {Window}=await import('happy-dom');const windows=[];
function setup({saved,reduced=true,denied=false}={}){
 const w=new Window({url:'https://example.test/game/water-sort.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});windows.push(w);
 w.document.write(fs.readFileSync(path.join(root,'game/water-sort.html'),'utf8'));w.matchMedia=()=>({matches:reduced});
 if(saved)w.localStorage.setItem('cozy-water-sort-v1',saved);
 if(denied)Object.defineProperty(w,'localStorage',{get(){throw new Error('Denied');}});
 for(const f of ['game/js/water-sort-levels.js','game/js/water-sort-engine.js','game/js/water-sort.js','js/game-view.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 return w;
}
const $=(w,id)=>w.document.getElementById(id),b=(w,n)=>w.document.querySelector(`[data-bottle="${n}"]`),clickMove=(w,m)=>{b(w,m.from).click();b(w,m.to).click();},savedState=w=>E.restore(w.localStorage.getItem('cozy-water-sort-v1'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const w=setup();assert.equal(w.document.querySelectorAll('.bottle').length,5);assert.equal($(w,'level-select').options.length,8);
 assert.equal(w.document.querySelectorAll('.liquid-symbol').length,12);assert.equal(w.document.querySelectorAll('.palette-chip').length,3);
 b(w,3).click();assert.match($(w,'feedback').textContent,/这是空瓶/);assert(b(w,3).classList.contains('invalid'));
 b(w,0).click();assert.equal(b(w,0).getAttribute('aria-pressed'),'true');assert(b(w,3).classList.contains('target'));
 b(w,1).click();assert.match($(w,'feedback').textContent,/已经满了/);assert(b(w,0).classList.contains('selected'));assert.equal(savedState(w).moves,0);
 b(w,0).click();assert.equal(w.document.querySelectorAll('.selected').length,0);assert.match($(w,'feedback').textContent,/取消/);
 b(w,0).click();b(w,0).dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(w.document.querySelectorAll('.selected').length,0);
 b(w,0).focus();b(w,0).dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(w.document.activeElement.dataset.bottle,'1');
 for(const m of E.solve(E.create()))clickMove(w,m);
 assert.equal($(w,'win-card').hidden,false);assert.equal($(w,'sorted-count').textContent,'3');assert.equal(w.document.activeElement.id,'next-level');assert.equal($(w,'water-board').inert,true);
 const resume=setup({saved:w.localStorage.getItem('cozy-water-sort-v1')});assert.equal($(resume,'win-card').hidden,false);assert.match($(resume,'win-detail').textContent,/1 \/ 8/);
 $(w,'next-level').click();assert.equal($(w,'level-number').textContent,'02');assert.equal($(w,'win-card').hidden,true);assert.equal($(w,'water-board').inert,false);
 // A reachable dead end must explain how to replan, including after restore.
 const dead=setup();$(dead,'level-select').value='5';$(dead,'level-select').dispatchEvent(new dead.Event('change'));
 for(const [from,to] of [[0,5],[4,6],[2,4],[0,2]])clickMove(dead,{from,to});
 assert.match($(dead,'feedback').textContent,/没有可倒的位置.*重新开始.*重新规划/);assert.equal($(dead,'win-card').hidden,true);
 const deadResume=setup({saved:dead.localStorage.getItem('cozy-water-sort-v1')});assert.match($(deadResume,'feedback').textContent,/没有可倒的位置/);$(dead,'restart').click();assert(E.legalMoves(savedState(dead).bottles).length);
 const different=setup();clickMove(different,E.solve(E.create())[0]);b(different,1).click();b(different,3).click();assert.match($(different,'feedback').textContent,/顶部颜色不同/);assert.equal(savedState(different).moves,1);
 // All eight levels can be completed through the actual UI handlers.
 const all=setup();for(let i=0;i<8;i++){for(const m of E.solve(E.create(i)))clickMove(all,m);assert.equal($(all,'win-card').hidden,false);if(i<7)$(all,'next-level').click();}
 assert.match($(all,'win-title').textContent,/八份色彩，都收好/);assert.match($(all,'win-detail').textContent,/全部完成/);
 const direct=setup();$(direct,'level-select').value='7';$(direct,'level-select').dispatchEvent(new direct.Event('change'));assert.equal(direct.document.querySelectorAll('.bottle').length,9);assert.equal(direct.document.querySelectorAll('.bottle-row').length,2);
 for(const m of E.solve(E.create(7)))clickMove(direct,m);assert.match($(direct,'win-title').textContent,/最后一份/);assert.doesNotMatch($(direct,'win-title').textContent,/八份|全部/);assert.match($(direct,'win-detail').textContent,/1 \/ 8/);$(direct,'next-level').click();assert.equal($(direct,'level-number').textContent,'01');
 const bad=setup({saved:'{broken'});assert.equal(bad.document.querySelectorAll('.bottle').length,5);
 const denied=setup({denied:true});clickMove(denied,E.solve(E.create())[0]);assert.equal(denied.document.querySelectorAll('.liquid').length,12);assert.match($(denied,'saved').textContent,/无法保存/);
 // During real-duration animation, repeated input is ignored; restart/selection cancel it.
 const racing=setup({reduced:false});const first=E.solve(E.create())[0];clickMove(racing,first);assert(racing.document.querySelector('.pour-ghost'));assert(b(racing,0).disabled);b(racing,2).click();assert.equal(savedState(racing).moves,0);
 $(racing,'restart').click();assert.equal(racing.document.querySelectorAll('.pour-ghost').length,0);await delay(570);assert.deepEqual(savedState(racing).bottles,E.create().bottles);assert(!b(racing,0).disabled);
 clickMove(racing,first);$(racing,'level-select').value='7';$(racing,'level-select').dispatchEvent(new racing.Event('change'));await delay(570);assert.equal(savedState(racing).level,7);assert.deepEqual(savedState(racing).bottles,E.create(7).bottles);assert.equal(racing.document.querySelectorAll('.pour-ghost').length,0);
 $(racing,'level-select').value='0';$(racing,'level-select').dispatchEvent(new racing.Event('change'));clickMove(racing,first);await delay(240);assert(racing.document.querySelector('.pour-stream'));await delay(320);assert.equal(savedState(racing).moves,1);assert.equal(racing.document.querySelectorAll('.pour-ghost,.pour-stream').length,0);
 const next=E.solve(savedState(racing))[0];clickMove(racing,next);racing.dispatchEvent(new racing.Event('resize'));assert.equal(savedState(racing).moves,2);assert.equal(racing.document.querySelectorAll('.pour-ghost').length,0);await delay(560);assert.equal(savedState(racing).moves,2);
 const fsButton=w.document.querySelector('[data-game-fullscreen]');const before=E.save(savedState(w));fsButton.click();assert.equal(fsButton.getAttribute('aria-pressed'),'true');w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(fsButton.getAttribute('aria-pressed'),'false');assert.equal(E.save(savedState(w)),before);
 console.log('water-sort UI: all 8 wins, direct-final distinction, source cancel, invalid target, keyboard, restart/level/resize races, animation stream, blocked storage, resume and fullscreen PASS');
}finally{for(const w of windows)await w.happyDOM.abort();}
})().catch(e=>{console.error(e);process.exitCode=1;});
