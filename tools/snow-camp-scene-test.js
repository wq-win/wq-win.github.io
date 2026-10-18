#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const E=require('../js/snow-camp-engine.js');
const window={SnowCamp:E,devicePixelRatio:2};
vm.runInNewContext(fs.readFileSync(require.resolve('../js/snow-camp-scene.js'),'utf8'),{window});
const Scene=window.SnowCampScene;
const plain=value=>JSON.parse(JSON.stringify(value));
const state=E.create();
assert.equal(Scene.simulationTime(state),0);
let routes=plain(Scene.workerRoutes(state));
assert.equal(routes.length,8);assert.equal(new Set(routes.map(r=>r.id)).size,8);
for(const [job,n] of Object.entries(state.jobs))assert.equal(routes.filter(r=>r.job===job).length,n);
assert.equal(routes.find(r=>r.job==='wood').target,'wood');
assert.equal(routes.find(r=>r.job==='build').stage,'idle');assert.equal(routes.find(r=>r.job==='medic').stage,'idle');
state.buildings.sawmill=1;state.buildings.clinic=1;state.resources.wood=100;E.act(state,{type:'build',building:'housing'});
routes=plain(Scene.workerRoutes(state));assert.equal(routes.find(r=>r.job==='wood').target,'sawmill');assert.equal(routes.find(r=>r.job==='build').target,'housing');assert.equal(routes.find(r=>r.job==='medic').target,'clinic');
const stages=new Set(),carriers=new Set();
for(let t=0;t<32;t++){state.elapsed=t;for(const r of Scene.workerRoutes(state)){assert.ok(Number.isFinite(r.x)&&Number.isFinite(r.y));stages.add(r.stage);if(r.carrying){assert.equal(r.stage,'returning');carriers.add(r.job);}}}
assert.deepEqual([...stages].sort(),['outbound','returning','working']);assert.deepEqual([...carriers].sort(),['coal','cook','hunt','wood']);
E.act(state,{type:'start'});E.tick(state,.25);assert.equal(Scene.simulationTime(state),31.25);E.act(state,{type:'pause'});const frozen=plain(Scene.workerRoutes(state));E.tick(state,5);assert.deepEqual(plain(Scene.workerRoutes(state)),frozen);
// Exercise the real canvas renderer, recording operations rather than stubbing draw().
function paint(s,wallTime){const calls=[];const context=new Proxy({}, {get(target,key){if(key in target)return target[key];return (...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),'finite canvas '+key);calls.push([key,...args]);if(key==='createLinearGradient'||key==='createRadialGradient')return {addColorStop(...stops){calls.push(['addColorStop',...stops]);}};};},set(target,key,value){calls.push(['set',key,value]);target[key]=value;return true;}});const canvas={width:0,height:0,getBoundingClientRect:()=>({width:500,height:320}),getContext:()=>context};Scene.draw(canvas,s,wallTime);assert.equal(canvas.width,1000);assert.equal(canvas.height,640);assert.ok(calls.length>1000);return plain(calls);}
assert.deepEqual(paint(state,100),paint(state,9999),'all visual animation uses frozen simulation clock, not wall time');
const paused=paint(state,0);E.act(state,{type:'start'});E.tick(state,.25);assert.notDeepEqual(paint(state,0),paused,'visuals advance with simulation');
const before=paint(state,0);state.buildings.housing=2;state.buildings.kitchen=2;state.queue=[];assert.notDeepEqual(paint(state,0),before,'building completion changes canvas output');
state.resources.coal=0;state.jobs.coal=0;paint(state,0);state.elapsed=240;paint(state,0);state.elapsed=410;paint(state,0);
state.residents[0].alive=false;state.residents[0].health=0;state.jobs.wood--;assert.equal(Scene.workerRoutes(state).length,7);
console.log('snow-camp-scene: real draw, worker routes/carrying, staffing, construction, heat, weather and frozen simulation clock passed');
