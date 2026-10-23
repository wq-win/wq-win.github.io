(function(root){
'use strict';
const TYPES=['苹果','胡萝卜','树叶','花朵','麦穗','蘑菇','梨子','浆果','南瓜','玉米','四叶草','鸡蛋','牛奶','毛线','靴子','洒水壶'].map((name,i)=>({name,color:['#4b9873','#e8874a','#d5ac40','#db7553','#aa7b91','#d96669','#cb86ad','#75a685','#80b2c4','#c39660','#699ead','#c9a449','#9e88b9','#c27f99','#a58a6a','#e0b14d'][i],icon:['🌱','🥕','🌽','🎃','🍄','🍎','🌼','🍃','🥛','🍞','🪣','🔔','🧤','🧣','🪵','☀️'][i]}));
const SIZE=40,CAPACITY=7;
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
// Eight equally deep layers of 36 cards. Shape, rotation, reflection and layer
// offsets change the silhouette, not merely the card faces. All levels draw
// from the same geometry distribution; only their tool budgets differ.
const SHAPES=[
 [2,4,6,6,6,6,4,2], // diamond meadow
 [6,6,4,2,2,4,6,6], // butterfly
 [4,6,8,8,6,4],     // terraces
 null,              // four islands
 null,              // courtyard ring
 [6,6,6,6,6,6]      // stepped rows
];
function geometry(random,previousLayout){
 const families=SHAPES.map((_,i)=>i).filter(i=>i!==previousLayout);
 const out=[],family=families[Math.floor(random()*families.length)],turn=Math.floor(random()*4),mirror=random()<.5,points=[];
 if(family===3){for(const ox of [0,5])for(const oy of [0,5])for(let y=0;y<3;y++)for(let x=0;x<3;x++)points.push([ox+x,oy+y]);}
 else if(family===4){for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(x===0||x===7||y===0||y===7||((x===2||x===5)&&(y===2||y===3||y===4||y===5)))points.push([x,y]);}
 else SHAPES[family].forEach((n,y)=>{for(let x=0;x<n;x++)points.push([x+(8-n)/2+(family===5?(y%3-1)*.5:0),y+(8-SHAPES[family].length)/2]);});
 for(let z=0;z<8;z++){
  const dx=Math.floor(random()*13)-6,dy=Math.floor(random()*13)-6;
  for(const point of points){let [x,y]=point;if(mirror)x=7-x;for(let r=0;r<turn;r++)[x,y]=[7-y,x];out.push({id:out.length,x:13+x*42+dx,y:20+y*42+dy,z,type:0});}
 }
 out.layout=family;return out;
}
const blockerCache=new WeakMap();
function blockers(tiles){if(blockerCache.has(tiles))return blockerCache.get(tiles);const result=tiles.map(a=>tiles.filter(b=>b.z>a.z&&Math.abs(a.x-b.x)<SIZE-.01&&Math.abs(a.y-b.y)<SIZE-.01).map(b=>b.id));blockerCache.set(tiles,result);return result;}
function order(tiles,removed,random){const gone=new Set(removed),bs=blockers(tiles),out=[];while(gone.size<tiles.length){const options=tiles.filter(t=>!gone.has(t.id)&&bs[t.id].every(id=>gone.has(id)));if(!options.length)throw Error('Cyclic board');const t=options[Math.floor(random()*options.length)];gone.add(t.id);out.push(t.id);}return out;}
function sequence(counts,random){const left=counts.slice(),rack=Array(16).fill(0),out=[];let n=0;while(left.some(Boolean)){let opts=left.map((v,t)=>t).filter(t=>{if(!left[t])return false;if(rack[t]===2)return true;if(n>=6)return false;if(n===5&&rack[t]===0&&!rack.some(v=>v===2))return false;return true;});if(!opts.length)throw Error('Invalid certificate supply');const completes=opts.filter(t=>rack[t]===2),opens=opts.filter(t=>rack[t]<2);if(opens.length&&n<5&&random()<.73)opts=opens;else if(completes.length&&n>=5)opts=completes;let t=opts[Math.floor(random()*opts.length)];left[t]--;rack[t]++;n++;out.push(t);if(rack[t]===3){rack[t]=0;n-=3;}}if(n)throw Error('Unbalanced certificate');return out;}
let serial=0;
function create(level=0,seed,previousLayout){if(!Number.isInteger(level)||level<0||level>4)throw Error('Unknown level');if(seed===undefined)seed=(Math.floor(Math.random()*4294967296)^(Date.now()>>>0)^(++serial*101))>>>0;if(!Number.isInteger(seed))throw Error('Invalid seed');const random=rng(seed),tiles=geometry(random,previousLayout),path=order(tiles,[],random),seq=sequence(Array(16).fill(18),random);path.forEach((id,i)=>tiles[id].type=seq[i]);return {level,seed,layout:tiles.layout,tiles,removed:[],rack:[],holding:[],counts:{remove:5-level,undo:5-level,shuffle:5-level},status:'playing',matched:0,history:[],certificate:path,shuffleSerial:0,message:''};}
function available(s){if(s.status!=='playing')return [];const gone=new Set(s.removed),bs=blockers(s.tiles);return s.tiles.filter(t=>!gone.has(t.id)&&bs[t.id].every(id=>gone.has(id))).map(t=>t.id);}
function snapshot(s){return {removed:s.removed.slice(),rack:s.rack.slice(),holding:s.holding.slice(),matched:s.matched,status:s.status};}
function status(s){s.status=s.removed.length===s.tiles.length&&s.rack.length===0&&s.holding.length===0?'won':s.rack.length>=CAPACITY?'lost':'playing';}
function take(s,id){if(s.status!=='playing'||!Number.isInteger(id))return false;const held=s.holding.includes(id);if(!held&&!available(s).includes(id))return false;s.history.push(snapshot(s));if(held)s.holding.splice(s.holding.indexOf(id),1);else s.removed.push(id);s.rack.push(id);const type=s.tiles[id].type,matching=s.rack.filter(i=>s.tiles[i].type===type);if(matching.length===3){s.rack=s.rack.filter(i=>!matching.includes(i));s.matched+=3;}status(s);s.message='';return true;}
// Reassign board faces only. Rack and holding cards never change. A returned
// certificate includes holding picks and legally exposed board picks, proving
// a solution for the entire current position, not just an empty starting rack.
function shufflePlan(s){const random=rng(s.seed+101*(s.shuffleSerial+1)),path=order(s.tiles,s.removed,random),supply=Array(16).fill(0),held=Array.from({length:16},()=>[]),rack=Array(16).fill(0);path.forEach(id=>supply[s.tiles[id].type]++);s.holding.forEach(id=>held[s.tiles[id].type].push(id));s.rack.forEach(id=>rack[s.tiles[id].type]++);let n=s.rack.length,pos=0;const assignments=[],certificate=[];
function add(t){let id;if(held[t].length)id=held[t].shift();else{if(!supply[t]||pos>=path.length)return false;id=path[pos++];supply[t]--;assignments.push([id,t]);}certificate.push(id);rack[t]++;n++;if(rack[t]===3){rack[t]=0;n-=3;}return n<7;}
while(rack.some(Boolean)||supply.some(Boolean)||held.some(a=>a.length)){let options=[];for(let t=0;t<16;t++){const need=3-rack[t],total=supply[t]+held[t].length;if(total>=need&&n+need-1<7)options.push(t);}if(!options.length)return null;const existing=options.filter(t=>rack[t]>0);if(existing.length)options=existing;const t=options[Math.floor(random()*options.length)],need=3-rack[t];for(let k=0;k<need;k++)if(!add(t))return null;}
return {assignments,certificate};}
function tool(s,name){s.message='';if(!Object.hasOwn(s.counts,name)||s.counts[name]<=0||s.status==='won')return false;
if(name==='undo'){if(!s.history.length){s.message='还没有可以撤回的选牌。';return false;}const old=s.history.pop();Object.assign(s,old);s.counts.undo--;s.message='已撤回上一次选牌。';return true;}
if(name==='remove'){if(!s.rack.length||s.holding.length){s.message=s.holding.length?'请先将暂存区的牌取回卡槽。':'卡槽为空，无需移出。';return false;}s.holding.push(...s.rack.splice(0,Math.min(3,s.rack.length)));s.counts.remove--;s.history=[];status(s);s.message='已移到暂存区；点击暂存牌可取回。';return true;}
if(s.status!=='playing'){s.message='卡槽已满，请先移出或撤回。';return false;}const plan=shufflePlan(s);if(!plan){s.message='当前卡槽无法靠洗牌解开，请先移出或撤回；未扣次数。';return false;}plan.assignments.forEach(([id,t])=>s.tiles[id].type=t);s.certificate=plan.certificate;s.shuffleSerial++;s.counts.shuffle--;s.history=[];s.message='已重新排列剩余牌，验证有可行解。';return true;}
function verify(s,path){const clone={...s,tiles:s.tiles.map(t=>({...t})),...snapshot(s),counts:{...s.counts},history:[],certificate:[]};for(const id of path)if(!take(clone,id))return {valid:false,state:clone};return {valid:clone.status==='won',state:clone};}
const api={TYPES,SIZE,CAPACITY,create,available,take,tool,verify,blockers,shufflePlan};if(typeof module==='object'&&module.exports)module.exports=api;else root.SheepTriple=api;
})(typeof globalThis==='object'?globalThis:this);
