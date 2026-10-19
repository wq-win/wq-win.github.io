'use strict';
// Synthetic worker contract tests: these do not execute GPU inference.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../game/life');
(async()=>{
 let calls=[],responses=[],reloads=[],resets=0,options;
 class MLCEngine {
  constructor(opts){options=opts;this.chat={completions:{create:async request=>{calls.push(request);return{choices:[{message:{content:'SYNTHETIC TEST OUTPUT'}}]};}}};}
  async reload(model){reloads.push(model);options.initProgressCallback({progress:.5});}
  async resetChat(){resets++;}
 }
 const self={postMessage:m=>responses.push(m),addEventListener(){}};
 const context={self,loadRuntime:async()=>({MLCEngine})};
 vm.createContext(context);
 context.importScripts=(...names)=>names.forEach(n=>vm.runInContext(fs.readFileSync(path.join(root,n),'utf8'),context));
 const original=fs.readFileSync(path.join(root,'model-worker.js'),'utf8');
 assert(original.includes("import('./vendor/web-llm-0.2.85.js')"));
 vm.runInContext(original.replace("import('./vendor/web-llm-0.2.85.js')",'loadRuntime()'),context);
 await self.onmessage({data:{id:1,kind:'load'}});
 assert.equal(reloads[0],'Qwen2.5-0.5B-Instruct-q4f16_1-MLC');assert.equal(options.logLevel,'SILENT');
 const record=options.appConfig.model_list[0];assert.equal(record.overrides.context_window_size,4096);assert.match(record.model,/resolve\/[a-f0-9]{40}\/$/);assert.match(record.model_lib,/\/binary-mlc-llm-libs\/[a-f0-9]{40}\//);assert.equal(record.integrity.onFailure,'error');assert.equal(responses.at(-1).kind,'ready');
 for(const payload of[{type:'dream',dream:'梦见自己在火车站迷路'},{type:'fortune',date:'2026-10-18',ageRange:null,gender:null}]){
  await self.onmessage({data:{id:2,kind:'generate',payload}});assert.equal(responses.at(-1).text,'SYNTHETIC TEST OUTPUT');assert.equal(calls.at(-1).max_tokens,512);assert.equal(calls.at(-1).stream,false);assert.equal(calls.at(-1).messages.length,2);
 }
 assert.equal(resets,4);
 await self.onmessage({data:{id:3,kind:'generate',payload:{type:'dream',dream:''}}});assert.equal(responses.at(-1).kind,'error');assert.equal(calls.length,2);
 const bytes=fs.readFileSync(path.join(root,'vendor/web-llm-0.2.85.js'));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'341bae95822bfee1d0fd6a0e6cd2db8613bb8edf809390ac142fba36ec17792c');
 console.log('Worker API contract, artifact pins/SRI, real message routing, bounded output and vendored runtime digest passed. Engine responses above are synthetic; actual inference is unverified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
