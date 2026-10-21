'use strict';
const assert = require('node:assert/strict');
const E = require('../game/js/water-sort-engine');
const signature = bottles => bottles.map(b=>b.join('')).sort().join('|');
const counts = bottles => bottles.flat().reduce((all,c)=>(all[c]=(all[c]||0)+1,all),{});
const copy = value => JSON.parse(JSON.stringify(value));
assert.equal(E.LEVELS.length,8);
assert.deepEqual(E.LEVELS.map(l=>l.colors),[3,3,4,4,5,5,6,7]);
assert.equal(new Set(E.LEVELS.map(l=>signature(l.bottles))).size,8);
let transitions = 0; const lengths=[];
for(let index=0;index<8;index++){
  const level=E.LEVELS[index],initial=E.create(index),before=copy(initial);
  assert.equal(level.bottles.length,level.colors+2);assert.equal(level.bottles.filter(b=>!b.length).length,2);
  assert(Object.values(counts(initial.bottles)).every(n=>n===4));assert.equal(Object.keys(counts(initial.bottles)).length,level.colors);
  assert(!E.won(initial.bottles));assert(E.legalMoves(initial.bottles).length);
  const trace=E.solve(initial);assert(trace);lengths.push(trace.length);
  let state=initial;
  for(const move of trace){
    const previous=copy(state);const result=E.act(state,move.from,move.to);
    assert(result.ok);assert.equal(result.amount,move.amount);assert.equal(result.color,move.color);
    assert.deepEqual(state,previous,'act is immutable');
    assert.deepEqual(counts(result.state.bottles),counts(initial.bottles));assert(result.state.bottles.every(b=>b.length<=4));
    assert.deepEqual(E.restore(E.save(result.state)),result.state,'save replays the exact legal action trace');
    for(const from of [-1,0,...state.bottles.keys(),1.1])for(const to of [-1,...state.bottles.keys(),100]){
      const p=E.pour(state.bottles,from,to);transitions++;
      if(p.ok){assert.deepEqual(counts(p.bottles),counts(state.bottles));assert(p.bottles.every(b=>b.length<=4));assert(p.amount>0);assert.notEqual(from,to);}
      else assert.equal(p.bottles,state.bottles);
    }
    state=result.state;
  }
  assert(E.won(state.bottles));assert(state.completed.includes(index));assert.deepEqual(initial,before);assert.deepEqual(E.solve(state),[]);
  assert.equal(E.act(state,0,1).reason,'won');
  console.log(`level ${index+1}: ${level.colors} colours, ${trace.length} legal pours, conservation and replay PASS`);
}
assert.deepEqual(lengths,[4,9,12,15,17,23,26,29]);
assert.equal(E.inspect([[0,1,1,1],[1,1,1]],0,1).amount,1,'capacity limits top run');
assert.equal(E.inspect([[0,1,1,1],[]],0,1).amount,3,'maximal top run pours');
assert.equal(E.inspect([[0,1,1,1],[1]],0,1).amount,3);
assert.equal(E.inspect([[1,1,1,1],[]],0,1).amount,4,'player may relocate a complete bottle');
assert.equal(E.inspect([[0],[1]],0,1).reason,'color');assert.equal(E.inspect([[],[1]],0,1).reason,'empty');
assert.equal(E.inspect([[0],[0,0,0,0]],0,1).reason,'full');assert.equal(E.inspect([[0],[]],0,0).reason,'same');
assert(!E.won([[0,0],[],[1,1,1,1]]),'partial monochrome bottles do not win');
assert(E.won([[0,0,0,0],[],[1,1,1,1]]));
const stuck=[[1,2,3,0],[1,2,3,0],[1,2,3,0],[0,1],[2],[3]];
assert.deepEqual(counts(stuck),{0:4,1:4,2:4,3:4});assert.equal(E.legalMoves(stuck).length,0);assert.equal(E.solve(stuck),null);
for(const bad of ['{bad','null','{}','[]',JSON.stringify({v:2,level:0,history:[],completed:[]}),JSON.stringify({v:1,level:8,history:[],completed:[]}),JSON.stringify({v:1,level:0,history:[[0,1]],completed:[]}),JSON.stringify({v:1,level:0,history:[[0,3,1]],completed:[]}),JSON.stringify({v:1,level:0,history:[],completed:null})])assert.deepEqual(E.restore(bad),E.create());
assert.deepEqual(E.create(8),E.create());assert.deepEqual(E.create(-1),E.create());
assert.deepEqual(E.create(0,[0,0,-1,8,1.2,2]).completed,[0,2]);
// Explore every symmetry-distinct state of the introductory puzzle.
const queue=[E.LEVELS[0].bottles],seen=new Set([signature(queue[0])]);
for(let head=0;head<queue.length;head++)for(const move of E.legalMoves(queue[head])){const next=E.pour(queue[head],move.from,move.to).bottles;assert.deepEqual(counts(next),{0:4,1:4,2:4});const key=signature(next);if(!seen.has(key)){seen.add(key);queue.push(next);}}
console.log(`water-sort engine: ${transitions} tested transitions, ${seen.size} introductory reachable states, 8 solver traces, dead-end and corrupted-save checks PASS`);

// Undo reconstructs the previous legal state and preserves earned completion.
{ let s=E.create(); const start=E.save(s); assert.equal(E.undo(s),s); const path=E.solve(s); for(const m of path)s=E.act(s,m.from,m.to).state;const u=E.undo(s);assert.equal(u.moves,s.moves-1);assert.equal(E.won(u.bottles),false);assert(u.completed.includes(0));assert.equal(E.act(u,...s.history.at(-1)).won,true);let first=E.act(E.create(),path[0].from,path[0].to).state;assert.equal(E.save(E.undo(first)),start); }
