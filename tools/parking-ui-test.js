'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../game/js/parking-engine');
const parkingCSS=fs.readFileSync(path.resolve(__dirname,'../game/assets/parking.css'),'utf8');assert(!parkingCSS.includes('preserve-3d'),'car hit areas must remain in the 2D stacking context');assert(!parkingCSS.includes('rotateX('),'board uses affine tilt for reliable pointer hit testing');assert(!/\.car:hover\{/.test(parkingCSS),'hover must not change button compositing or stacking');assert(/\.board\{overflow:clip\}/.test(parkingCSS),'departing cars must be clipped at the board so animation cannot resize scroll bounds');const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'game/parking.html'),'utf8');assert(html.includes('js/parking-engine.js?v=20261120-v6'),'engine cache URL remains unchanged');assert(html.includes('js/parking.js?v=20261122-checkpoint'),'checkpoint release invalidates only controller cache');
(async()=>{const {Window}=await import('happy-dom');
// CSS cascade regression for the clipped desktop controls. Happy DOM does not
// render geometry; normalize its @media-whitespace parser limitation only here.
for(const [width,height] of [[1188,761],[1366,768],[800,500],[761,481],[390,844],[320,568],[844,390],[667,375]]){
 const cssWindow=new Window({width,height});
 cssWindow.document.write('<style>'+parkingCSS.replace(/@media\(/g,'@media (')+'</style><main class="parking-app"><section class="play-layout"><div class="play-column"><div class="board-meta"></div><div class="scene"><div class="board-viewport"></div></div><div class="zoom-tools"></div><div class="feedback"></div><div class="actions"></div></div></section></main>');
 const style=selector=>cssWindow.getComputedStyle(cssWindow.document.querySelector(selector));
 if(width>=761&&height>=481){
  assert.equal(style('.parking-app').overflowY,'auto','short desktop overflow must be user-scrollable, never clipped');
  assert.equal(style('.play-column').display,'flex');assert.equal(style('.play-column').height,'100%','desktop column uses its actual available row height');
  assert.equal(style('.play-column').justifyContent,'safe center','too-short rows start at the top instead of overflowing above it');
  for(const selector of ['.board-meta','.zoom-tools','.feedback','.actions'])assert.equal(style(selector).flexShrink,'0','controls and feedback retain their full height');
  assert.equal(style('.scene').minHeight,'260px','lot keeps a usable minimum and can scroll the app if needed');
  assert.equal(style('.board-viewport').overflow,'auto','zoomed cars remain reachable within the lot');
  cssWindow.document.querySelector('.parking-app').classList.add('is-expanded');
  assert.equal(style('.parking-app').overflowY,'auto','fullscreen fallback keeps access to overflowing controls');
 }else{assert.equal(style('.parking-app').height,'auto','narrow/landscape pages retain natural document flow');assert.equal(style('.parking-app').overflow,'visible');}
 await cssWindow.happyDOM.abort();
}
function setup(saved,reduced=true,legacy,withSession=false,primary,shared){const w=new Window({url:'https://example.test/game/parking.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});w.document.write(fs.readFileSync(path.join(root,'game/parking.html'),'utf8'));w.matchMedia=()=>({matches:reduced});if(shared)Object.defineProperty(w,'localStorage',{value:shared});if(saved)w.localStorage.setItem('cozy-parking-v3',saved);if(primary)w.localStorage.setItem('cozy-parking-v5',primary);if(legacy)w.localStorage.setItem('cozy-parking-v2',legacy);w.eval(fs.readFileSync(path.join(root,'game/js/parking-engine.js'),'utf8'));if(withSession)w.eval(fs.readFileSync(path.join(root,'game/js/workshop-session.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'game/js/parking.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'js/game-view.js'),'utf8'));return w;}
// Control only the controller's post-boot timers; do not wait on the host clock.
const timing=setup();
try{
 let now=0,nextId=0;
 const pending=new Map();
 timing.setTimeout=(fn,delay)=>{const id=++nextId;pending.set(id,{fn,due:now+delay});return id;};
 timing.clearTimeout=id=>pending.delete(id);
 function advance(ms){
  const end=now+ms;
  for(;;){
   const next=[...pending].filter(([,job])=>job.due<=end).sort(([,a],[,b])=>a.due-b.due)[0];
   if(!next)break;
   const [id,job]=next;pending.delete(id);now=job.due;job.fn();
  }
  now=end;
 }
 const click=id=>timing.document.querySelector(`[data-car="${id}"]`).click();
 const clues=()=>[...timing.document.querySelectorAll('.blocked,.obstacle')].map(c=>Number(c.dataset.car)).sort((a,b)=>a-b);
 const progress=()=>timing.localStorage.getItem('cozy-parking-v5');
 const initialSave=progress();
 click(0);assert.deepEqual(clues(),[0,8],'first attempt identifies car 9 as the blocker');
 advance(750);
 click(1);assert.deepEqual(clues(),[1,2],'retry switches the blocker to car 3 immediately');
 advance(150);assert.deepEqual(clues(),[1,2],'first deadline must not clear the retry');
 advance(749);assert.deepEqual(clues(),[1,2]);
 advance(1);assert.deepEqual(clues(),[],'retry clears at its own 900 ms deadline');
 assert.equal(progress(),initialSave,'blocked attempts and their timeouts do not save progress');
 click(0);advance(100);
 timing.document.getElementById('restart').click();
 assert.deepEqual(clues(),[],'restart clears pending highlights immediately');
 click(1);advance(800);assert.deepEqual(clues(),[1,2],'pre-restart timer cannot clear a fresh clue');
 click(E.solve(E.LEVELS[0])[0]);
 assert.deepEqual(clues(),[],'successful move immediately clears the blocked feedback');
 assert.equal(JSON.parse(progress()).moves,1,'successful move still saves once accepted');
 advance(900);
 assert.equal(timing.document.querySelectorAll('.car').length,11,'departure timer still removes the car');
}finally{await timing.happyDOM.abort();}
const tick=()=>new Promise(r=>setTimeout(r,5));const w=setup();const $=id=>w.document.getElementById(id);
try{assert.equal(w.document.querySelectorAll('.car').length,12);assert.equal($('level-select').options.length,16);for(const dir of ['右下','左下','左上','右上'])assert([...w.document.querySelectorAll('.car')].some(c=>c.getAttribute('aria-label').includes('朝'+dir)), 'diagonal direction is announced');for(let i=0;i<16;i++){$('level-select').value=String(i);$('level-select').dispatchEvent(new w.Event('change'));const level=E.LEVELS[i];for(const car of level.cars){const button=w.document.querySelector(`[data-car="${car.id}"]`);assert(button.style.width.includes(String(E.LENGTH)));assert(button.style.height.includes(String(E.WIDTH)));const travel=name=>Number(button.style.getPropertyValue(name).match(/\*([-\d.]+)\)/)[1]);const moved={...car,x:car.x+travel('--exit-x'),y:car.y+travel('--exit-y')},corners=E.corners(moved);assert([0,1].some(axis=>corners.every(p=>p[axis]<0)||corners.every(p=>p[axis]>level.size)),'animation carries every cardinal and diagonal body fully beyond one lot edge');}}$('level-select').value='0';$('level-select').dispatchEvent(new w.Event('change'));
// Exercise the real layout/input handlers with deterministic container sizes.
const viewport=$('board-viewport'),board=$('parking-board');let vw=366,vh=414;
Object.defineProperty(viewport,'clientWidth',{get:()=>vw});Object.defineProperty(viewport,'clientHeight',{get:()=>vh});Object.defineProperty(board,'offsetWidth',{get:()=>parseFloat(board.style.getPropertyValue('--cell'))*parseFloat(board.style.getPropertyValue('--grid-size'))});
for(const dims of [[760,540],[760,391],[760,260],[366,414],[820,253]]){[vw,vh]=dims;$('zoom-reset').click();const cell=parseFloat(board.style.getPropertyValue('--cell'));assert(cell*E.LEVELS[0].size<=Math.min(vw,vh)-28+.001,'overview formula fits desktop, portrait and landscape containers');for(let j=0;j<12;j++)$('zoom-in').click();assert($('zoom-in').disabled);assert(parseFloat(board.style.getPropertyValue('--cell'))*E.WIDTH>=44,'max zoom restores a minimum 44px car-body hit target');$('zoom-reset').click();assert($('zoom-out').disabled);}
const blocked=E.LEVELS[0].cars.find(c=>E.blockers(E.LEVELS[0],E.LEVELS[0].cars.map(c=>c.id),c.id).length);w.document.querySelector(`[data-car="${blocked.id}"]`).click();assert($('feedback').classList.contains('error'));assert(w.document.querySelector('.obstacle'));assert.equal(w.document.querySelectorAll('.car').length,12);
for(const id of E.solve(E.LEVELS[0])){w.document.querySelector(`[data-car="${id}"]`).click();await tick();}assert.equal($('win-card').hidden,false);assert.equal($('remaining').textContent,'0');assert.equal(w.document.activeElement.id,'next-level');const won=w.localStorage.getItem('cozy-parking-v5');const resume=setup(won);assert.equal(resume.document.getElementById('win-card').hidden,false);await resume.happyDOM.abort();$('next-level').click();assert.equal($('level-number').textContent,'02');assert.equal($('win-card').hidden,true);
$('level-select').value='15';$('level-select').dispatchEvent(new w.Event('change'));assert.equal($('level-number').textContent,'16');assert.equal(w.document.querySelectorAll('.car').length,48);for(const id of E.solve(E.LEVELS[15])){w.document.querySelector(`[data-car="${id}"]`).click();await tick();}assert.equal($('win-card').hidden,false);assert.match($('win-title').textContent,/最后一站/);assert.doesNotMatch($('win-title').textContent,/全部走过/,'direct-selecting level 16 must not claim all levels completed');$('next-level').click();assert.equal($('level-number').textContent,'01');
const rapid=setup(undefined,false);for(const id of E.solve(E.LEVELS[0])){rapid.document.querySelector(`[data-car="${id}"]`).dispatchEvent(new rapid.MouseEvent('click',{bubbles:true,detail:1}));}assert.equal(rapid.document.getElementById('remaining').textContent,'0','rapid pointer clicks accept the whole valid sequence while departures animate');assert.equal(rapid.document.querySelectorAll('.leaving').length,12);await new Promise(r=>setTimeout(r,300));assert.equal(rapid.document.getElementById('win-card').hidden,false);await rapid.happyDOM.abort();
const first=E.solve(E.LEVELS[0])[0];w.document.querySelector(`[data-car="${first}"]`).click();$('restart').click();await tick();assert.equal(w.document.querySelectorAll('.car').length,12,'restart cancels stale removal callback');
const fsButton=w.document.querySelector('[data-game-fullscreen]');fsButton.click();assert.equal(fsButton.getAttribute('aria-pressed'),'true');assert(w.document.querySelector('.is-expanded'));w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(fsButton.getAttribute('aria-pressed'),'false');
const allCompleted=E.create(15);allCompleted.completed=Array.from({length:15},(_,i)=>i);const all=setup(E.save(allCompleted));for(const id of E.solve(E.LEVELS[15])){all.document.querySelector(`[data-car="${id}"]`).click();await tick();}assert.match(all.document.getElementById('win-title').textContent,/十六站，全部走过/,'winning last level updates full-completion title');await all.happyDOM.abort();const bad=setup('{broken');assert.equal(bad.document.querySelectorAll('.car').length,12);await bad.happyDOM.abort();
const oldLevel=E.generate(7,true),oldPath=E.solve(oldLevel),oldRemaining=oldLevel.cars.map(c=>c.id).filter(id=>id!==oldPath[0]);const oldRun=setup(JSON.stringify({v:3,level:7,remaining:oldRemaining,completed:[0,1],moves:1}));assert.equal(oldRun.document.querySelectorAll('.car').length,189,'old run retains its full original board');assert.match(oldRun.document.getElementById('session-phase').textContent,/旧版续局/);assert.equal(oldRun.document.getElementById('car-total').textContent,'190');assert.equal(oldRun.document.getElementById('cleared-count').textContent,'1');oldRun.document.querySelector(`[data-car="${oldPath[1]}"]`).click();assert.equal(oldRun.document.getElementById('remaining').textContent,'188');oldRun.document.getElementById('restart').click();assert.equal(oldRun.document.getElementById('car-total').textContent,'32','explicit restart switches to new short-session board');assert.deepEqual(JSON.parse(oldRun.localStorage.getItem('cozy-parking-v5')).completed,[0,1]);await oldRun.happyDOM.abort();
const v2=JSON.stringify({v:2,level:5,remaining:[],completed:[0,1,5]});
const legacy=setup(undefined,true,v2);assert.equal(legacy.document.getElementById('level-number').textContent,'06');assert.equal(legacy.document.querySelectorAll('.car').length,24);
assert.equal(legacy.localStorage.getItem('cozy-parking-v5'),null,'startup leaves migration uncommitted');assert.equal(legacy.localStorage.getItem('cozy-parking-v2'),v2);
legacy.document.querySelector(`[data-car="${E.solve(E.LEVELS[5])[0]}"]`).click();
assert.deepEqual(JSON.parse(legacy.localStorage.getItem('cozy-parking-v5')).completed,[0,1,5]);assert.equal(JSON.parse(legacy.localStorage.getItem('cozy-parking-v5')).moves,1);await legacy.happyDOM.abort();
// Real session dialog: old level 14 survives play/reload/cancel; restart opts in.
const prior14=E.generate(13,false,318),priorPath=E.solve(prior14);
const priorSave=JSON.stringify({v:4,level:13,remaining:prior14.cars.map(c=>c.id).filter(id=>!priorPath.slice(0,8).includes(id)),completed:[0,3,10],moves:8});
let old14UI=setup(priorSave,true,undefined,true);
const getSave=win=>win.localStorage.getItem('cozy-parking-v5');
const assertBoard=(win,level)=>{for(const car of level.cars){const button=win.document.querySelector(`[data-car="${car.id}"]`);if(button){assert.equal(button.style.left,`calc(var(--cell)*${car.x})`);assert.equal(button.style.top,`calc(var(--cell)*${car.y})`);}}};
assert.match(old14UI.document.getElementById('session-phase').textContent,/旧版续局/);
assertBoard(old14UI,prior14);old14UI.document.querySelector(`[data-car="${priorPath[8]}"]`).click();
assert.equal(old14UI.localStorage.getItem('cozy-parking-v3'),priorSave,'migration does not overwrite old storage');const continued=getSave(old14UI);await old14UI.happyDOM.abort();old14UI=setup(priorSave,true,undefined,true,continued);
const stale=setup(JSON.stringify({v:4,level:0,remaining:E.create().remaining,completed:[]}),true,undefined,false,continued);assert.equal(getSave(stale),continued,'v5 primary wins over stale old-code writes');await stale.happyDOM.abort();assert.equal(old14UI.document.querySelectorAll('.car').length,27);assertBoard(old14UI,prior14);
old14UI.document.getElementById('restart').click();
let buttons=old14UI.document.querySelectorAll('dialog button');buttons[0].click();
assert.equal(getSave(old14UI),continued,'cancel preserves exact save');assertBoard(old14UI,prior14);
const select14=old14UI.document.getElementById('level-select');select14.value='14';select14.dispatchEvent(new old14UI.Event('change'));buttons[0].click();
assert.equal(select14.value,'13','cancel restores selected level');assert.equal(getSave(old14UI),continued);
old14UI.document.getElementById('restart').click();buttons[1].click();
assert.equal(old14UI.document.querySelectorAll('.car').length,36);assertBoard(old14UI,E.LEVELS[13]);
const new14Save=JSON.parse(getSave(old14UI));assert.equal(new14Save.v,5);assert.equal(new14Save.catalog,undefined);assert.deepEqual(new14Save.completed,[0,3,10]);
assert.doesNotMatch(old14UI.document.getElementById('session-phase').textContent,/旧版续局/);
const newReload=setup(getSave(old14UI));assertBoard(newReload,E.LEVELS[13]);await newReload.happyDOM.abort();await old14UI.happyDOM.abort();
// Finishing a legacy board transitions to current level 15 without losing progress.
const ending=setup(JSON.stringify({v:4,level:13,remaining:[priorPath.at(-1)],completed:[0,3,10]}));
ending.document.querySelector(`[data-car="${priorPath.at(-1)}"]`).click();await tick();ending.document.getElementById('next-level').click();
assert.equal(ending.document.getElementById('level-number').textContent,'15');assert.deepEqual(JSON.parse(getSave(ending)).completed,[0,3,10,13]);assertBoard(ending,E.LEVELS[14]);await ending.happyDOM.abort();
// Two disposable same-origin controllers sharing literal storage bytes.
const K='cozy-parking-v5',V3='cozy-parking-v3',V2='cozy-parking-v2';
const makeStore=(values={})=>({
 map:new Map(Object.entries(values)),writes:0,readFail:null,writeFail:false,reads:[],
 getItem(k){this.reads.push(k);if(this.readFail===k)throw Error('blocked read');return this.map.get(k)??null;},
 setItem(k,v){this.writes++;if(this.writeFail)throw Error('blocked write');this.map.set(k,v);}
});
const tab=store=>setup(undefined,true,undefined,true,undefined,store);
const click=(win,id)=>win.document.querySelector(`[data-car="${id}"]`).click();
const el=(win,id)=>win.document.getElementById(id);
const signal=(win,key,storageArea)=>{const event=new win.Event('storage');Object.assign(event,{key,storageArea});win.dispatchEvent(event);};
const v4=JSON.stringify({v:4,level:13,remaining:prior14.cars.map(c=>c.id),completed:[0,1],moves:0});
for(const [fixture,order,isOld] of [[{},E.solve(E.LEVELS[0]),false],[{[V3]:v4},priorPath,true]]){
 const store=makeStore(fixture),a=tab(store),b=tab(store);
 try{
  assert.equal(store.writes,0,'opening two tabs never writes');
  for(const id of order)click(a,id);
  const won=store.getItem(K);
  assert.equal(JSON.parse(won).moves,order.length);
  assert.deepEqual(JSON.parse(won).completed,isOld?[0,1,13]:[0]);
  click(b,order[0]);assert.equal(store.getItem(K),won,'stale departure preserves entire winning record');
  const before=el(b,'remaining').textContent;
  el(b,'restart').click();b.document.querySelectorAll('dialog button')[1].click();
  assert.equal(el(b,'remaining').textContent,before,'stale confirmation cannot reset local board');
  assert.equal(store.getItem(K),won);
  assert.match(el(b,'saved').textContent,/另一个页面/);
  if(isOld){el(a,'restart').click();assertBoard(a,E.LEVELS[13]);assert.deepEqual(JSON.parse(store.getItem(K)).completed,[0,1,13]);assert.equal(JSON.parse(store.getItem(K)).moves,0);}
 }finally{await a.happyDOM.abort();await b.happyDOM.abort();}
}
{
 const order=E.solve(E.LEVELS[0]);
 const store=makeStore({[V3]:JSON.stringify({v:3,level:0,remaining:E.LEVELS[0].cars.map(c=>c.id),completed:[1],moves:0})});
 store.readFail=V2;
 const a=tab(store);
 try{
  assert.ok(!store.reads.includes(V2),'irrelevant older keys need not be readable');
  store.readFail=K;click(a,order[0]);assert.equal(store.writes,0);
  store.readFail=null;store.writeFail=true;click(a,order[1]);assert.equal(store.getItem(K),null);
  store.writeFail=false;click(a,order[2]);assert.equal(JSON.parse(store.getItem(K)).moves,3,'successful retry writes the full newer local run');
  signal(a,null,{});
  assert.doesNotMatch(el(a,'saved').textContent,/另一个页面/);
  store.map.clear();signal(a,null,store);
  assert.match(el(a,'saved').textContent,/另一个页面/);
  click(a,order[3]);assert.equal(store.getItem(K),null,'external clear is not recreated');
 }finally{await a.happyDOM.abort();}
 const denied=makeStore();denied.readFail=K;const b=tab(denied);
 try{denied.readFail=null;click(b,order[0]);assert.equal(denied.writes,0,'never guess at initially unreadable bytes');}finally{await b.happyDOM.abort();}
 const future=makeStore({[K]:'{"v":6}'});const c=tab(future);
 try{click(c,order[0]);assert.equal(future.getItem(K),'{"v":6}');assert.match(el(c,'saved').textContent,/较新版本/);}finally{await c.happyDOM.abort();}
 const legacyRace=makeStore({[V3]:v4});const d=tab(legacyRace);
 try{legacyRace.map.set(V3,v4+' ');click(d,priorPath[0]);assert.equal(legacyRace.getItem(K),null,'external legacy bytes checked before first canonical write');}finally{await d.happyDOM.abort();}
}
console.log('parking UI: blocked feedback, all exits, level wins, final level, restart race, save resume, invalid save, keyboard fullscreen fallback passed');}finally{await w.happyDOM.abort();}})().catch(e=>{console.error(e);process.exitCode=1});
