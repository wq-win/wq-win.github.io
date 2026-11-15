(function (root) {
'use strict';
const LEVELS = typeof module !== 'undefined' && module.exports ? require('./water-sort-levels.js') : root.WaterSortLevels;
const CAPACITY = 4;
const clone = bottles => bottles.map(b => b.slice());
const top = bottle => bottle[bottle.length - 1];
function same(bottle) { return bottle.length > 0 && bottle.every(c => c === bottle[0]); }
function won(bottles) { return bottles.every(b => b.length === 0 || (b.length === CAPACITY && same(b))); }
function inspect(bottles, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= bottles.length || to >= bottles.length) return {ok:false,reason:'missing'};
  if (from === to) return {ok:false,reason:'same'};
  const a = bottles[from], b = bottles[to];
  if (!a.length) return {ok:false,reason:'empty'};
  if (b.length === CAPACITY) return {ok:false,reason:'full'};
  const color = top(a);
  if (b.length && top(b) !== color) return {ok:false,reason:'color'};
  let amount = 1;
  while (amount < a.length && a[a.length - 1 - amount] === color) amount++;
  amount = Math.min(amount, CAPACITY - b.length);
  return {ok:true,from,to,color,amount};
}
function pour(bottles, from, to) {
  const move = inspect(bottles,from,to);
  if (!move.ok) return {...move,bottles};
  const next = clone(bottles);
  next[to].push(...next[from].splice(next[from].length - move.amount));
  return {...move,bottles:next,won:won(next)};
}
function legalMoves(bottles) {
  const out = [];
  for (let from = 0; from < bottles.length; from++) for (let to = 0; to < bottles.length; to++) {
    const move = inspect(bottles,from,to); if (move.ok) out.push(move);
  }
  return out;
}
function create(level = 0, completed = []) {
  level = Number.isInteger(level) && level >= 0 && level < LEVELS.length ? level : 0;
  return {level,bottles:clone(LEVELS[level].bottles),moves:0,history:[],completed:[...new Set(completed.filter(i=>Number.isInteger(i)&&i>=0&&i<LEVELS.length))]};
}
function act(state, from, to) {
  if (won(state.bottles)) return {ok:false,reason:'won',state};
  const result = pour(state.bottles,from,to);
  if (!result.ok) return {...result,state};
  const completed = state.completed.slice();
  if (result.won && !completed.includes(state.level)) completed.push(state.level);
  return {...result,state:{...state,bottles:result.bottles,moves:state.moves+1,history:[...state.history,[from,to]],completed}};
}
function undo(state) {
  if (!state.history.length) return state;
  let previous = create(state.level,state.completed);
  for (const [from,to] of state.history.slice(0,-1)) previous = act(previous,from,to).state;
  return previous;
}
function key(bottles) { return bottles.map(b=>b.join('')).sort().join('|'); }
/* Breadth-first search returns a shortest continuation. Re-solving after each
   pour therefore decreases the remaining distance by exactly one; a fresh
   heuristic depth-first search can choose a different path and oscillate.
   Bottle permutations share a key, but nodes keep real bottle indices. */
function solve(input, options = {}) {
  const bottles = Array.isArray(input) ? input : input.bottles;
  if (won(bottles)) return [];
  const limit = options.maxStates ?? 20000, maxDepth = options.maxDepth ?? 180;
  const nodes = [{board:bottles,parent:-1,depth:0}], seen = new Set([key(bottles)]);
  for (let head = 0; head < nodes.length; head++) {
    const node = nodes[head];
    if (node.depth >= maxDepth) continue;
    for (const move of legalMoves(node.board)) {
      const next = pour(node.board,move.from,move.to).bottles, signature = key(next);
      if (seen.has(signature)) continue;
      // Never return an unproved partial route when the search budget expires.
      if (nodes.length >= limit) return null;
      seen.add(signature);
      const child = {board:next,parent:head,depth:node.depth+1,move};
      nodes.push(child);
      if (won(next)) {
        const path = [];
        for (let n = child; n.parent >= 0; n = nodes[n.parent]) {
          const {from,to,amount,color} = n.move; path.push({from,to,amount,color});
        }
        return path.reverse();
      }
    }
  }
  return null;
}
function save(state) { return JSON.stringify({v:2,level:state.level,history:state.history,completed:state.completed}); }
function restore(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data || ![1,2].includes(data.v) || !Number.isInteger(data.level) || data.level < 0 || data.level >= LEVELS.length || !Array.isArray(data.history) || data.history.length > 10000 || !Array.isArray(data.completed)) return create();
    let state = create(data.level,data.completed);
    // Level revision 2 changes bottle contents: never replay an old trace on a
    // different puzzle. Keep earned completion and the selected level instead.
    if (data.v === 1) return state;
    for (const step of data.history) {
      if (!Array.isArray(step) || step.length !== 2) return create();
      const result = act(state,step[0],step[1]);
      if (!result.ok) return create();
      state = result.state;
    }
    return state;
  } catch (_) { return create(); }
}
const api = {CAPACITY,LEVELS,top,same,won,inspect,pour,legalMoves,create,act,undo,solve,save,restore};
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WaterSortEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
