'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const demo = require('../game/js/lora-demo.js');
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);
for (const rank of [1,2,3,4]) for (const alpha of [0,2,8]) {
  const s=demo.createState({rank,alpha});
  const frozen=JSON.stringify(s.W0);
  assert.equal(s.A.length,rank); assert.equal(s.A[0].length,8);
  assert.equal(s.B.length,8); assert.equal(s.B[0].length,rank);
  assert.deepEqual(demo.parameterCounts(rank),{frozen:64,trainable:16*rank,fullFineTune:64});
  for(let n=0;n<=rank;n++) {
    const d=demo.delta(s), w=demo.adapted(s);
    for(let i=0;i<8;i++) for(let j=0;j<8;j++) {
      let expected=0; for(let k=0;k<n;k++) expected+=s.B[i][k]*s.A[k][j]*alpha/rank;
      near(d[i][j],expected); near(w[i][j],s.W0[i][j]+expected);
    }
    assert.equal(demo.numericalRank(d),alpha===0?0:n);
    assert.equal(JSON.stringify(s.W0),frozen);
    demo.advance(s);
  }
  assert.equal(s.step,rank); demo.advance(s); assert.equal(s.step,rank);
  const product=demo.multiply(s.B,s.A), full=demo.delta(s);
  product.forEach((row,i)=>row.forEach((v,j)=>near(full[i][j],v*alpha/rank)));
  const zero=demo.createState({rank,alpha,zeroB:true});
  assert.ok(demo.delta(zero,rank).flat().every(v=>v===0));
  assert.deepEqual(demo.adapted(zero,rank),zero.W0);
}
(async()=>{
  const {Window}=await import(pathToFileURL(require.resolve('happy-dom')).href);
  const win=new Window();
  const html=fs.readFileSync(path.join(__dirname,'../game/llm/lora.html'),'utf8');
  win.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const timers=new Map(); let id=0;
  win.setInterval=fn=>{timers.set(++id,fn);return id;};
  win.clearInterval=n=>timers.delete(n);
  const controller=demo.mount(win.document), el=x=>win.document.getElementById(x);
  const tick=()=>[...timers.values()].forEach(fn=>fn());
  const input=(name,value,event='input')=>{el(name).value=value;el(name).dispatchEvent(new win.Event(event));};
  assert.equal(controller.state.step,0); assert.equal(el('lora-base').children.length,64);
  el('lora-step').click(); assert.equal(controller.state.step,1);
  el('lora-reset').click(); assert.equal(controller.state.step,0);
  for(let n=0;n<5;n++) {
    el('lora-play').click(); assert.equal(timers.size,1); assert.equal(controller.playing,true);
    el('lora-play').click(); assert.equal(timers.size,0); assert.equal(controller.playing,false);
    tick(); assert.equal(controller.state.step,0);
  }
  el('lora-play').click(); tick(); assert.equal(controller.state.step,1);
  input('lora-rank','4'); assert.equal(controller.state.rank,4); assert.equal(controller.state.step,0); assert.equal(timers.size,0);
  assert.ok(el('lora-budget').textContent.includes('已没有参数节省'));
  el('lora-play').click(); for(let n=0;n<4;n++)tick();
  assert.equal(controller.state.step,4); assert.equal(timers.size,0); assert.equal(el('lora-play').disabled,true);
  assert.equal(el('lora-step').disabled,true);
  el('lora-reset').click(); assert.equal(el('lora-play').disabled,false);
  input('lora-alpha','0'); el('lora-step').click(); assert.equal(demo.numericalRank(demo.delta(controller.state)),0);
  input('lora-alpha','2'); el('lora-zero').checked=true; el('lora-zero').dispatchEvent(new win.Event('change'));
  el('lora-step').click(); assert.deepEqual(demo.adapted(controller.state),controller.state.W0);
  el('lora-play').click(); win.dispatchEvent(new win.Event('pagehide')); assert.equal(timers.size,0);
  el('lora-play').click(); controller.destroy(); assert.equal(timers.size,0);
  const previous=controller.state.step; el('lora-step').click(); assert.equal(controller.state.step,previous);
  await win.happyDOM.close();
  console.log('LoRA: matrix products, ranks, frozen weights, parameter counts, zero initialization, and controller lifecycle passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
