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
function key(bottles) { return bottles.map(b=>b.join('')).sort().join('|'); }
/* Symmetric bottles share a search key. Moving a uniform bottle into an empty one
   is a label swap, so the solver skips it; the player is still allowed to do it. */
function solve(input, options = {}) {
  const bottles = Array.isArray(input) ? input : input.bottles;
  if (won(bottles)) return [];
  const limit = options.maxStates || 300000, seen = new Set([key(bottles)]);
  let visited = 0;
  function search(board, depth) {
    if (++visited > limit || depth > (options.maxDepth || 180)) return null;
    if (won(board)) return [];
    const moves = legalMoves(board).filter(m => !(same(board[m.from]) && !board[m.to].length) && !(same(board[m.from]) && board[m.from].length === CAPACITY));
    moves.sort((a,b)=>score(b,board)-score(a,board));
    for (const move of moves) {
      const next = pour(board,move.from,move.to).bottles, signature = key(next);
      if (seen.has(signature)) continue;
      seen.add(signature);
      const result = search(next,depth+1);
      if (result) return [{from:move.from,to:move.to,amount:move.amount,color:move.color},...result];
      if (visited > limit) return null;
    }
    return null;
  }
  return search(bottles,0);
}
function score(m,b) {
  return (b[m.to].length ? 10 : 0) + (b[m.to].length + m.amount === CAPACITY && same(b[m.to]) ? 20 : 0) + (m.amount === b[m.from].length ? 7 : 0) + m.amount;
}
function save(state) { return JSON.stringify({v:1,level:state.level,history:state.history,completed:state.completed}); }
function restore(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || !Number.isInteger(data.level) || data.level < 0 || data.level >= LEVELS.length || !Array.isArray(data.history) || data.history.length > 10000 || !Array.isArray(data.completed)) return create();
    let state = create(data.level,data.completed);
    for (const step of data.history) {
      if (!Array.isArray(step) || step.length !== 2) return create();
      const result = act(state,step[0],step[1]);
      if (!result.ok) return create();
      state = result.state;
    }
    return state;
  } catch (_) { return create(); }
}
const api = {CAPACITY,LEVELS,top,same,won,inspect,pour,legalMoves,create,act,solve,save,restore};
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WaterSortEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
