'use strict';
const assert=require('node:assert/strict'),E=require('../game/js/parking-engine');
let randomMoves=0;const start=Date.now();
// Independent polygon oracle: hull the start/end body corners, then SAT the
// entire swept polygon against another body. No grid rays or engine intervals.
function hull(points){const p=points.map(v=>v.map(x=>Math.round(x*1e10)/1e10)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const lower=[],upper=[];for(const v of p){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),v)<=1e-9)lower.pop();lower.push(v);}for(const v of p.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),v)<=1e-9)upper.pop();upper.push(v);}return [...lower.slice(0,-1),...upper.slice(0,-1)];}
function body(car){const angle=Math.atan2(E.DIRS[car.dir][1],E.DIRS[car.dir][0]),co=Math.cos(angle),si=Math.sin(angle);return [[-.9,-.42],[.9,-.42],[.9,.42],[-.9,.42]].map(([x,y])=>[car.x+x*co-y*si,car.y+x*si+y*co]);}
function polygonsOverlap(a,b){for(const p of [a,b])for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length],axis=[q[1]-p[i][1],p[i][0]-q[0]],project=poly=>poly.map(v=>v[0]*axis[0]+v[1]*axis[1]),ap=project(a),bp=project(b);if(Math.max(...ap)<=Math.min(...bp)+1e-7||Math.max(...bp)<=Math.min(...ap)+1e-7)return false;}return true;}
function swept(car,distance){const p=body(car),[dx,dy]=E.DIRS[car.dir];return hull([...p,...p.map(([x,y])=>[x+dx*distance,y+dy*distance])]);}
const clip={id:0,x:0,y:0,dir:'SE'},offRay={id:1,x:3,y:1.2,dir:'E'};
assert(E.intersects(clip,offRay,true),'diagonal car body clips a car missed by its centre ray');
assert(!E.intersects(clip,offRay),'cars are initially separate');
assert(!E.intersects(clip,{...offRay,y:.8},true),'diagonal near-miss remains legal');
assert(!E.intersects(clip,{...offRay,x:-3,y:-3},true),'cars behind the tail do not block departure');
for(const aDir of Object.keys(E.DIRS))for(const bDir of Object.keys(E.DIRS))for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++){
 const a={x:0,y:0,dir:aDir},b={x:x*1.13+.07,y:y*1.07+.11,dir:bDir};
 assert.equal(E.intersects(a,b,true),polygonsOverlap(swept(a,20),body(b)),`swept SAT ${aDir}/${bDir} at ${x},${y}`);
}
assert.equal(E.LEVELS.length,16);
const metrics=[];
E.LEVELS.forEach((level,i)=>{
 assert.equal(level.cars.length,50+20*i);assert.deepEqual(E.generate(i),level,'deterministic restart layout');
 for(const c of level.cars)for(const [x,y] of body(c))assert(x>=0&&x<=level.size&&y>=0&&y<=level.size,'whole rotated body in bounds');
 const all=new Set(level.cars.map(c=>c.id));
 for(const c of level.cars){const ray=swept(c,level.size*2),expected=[];for(const other of level.cars){if(c.id===other.id)continue;assert(!polygonsOverlap(body(c),body(other)),'rotated bodies never overlap');if(polygonsOverlap(ray,body(other)))expected.push(other.id);}assert.deepEqual(E.blockers(level,all,c.id),expected,'game blockers agree with independent swept geometry');}
 const order=E.solve(level),quality=E.stats(level);assert.equal(order.length,level.cars.length);assert.equal(quality.free,4,'four initial exits, no broad outside ring');assert(quality.depth>=10+i*1.5,'multi-stage interleaved unlocks');assert(quality.longestLane<=4,'no long same-direction lane');for(const count of Object.values(quality.directions))assert(count>=level.cars.length*.05,'all eight directions are materially represented');
 const scan=E.create(i);let rowClear=0;for(const c of level.cars.slice().sort((a,b)=>a.y-b.y||a.x-b.x))rowClear+=E.act(scan,c.id).ok;assert(rowClear<level.cars.length*.3,'one uniform row sweep cannot clear most of the lot');
 const state=E.create(i),initial=JSON.stringify(state),blocked=state.remaining.find(id=>E.blockers(level,state.remaining,id).length);assert.equal(E.act(state,blocked).ok,false);assert.equal(JSON.stringify(state),initial);assert.equal(E.act(state,-1).ok,false);
 for(const id of order){assert(E.act(state,id).ok);assert.equal(E.act(state,id).ok,false,'departed car cannot leave twice');if(state.moves%25===0)assert.deepEqual(E.restore(E.save(state)),state);}assert.deepEqual(E.restore(E.save(state)),state);assert.equal(state.remaining.length,0);assert(state.completed.includes(i));
 // Removal only deletes blockers. All legal choices remain safe; difficulty
 // is visual search and interleaved unlocking, not fabricated order deadlocks.
 for(let seed=0;seed<8;seed++){const s=E.create(i);let r=seed+100;while(s.remaining.length){const set=new Set(s.remaining),options=s.remaining.filter(id=>!E.blockers(level,set,id).length);assert(options.length);r=(Math.imul(r,1664525)+1013904223)>>>0;const chosen=options[r%options.length];assert(E.act(s,chosen).ok);for(const other of options)if(other!==chosen)assert.equal(E.blockers(level,s.remaining,other).length,0,'legal exits stay legal');randomMoves++;}}
 metrics.push({level:i+1,cars:level.cars.length,free:quality.free,depth:quality.depth,longestLane:quality.longestLane,rowSweep:rowClear});
});
assert.deepEqual(E.restore('{bad'),E.create());for(const v of [1])assert.deepEqual(E.restore(JSON.stringify({v,level:15,remaining:[],completed:[15]})),E.create(),'old layouts cannot silently complete new levels');const migrated=E.restore(JSON.stringify({v:2,level:7,remaining:[999],completed:[0,1,1,7,-1,16,'3'],moves:99}));assert.deepEqual(migrated,{...E.create(7),completed:[0,1,7]},'retain earned completion/selection but restart incompatible ring-layout removals');const bad=E.create();bad.remaining=[999];assert.deepEqual(E.restore(E.save(bad)),E.create());const impossible=E.create();const blocked=impossible.remaining.find(id=>E.blockers(E.LEVELS[0],impossible.remaining,id).length);impossible.remaining=impossible.remaining.filter(id=>id!==blocked);assert.deepEqual(E.restore(E.save(impossible)),E.create());
console.table(metrics);console.log(`PASS: 16 exact-count eight-direction levels; independent swept-polygon/nonoverlap checks; interleaved DAGs; ${randomMoves} random-order exits; persistence/invalid saves/blocked moves; ${Date.now()-start}ms`);
