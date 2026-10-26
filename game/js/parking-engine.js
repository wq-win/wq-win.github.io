(function(root){
'use strict';
const Q=Math.SQRT1_2;
const DIRS={E:[1,0],SE:[Q,Q],S:[0,1],SW:[-Q,Q],W:[-1,0],NW:[-Q,-Q],N:[0,-1],NE:[Q,-Q]};
const NAMES=Object.keys(DIRS),STEPS=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]],COUNT=16;
// These are the visible rectangular bodies, not a point at the arrow tip.
const LENGTH=1.8,WIDTH=.84,SPACING=2.1,EPS=1e-8;
const SEEDS=[5939,6850,7761,8672,9583,10494,11405,12316,13227,328325,15049,15960,16871,17782,228151,229062];
function cells(c){const [dx,dy]=DIRS[c.dir];return [[c.x+dx*.5,c.y+dy*.5],[c.x-dx*.5,c.y-dy*.5]];}
function corners(c){const [dx,dy]=DIRS[c.dir];return [-1,1].flatMap(a=>[-1,1].map(b=>[c.x+a*dx*LENGTH/2-b*dy*WIDTH/2,c.y+a*dy*LENGTH/2+b*dx*WIDTH/2]));}
// Continuous separating-axis test. Intersect the overlap-time intervals on
// both bodies' axes; a diagonal may clip another car even if its centre ray
// misses the other centre. Contact without penetration is allowed.
function intersects(a,b,moving=false){
 const u=DIRS[a.dir],v=DIRS[b.dir],axes=[u,[-u[1],u[0]],v,[-v[1],v[0]]];let enter=0,leave=Infinity;
 for(const axis of axes){
  const dot=(p,q)=>p[0]*q[0]+p[1]*q[1],perp=p=>[-p[1],p[0]];
  const radius=LENGTH/2*(Math.abs(dot(u,axis))+Math.abs(dot(v,axis)))+WIDTH/2*(Math.abs(dot(perp(u),axis))+Math.abs(dot(perp(v),axis)));
  const offset=(b.x-a.x)*axis[0]+(b.y-a.y)*axis[1],speed=moving?dot(u,axis):0;
  if(Math.abs(speed)<EPS){if(Math.abs(offset)>=radius-EPS)return false;}
  else {let from=(offset-radius)/speed,to=(offset+radius)/speed;if(from>to)[from,to]=[to,from];enter=Math.max(enter,from);leave=Math.min(leave,to);if(leave<=enter+EPS)return false;}
 }
 return leave>enter+EPS;
}
const indexes=new WeakMap();
function index(level){
 if(!indexes.has(level)){
  const cars=new Map(level.cars.map(c=>[c.id,c])),deps=new Map();
  for(const car of level.cars)deps.set(car.id,level.cars.filter(other=>other.id!==car.id&&intersects(car,other,true)).map(other=>other.id));
  indexes.set(level,{cars,deps});
 }
 return indexes.get(level);
}
function blockers(level,remaining,id){const {cars,deps}=index(level),left=remaining instanceof Set?remaining:new Set(remaining);if(!cars.has(id)||!left.has(id))return [];return deps.get(id).filter(other=>left.has(other));}
function solve(level){const left=new Set(level.cars.map(c=>c.id)),order=[];while(left.size){let progress=false;for(const id of left)if(!blockers(level,left,id).length){left.delete(id);order.push(id);progress=true;}if(!progress)return null;}return order;}
function stats(level){
 const ids=level.cars.map(c=>c.id),left=new Set(ids),deps=new Map(ids.map(id=>[id,blockers(level,left,id)])),memo=new Map();
 function depth(id,visiting=new Set()){if(memo.has(id))return memo.get(id);if(visiting.has(id))return Infinity;visiting.add(id);const n=1+Math.max(0,...deps.get(id).map(x=>depth(x,visiting)));visiting.delete(id);memo.set(id,n);return n;}
 const directions=Object.fromEntries(NAMES.map(dir=>[dir,level.cars.filter(c=>c.dir===dir).length]));
 const slots=new Map(level.cars.map(c=>[`${c.col},${c.row}`,c]));let longestLane=0;
 for(const c of level.cars){const [dx,dy]=STEPS[NAMES.indexOf(c.dir)];let length=1,x=c.col+dx,y=c.row+dy;while(slots.get(`${x},${y}`)?.dir===c.dir){length++;x+=dx;y+=dy;}longestLane=Math.max(longestLane,length);}
 return {blocked:ids.filter(id=>deps.get(id).length).length,depth:Math.max(...ids.map(id=>depth(id))),free:ids.filter(id=>!deps.get(id).length).length,directions,longestLane};
}
// Reverse legal-exit construction on an irregular, perforated lot. Four
// scattered exits seed interleaved paths; no concentric lanes or uniform rows.
// Every new arrow has only already-removed cars ahead, proving a DAG. The
// physical swept-body solver, not this lattice shortcut, validates gameplay.
function generate(i){
 const count=50+20*i,side=Math.ceil(Math.sqrt(count*1.08));let seed=SEEDS[i];
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const all=Array.from({length:side*side},(_,id)=>({col:id%side,row:Math.floor(id/side)}));
 const roots=[all[0],all[side-1],all[side*(side-1)],all[side*side-1]],pool=all.filter(c=>!roots.includes(c));
 while(pool.length>count-4)pool.splice(Math.floor(rand()*pool.length),1);
 const slots=[...roots,...pool],grid=new Map(slots.map((c,id)=>[`${c.col},${c.row}`,id]));
 const rays=slots.map(c=>STEPS.map(([dx,dy])=>{const result=[];for(let x=c.col+dx,y=c.row+dy;x>=0&&y>=0&&x<side&&y<side;x+=dx,y+=dy){const id=grid.get(`${x},${y}`);if(id!==undefined)result.push(id);}return result;}));
 const left=new Set(slots.map((_,id)=>id)),directions=[];
 [5,7,3,1].forEach((dir,id)=>{left.delete(id);directions[id]=dir;});
 while(left.size){
  let best=null,score=-Infinity;
  for(const id of left)for(let dir=0;dir<8;dir++){
   const ray=rays[id][dir];if(!ray.length||ray.some(other=>left.has(other)))continue;
   let same=0;for(const [dx,dy]of STEPS){const adjacent=grid.get(`${slots[id].col+dx},${slots[id].row+dy}`);if(adjacent!==undefined&&directions[adjacent]===dir)same++;}
   const value=rand()*4-same*3;if(value>score){score=value;best={id,dir};}
  }
  if(!best)throw Error('Parking layout has no legal construction step');
  left.delete(best.id);directions[best.id]=best.dir;
 }
 const cars=slots.map((c,id)=>({...c,x:(c.col+.5)*SPACING,y:(c.row+.5)*SPACING,dir:NAMES[directions[id]]}));
 // Shuffle identifiers so car numbers never disclose the construction order.
 for(let j=cars.length-1;j>0;j--){const k=Math.floor(rand()*(j+1));[cars[j],cars[k]]=[cars[k],cars[j]];}
 cars.forEach((c,id)=>c.id=id);return {size:side*SPACING,cars};
}
const LEVELS=Array.from({length:COUNT},(_,i)=>generate(i));
function create(level=0){level=Math.max(0,Math.min(COUNT-1,Number.isInteger(level)?level:0));return {level,remaining:LEVELS[level].cars.map(c=>c.id),completed:[],moves:0};}
function act(state,id){const level=LEVELS[state.level];if(!state.remaining.includes(id))return {ok:false,blockers:[]};const blocks=blockers(level,state.remaining,id);if(blocks.length)return {ok:false,blockers:blocks};state.remaining=state.remaining.filter(x=>x!==id);state.moves++;if(!state.remaining.length&&!state.completed.includes(state.level))state.completed.push(state.level);return {ok:true,won:!state.remaining.length};}
function save(state){return JSON.stringify({v:3,...state});}
function restore(raw){try{const s=JSON.parse(raw);if(s.v===2&&Number.isInteger(s.level)&&s.level>=0&&s.level<COUNT&&Array.isArray(s.completed)){const fresh=create(s.level);fresh.completed=[...new Set(s.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<COUNT))];return fresh;}if(s.v!==3||!Number.isInteger(s.level)||s.level<0||s.level>=COUNT||!Array.isArray(s.remaining)||!Array.isArray(s.completed))return create();const all=LEVELS[s.level].cars.map(c=>c.id);if(new Set(s.remaining).size!==s.remaining.length||s.remaining.some(id=>!all.includes(id)))return create();const possible=new Set(all),removed=new Set(all.filter(id=>!s.remaining.includes(id)));while(removed.size){let progress=false;for(const id of removed)if(!blockers(LEVELS[s.level],possible,id).length){possible.delete(id);removed.delete(id);progress=true;}if(!progress)return create();}return {level:s.level,remaining:s.remaining,completed:[...new Set(s.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<COUNT))],moves:all.length-s.remaining.length};}catch(e){return create();}}
const api={DIRS,LENGTH,WIDTH,LEVELS,cells,corners,intersects,blockers,solve,stats,generate,create,act,save,restore};if(typeof module!=='undefined')module.exports=api;else root.ParkingEngine=api;
})(typeof window!=='undefined'?window:globalThis);
