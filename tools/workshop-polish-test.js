'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const{Window}=await import('happy-dom');
for(const game of ['yarn','screws']){
 const key=game==='yarn'?'cozy-yarn-v1':'pine-screw-progress-v1';
 function boot(storage={}){const w=new Window({url:'https://example.test/game/'+game+'.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});w.document.write(fs.readFileSync('game/'+game+'.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));for(const [k,v]of Object.entries(storage))w.localStorage.setItem(k,v);w.matchMedia=()=>({matches:true});for(const f of [game+'-engine',...(game==='screws'?['screws-levels']:[]),'workshop-feedback'])w.eval(fs.readFileSync('game/js/'+f+'.js','utf8'));w.eval(fs.readFileSync('game/js/'+game+'.js','utf8').replace(/\}\)\(\);\s*$/,'window.__test={get state(){return state},get history(){return history}};})();'));return w;}
 const w=boot(),d=w.document,$=id=>d.getElementById(id),wait=()=>new Promise(r=>setTimeout(r,10));
 assert.equal($('sound').getAttribute('aria-pressed'),'false');$('sound').click();assert.equal(w.localStorage.getItem('workshop-sound-v1'),'on');
 const selector=game==='yarn'?'[data-stack]':'.screw';assert($('undo').disabled);d.querySelector(selector).click();await wait();assert.equal(w.__test.state.moves,1);assert(!$('undo').disabled);
 const storage={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);storage[k]=w.localStorage.getItem(k);}
 const restored=boot(storage);assert.equal(restored.__test.state.moves,1);assert.equal(restored.document.getElementById('sound').getAttribute('aria-pressed'),'true');restored.document.getElementById('undo').click();assert.equal(restored.__test.state.moves,0);assert(restored.document.getElementById('undo').disabled);await restored.happyDOM.abort();
 $('undo').click();assert.equal(w.__test.state.moves,0);assert.equal(w.__test.history.length,0);d.querySelector(selector).click();$('restart').click();await wait();assert.equal(w.__test.state.moves,0,'restart cancels in-flight move');assert.equal(JSON.parse(w.localStorage.getItem(key+'-run')).moves.length,0);
 const bad=boot({...storage,[key+'-run']:JSON.stringify({version:2,level:1,index:0,moves:[999]})});assert.equal(bad.__test.state.moves,0);await bad.happyDOM.abort();
 const old=game==='yarn'?{level:4,completed:[4]}:{index:2,completed:[2]};const migrated=boot({[key]:JSON.stringify(old)});assert.equal(game==='yarn'?migrated.__test.state.level:migrated.__test.state.index,game==='yarn'?5:4);await migrated.happyDOM.abort();
 await w.happyDOM.abort();console.log('PASS '+game+': sound toggle, current run reload, undo, restart interruption, invalid replay and old progress migration');
}
})().catch(e=>{console.error(e);process.exitCode=1;});
