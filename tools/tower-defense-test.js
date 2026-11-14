'use strict';
const assert=require('node:assert/strict'),E=require('../js/tower-defense-engine.js');
function finish(s){let n=0;while(s.state==='running'&&n++<30000)E.tick(s,1/60);assert.ok(n<30000);}
const order=[1,4,2,3,5,0,6,7],types={1:'arrow',4:'magic',2:'cannon',3:'magic',5:'arrow',0:'arrow',6:'cannon',7:'magic'};
function play(level,only){const s=E.create(level);E.build(s,1,only||'arrow');E.build(s,4,only||'magic');let capped=0;
 while(!['cleared','won','lost'].includes(s.state)){for(const i of order)if(!s.towers[i])E.build(s,i,only||types[i]);for(const i of order)E.upgrade(s,i);if(s.towers.every(t=>t?.level===3))capped++;assert.equal(E.startWave(s),true);finish(s);}return {level,state:s.state,health:s.health,seconds:Math.round(s.time),gold:s.gold,capped,kills:s.kills};}
assert.equal(E.WAVES_PER_LEVEL,6);assert.equal(E.LEVEL_COUNT,20);
assert.equal(new Set(Array.from({length:20},(_,i)=>JSON.stringify(E.mission(i+1).path))).size,3);
assert.equal(new Set(Array.from({length:20},(_,i)=>JSON.stringify(E.mission(i+1).order))).size,4);
const results=[];
for(let l=1;l<=20;l++){const r=play(l);assert.notEqual(r.state,'lost',`Mixed strategy must complete level ${l}`);assert.ok(r.seconds<270);assert.equal(r.capped,0,'No waiting with all towers maxed');results.push(r);
 for(let w=1;w<=6;w++){const p=E.wavePlan(l,w);assert.equal(p.queue.filter(t=>t==='boss').length,w===6?1:0);assert.ok(p.queue.length>=10);}
 const m=E.mission(l);assert.equal(m.slots.length,8);for(const p of m.slots)assert.ok(p[0]>0&&p[0]<1000&&p[1]>0&&p[1]<600);
}
console.table(results);
const homogeneous=Object.fromEntries(['arrow','magic','cannon'].map(t=>[t,Array.from({length:20},(_,i)=>play(i+1,t)).filter(r=>r.state!=='lost').length]));
assert.ok(Object.values(homogeneous).every(w=>w<20),'One-type brute force should not clear everything');console.log('Single-type strategies wins / 20:',homogeneous);
for(const level of [1,10,20]){const s=E.create(level);while(s.state!=='lost'){E.startWave(s);finish(s);}assert.equal(s.health,0);const before=JSON.stringify(s);assert.equal(E.startWave(s),false);assert.equal(E.build(s,0,'arrow'),false);E.tick(s,1);assert.equal(JSON.stringify(s),before);}
{
 const s=E.create();assert.equal(E.build(s,-1,'arrow'),false);assert.equal(E.build(s,0,'__proto__'),false);assert.equal(E.build(s,0,'arrow'),true);assert.equal(s.gold,210);assert.equal(s.built,1);assert.equal(E.build(s,0,'magic'),false);assert.equal(E.upgrade(s,0,'bad'),false);E.upgrade(s,0);s.gold=1000;E.upgrade(s,0,'reach');assert.equal(s.towers[0].branch,'reach');assert.equal(E.upgrade(s,0),false);
 const reach=E.stats(s.towers[0]),power=E.stats({...s.towers[0],branch:'power'});assert.ok(reach.damage<power.damage&&reach.range>power.range);const gold=s.gold;assert.equal(E.sell(s,0),true);assert.equal(s.gold-gold,Math.floor((90+72+113)*.7));assert.equal(s.built,1,'Selling does not erase challenge build count');
 E.build(s,0,'magic');E.startWave(s);assert.equal(E.sell(s,0),false);const queue=s.queue.length;assert.equal(E.startWave(s),false);assert.equal(s.queue.length,queue);
}
{
 const s=E.create();E.build(s,0,'magic');s.state='running';s.wave=3;const e=E.spawn(s,'brute');e.distance=180;Object.assign(e,E.position(180));const hp=e.hp;E.tick(s,.01);assert.equal(e.hp,hp-E.TYPES.magic.damage);assert.ok(e.slow>0);
}
{
 const s=E.create();E.build(s,0,'cannon');s.state='running';s.wave=1;const a=E.spawn(s,'goblin'),b=E.spawn(s,'goblin');for(const e of [a,b]){e.distance=170;Object.assign(e,E.position(170));}E.tick(s,.01);assert.ok(a.hp<a.maxHp&&b.hp<b.maxHp);
}
{
 const s=E.create(4);s.state='cleared';s.health=18;s.built=5;assert.equal(E.rating(s),3);s.built=6;assert.equal(E.rating(s),2);s.health=11;assert.equal(E.rating(s),1);s.state='lost';assert.equal(E.rating(s),0);
 s.state='cleared';assert.equal(E.nextLevel(s),true);assert.deepEqual(s,E.create(5));assert.equal(E.nextLevel(s),false);for(const l of [0,21,1.2,NaN])assert.throws(()=>E.create(l),RangeError);
}
console.log('Tower tactics: maps, encounter previews, bounded six-wave play, economy, specializations, salvage, stars, pause and terminal guards passed.');
for(const [level,mode] of [[4,0],[8,0],[12,0],[16,0],[20,0]]) {
 const s=E.create(level);
 while(!['lost','cleared','won'].includes(s.state)){
  for(let i=0;i<5;i++)if(!s.towers[i])E.build(s,i,['arrow','magic','cannon'][(i+mode)%3]);
  for(let i=0;i<5;i++)E.upgrade(s,i,i%2?'reach':'power');E.startWave(s);finish(s);
 }
 assert.equal(E.rating(s),3,`Five-tower challenge on ${level} is feasible`);
}
console.log('All five limited-build three-star challenges have deterministic valid solutions.');
