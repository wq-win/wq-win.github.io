'use strict';
(async()=>{
const assert=require('node:assert/strict'),fs=require('node:fs'),{Window}=await import('happy-dom');
const code=fs.readFileSync('game/js/game-feedback.js','utf8');
function setup({support=true,storageFail=false,reduce=false,rejectVibration=false,shared}={}){
 const w=new Window({url:'https://example.test/game/net.html'});w.document.write('<main><button id="tile">tile</button></main>');
 let tones=0,stops=[],vibes=[];w.matchMedia=()=>({matches:reduce});
 if(support){Object.defineProperty(w.navigator,'vibrate',{value:n=>{vibes.push(Array.isArray(n)?Array.from(n):n);if(rejectVibration==='throw')throw Error('refused');return !rejectVibration;}});w.AudioContext=class{constructor(){this.state='running';this.currentTime=0;this.destination={};}createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){tones++},stop(at){stops.push(at)},disconnect(){}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}close(){return Promise.resolve();}};}
 if(shared)Object.defineProperty(w,'localStorage',{value:shared});
 if(storageFail){Object.defineProperty(w,'localStorage',{value:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}});}
 w.eval(code);const f=w.GameFeedback.create({host:w.document.querySelector('main')}),buttons=f.controls.querySelectorAll('button');
 return {w,f,buttons,tile:w.document.getElementById('tile'),tones:()=>tones,stops,vibes,allowVibration:()=>rejectVibration=false};
}
let q=setup();q.f.play('win',q.tile);assert.equal(q.tones(),0);assert.equal(q.vibes.length,0);assert(q.tile.classList.contains('game-fx-win'));q.buttons[0].click();assert.equal(q.tones(),1);q.buttons[1].click();assert.deepEqual(q.vibes,[8]);assert.equal(q.buttons[0].getAttribute('aria-pressed'),'true');const prefs=q.w.localStorage.getItem('mylog-game-feedback-v1');assert.deepEqual(JSON.parse(prefs),{sound:true,vibration:true});q.f.destroy();assert(!q.tile.classList.contains('game-fx-win'));const n=q.tones();q.f.play('tap',q.tile);assert.equal(q.tones(),n);await q.w.happyDOM.close();
q=setup({support:false});assert(q.buttons[0].disabled);assert(q.buttons[1].disabled);q.f.play('error',q.tile);assert(q.tile.classList.contains('game-fx-error'));q.f.destroy();await q.w.happyDOM.close();
q=setup({storageFail:true});q.buttons[0].click();q.buttons[1].click();assert.equal(q.tones(),1);assert.deepEqual(q.vibes,[8]);q.f.destroy();await q.w.happyDOM.close();
q=setup({reduce:true});q.buttons[1].click();q.f.play('win',q.tile);assert(q.vibes.every(n=>n===0));assert(!q.tile.classList.contains('game-fx-win'));q.f.destroy();await q.w.happyDOM.close();
const KEY='mylog-game-feedback-v1';
const pressed=(q,i)=>q.buttons[i].getAttribute('aria-pressed')==='true';
const backend=(raw=JSON.stringify({sound:true,vibration:true}))=>{
 let writes=0;const fault={};return {fault,get raw(){return raw},set raw(v){raw=v},get writes(){return writes},area:{
  getItem(k){if(fault.read)throw Error('read');return raw},
  setItem(k,v){if(fault.write)throw Error('write');writes++;raw=v;}
 }};
};
const event=(q,key,area)=>q.w.dispatchEvent(new q.w.StorageEvent('storage',{key,storageArea:area}));
const show=(q,persisted)=>{const e=new q.w.Event('pageshow');Object.defineProperty(e,'persisted',{value:persisted});q.w.dispatchEvent(e);};
for(const first of [0,1]){
 const store=backend(), a=setup({shared:store.area}), b=setup({shared:store.area});
 a.buttons[first].click();b.buttons[1-first].click();
 assert.deepEqual(JSON.parse(store.raw),{sound:false,vibration:false});
 assert.equal(a.tones()+b.tones(),0);assert(!a.vibes.concat(b.vibes).some(v=>v!==0));
 a.f.destroy();b.f.destroy();await a.w.happyDOM.close();await b.w.happyDOM.close();
}
{
 const store=backend(), a=setup({shared:store.area}), b=setup({shared:store.area});
 a.buttons[1].click();b.buttons[1].click();assert.equal(store.writes,1);
 assert.deepEqual(JSON.parse(store.raw),{sound:true,vibration:false});
 a.f.destroy();b.f.destroy();await a.w.happyDOM.close();await b.w.happyDOM.close();
}
{
 const store=backend(), a=setup({shared:store.area});
 a.f.play('win',a.tile);assert.equal(a.tones(),1);assert.deepEqual(a.vibes,[[12,65,18]]);
 store.raw='{"sound":true,"vibration":false}';
 event(a,'other',store.area);event(a,KEY,a.w.sessionStorage);assert(pressed(a,1));
 event(a,KEY,store.area);assert(!pressed(a,1));assert.deepEqual(a.vibes,[[12,65,18],0]);assert.equal(a.stops.filter(x=>x===undefined).length,0);
 store.raw='{"sound":false,"vibration":true}';show(a,false);assert(pressed(a,0));show(a,true);
 assert(!pressed(a,0));assert(pressed(a,1));assert.equal(a.stops.filter(x=>x===undefined).length,1);
 assert.equal(a.tones(),1);assert.deepEqual(a.vibes,[[12,65,18],0]);assert.equal(store.writes,0);
 store.raw=null;event(a,null,store.area);assert(!pressed(a,0)&&!pressed(a,1));
 store.raw='{"sound":true,"vibration":true}';const reload=setup({shared:store.area});assert(pressed(reload,0)&&pressed(reload,1));
 store.raw=null;event(reload,KEY,store.area);assert(!pressed(reload,0)&&!pressed(reload,1));
 reload.f.destroy();await reload.w.happyDOM.close();
 a.f.destroy();store.raw='{"sound":true,"vibration":true}';event(a,KEY,store.area);show(a,true);assert(!pressed(a,0)&&!pressed(a,1));
 await a.w.happyDOM.close();
}
for(const failure of ['read','write','parse']){
 const initial=failure==='parse'?'{bad':'{"sound":false,"vibration":false}', store=backend(initial), a=setup({shared:store.area});
 if(failure!=='parse')store.fault[failure]=true;
 a.buttons[0].click();a.buttons[1].click();
 assert.equal(store.raw,initial);assert.equal(store.writes,0);assert(pressed(a,0)&&pressed(a,1));
 assert.equal(a.tones(),1);assert.deepEqual(a.vibes,[8]);a.f.destroy();await a.w.happyDOM.close();
}
for(const refusal of [true,'throw']){
 q=setup({rejectVibration:refusal});
 q.buttons[1].click();assert(!q.buttons[1].disabled&&pressed(q,1));
 q.allowVibration();q.f.play('success',q.tile);assert.deepEqual(q.vibes,[8,12]);
 q.buttons[1].click();assert(!pressed(q,1));assert.deepEqual(q.vibes,[8,12,0]);q.f.play('win',q.tile);assert.deepEqual(q.vibes,[8,12,0]);
 q.f.destroy();await q.w.happyDOM.close();
 q=setup({rejectVibration:refusal});q.buttons[1].click();q.buttons[1].click();assert(!q.buttons[1].disabled&&!pressed(q,1));
 assert.deepEqual(q.vibes,[8,0]);assert.equal(JSON.parse(q.w.localStorage.getItem(KEY)).vibration,false);
 q.f.destroy();await q.w.happyDOM.close();
}
// Exercise explicit Net events with the real board and optional helper present.
const nw=new Window({url:'https://example.test/game/net.html'});
nw.document.write(fs.readFileSync('game/net.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
const calls=[];nw.GameFeedback={create:()=>({play:kind=>calls.push(kind)})};
for(const file of ['js/net-engine.js','js/net-session.js','js/net.js'])nw.eval(fs.readFileSync(file,'utf8'));
assert.equal(calls.length,0,'initial/restore render is silent');
const nd=nw.document;nd.querySelector('#net-board button').click();assert(['tap','success','win'].includes(calls.at(-1)));assert.equal(nd.getElementById('move-count').textContent,'1');
nd.getElementById('undo-board').click();assert.equal(calls.at(-1),'undo');assert.equal(Number(nd.getElementById('move-count').textContent),0);
nd.getElementById('hint-board').click();assert(['success','win'].includes(calls.at(-1)));assert.equal(nd.getElementById('hint-count').textContent,'2');
await nw.happyDOM.close();
console.log('PASS feedback opt-in, capability fallback, reduced motion, storage failure, rejected haptics and cleanup');
})();
