'use strict';
const assert=require('node:assert/strict');
const D=require('../game/js/dyna-q-demo.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS',name);}
test('boundary, wall, ordinary and terminal transitions',()=>{
assert.deepEqual(D.transition(0,2),{next:0,reward:0,done:false});
assert.equal(D.transition(9,0).next,9);
assert.deepEqual(D.transition(5,0),{next:6,reward:1,done:true});
assert.deepEqual(D.transition(28,0),{next:29,reward:0,done:false});
});
test('exact Q learning target and terminal no-bootstrap',()=>{
const m=D.create({alpha:.2,gamma:.95});m.q[1][0]=2;m.q[0][0]=.5;
const e=D.update(m,0,0,{next:1,reward:0,done:false},'real');assert.ok(Math.abs(e.target-1.9)<1e-12);assert.ok(Math.abs(e.value-.78)<1e-12);
m.q[D.GOAL].fill(100);D.update(m,5,0,{next:D.GOAL,reward:1,done:true},'real');assert.equal(m.q[5][0],.2);
});
test('one real transition then exactly n model updates without moving agent',()=>{
const m=D.create({planning:5});assert.equal(D.advance(m).kind,'real');const state=m.state;
for(let i=0;i<5;i++){assert.equal(D.advance(m).kind,'model');assert.equal(m.state,state);assert.equal(m.real,1);}
assert.equal(m.planned,5);assert.equal(m.pending,0);assert.equal(D.advance(m).kind,'real');assert.equal(m.real,2);
const plain=D.create({planning:0});for(let i=0;i<100;i++)assert.equal(D.advance(plain).kind,'real');assert.equal(plain.planned,0);
});
test('learned model contains only real observations, replay is deterministic and bounded',()=>{
const a=D.create(),b=D.create();for(let i=0;i<18000;i++){const x=D.advance(a),y=D.advance(b);assert.deepEqual(x,y);assert.ok(Number.isFinite(x.value)&&x.value>=0&&x.value<=1);if(x.kind==='model'){assert.ok(a.model[x.state+','+x.action]);}else{assert.deepEqual(a.model[x.state+','+x.action],{state:x.state,action:x.action,...D.transition(x.state,x.action)});}}
assert.ok(a.episodes>0,'must discover and repeat goal');assert.deepEqual(a.q,b.q);assert.ok(a.keys.length<=4*(D.WIDTH*D.HEIGHT-D.WALLS.length-1));assert.deepEqual(a.q[D.GOAL],[0,0,0,0]);
console.log('  episodes',a.episodes,'real',a.real,'planning',a.planned);
});
test('terminal real transition resets actual position; terminal model replay does not reset it',()=>{
const m=D.create({epsilon:0,planning:1});m.state=5;m.q[5][0]=.5;D.advance(m);assert.equal(m.state,D.START);assert.equal(m.episodes,1);assert.equal(m.pending,1);m.state=20;D.advance(m);assert.equal(m.state,20);assert.equal(m.last.target,1);
});
test('UI play/pause/step/reset/parameter/visibility controls never duplicate timers',()=>{
const ids=['dyna-canvas','step','play','reset','planning','alpha','epsilon','speed','real-count','plan-count','model-count','episode-count','planning-value','alpha-value','epsilon-value','speed-value','event-kind','event-detail','pending'];
const noop=()=>{};const context=new Proxy({},{get:()=>noop,set:()=>true});
const nodes=Object.fromEntries(ids.map(id=>[id,{value:({planning:5,alpha:20,epsilon:15,speed:20})[id]||'',listeners:{},textContent:'',setAttribute(k,v){this[k]=v;},addEventListener(k,f){this.listeners[k]=f;},dispatch(k){this.listeners[k]();},getContext(){return context;}}]));
const doc={hidden:false,getElementById:id=>nodes[id],listeners:{},addEventListener(k,f){this.listeners[k]=f;}};
const realSet=global.setTimeout,realClear=global.clearTimeout;let sequence=0;const timers=new Map();global.setTimeout=fn=>{const id=++sequence;timers.set(id,fn);return id;};global.clearTimeout=id=>timers.delete(id);
try{const ui=D.mount(doc);assert.equal(ui.model.real,0);assert.equal(timers.size,0);
for(let i=0;i<8;i++){nodes.play.dispatch('click');assert.equal(ui.playing,true);assert.equal(timers.size,1);nodes.play.dispatch('click');assert.equal(ui.playing,false);assert.equal(timers.size,0);}
nodes.play.dispatch('click');const [id,fn]=timers.entries().next().value;timers.delete(id);fn();assert.equal(timers.size,1);
nodes.step.dispatch('click');assert.equal(ui.playing,false);assert.equal(timers.size,0);
nodes.reset.dispatch('click');assert.equal(ui.model.real,0);assert.equal(ui.model.planned,0);assert.deepEqual(ui.model.keys,[]);assert.equal(ui.model.state,D.START);
nodes.play.dispatch('click');nodes.planning.value='0';nodes.planning.dispatch('input');assert.equal(ui.model.planning,0);assert.equal(ui.model.real,0);assert.equal(timers.size,0);nodes.step.dispatch('click');assert.equal(ui.model.real,1);
nodes.play.dispatch('click');doc.hidden=true;doc.listeners.visibilitychange();assert.equal(ui.playing,false);assert.equal(timers.size,0);
nodes.reset.dispatch('click');const expected=D.create({planning:0,seed:42});nodes.step.dispatch('click');D.advance(expected);assert.deepEqual(ui.model.last,expected.last);
}finally{global.setTimeout=realSet;global.clearTimeout=realClear;}
});
console.log(`${checks} Dyna-Q tests passed`);
