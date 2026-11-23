'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{const {Window}=await import(pathToFileURL(require.resolve('happy-dom')).href);const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'game/screws.html'),'utf8');
function boot(saved,savedRun,shared){const w=new Window({url:'https://example.test/game/screws.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});w.document.write(html.replace(/<script[\s\S]*?<\/script>/g,''));if(shared)Object.defineProperty(w,'localStorage',{value:shared});if(saved)w.localStorage.setItem('pine-screw-progress-v1',saved);if(savedRun)w.localStorage.setItem('pine-screw-progress-v1-run',savedRun);w.matchMedia=()=>({matches:true});w.eval(fs.readFileSync(path.join(root,'game/js/screws-engine.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'game/js/screws-levels.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'game/js/screws.js'),'utf8').replace(/\}\)\(\);\s*$/,'window.__test={get state(){return state},start,render};})();'));w.eval(fs.readFileSync(path.join(root,'js/game-view.js'),'utf8'));return w;}
const w=boot('{bad'),d=w.document,E=w.ScrewPuzzle,api=w.__test;const wait=()=>new Promise(r=>setTimeout(r,8));const click=async id=>{d.querySelector('[data-screw="'+id+'"]').click();await wait();};
try{
 assert.equal(d.querySelectorAll('#level option').length,16);assert.equal(d.querySelectorAll('.screw').length,9);assert.equal(d.querySelectorAll('.slot').length,5);assert.equal(d.getElementById('result').hidden,true);
 const branch=boot(JSON.stringify({version:3,index:0,completed:[]}),JSON.stringify({version:3,index:0,moves:[1,2]}));
 try{
  const bd=branch.document;
  function clues(){
   const rows=[...bd.querySelectorAll('.lane')].map(lane=>[...lane.querySelectorAll('.preview-group')].map(group=>{
    assert.equal(group.hasAttribute('aria-label'),false);
    assert.equal(group.querySelectorAll('.preview-dot[aria-hidden="true"]').length,3);
    const text=group.querySelector('.sr-only');
    assert(text&&!text.closest('[aria-hidden="true"],[hidden],[aria-live]'));
    return text.textContent;
   }));
   const tray=bd.getElementById('tray'),summary=tray.querySelector('.sr-only');
   assert(summary&&!summary.closest('[aria-hidden="true"],[hidden],[aria-live]'));
   assert.equal(tray.querySelectorAll('.slot').length,5);
   assert.equal(tray.querySelectorAll('.slot[aria-label]').length,0);
   return {rows,tray:summary.textContent};
  }
  const beforeClues=clues();
  assert.equal(beforeClues.rows[0][0],'第1排下方第1层：湖蓝、朱砂、青绿');
  assert.equal(beforeClues.rows[1][0],'第2排下方第1层：朱砂、湖蓝、朱砂');
  assert.equal(beforeClues.tray,'托盘：湖蓝、青绿；剩余3个空格。');
  assert.match(bd.querySelector('[data-screw="0"]').getAttribute('aria-label'),/姜黄/);
  assert.match(bd.querySelector('[data-screw="4"]').getAttribute('aria-label'),/姜黄/);
  bd.querySelector('[data-screw="0"]').click();await wait();
  const fallen=clues();
  assert.equal(fallen.rows[0].length,beforeClues.rows[0].length-1);
  assert(fallen.rows[0].every((text,i)=>text===beforeClues.rows[0][i+1].replace('下方第'+(i+2)+'层','下方第'+(i+1)+'层')));
  assert.equal(fallen.tray,'托盘：湖蓝、青绿、姜黄；剩余2个空格。');
  bd.getElementById('undo').click();
  assert.deepEqual(clues(),beforeClues,'Undo restores exact preview and tray descriptions');
 }finally{await branch.happyDOM.abort();}
 const css=fs.readFileSync(path.join(root,'game/assets/screws.css'),'utf8');
 const srOnly=css.match(/\.sr-only\{([^}]+)\}/)[1];
 for(const rule of ['position:absolute','width:1px','height:1px','overflow:hidden','clip:rect(0,0,0,0)'])assert(srOnly.includes(rule));
 assert.doesNotMatch(srOnly,/display:none|visibility:hidden/);
 const solution=E.solve(api.state).path;
 const before=JSON.stringify(api.state);await click(solution[0]);d.getElementById('undo').click();assert.equal(JSON.stringify(api.state),before,'undo restores exact state');
 for(const id of solution.slice(0,5))await click(id);
 const savedRun=w.localStorage.getItem('pine-screw-progress-v1-run'),savedProgress=w.localStorage.getItem('pine-screw-progress-v1');
 const resumed=boot(savedProgress,savedRun);assert.equal(JSON.stringify(resumed.__test.state),JSON.stringify(api.state),'new-catalog run restores');resumed.happyDOM.abort();
 const legacy=boot(JSON.stringify({version:2,index:0,completed:[2]}),JSON.stringify({version:2,index:0,moves:solution.slice(0,5)}));assert.equal(legacy.__test.state.moves,0,'old-board history is not replayed onto redesigned boards');assert.match(legacy.document.getElementById('progress').textContent,/1 \/ 16/,'historical completions preserved');legacy.happyDOM.abort();
 for(const id of solution.slice(5))await click(id);assert.equal(api.state.status,'won');assert.equal(d.getElementById('result').hidden,false);assert.match(d.getElementById('result-title').textContent,/木落/);assert.deepEqual(JSON.parse(w.localStorage.getItem('pine-screw-progress-v1')).completed,[0]);
 d.getElementById('undo').click();assert.equal(api.state.status,'playing','undo can recover a terminal board');assert.equal(d.getElementById('result').hidden,true);await click(solution.at(-1));d.getElementById('result-action').click();assert.equal(api.state.index,1);assert.equal(api.state.moves,0);assert.equal(d.getElementById('result').hidden,true);
 await click(E.available(api.state)[0].id);d.getElementById('restart').click();assert.equal(api.state.moves,0);assert.equal(api.state.rack.length,0);
 d.getElementById('level').value='15';d.getElementById('level').dispatchEvent(new w.Event('change'));assert.equal(api.state.index,15);assert.equal(d.querySelectorAll('.preview-group').length,6);assert.equal(d.querySelectorAll('.plate.lower button').length,0);assert.equal(d.querySelectorAll('.screw').length,9);
 const initial=JSON.stringify(api.state);d.querySelector('[data-game-fullscreen]').click();assert.ok(d.querySelector('[data-game-view]').classList.contains('is-expanded'));assert.equal(JSON.stringify(api.state),initial);d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(d.querySelector('[data-game-view]').classList.contains('is-expanded'),false);
 function loss(st,path=[]){if(st.status==='lost')return path;if(st.status!=='playing'||path.length>8)return null;for(const c of E.available(st)){const n={...st,rack:st.rack.slice()};E.take(n,c.id);const p=loss(n,[...path,c.id]);if(p)return p;}return null;}
 const losing=loss(api.state);assert.ok(losing);for(const id of losing)await click(id);assert.equal(api.state.status,'lost');assert.equal(d.querySelectorAll('.screw:not(:disabled)').length,0);assert.match(d.getElementById('result-title').textContent,/托盘/);d.getElementById('undo').click();assert.equal(api.state.status,'playing','undo a full tray');assert.equal(d.getElementById('result').hidden,true);await click(losing.at(-1));d.getElementById('result-action').click();assert.equal(api.state.status,'playing');
 const id=E.available(api.state)[0].id;d.querySelector('[data-screw="'+id+'"]').click();d.getElementById('restart').click();await wait();assert.equal(api.state.moves,0,'restart cancels in-flight screw');
 const saved=w.localStorage.getItem('pine-screw-progress-v1'),w2=boot(saved);assert.equal(w2.__test.state.index,15);assert.match(w2.document.getElementById('progress').textContent,/1 \/ 16/);w2.happyDOM.abort();
 const key='pine-screw-progress-v1',runKey=key+'-run';
 const driver=(entries=[])=>{const disk=new Map(entries),writes=[],deny={};return {disk,writes,deny,ls:{
  getItem(k){if(deny.read===k)throw Error('denied read');return disk.get(k)??null;},
  setItem(k,v){writes.push(k);if(deny.write===k)throw Error('denied write');disk.set(k,String(v));}
 }};};
 const act=async(tab,id)=>{tab.document.querySelector('[data-screw="'+id+'"]').click();await wait();};
 const finish=async tab=>{const moves=E.solve(tab.__test.state).path;for(const id of moves)await act(tab,id);return moves;};
 const board=driver(),a=boot(null,null,board.ls),b=boot(null,null,board.ls);
 try {
  assert.deepEqual(board.writes,[]);
  b.__test.start(1);
  await finish(a);
  const moves=E.solve(b.__test.state).path;
  await act(b,moves[0]);
  assert.deepEqual(JSON.parse(board.disk.get(key)).completed,[0],'ordinary stale move preserves earlier badge');
  for(const id of moves.slice(1,-1))await act(b,id);
  board.writes.length=0;await act(b,moves.at(-1));
  assert.deepEqual(board.writes,[key,runKey],'one write per key on final move');
  assert.deepEqual(JSON.parse(board.disk.get(key)).completed,[0,1]);
  assert.deepEqual(JSON.parse(board.disk.get(runKey)),{version:3,index:1,moves:Array.from(moves)});
  assert.match(b.document.getElementById('status').textContent,/已保存在此设备/);
 } finally {await a.happyDOM.abort();await b.happyDOM.abort();}
 const win0=Array.from(E.solve(E.create(0)).path);
 const summary='{"version":3,"completed":[],"index":0}',active=moves=>JSON.stringify({version:3,index:0,moves});
 const repaired=driver([[key,summary],[runKey,active(win0)]]),won=boot(null,null,repaired.ls);
 try {assert.equal(won.__test.state.status,'won');assert.match(won.document.getElementById('progress').textContent,/1 \/ 16/);assert.deepEqual(repaired.writes,[]);} finally {await won.happyDOM.abort();}
 for(const failure of [{read:key},{write:key},{write:runKey}]){
  const store=driver([[key,summary],[runKey,active(win0.slice(0,-1))]]),tab=boot(null,null,store.ls);
  try {
   Object.assign(store.deny,failure);await act(tab,win0.at(-1));
   assert.equal(tab.__test.state.status,'won');
   assert.match(tab.document.getElementById('status').textContent,/未能完整保存/);
   if(failure.read)assert.deepEqual(store.writes,[]);
   if(failure.write===key)assert.deepEqual(store.writes,[key]);
   if(failure.write===runKey)assert.deepEqual(store.writes,[key,runKey]);
   assert.equal(store.disk.get(runKey),active(win0.slice(0,-1)));
  }finally {await tab.happyDOM.abort();}
 }
 const historical=driver([[key,'{"version":1,"index":2,"completed":[2,4,2,99]}']]),v1=boot(null,null,historical.ls);
 try {
  assert.equal(v1.__test.state.index,4);assert.match(v1.document.getElementById('progress').textContent,/2 \/ 16/);assert.deepEqual(historical.writes,[]);
  await act(v1,E.available(v1.__test.state)[0].id);
  assert.deepEqual(JSON.parse(historical.disk.get(key)),{version:3,index:4,completed:[4,3]});
 } finally {await v1.happyDOM.abort();}
 console.log('screws UI: all controls, win/loss, matching, hidden screws, preview, persistence, corrupt save, fullscreen fallback, restart during animation passed');
}finally{w.happyDOM.abort();}
})().catch(e=>{console.error(e);process.exitCode=1});
