'use strict';
const assert=require('node:assert/strict'),E=require('../game/js/screws-engine.js');E.configure(require('../game/js/screws-levels.js'));
assert.equal(E.levels.length,16);let traps=0,plateChoiceWitnesses=0;
// Exact probability for the old easy strategy: always take the color already
// most represented in the tray, choosing uniformly among tied screws.
function greedyChance(index){
 const memo=new Map();
 function probability(s){
  if(s.status==='won')return 1;if(s.status==='lost')return 0;
  if(memo.has(s.mask))return memo.get(s.mask);
  const choices=E.available(s),count=c=>s.rack.filter(v=>v===c.color).length;
  const best=Math.max(...choices.map(count)),tied=choices.filter(c=>count(c)===best);
  const p=tied.reduce((sum,c)=>{const n={...s,rack:s.rack.slice()};E.take(n,c.id);return sum+probability(n);},0)/tied.length;
  memo.set(s.mask,p);return p;
 }
 return probability(E.create(index));
}
function greedy(index){const s=E.create(index);while(s.status==='playing'){const choices=E.available(s).sort((a,b)=>s.rack.filter(c=>c===b.color).length-s.rack.filter(c=>c===a.color).length);E.take(s,choices[0].id);}return s.status;}

for(let i=0;i<16;i++){
 const s=E.create(i),level=E.levels[i],counts={};level.plates.forEach(p=>p.colors.forEach(c=>counts[c]=(counts[c]||0)+1));Object.values(counts).forEach(n=>assert.equal(n%3,0));
 assert.ok(level.plates.length>=6,'every level requires reveals, including the opening');
 level.plates.forEach(p=>assert.ok(new Set(p.colors).size>1,'no self-contained three-match plates'));
 assert.equal(greedy(i),'lost','a fixed tray-greedy sweep cannot clear the board');
 // Along the failed greedy line, look for two equal-colour choices with the
 // same tray result but opposite solvability: which plate opens really matters.
 let probe=E.create(i);
 while(probe.status==='playing'){
  const choices=E.available(probe).sort((a,b)=>probe.rack.filter(c=>c===b.color).length-probe.rack.filter(c=>c===a.color).length);
  const chosen=choices[0],next={...probe,rack:probe.rack.slice()};E.take(next,chosen.id);
  if(!E.solve(next).path){
   if(choices.some(c=>{if(c.color!==chosen.color||c.plate===chosen.plate)return false;const alt={...probe,rack:probe.rack.slice()};E.take(alt,c.id);return !!E.solve(alt).path;}))plateChoiceWitnesses++;
   break;
  }
  probe=next;
 }
 const chance=greedyChance(i);assert.ok(chance<=(i<4?.45:i<8?.30:.16),`level ${i+1} greedy probability ${chance}`);
 // Let players explore: no opening screw silently makes the board unsolvable.
 for(const c of E.available(s)){const n=E.create(i);E.take(n,c.id);assert.ok(E.solve(n).path,'every first click is recoverable');}
 const solved=E.solve(s);assert.ok(solved.path,`level ${i+1} solvable`);assert.equal(solved.path.length,level.plates.length*3);
 const untouched=JSON.stringify(s);assert.equal(E.take(s,-1),false);assert.equal(JSON.stringify(s),untouched);
 if(level.plates.length>3){assert.equal(E.take(s,9),false,'lower plate occluded');assert.equal(JSON.stringify(s),untouched);}
 let peak=0;for(const id of solved.path){assert.ok(E.available(s).some(v=>v.id===id));const result=E.take(s,id);assert.ok(result);assert.ok(s.rack.length<5);peak=Math.max(peak,s.rack.length);assert.equal(E.take(s,id),false,'cannot take twice');}
 assert.equal(peak,4,'verified solution trace uses four tray slots');assert.equal(s.status,'won');assert.equal(s.rack.length,0);assert.equal(E.available(s).length,0);assert.ok(level.plates.every(p=>E.plateGone(s,p)));
 const seen=new Set();function findLoss(st){if(st.status==='lost')return true;if(st.status!=='playing'||seen.size>5000||seen.has(st.mask))return false;seen.add(st.mask);for(const c of E.available(st)){const next={...st,rack:st.rack.slice()};E.take(next,c.id);if(findLoss(next))return true;}return false;}if(findLoss(E.create(i)))traps++;
 console.log(`screws level ${i+1}: ${solved.path.length} screws, solution verified (${solved.visited} search states), exact greedy win ${(chance*100).toFixed(1)}%`);
}
assert.ok(plateChoiceWitnesses>=3,'multiple boards require choosing which same-colour screw opens the right plate');
assert.equal(traps,16,'every level has real losing choices');
const small=E.create();const first=E.available(small)[0];E.take(small,first.id);const snapshot=JSON.stringify(small);E.solve(small);assert.equal(JSON.stringify(small),snapshot,'solver is pure');
console.log('screws model: all 16 solutions, occlusion, matching, capacity, loss branches, terminal state, invalid moves and solver purity passed');
