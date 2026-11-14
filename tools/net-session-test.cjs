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
 function boot(saved){const w=new Window({url:'https://test.invalid/game/net.html',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});w.document.write(fs.readFileSync('game/net.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));if(saved)w.localStorage.setItem('mylog-net-run-v1',saved);for(const p of ['js/net-engine.js','js/net-session.js','game/js/workshop-session.js','js/net.js'])w.eval(fs.readFileSync(p,'utf8'));return w;}
 let w=boot(),d=w.document;d.querySelector('#net-board button').click();assert.equal(d.querySelector('#move-count').textContent,'1');
 const save=w.localStorage.getItem('mylog-net-run-v1');d.querySelector('#undo-board').click();assert.equal(Number(d.querySelector('#move-count').textContent),0);
 d.querySelector('#turn-direction').click();assert.equal(d.querySelector('#turn-direction').getAttribute('aria-pressed'),'true');
 d.querySelector('#net-board button').click();d.querySelector('#reset-board').click();assert.equal(d.querySelector('dialog').open,true);d.querySelector('.workshop-sheet-actions button').click();assert.equal(d.querySelector('#move-count').textContent,'1');
 await w.happyDOM.abort();w=boot(save);d=w.document;assert.equal(d.querySelector('#move-count').textContent,'1');assert.match(d.querySelector('#net-status').textContent,/已恢复/);await w.happyDOM.abort();
 console.log('Net session: all 20 levels restore/validation, rotation undo/direction, restart cancel and real UI reload passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
