#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const E=require('../js/snow-camp-engine.js');
require('./snow-camp-scene-test.js');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'game/snow-camp.html'),'utf8');
const source=fs.readFileSync(path.join(root,'js/snow-camp.js'),'utf8');
const instrumented=source.replace(/\}\)\(\);\s*$/,'window.__snowTest={get state(){return state;},sync,select};\n})();');
assert.notEqual(source,instrumented);
(async()=>{
 let dependency=process.env.HAPPY_DOM_PATH||require.resolve('happy-dom');
 if(fs.statSync(dependency).isDirectory())dependency=path.join(dependency,'lib/index.js');
 const {Window}=await import(pathToFileURL(path.resolve(dependency)).href);
 function setup(saved, storage){
  const window=new Window({url:'https://example.test/game/snow-camp.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  const setter=Object.getOwnPropertyDescriptor(window.Element.prototype,'textContent');Object.defineProperty(window.Element.prototype,'textContent',{...setter,set(value){setter.set.call(this,value==null?'':String(value));}});
  window.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  if(storage)Object.defineProperty(window,'localStorage',{value:storage});
  if(saved)window.localStorage.setItem('mylog-snow-camp-v1',saved);
  window.SnowCamp=E;window.SnowCampScene={draw(){}};let callback,now=0;
  window.requestAnimationFrame=fn=>{callback=fn;return 1;};window.confirm=()=>true;window.eval(instrumented);
  const canvas=window.document.getElementById('camp-scene');canvas.getBoundingClientRect=()=>({left:20,top:30,width:500,height:320});
  return {window,api:window.__snowTest,$:id=>window.document.getElementById(id),canvasClick(x,y){canvas.dispatchEvent(new window.MouseEvent('click',{clientX:20+x/2,clientY:30+y/2,bubbles:true}));},frame(n=1){for(let i=0;i<n;i++){now+=250;callback(now);}}};
 }
 const c=setup();
 try{
  assert.equal(c.api.state.status,'ready');assert.equal(c.$('intro-overlay').hidden,false);
  c.frame(40);assert.equal(c.api.state.elapsed,0,'intro does not run simulation');
  const initial=JSON.stringify(c.api.state);c.window.document.querySelector('[data-building="furnace"]').click();c.window.document.querySelector('[data-dispatch="wood"]').click();c.canvasClick(510,255);assert.equal(JSON.stringify(c.api.state),initial,'intro blocks map actions');
  assert.match(c.$('intro-overlay').textContent,/至少 5 名居民/);
  c.$('begin').click();assert.equal(c.api.state.status,'running');assert.equal(c.$('intro-overlay').hidden,true);
  assert.equal(c.$('milestones').children.length,E.milestones(c.api.state).length);
  const wood=c.api.state.resources.wood;c.window.document.querySelector('[data-building="furnace"]').click();
  assert.equal(c.api.state.furnace.level,2);assert.equal(c.api.state.resources.wood,wood+8,'furnace milestone grants reward');assert.match(c.$('scene-feedback').textContent,/炉火就绪/);assert.equal(c.$('milestones').querySelectorAll('.done').length,1);
  c.api.sync();c.api.sync();assert.equal(c.api.state.resources.wood,wood+8,'rendering does not reclaim reward');
  c.window.document.querySelector('[data-building="housing"]').click();assert.equal(c.api.state.queue[0].building,'housing','map building directly starts construction');assert.match(c.$('scene-feedback').textContent,/已支付木材/);
  const paidWood=c.api.state.resources.wood;c.window.document.querySelector('[data-building="housing"]').click();assert.equal(c.api.state.resources.wood,paidWood);assert.equal(c.api.state.queue.length,1);assert.equal(c.$('scene-feedback').classList.contains('error'),true);
  c.frame(9);assert.ok(c.api.state.elapsed>=1);
  c.$('pause').click();const elapsed=c.api.state.elapsed;c.frame(30);assert.equal(c.api.state.elapsed,elapsed);assert.equal(c.api.state.status,'paused');
  const frozen=JSON.stringify(c.api.state);c.frame(10);assert.equal(JSON.stringify(c.api.state),frozen,'pause freezes resources, construction and fractional clock');
  const minus=c.window.document.querySelector('[data-job="medic"][data-delta="-1"]');minus.click();assert.equal(c.api.state.jobs.medic,0);assert.equal(c.$('free-workers').textContent,'1');
  c.window.document.querySelector('[data-job="hunt"][data-delta="1"]').click();assert.equal(c.api.state.jobs.hunt,2);
  c.api.state.resources.wood=40;c.api.select('kitchen');assert.equal(c.$('build').disabled,false);c.$('build').click();assert.ok(c.api.state.queue.some(q=>q.building==='kitchen'));assert.equal(c.$('build').disabled,true);
  c.api.select('furnace');c.window.document.querySelector('[data-heat="3"]').click();assert.equal(c.api.state.furnace.level,3);assert.match(c.$('heat-info').textContent,/32.6/);
  const beforeDispatch=c.api.state.jobs.wood;c.window.document.querySelector('[data-dispatch="wood"]').click();assert.equal(c.api.state.jobs.wood,beforeDispatch+1);assert.equal(E.view(c.api.state).workers,E.view(c.api.state).population,'dispatch transfers instead of creating workers');assert.match(c.$('scene-feedback').textContent,/调派/);
  for(const [job,x,y] of [['wood',885,350],['coal',770,190],['hunt',210,290]]){const count=c.api.state.jobs[job];c.canvasClick(x,y);assert.equal(c.api.state.jobs[job],count+1,'raw canvas '+job+' hit target');assert.equal(E.view(c.api.state).workers,8);}
  assert.equal(c.$('pin-furnace').textContent,'3 档 · 调至 1 档');
  assert.match(c.window.document.querySelector('[data-building="furnace"]').getAttribute('aria-label'),/调至 1 档/);
  c.canvasClick(510,255);assert.equal(c.api.state.furnace.level,1,'canvas furnace cycles heat');
  assert.equal(c.$('action-message').textContent,'炉火已调至 1 档');
  for(const [level,next] of [[0,1],[1,2],[2,3],[3,1]]){
    c.window.document.querySelector('[data-heat="'+level+'"]').click();
    assert.equal(c.$('pin-furnace').textContent,level+' 档 · 调至 '+next+' 档');
    if(level===0)assert.equal(c.$('action-message').textContent,'炉火已关闭');
    c.window.document.querySelector('[data-building="furnace"]').click();
    assert.equal(c.api.state.furnace.level,next);
    assert.equal(c.$('action-message').textContent,'炉火已调至 '+next+' 档');
  }
  c.api.state.resources.wood=100;c.canvasClick(370,210);assert.ok(c.api.state.queue.some(q=>q.building==='clinic'),'canvas clinic starts construction');c.canvasClick(735,290);assert.ok(c.api.state.queue.some(q=>q.building==='sawmill'),'canvas sawmill starts construction');
  c.api.select('furnace');c.window.document.querySelector('[data-heat="3"]').click();
  c.$('speed').click();assert.match(c.$('speed').textContent,/2×/);
  c.window.confirm=()=>false;c.$('reset').click();assert.equal(c.api.state.furnace.level,3,'declining reset preserves game');
  c.window.confirm=()=>true;c.$('reset').click();assert.equal(c.api.state.status,'ready');assert.equal(c.api.state.elapsed,0);assert.match(c.$('speed').textContent,/1×/);
  c.api.state.status='won';c.api.state.reason='救援队抵达';c.api.sync();assert.equal(c.$('result-overlay').hidden,false);assert.equal(c.$('pause').disabled,true);
  const ended=JSON.stringify(c.api.state);c.window.document.querySelector('[data-building="housing"]').click();c.window.document.querySelector('[data-dispatch="coal"]').click();c.canvasClick(510,255);c.frame(20);assert.equal(JSON.stringify(c.api.state),ended,'ended games block map actions and clock');
  c.$('result-restart').click();assert.equal(c.api.state.status,'ready');assert.equal(c.$('result-overlay').hidden,true);
  c.api.state.status='lost';c.api.state.reason='居民不足';c.api.state.residents.forEach(r=>r.alive=false);c.api.sync();assert.equal(c.$('value-food').textContent,'0%');assert.equal(c.$('value-warm').textContent,'0%');assert.match(c.$('result-title').textContent,/炉火/);
  c.$('result-restart').click();assert.equal(c.api.state.status,'ready');
  assert.match(c.$('resource-outlook').textContent,/当前净变化/);
  c.$('inspect-map').click();assert.equal(c.$('inspect-map').getAttribute('aria-pressed'),'true');assert.match(c.$('pin-furnace').textContent,/查看$/);
  const planning=JSON.stringify(c.api.state);c.window.document.querySelector('[data-building="housing"]').click();c.canvasClick(510,255);c.window.document.querySelector('[data-dispatch="wood"]').click();
  assert.equal(JSON.stringify(c.api.state),planning,'inspection mode never spends resources or changes staffing');
  c.$('inspect-map').click();assert.equal(c.$('inspect-map').getAttribute('aria-pressed'),'false');
  c.api.state.resources.food=0;c.api.state.jobs.cook=0;c.api.sync();assert.match(c.$('supply-advice').textContent,/餐食正在减少/);
  const saved=E.create();E.act(saved,{type:'start'});E.tick(saved,5);E.act(saved,{type:'heat',level:2});const savedWood=saved.resources.wood;const d=setup(E.save(saved));
  try{assert.equal(d.$('resume').hidden,false);d.$('resume').click();assert.equal(d.api.state.elapsed,5);assert.equal(d.api.state.status,'running');assert.equal(d.$('intro-overlay').hidden,true);assert.equal(d.api.state.resources.wood,savedWood);assert.equal(d.$('milestones').querySelectorAll('.done').length,1);d.api.sync();d.window.document.querySelector('[data-building="furnace"]').click();assert.equal(d.api.state.resources.wood,savedWood,'resume does not duplicate rewards');}finally{d.window.happyDOM.abort();}
  const bad=setup('{corrupt');try{assert.equal(bad.$('resume').hidden,true);bad.$('begin').click();assert.equal(bad.api.state.status,'running');}finally{bad.window.happyDOM.abort();}
  const key='mylog-snow-camp-v1';
  let raw=null,writes=0,blocked=false;
  const storage={
   getItem(){if(blocked)throw Error('storage blocked');return raw;},
   setItem(k,v){assert.equal(k,key);if(blocked)throw Error('storage blocked');raw=v;writes++;}
  };
  const a=setup(null,storage), b=setup(null,storage), late=[];
  try{
   a.$('begin').click();a.$('pause').click();
   const old=setup(null,storage);late.push(old);
   old.$('resume').click();old.$('pause').click();
   const w=writes;old.frame(24);old.window.dispatchEvent(new old.window.Event('pagehide'));
   assert.equal(writes,w,'an unchanged single-tab camp is not written again');
   a.$('pause').click();a.frame(49);
   a.window.document.querySelector('[data-building="furnace"]').click();
   a.window.document.querySelector('[data-building="housing"]').click();
   const advanced=raw;
   old.frame(24);old.window.dispatchEvent(new old.window.Event('pagehide'));
   assert.equal(raw,advanced,'idle and pagehide from stale pause leave newer coherent save intact');
   old.window.document.querySelector('[data-building="furnace"]').click();
   assert.equal(raw,advanced,'ordinary writes from stale dirty tab are rejected');
   assert.match(old.$('save-note').textContent,/此营地未保存/);
   const cache=setup(null,storage);late.push(cache);
   a.frame(7);const dirtyElapsed=a.api.state.elapsed;
   a.window.dispatchEvent(new a.window.Event('pagehide'));
   const checkpoint=E.restore(raw);assert.equal(checkpoint.elapsed,dirtyElapsed);
   assert.equal(checkpoint.furnace.level,2);
   assert.equal(checkpoint.queue[0].building,'housing');
   cache.$('resume').click();assert.equal(cache.api.state.elapsed,dirtyElapsed,'resume re-reads storage');
   assert.equal(cache.api.state.queue[0].building,'housing');
   old.api.state.status='won';old.api.state.reason='获救';old.api.sync();
   old.window.confirm=()=>false;old.$('result-restart').click();
   assert.equal(old.api.state.status,'won','stale result restart asks before discarding new slot');
   const beforeConfirmation=raw;
   old.window.confirm=()=>{a.$('reset').click();return true;};
   old.$('result-restart').click();
   assert.notEqual(raw,beforeConfirmation);
   assert.equal(old.api.state.status,'won','confirmation cannot authorize an even newer replacement');
   a.$('pause').click();a.frame(9);a.window.dispatchEvent(new a.window.Event('pagehide'));
   const beforeRestart=E.restore(raw);assert.ok(beforeRestart.elapsed>0);
   old.window.confirm=()=>true;old.$('result-restart').click();
   assert.equal(E.restore(raw).elapsed,0,'explicitly authorized restart can replace higher elapsed');
   b.window.confirm=()=>false;b.$('begin').click();
   assert.equal(b.$('intro-overlay').hidden,false,'page originally opened with no slot prompts for a later checkpoint');
   blocked=true;
   const offline=setup(null,storage);late.push(offline);
   offline.$('begin').click();assert.equal(offline.api.state.status,'running');
   assert.match(offline.$('save-note').textContent,/无法存档/);
   blocked=false;offline.window.dispatchEvent(new offline.window.Event('pagehide'));
   assert.equal(E.restore(raw).elapsed,0);
   assert.match(offline.$('save-note').textContent,/此营地未保存/);
  }finally{[a,b,...late].forEach(tab=>tab.window.happyDOM.abort());}
  console.log('snow-camp-ui: onboarding, pause, assignments, builds, heat, speed, reset, end states, save/resume, corrupt-save recovery passed');
 }finally{c.window.happyDOM.abort();}
})().catch(error=>{console.error(error);process.exitCode=1;});
