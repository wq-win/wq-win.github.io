'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const P=require('../game/js/promp-demo.js');
const near=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const base=P.prior();
for(let k=0;k<=100;k++) {
 const t=k/100,p=P.basis(t);near(p.reduce((a,b)=>a+b,0),1);assert.ok(p.every(Number.isFinite));
 for(const noise of [.01,.08,.6]) {
  const post=P.condition(base,t,1.6,noise),a=P.moments(base,t),b=P.moments(post,t);
  near(b.mean,a.mean+a.variance/(a.variance+noise*noise)*(1.6-a.mean));
  near(b.variance,a.variance*noise*noise/(a.variance+noise*noise));
  assert.ok(b.variance<a.variance);
  const L=P.cholesky(post.covariance);
  for(let i=0;i<6;i++)for(let j=0;j<6;j++) {
   near(post.covariance[i][j],post.covariance[j][i]);
   near(P.dot(L[i],L[j]),post.covariance[i][j]);
  }
  for(let s=0;s<=20;s++)assert.ok(P.moments(post,s/20).variance<=P.moments(base,s/20).variance+1e-12);
 }
}
const tight=P.moments(P.condition(base,.65,1.25,.01),.65),loose=P.moments(P.condition(base,.65,1.25,.6),.65);
assert.ok(Math.abs(tight.mean-1.25)<Math.abs(loose.mean-1.25));assert.ok(tight.variance<loose.variance);
assert.deepEqual(P.sampleWeights(base,6,1983),P.sampleWeights(base,6,1983));
assert.ok(P.sampleWeights(base,6,1983).flat().every(Number.isFinite));
for(const noise of [0,-1,NaN,Infinity])assert.throws(()=>P.condition(base,.5,1,noise));
(async()=>{
 const {Window}=await import('happy-dom');
 const window=new Window({settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 const doc=window.document;doc.write(fs.readFileSync(path.join(__dirname,'../game/robot-learn/promp.html'),'utf8'));
 const noop=()=>{};const ctx=new Proxy({}, {get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 doc.getElementById('promp-canvas').getContext=()=>ctx;
 let id=0;const frames=new Map();
 const controller=P.mount(doc,{raf:fn=>{frames.set(++id,fn);return id;},caf:n=>frames.delete(n)});
 const click=name=>doc.getElementById(name).click();
 const frame=ts=>{const [n,fn]=frames.entries().next().value;frames.delete(n);fn(ts);};
 assert.equal(controller.getState().cursor,0);assert.equal(frames.size,0);
 click('promp-step');assert.equal(controller.getState().cursor,5);
 for(let i=0;i<8;i++) {
  click('promp-play');assert.equal(frames.size,1);frame(100);frame(170);assert.ok(controller.getState().playing);
  click('promp-play');assert.equal(frames.size,0);assert.equal(controller.getState().playing,false);
 }
 click('promp-play');doc.getElementById('promp-target').value='80';doc.getElementById('promp-target').dispatchEvent(new window.Event('input'));
 assert.equal(frames.size,0);assert.equal(controller.getState().cursor,0);assert.equal(controller.getState().params.target,.8);
 click('promp-play');frame(100);frame(10000);assert.equal(controller.getState().cursor,100);assert.equal(frames.size,0);
 click('promp-play');assert.equal(controller.getState().cursor,0);assert.equal(frames.size,1);
 click('promp-reset');assert.equal(frames.size,0);assert.deepEqual(controller.getState().params,{t:.65,target:1.25,noise:.08});
 assert.equal(controller.getState().cursor,0);assert.equal(doc.getElementById('promp-play').getAttribute('aria-pressed'),'false');
 controller.play();Object.defineProperty(doc,'hidden',{configurable:true,value:true});doc.dispatchEvent(new window.Event('visibilitychange'));assert.equal(frames.size,0);assert.equal(controller.getState().playing,false);
 controller.play();controller.destroy();assert.equal(frames.size,0);click('promp-step');assert.equal(controller.getState().cursor,0);
 window.happyDOM.abort();console.log('ProMP: 303 posterior invariants, seeded samples, repeated play/pause, stepping, parameter/reset/end/destroy flows passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
