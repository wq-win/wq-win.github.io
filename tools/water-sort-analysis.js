'use strict';
// Exhaustive, bottle-symmetry-reduced QA graph. No solver heuristic is used to
// classify winning states or shortest paths; reverse reachability proves them.
const E = require('../game/js/water-sort-engine');
const signature = bottles => bottles.map(b=>b.join('')).sort().join('|');
function analyze(initial, maxStates = 50000) {
  const nodes=[{bottles:initial,edges:[],parents:[],depth:0,parent:-1}],seen=new Map([[signature(initial),0]]);
  let goal=-1;
  for(let head=0;head<nodes.length;head++) {
    if(nodes.length>maxStates)throw Error(`Water graph exceeded ${maxStates} states`);
    const node=nodes[head];
    if(E.won(node.bottles)){goal=head;continue;}
    const targets=new Set();
    for(const move of E.legalMoves(node.bottles)) {
      const bottles=E.pour(node.bottles,move.from,move.to).bottles,key=signature(bottles);
      let id=seen.get(key);
      if(id===undefined){id=nodes.length;seen.set(key,id);nodes.push({bottles,edges:[],parents:[],depth:node.depth+1,parent:head,move:[move.from,move.to]});}
      targets.add(id);
    }
    node.edges=[...targets];for(const id of targets)nodes[id].parents.push(head);
  }
  const winning=new Set(goal<0?[]:[goal]),reverse=[...winning];
  for(let head=0;head<reverse.length;head++)for(const id of nodes[reverse[head]].parents)if(!winning.has(id)){winning.add(id);reverse.push(id);}
  function pathTo(id){const path=[];while(id>=0&&nodes[id].parent>=0){path.push(nodes[id].move);id=nodes[id].parent;}return path.reverse();}
  const dead=nodes.map((n,i)=>!n.edges.length&&!E.won(n.bottles)?i:-1).filter(i=>i>=0);
  // Can a player win while leaving one bottle empty at every intermediate step?
  const oneSpare=new Set([0]),open=[0];
  for(let h=0;h<open.length;h++)for(const id of nodes[open[h]].edges){if(oneSpare.has(id)||nodes[id].bottles.every(b=>b.length))continue;oneSpare.add(id);open.push(id);}
  return {nodes,winning,shortest:goal<0?null:nodes[goal].depth,solution:pathTo(goal),losing:nodes.length-winning.size,dead,deadPath:dead.length?pathTo(dead[0]):[],oneSpareCanWin:oneSpare.has(goal)};
}
function greedyWins(initial,trials=200) {
  let wins=0;
  for(let trial=1;trial<=trials;trial++){
    let seed=Math.imul(trial,0x9e3779b9),bottles=initial;const seen=new Set([signature(bottles)]);
    const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
    for(let step=0;step<120;step++){
      if(E.won(bottles)){wins++;break;}
      const moves=E.legalMoves(bottles).map(m=>({...m,next:E.pour(bottles,m.from,m.to).bottles})).filter(m=>!seen.has(signature(m.next)));
      if(!moves.length)break;
      const score=m=>(bottles[m.to].length?10:0)+(bottles[m.to].length+m.amount===4&&E.same(bottles[m.to])?20:0)+(m.amount===bottles[m.from].length?7:0)+m.amount;
      const best=Math.max(...moves.map(score)),ties=moves.filter(m=>score(m)===best),chosen=ties[Math.floor(random()*ties.length)];
      bottles=chosen.next;seen.add(signature(bottles));
    }
  }
  return wins;
}
module.exports={signature,analyze,greedyWins};
