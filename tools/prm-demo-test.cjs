'use strict';
const assert=require('node:assert/strict');
const P=require('../game/js/prm-demo.js');
const r={x:3,y:3,w:2,h:2};
assert(P.segmentHitsRect({x:0,y:3},{x:8,y:3},r),'edge touching collides');
assert(P.segmentHitsRect({x:0,y:0},{x:3,y:3},r),'corner touching collides');
assert(P.segmentHitsRect({x:4,y:4},{x:4,y:4},r),'zero segment inside collides');
assert(!P.segmentHitsRect({x:0,y:2},{x:8,y:2},r));
assert(!P.visible({x:0,y:2},{x:8,y:2},[]),'workspace boundary excluded');
const a=P.finish(P.create()),b=P.finish(P.create());assert.deepEqual(a.nodes,b.nodes);assert.deepEqual(a.edges,b.edges);assert(a.search.path.length>0,'default finds path');
for(let seed=1;seed<=30;seed++){
 const s=P.finish(P.create({seed,count:80,radius:25}));
 assert.equal(s.nodes.length,80);s.nodes.forEach(p=>assert(P.pointFree(p,s.obstacles)));
 s.edges.forEach(e=>{assert(P.visible(s.nodes[e.a],s.nodes[e.b],s.obstacles));assert(Math.abs(e.w-Math.hypot(s.nodes[e.a].x-s.nodes[e.b].x,s.nodes[e.a].y-s.nodes[e.b].y))<1e-9);});
 const nodes=JSON.stringify(s.nodes),edges=JSON.stringify(s.edges);
 for(let q=0;q<3;q++){assert(P.query(s,q));P.finish(s);assert.equal(JSON.stringify(s.nodes),nodes);assert.equal(JSON.stringify(s.edges),edges);const path=s.search.path;for(let i=1;i<path.length;i++)assert(P.visible(s.queryNodes[path[i-1]],s.queryNodes[path[i]],s.obstacles));}
}
const graph=P.beginSearch([0,1,2,3],[{a:0,b:1,w:5},{a:0,b:2,w:1},{a:2,b:1,w:1},{a:1,b:3,w:1},{a:2,b:3,w:8}],0,3);while(!graph.done)P.searchStep(graph);assert.equal(graph.dist[3],3);assert.deepEqual(graph.path,[0,2,1,3]);
const no=P.beginSearch([0,1],[],0,1);while(!no.done)P.searchStep(no);assert.equal(no.path.length,0);
const sparse=P.finish(P.create({count:40,radius:3}));assert.equal(sparse.search.path.length,0,'disconnected honest');
console.log('PRM PASS: boundary/segment collision, deterministic sampling, 30 seeds, safe edges, roadmap reuse, Dijkstra, disconnected result');

// DOM control contract without a browser: deterministic fake timer prevents flaky sleeps.
(async()=>{
 const {Window}=await import('happy-dom');
 const fs=require('node:fs');const window=new Window();
 window.document.write(fs.readFileSync(require('node:path').join(__dirname,'../game/robot-classic/prm.html'),'utf8'));
 const timers=new Map();let nextTimer=0;
 window.setInterval=fn=>{const id=++nextTimer;timers.set(id,fn);return id;};
 window.clearInterval=id=>timers.delete(id);
 const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 window.DemoKit={setupCanvas:()=>({ctx})};global.window=window;
 const app=P.mount(window.document),$=id=>window.document.getElementById('prm-'+id);
 const click=id=>$(id).click();
 for(const id of ['count','radius']){assert($(`${id}-value`).classList.contains('range-val'),'DemoKit reuses existing value output');assert.equal($(id).parentElement.querySelectorAll('.range-val').length,1,'one range output');}
 assert.equal(app.getState().nodes.length,0);assert($('query').disabled);
 click('step');assert.equal(app.getState().attempts,1);
 for(let i=0;i<5;i++){
  click('run');assert.equal(timers.size,1);assert.equal($('run').getAttribute('aria-pressed'),'true');
  [...timers.values()][0]();const attempts=app.getState().attempts;
  click('run');assert.equal(timers.size,0);assert.equal($('run').getAttribute('aria-pressed'),'false');assert.equal(app.getState().attempts,attempts);
 }
 click('run');click('reset');assert.equal(timers.size,0);assert.equal(app.getState().attempts,0);assert.equal(app.getState().phase,'sample');
 click('run');$('count').value='80';$('count').dispatchEvent(new window.Event('input'));assert.equal(timers.size,0);assert.equal(app.getState().target,80);
 P.finish(app.getState());app.tick();assert($('run').disabled);assert(!$('query').disabled);
 const nodes=JSON.stringify(app.getState().nodes);$('query').value='1';$('query').dispatchEvent(new window.Event('change'));
 assert.equal(app.getState().phase,'query');assert.equal(JSON.stringify(app.getState().nodes),nodes);assert(!$('run').disabled);
 click('run');window.dispatchEvent(new window.Event('pagehide'));assert.equal(timers.size,0);
 click('reset');const first=P.finish(app.getState()).nodes;app.reset();assert.deepEqual(P.finish(app.getState()).nodes,first);
 app.stop();await window.happyDOM.close();delete global.window;
 console.log('PRM DOM PASS: step, repeated play/pause, reset cancels timer, parameter reset, query reuse, completion, pagehide, repeatability');
})().catch(err=>{console.error(err);process.exitCode=1;});
