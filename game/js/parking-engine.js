(function(root){
'use strict';
const DIRS={E:[1,0],S:[0,1],W:[-1,0],N:[0,-1]},COUNT=16;
function cells(c){const d=DIRS[c.dir];return [[c.x,c.y],[c.x-d[0],c.y-d[1]]];}
const indexes=new WeakMap();
function index(level){if(!indexes.has(level)){const grid=Array.from({length:level.size},()=>Array(level.size).fill(null)),cars=new Map();for(const c of level.cars){cars.set(c.id,c);for(const [x,y] of cells(c))grid[y][x]=c.id;}indexes.set(level,{grid,cars});}return indexes.get(level);}
function blockers(level,remaining,id){const {grid,cars}=index(level),c=cars.get(id),left=remaining instanceof Set?remaining:new Set(remaining);if(!c||!left.has(id))return [];const [dx,dy]=DIRS[c.dir],out=new Set();for(let x=c.x+dx,y=c.y+dy;x>=0&&y>=0&&x<level.size&&y<level.size;x+=dx,y+=dy){const hit=grid[y][x];if(hit!==null&&hit!==id&&left.has(hit))out.add(hit);}return [...out];}
function solve(level){const left=new Set(level.cars.map(c=>c.id)),order=[];while(left.size){let progress=false;for(const id of left)if(!blockers(level,left,id).length){left.delete(id);order.push(id);progress=true;}if(!progress)return null;}return order;}
function stats(level){const ids=level.cars.map(c=>c.id),left=new Set(ids),deps=new Map(ids.map(id=>[id,blockers(level,left,id)])),memo=new Map();function depth(id,visiting=new Set()){if(memo.has(id))return memo.get(id);if(visiting.has(id))return Infinity;visiting.add(id);const n=1+Math.max(0,...deps.get(id).map(x=>depth(x,visiting)));visiting.delete(id);memo.set(id,n);return n;}return {blocked:ids.filter(id=>deps.get(id).length).length,depth:Math.max(...ids.map(id=>depth(id))),free:ids.filter(id=>!deps.get(id).length).length};}
// Concentric domino rings: each car depends only on its ring's exit chain
// or an outer ring. Thus clearing outer rings always yields a solution.
function generate(i){const count=50+20*i,size=2*Math.ceil(Math.sqrt(count*2)/2);let seed=5939+i*911;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);};let cars=[];for(let lo=0,hi=size-1;lo<hi;lo++,hi--){for(const y of [lo,hi]){const dir=rand(2)?'E':'W';for(let x=lo;x<hi;x+=2)cars.push({x:dir==='E'?x+1:x,y,dir});}for(const x of [lo,hi]){const dir=rand(2)?'S':'N';for(let y=lo+1;y<hi-1;y+=2)cars.push({x,y:dir==='S'?y+1:y,dir});}}
// Remove surplus slots, without introducing new dependencies. Keep most
// outer-ring traffic so later levels remain layered rather than sparse.
while(cars.length>count)cars.splice(rand(cars.length),1);
const turns=i%4;for(const c of cars)for(let t=0;t<turns;t++){const x=c.x;c.x=size-1-c.y;c.y=x;c.dir={E:'S',S:'W',W:'N',N:'E'}[c.dir];}
for(let j=cars.length-1;j>0;j--){const k=rand(j+1);[cars[j],cars[k]]=[cars[k],cars[j]];}cars.forEach((c,id)=>c.id=id);return {size,cars};}
const LEVELS=Array.from({length:COUNT},(_,i)=>generate(i));
function create(level=0){level=Math.max(0,Math.min(COUNT-1,Number.isInteger(level)?level:0));return {level,remaining:LEVELS[level].cars.map(c=>c.id),completed:[],moves:0};}
function act(state,id){const level=LEVELS[state.level];if(!state.remaining.includes(id))return {ok:false,blockers:[]};const blocks=blockers(level,state.remaining,id);if(blocks.length)return {ok:false,blockers:blocks};state.remaining=state.remaining.filter(x=>x!==id);state.moves++;if(!state.remaining.length&&!state.completed.includes(state.level))state.completed.push(state.level);return {ok:true,won:!state.remaining.length};}
function save(state){return JSON.stringify({v:2,...state});}
function restore(raw){try{const s=JSON.parse(raw);if(s.v!==2||!Number.isInteger(s.level)||s.level<0||s.level>=COUNT||!Array.isArray(s.remaining)||!Array.isArray(s.completed))return create();const all=LEVELS[s.level].cars.map(c=>c.id);if(new Set(s.remaining).size!==s.remaining.length||s.remaining.some(id=>!all.includes(id)))return create();const possible=new Set(all),removed=new Set(all.filter(id=>!s.remaining.includes(id)));while(removed.size){let progress=false;for(const id of removed)if(!blockers(LEVELS[s.level],possible,id).length){possible.delete(id);removed.delete(id);progress=true;}if(!progress)return create();}return {level:s.level,remaining:s.remaining,completed:[...new Set(s.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<COUNT))],moves:all.length-s.remaining.length};}catch(e){return create();}}
const api={DIRS,LEVELS,cells,blockers,solve,stats,create,act,save,restore};if(typeof module!=='undefined')module.exports=api;else root.ParkingEngine=api;
})(typeof window!=='undefined'?window:globalThis);
