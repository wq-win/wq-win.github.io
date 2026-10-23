'use strict';
const assert=require('node:assert/strict'),R=require('../game/js/rrt-star-demo');
const box={x:3,y:3,w:2,h:2};
assert(R.segmentHitsRect({x:1,y:3},{x:8,y:3},box));assert(R.segmentHitsRect({x:1,y:1},{x:3,y:3},box));assert(R.segmentHitsRect({x:4,y:4},{x:4,y:4},box));assert(!R.segmentHitsRect({x:1,y:2},{x:8,y:2},box));assert(!R.visible({x:0,y:1},{x:2,y:2},[]));
for(let seed=1;seed<=12;seed++){
 const s=R.create({seed,limit:400});let last=Infinity;
 while(s.phase!=='done'){
  R.step(s);
  for(const nodes of [s.rrt,s.star])for(let i=1;i<nodes.length;i++){
   const p=nodes[i];assert(p.parent>=0&&p.parent<nodes.length);assert(R.visible(p,nodes[p.parent],s.obstacles));assert(Math.abs(p.cost-nodes[p.parent].cost-R.distance(p,nodes[p.parent]))<1e-7,'costs propagate to descendants');
   let k=i,count=0;while(k>=0){k=nodes[k].parent;assert(++count<=nodes.length,'acyclic parent chain');}
  }
  assert.equal(s.rrt.length,s.star.length);s.rrt.forEach((p,i)=>{assert.equal(p.x,s.star[i].x);assert.equal(p.y,s.star[i].y);assert(s.star[i].cost<=p.cost+1e-7);});
  const best=R.bestGoal(s.star,s.obstacles);assert(best.cost<=last+1e-7,'best path never worsens');last=best.cost;
 }
}
const a=R.finish(R.create()),b=R.finish(R.create());assert.deepEqual(a.star,b.star);assert(a.rewires>0);assert(Number.isFinite(R.bestGoal(a.star,a.obstacles).cost));assert(R.bestGoal(a.star,a.obstacles).cost<R.bestGoal(a.rrt,a.obstacles).cost);
const n=[{x:0,y:0,parent:-1,cost:0},{x:1,y:0,parent:0,cost:1},{x:2,y:0,parent:1,cost:9},{x:3,y:0,parent:2,cost:10}];R.propagate(n,1);assert.equal(n[2].cost,2);assert.equal(n[3].cost,3);
const blocked=R.finish(R.create({limit:100,obstacles:[{x:40,y:0,w:20,h:60}]}));assert.equal(R.bestGoal(blocked.star,blocked.obstacles).cost,Infinity);
console.log('RRT* numerical PASS: closed collision, deterministic common samples, 12 seeds, all-step edge/cost/cycle invariants, monotone best path, descendant costs, unreachable goal');
(async()=>{const{Window}=await import('happy-dom');const fs=require('node:fs');const window=new Window();window.document.write(fs.readFileSync(require('node:path').join(__dirname,'../game/robot-classic/rrt-star.html'),'utf8'));const timers=new Map();let next=0;window.setInterval=fn=>{timers.set(++next,fn);return next;};window.clearInterval=id=>timers.delete(id);window.DemoKit={setupCanvas:()=>({ctx:new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)})})};global.window=window;const app=R.mount(window.document),$=id=>window.document.getElementById('rrt-star-'+id);$('step').click();assert.equal(app.getState().attempts,1);for(let i=0;i<4;i++){$('run').click();assert.equal(timers.size,1);$('run').click();assert.equal(timers.size,0);}$('run').click();$('radius').value='15';$('radius').dispatchEvent(new window.Event('input'));assert.equal(timers.size,0);assert.equal(app.getState().attempts,0);assert.equal(app.getState().radius,15);R.finish(app.getState());app.tick();assert($('run').disabled);$('reset').click();assert(!$('run').disabled);$('run').click();window.dispatchEvent(new window.Event('pagehide'));assert.equal(timers.size,0);for(const k of ['length','radius','limit'])assert.equal($(k).parentElement.querySelectorAll('.range-val').length,1);app.stop();await window.happyDOM.close();delete global.window;console.log('RRT* DOM PASS: step, play/pause, parameter reset, completion, reset, pagehide, outputs');})().catch(e=>{console.error(e);process.exitCode=1;});
