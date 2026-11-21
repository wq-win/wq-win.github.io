'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{const {Window}=await import(pathToFileURL(require.resolve('happy-dom')).href);const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'game/screws.html'),'utf8');
function boot(saved,savedRun){const w=new Window({url:'https://example.test/game/screws.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});w.document.write(html.replace(/<script[\s\S]*?<\/script>/g,''));if(saved)w.localStorage.setItem('pine-screw-progress-v1',saved);if(savedRun)w.localStorage.setItem('pine-screw-progress-v1-run',savedRun);w.matchMedia=()=>({matches:true});w.eval(fs.readFileSync(path.join(root,'game/js/screws-engine.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'game/js/screws-levels.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'game/js/screws.js'),'utf8').replace(/\}\)\(\);\s*$/,'window.__test={get state(){return state},start,render};})();'));w.eval(fs.readFileSync(path.join(root,'js/game-view.js'),'utf8'));return w;}
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
 console.log('screws UI: all controls, win/loss, matching, hidden screws, preview, persistence, corrupt save, fullscreen fallback, restart during animation passed');
}finally{w.happyDOM.abort();}
})().catch(e=>{console.error(e);process.exitCode=1});
