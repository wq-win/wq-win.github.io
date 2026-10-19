(function(root){
'use strict';
const COLORS=['朱砂','湖蓝','姜黄','青绿','藤紫'];
const NAMES=['初识机关','三色小试','木间藏巧','错落之间','留一手','层层有序','先解后取','青铜旧匣','拨云见木','余地之道','交错工坊','静观其变','巧手归藏','深藏玄机','匠心之锁','百工归一'];
let LEVELS=[];
function create(index=0){ const level=LEVELS[index]; if(!level) throw Error('Invalid level'); return {index,mask:0,rack:[],moves:0,status:'playing'}; }
function removed(s,id){return !!(s.mask&(1<<id));}
function plateGone(s,p){return p.colors.every((_,i)=>removed(s,p.id*3+i));}
function available(s){if(s.status!=='playing')return [];const result=[];for(let lane=0;lane<3;lane++){const p=LEVELS[s.index].plates.find(p=>p.lane===lane&&!plateGone(s,p));if(p)p.colors.forEach((color,i)=>{const id=p.id*3+i;if(!removed(s,id))result.push({id,color,plate:p.id});});}return result;}
function take(s,id){const screw=available(s).find(v=>v.id===id);if(!screw)return false;s.mask|=1<<id;s.moves++;s.rack.push(screw.color);let matched=false;if(s.rack.filter(c=>c===screw.color).length===3){s.rack=s.rack.filter(c=>c!==screw.color);matched=true;}const complete=LEVELS[s.index].plates.every(p=>plateGone(s,p));s.status=complete?'won':s.rack.length>=5?'lost':'playing';return {matched,color:screw.color,plate:screw.plate,fallen:plateGone(s,LEVELS[s.index].plates[screw.plate])};}
function solve(initial,limit=300000){const bad=new Set();let visited=0;function dfs(s){if(s.status==='won')return [];if(s.status!=='playing'||++visited>limit)return null;const key=s.mask;if(bad.has(key))return null;const choices=available(s).sort((a,b)=>s.rack.filter(c=>c===b.color).length-s.rack.filter(c=>c===a.color).length);const same=new Set();for(const c of choices){const k=c.plate+':'+c.color;if(same.has(k))continue;same.add(k);const next={...s,rack:s.rack.slice()};take(next,c.id);const tail=dfs(next);if(tail)return [c.id,...tail];}bad.add(key);return null;}return {path:dfs({...initial,rack:initial.rack.slice()}),visited};}
function configure(data){LEVELS=data;}
const api={COLORS,NAMES,create,available,take,removed,plateGone,solve,configure,get levels(){return LEVELS;}};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ScrewPuzzle=api;
})(typeof window!=='undefined'?window:globalThis);
