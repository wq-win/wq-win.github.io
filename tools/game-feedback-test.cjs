'use strict';
(async()=>{
const assert=require('node:assert/strict'),fs=require('node:fs'),{Window}=await import('happy-dom');
const code=fs.readFileSync('game/js/game-feedback.js','utf8');
function setup({support=true,storageFail=false,reduce=false,rejectVibration=false}={}){
 const w=new Window({url:'https://example.test/game/net.html'});w.document.write('<main><button id="tile">tile</button></main>');
 let tones=0,vibes=[];w.matchMedia=()=>({matches:reduce});
 if(support){Object.defineProperty(w.navigator,'vibrate',{value:n=>{vibes.push(n);return !rejectVibration;}});w.AudioContext=class{constructor(){this.state='running';this.currentTime=0;this.destination={};}createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){tones++},stop(){},disconnect(){}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}close(){return Promise.resolve();}};}
 if(storageFail){Object.defineProperty(w,'localStorage',{value:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}});}
 w.eval(code);const f=w.GameFeedback.create({host:w.document.querySelector('main')}),buttons=f.controls.querySelectorAll('button');
 return {w,f,buttons,tile:w.document.getElementById('tile'),tones:()=>tones,vibes};
}
let q=setup();q.f.play('win',q.tile);assert.equal(q.tones(),0);assert.equal(q.vibes.length,0);assert(q.tile.classList.contains('game-fx-win'));q.buttons[0].click();assert.equal(q.tones(),1);q.buttons[1].click();assert.deepEqual(q.vibes,[8]);assert.equal(q.buttons[0].getAttribute('aria-pressed'),'true');const prefs=q.w.localStorage.getItem('mylog-game-feedback-v1');assert.deepEqual(JSON.parse(prefs),{sound:true,vibration:true});q.f.destroy();assert(!q.tile.classList.contains('game-fx-win'));const n=q.tones();q.f.play('tap',q.tile);assert.equal(q.tones(),n);await q.w.happyDOM.close();
q=setup({support:false});assert(q.buttons[0].disabled);assert(q.buttons[1].disabled);q.f.play('error',q.tile);assert(q.tile.classList.contains('game-fx-error'));q.f.destroy();await q.w.happyDOM.close();
q=setup({storageFail:true});q.buttons[0].click();q.buttons[1].click();assert.equal(q.tones(),1);assert.deepEqual(q.vibes,[8]);q.f.destroy();await q.w.happyDOM.close();
q=setup({reduce:true});q.buttons[1].click();q.f.play('win',q.tile);assert(q.vibes.every(n=>n===0));assert(!q.tile.classList.contains('game-fx-win'));q.f.destroy();await q.w.happyDOM.close();
q=setup({rejectVibration:true});q.buttons[1].click();assert(q.buttons[1].disabled);assert.match(q.buttons[1].textContent,/不支持/);q.f.destroy();await q.w.happyDOM.close();
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
