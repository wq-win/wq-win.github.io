'use strict';
const assert=require('node:assert/strict'),E=require('../game/js/screws-engine.js');E.configure(require('../game/js/screws-levels.js'));
assert.equal(E.levels.length,16);let traps=0;
for(let i=0;i<16;i++){
 const s=E.create(i),level=E.levels[i],counts={};level.plates.forEach(p=>p.colors.forEach(c=>counts[c]=(counts[c]||0)+1));Object.values(counts).forEach(n=>assert.equal(n%3,0));
 const solved=E.solve(s);assert.ok(solved.path,`level ${i+1} solvable`);assert.equal(solved.path.length,level.plates.length*3);
 const untouched=JSON.stringify(s);assert.equal(E.take(s,-1),false);assert.equal(JSON.stringify(s),untouched);
 if(level.plates.length>3){assert.equal(E.take(s,9),false,'lower plate occluded');assert.equal(JSON.stringify(s),untouched);}
 for(const id of solved.path){assert.ok(E.available(s).some(v=>v.id===id));const result=E.take(s,id);assert.ok(result);assert.ok(s.rack.length<5);assert.equal(E.take(s,id),false,'cannot take twice');}
 assert.equal(s.status,'won');assert.equal(s.rack.length,0);assert.equal(E.available(s).length,0);assert.ok(level.plates.every(p=>E.plateGone(s,p)));
 const seen=new Set();function findLoss(st){if(st.status==='lost')return true;if(st.status!=='playing'||seen.size>5000||seen.has(st.mask))return false;seen.add(st.mask);for(const c of E.available(st)){const next={...st,rack:st.rack.slice()};E.take(next,c.id);if(findLoss(next))return true;}return false;}if(findLoss(E.create(i)))traps++;
 console.log(`screws level ${i+1}: ${solved.path.length} screws, solution verified (${solved.visited} search states)`);
}
assert.equal(traps,16,'every level has real losing choices');
const small=E.create();const first=E.available(small)[0];E.take(small,first.id);const snapshot=JSON.stringify(small);E.solve(small);assert.equal(JSON.stringify(small),snapshot,'solver is pure');
console.log('screws model: all 16 solutions, occlusion, matching, capacity, loss branches, terminal state, invalid moves and solver purity passed');
