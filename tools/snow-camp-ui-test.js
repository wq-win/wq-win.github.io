#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const E=require('../js/snow-camp-engine.js');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'game/snow-camp.html'),'utf8');
const source=fs.readFileSync(path.join(root,'js/snow-camp.js'),'utf8');
const instrumented=source.replace(/\}\)\(\);\s*$/,'window.__snowTest={get state(){return state;},sync,select};\n})();');
assert.notEqual(source,instrumented);
(async()=>{
 let dependency=process.env.HAPPY_DOM_PATH||require.resolve('happy-dom');
 if(fs.statSync(dependency).isDirectory())dependency=path.join(dependency,'lib/index.js');
 const {Window}=await import(pathToFileURL(path.resolve(dependency)).href);
 function setup(saved){
  const window=new Window({url:'https://example.test/game/snow-camp.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  const setter=Object.getOwnPropertyDescriptor(window.Element.prototype,'textContent');Object.defineProperty(window.Element.prototype,'textContent',{...setter,set(value){setter.set.call(this,value==null?'':String(value));}});
  window.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  if(saved)window.localStorage.setItem('mylog-snow-camp-v1',saved);
  window.SnowCamp=E;window.SnowCampScene={draw(){}};let callback,now=0;
  window.requestAnimationFrame=fn=>{callback=fn;return 1;};window.confirm=()=>true;window.eval(instrumented);
  return {window,api:window.__snowTest,$:id=>window.document.getElementById(id),frame(n=1){for(let i=0;i<n;i++){now+=250;callback(now);}}};
 }
 const c=setup();
 try{
  assert.equal(c.api.state.status,'ready');assert.equal(c.$('intro-overlay').hidden,false);
  c.frame(40);assert.equal(c.api.state.elapsed,0,'intro does not run simulation');
  assert.match(c.$('intro-overlay').textContent,/至少 5 名居民/);
  c.$('begin').click();assert.equal(c.api.state.status,'running');assert.equal(c.$('intro-overlay').hidden,true);
  c.frame(9);assert.ok(c.api.state.elapsed>=1);
  c.$('pause').click();const elapsed=c.api.state.elapsed;c.frame(30);assert.equal(c.api.state.elapsed,elapsed);assert.equal(c.api.state.status,'paused');
  const minus=c.window.document.querySelector('[data-job="medic"][data-delta="-1"]');minus.click();assert.equal(c.api.state.jobs.medic,0);assert.equal(c.$('free-workers').textContent,'1');
  c.window.document.querySelector('[data-job="hunt"][data-delta="1"]').click();assert.equal(c.api.state.jobs.hunt,2);
  c.api.select('kitchen');assert.equal(c.$('build').disabled,false);c.$('build').click();assert.equal(c.api.state.queue[0].building,'kitchen');assert.equal(c.$('build').disabled,true);
  c.api.select('furnace');c.window.document.querySelector('[data-heat="3"]').click();assert.equal(c.api.state.furnace.level,3);assert.match(c.$('heat-info').textContent,/32.6/);
  c.$('speed').click();assert.match(c.$('speed').textContent,/2×/);
  c.window.confirm=()=>false;c.$('reset').click();assert.equal(c.api.state.furnace.level,3,'declining reset preserves game');
  c.window.confirm=()=>true;c.$('reset').click();assert.equal(c.api.state.status,'ready');assert.equal(c.api.state.elapsed,0);assert.match(c.$('speed').textContent,/1×/);
  c.api.state.status='won';c.api.state.reason='救援队抵达';c.api.sync();assert.equal(c.$('result-overlay').hidden,false);assert.equal(c.$('pause').disabled,true);
  c.$('result-restart').click();assert.equal(c.api.state.status,'ready');assert.equal(c.$('result-overlay').hidden,true);
  c.api.state.status='lost';c.api.state.reason='居民不足';c.api.state.residents.forEach(r=>r.alive=false);c.api.sync();assert.equal(c.$('value-food').textContent,'0%');assert.equal(c.$('value-warm').textContent,'0%');assert.match(c.$('result-title').textContent,/炉火/);
  c.$('result-restart').click();assert.equal(c.api.state.status,'ready');
  const saved=E.create();E.act(saved,{type:'start'});E.tick(saved,5);const d=setup(E.save(saved));
  try{assert.equal(d.$('resume').hidden,false);d.$('resume').click();assert.equal(d.api.state.elapsed,5);assert.equal(d.api.state.status,'running');assert.equal(d.$('intro-overlay').hidden,true);}finally{d.window.happyDOM.abort();}
  const bad=setup('{corrupt');try{assert.equal(bad.$('resume').hidden,true);bad.$('begin').click();assert.equal(bad.api.state.status,'running');}finally{bad.window.happyDOM.abort();}
  console.log('snow-camp-ui: onboarding, pause, assignments, builds, heat, speed, reset, end states, save/resume, corrupt-save recovery passed');
 }finally{c.window.happyDOM.abort();}
})().catch(error=>{console.error(error);process.exitCode=1;});
