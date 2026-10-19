'use strict';
// These are synthetic lifecycle/API contract tests. No real model or GPU is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../game/life');
const source = fs.readFileSync(path.join(root, 'local-model.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(gpu) {
 const workers=[],timers=[];
 class Worker {
  constructor(url){this.url=String(url);this.messages=[];workers.push(this);}
  postMessage(message){this.messages.push(message);}
  terminate(){this.terminated=true;}
  reply(kind,text){this.onmessage({data:{id:this.messages.at(-1).id,kind,text}});}
 }
 const context={window:{},navigator:{gpu},document:{baseURI:'https://example.test/game/life/dream.html'},URL,Worker,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{}};
 vm.runInNewContext(source,context);
 const progress=[];return{model:new context.window.LifeLocalModel(text=>progress.push(text)),workers,timers,progress};
}
(async()=>{
 let passed=0;async function test(name,fn){await fn();passed++;console.log('✓ '+name);}
 await test('Absent adapter and absent feature reject before a worker/download exists',async()=>{
  for(const gpu of[undefined,{requestAdapter:async()=>null},{requestAdapter:async()=>{throw new Error('blocked');}},{requestAdapter:async()=>({features:new Set()})}]){
   const x=setup(gpu);await assert.rejects(x.model.generate({type:'dream'}));assert.equal(x.workers.length,0);
  }
 });
 const gpu={requestAdapter:async()=>({features:new Set(['shader-f16'])})};
 await test('Loading then generating uses pinned local worker and reuses model',async()=>{
  const x=setup(gpu);assert.equal(x.workers.length,0);const p=x.model.generate({type:'dream',dream:'test dream'});await tick();
  const w=x.workers[0];assert.equal(w.url,'https://example.test/game/life/model-worker.js');assert.equal(w.messages[0].kind,'load');
  w.reply('progress','30%');assert.equal(x.progress.at(-1),'30%');w.reply('ready');await tick();assert.equal(w.messages[1].kind,'generate');w.reply('result','synthetic');assert.equal(await p,'synthetic');
  const p2=x.model.generate({type:'fortune'});await tick();assert.equal(x.workers.length,1);w.reply('result','synthetic 2');assert.equal(await p2,'synthetic 2');
 });
 await test('Stop during adapter check cannot start a late download',async()=>{
  let resolve;const x=setup({requestAdapter:()=>new Promise(r=>resolve=r)});const p=x.model.generate({});x.model.stop();resolve({features:new Set(['shader-f16'])});await assert.rejects(p,/已停止/);assert.equal(x.workers.length,0);
 });
 await test('Stop during download terminates worker and retry gets a fresh worker',async()=>{
  const x=setup(gpu);const p=x.model.generate({});await tick();x.model.stop();await assert.rejects(p,/已停止/);assert(x.workers[0].terminated);
  const p2=x.model.generate({});await tick();assert.equal(x.workers.length,2);x.model.stop();await assert.rejects(p2);
 });
 await test('Timeout and worker errors terminate, reject and clear ready state',async()=>{
  for(const reason of['timeout','worker','cache']){
   const x=setup(gpu);const p=x.model.generate({});await tick();const w=x.workers[0];
   if(reason==='timeout')x.timers.at(-1)();else if(reason==='worker')w.onerror();else w.reply('error','缓存或内存不足，请重试。');
   await assert.rejects(p);assert(w.terminated);assert.equal(x.model.ready,false);assert.equal(x.model.pending,null);
  }
 });
 await test('GPU loss during generation rejects instead of substituting text',async()=>{
  const x=setup(gpu);const p=x.model.generate({});await tick();x.workers[0].reply('ready');await tick();x.workers[0].reply('error','GPU 设备丢失');await assert.rejects(p,/GPU/);assert(x.workers[0].terminated);
 });
 const ctx={self:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'model-prompts.js'),'utf8'),ctx);
 await test('Prompts require dream data or valid optional fortune profile',async()=>{
  assert.throws(()=>ctx.self.LifePrompts({type:'dream',dream:''}));
  const dream=ctx.self.LifePrompts({type:'dream',dream:'梦见一座火车站'});assert.match(dream[0].content,/不是.*诊断/);assert.match(dream[1].content,/火车站/);
  const fortune=ctx.self.LifePrompts({type:'fortune',date:'2026-10-18',ageRange:null,gender:null});for(const word of['幸运数字','幸运颜色','幸运方位','不代表预测'])assert(fortune[0].content.includes(word));
  assert.throws(()=>ctx.self.LifePrompts({type:'fortune',date:'2026-10-18',ageRange:'under18',gender:null}));
 });
 console.log(`${passed} local model lifecycle tests passed (synthetic; no real inference).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
