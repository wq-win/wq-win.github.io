'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const E = require('../game/js/hanzi-battle-engine.js');
const levels = require('../game/js/hanzi-battle-levels.js');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`  ✓ ${name}`); }
function unchanged(state, operation) {
  const before = JSON.stringify(state);
  assert.equal(operation().ok, false);
  assert.equal(JSON.stringify(state), before);
}
function formation(level, army) {
  const state = E.create(level);
  army.forEach((char, lane) => {
    if (!char) return;
    const unit = E.UNITS[char], slot = state.board.indexOf(unit.base);
    assert(slot >= 0, `Missing base material for ${char}`);
    for (let cost = 1; cost < unit.cost; cost++) {
      const other = state.board.findIndex((value, index) => value === unit.base && index !== slot);
      assert.equal(E.combine(state, slot, other).ok, true);
    }
    assert.equal(state.board[slot], char);
    assert.equal(E.deploy(state, slot, lane).ok, true);
  });
  return state;
}
function combat(enemies, army, gateHp = 100) {
  const level = { materials: ['木', '木', '木', '火', '火', '火', '人', '人', '人'], enemies, gateHp };
  const state = formation(level, army);
  assert.equal(E.start(state).ok, true);
  return state;
}
function enemy(hp, attack = 1, armor = 0) { return { name: '测试敌军', glyph: '卒', hp, attack, armor }; }
function finish(level, army) { return E.run(formation(level, army)); }

console.log('Hanzi Battle engine tests');
test('browser scripts and CommonJS expose the same six fixed levels and nine units', () => {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  ['hanzi-battle-levels.js', 'hanzi-battle-engine.js'].forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, '../game/js', file), 'utf8'), sandbox));
  assert.equal(sandbox.window.HanziBattleLevels.length, 6);
  assert.equal(sandbox.window.HanziBattleEngine.RECIPES.length, 6);
  assert.equal(Object.keys(E.UNITS).length, 9);
  assert.equal(E.LEVELS, levels);
  assert.deepEqual(E.create(0), E.create(levels[0]));
  assert.throws(() => E.create(-1));
  assert.throws(() => E.create(6));
  levels.forEach((level, index) => {
    const state = E.create(index);
    assert.equal(state.level, index);
    assert.equal(state.phase, 'prepare');
    assert.equal(state.board.length, 12);
    assert.equal(state.army.length, 3);
    assert.equal(state.enemies.length, 3);
    assert.equal(state.battleArmy.length, 3);
    assert(level.materials.length >= 8 && level.materials.length <= 12);
    assert.equal(state.gate.hp, level.gateHp);
    assert.deepEqual(state.board.filter(Boolean), level.materials);
  });
});

test('only the six unordered recipes exist; all consume two tiles and keep the first chosen slot', () => {
  assert.deepEqual(E.RECIPES.map(recipe => recipe.inputs.join('') + recipe.output), ['木木林', '林木森', '火火炎', '炎火焱', '人人从', '从人众']);
  for (const base of ['木', '火', '人']) {
    const state = E.create(5), indices = state.board.map((char, i) => char === base ? i : -1).filter(i => i >= 0);
    const before = state.board.filter(Boolean).length;
    const mid = E.RECIPES.find(recipe => recipe.inputs[0] === base).output;
    const high = E.RECIPES.find(recipe => recipe.inputs[0] === mid).output;
    assert.equal(E.combine(state, indices[1], indices[0]).char, mid);
    assert.equal(state.board[indices[1]], mid);
    assert.equal(state.board[indices[0]], null);
    // Reverse the higher recipe: base first, compound second.
    assert.equal(E.combine(state, indices[2], indices[1]).char, high);
    assert.equal(state.board[indices[2]], high);
    assert.equal(state.board[indices[1]], null);
    assert.equal(state.board.filter(Boolean).length, before - 2);
    assert.deepEqual(E.restore(E.save(state)), state);
  }
});

test('invalid combinations and out-of-range actions never consume or alter material', () => {
  const state = E.create(0);
  [[0, 0], [0, 3], [0, 8], [0, -1], [0, 12], [0, 1.5], ['0', 1]].forEach(([a, b]) => unchanged(state, () => E.combine(state, a, b)));
  unchanged(state, () => E.deploy(state, 8, 0));
  unchanged(state, () => E.deploy(state, 0, 3));
  unchanged(state, () => E.deploy(state, 0, -1));
  unchanged(state, () => E.recall(state, 0));
  unchanged(state, () => E.start(state));
  assert.deepEqual(E.step(state), []);
  const advanced = formation(5, [null, null, null]);
  E.combine(advanced, 0, 1);
  E.combine(advanced, 2, 3);
  unchanged(advanced, () => E.combine(advanced, 0, 2)); // 林＋林 is not a recipe.
});

test('base units deploy, occupied lanes reject replacement, and recall restores the first empty board slot', () => {
  for (const base of ['木', '火', '人']) {
    const state = E.create(5), slot = state.board.indexOf(base);
    assert.equal(E.deploy(state, slot, 2).ok, true);
    assert.equal(state.board[slot], null);
    assert.equal(state.army[2], base);
    const another = state.board.findIndex(Boolean);
    unchanged(state, () => E.deploy(state, another, 2));
    assert.equal(E.recall(state, 2).slot, slot);
    assert.equal(state.army[2], null);
    assert.deepEqual(state, E.create(5));
  }
  const state = formation(5, ['森', null, null]);
  assert.equal(E.recall(state, 0).slot, 0);
  assert.equal(E.deploy(state, 0, 1).ok, true);
  assert.equal(state.army[1], '森');
});

test('starting requires a soldier and locks all preparation operations until re-formation', () => {
  const state = formation(0, [null, '森', null]);
  assert.equal(E.start(state).ok, true);
  assert.equal(state.battleArmy[1].maxHp, E.UNITS['森'].hp);
  unchanged(state, () => E.combine(state, 3, 4));
  unchanged(state, () => E.deploy(state, 3, 0));
  unchanged(state, () => E.recall(state, 1));
  unchanged(state, () => E.start(state));
  E.run(state);
  unchanged(state, () => E.recall(state, 1));
  const prepared = E.restore(E.save(state));
  assert.equal(prepared.phase, 'prepare');
  assert.equal(E.recall(prepared, 1).ok, true);
});

test('same-lane attacks take priority; support chooses nearest enemy with left tie-break', () => {
  let state = combat([enemy(100), enemy(100), enemy(100)], [null, '人', null]);
  let attack = E.step(state).find(event => event.side === 'army' && event.type === 'attack');
  assert.equal(attack.targetLane, 1);
  assert.equal(attack.support, false);
  state = combat([enemy(100), null, enemy(100)], [null, '人', null]);
  attack = E.step(state).find(event => event.side === 'army' && event.type === 'attack');
  assert.equal(attack.targetLane, 0);
  assert.equal(attack.support, true);
  state = combat([enemy(100), enemy(100), null], [null, null, '人']);
  attack = E.step(state).find(event => event.side === 'army' && event.type === 'attack');
  assert.equal(attack.targetLane, 1);
});

test('enemies only hit their own lane or the gate, never an adjacent defender', () => {
  const state = combat([enemy(100, 9), null, null], [null, '森', null]);
  const events = E.step(state);
  assert.equal(state.gate.hp, 91);
  assert.equal(state.battleArmy[1].hp, 60);
  assert(events.some(event => event.type === 'gate' && event.lane === 0 && event.amount === 9));
  assert(!events.some(event => event.side === 'enemy' && event.type === 'attack'));
});

test('fire splash hits adjacent lanes around its target, while guard armor reduces damage', () => {
  const state = combat([enemy(100, 7), enemy(100, 7), enemy(100, 7)], ['森', '焱', '众']);
  const events = E.step(state);
  assert.equal(state.battleArmy[0].hp, 56);
  assert.equal(state.battleArmy[1].hp, 23);
  assert.equal(state.battleArmy[2].hp, 39);
  assert.equal(state.enemies[0].hp, 88); // guard 7 + splash 5
  assert.equal(state.enemies[1].hp, 83);
  assert.equal(state.enemies[2].hp, 83); // troop 12 + splash 5
  assert.deepEqual(events.filter(event => event.type === 'splash').map(event => event.targetLane), [0, 2]);
  const supporting = combat([enemy(100), enemy(100), null], [null, null, '焱']);
  const splash = E.step(supporting).find(event => event.type === 'splash');
  assert.equal(splash.targetLane, 0); // adjacent to target lane 1, not source lane 2
});

test('rounds are simultaneous: a defeated unit still attacks, and mutual army defeat wins if the gate survives', () => {
  const state = combat([enemy(4, 14), null, null], ['人', null, null]);
  const events = E.step(state);
  assert.equal(state.enemies[0], null);
  assert.equal(state.battleArmy[0], null);
  assert.equal(state.phase, 'won');
  assert.equal(state.round, 1);
  assert(events.some(event => event.side === 'army' && event.type === 'attack'));
  assert(events.some(event => event.side === 'enemy' && event.type === 'attack'));
  assert.equal(events.at(-1).type, 'won');
  const snapshot = JSON.stringify(state);
  assert.deepEqual(E.step(state), []);
  assert.equal(JSON.stringify(state), snapshot);
});

test('gate destruction overrides an enemy wipe in the same round; gate HP never becomes negative', () => {
  const state = combat([enemy(6, 9), null, null], [null, '火', null], 5);
  const events = E.step(state);
  assert.equal(state.enemies[0], null);
  assert.equal(state.gate.hp, 0);
  assert.equal(state.phase, 'lost');
  assert.equal(events.at(-1).type, 'lost');
  const emptyArmy = combat([enemy(20, 99), null, null], ['人', null, null], 7);
  E.step(emptyArmy);
  assert.equal(emptyArmy.phase, 'battle');
  E.step(emptyArmy);
  assert.equal(emptyArmy.phase, 'lost');
});

test('every fixed level has a searched, replayable legal victory and a clearly losing uncombined formation', () => {
  levels.forEach((level, index) => {
    const solution = E.solve(index);
    assert(solution, `No solution for level ${index + 1}`);
    assert(solution.actions.some(action => action.type === 'combine'));
    const state = E.create(index);
    solution.actions.forEach(action => {
      assert.equal((action.type === 'combine' ? E.combine(state, action.a, action.b) : E.deploy(state, action.slot, action.lane)).ok, true);
    });
    assert.deepEqual(state.army, solution.army);
    E.run(state);
    assert.equal(state.phase, 'won');
    assert.equal(state.round, solution.rounds);
    assert.equal(state.gate.hp, solution.gateHp);
    assert(state.completed.includes(index));
    assert.equal(finish(index, ['木', '火', '人']).phase, 'lost');
    const again = E.solve(level);
    assert.deepEqual(again, solution);
    console.log(`    ${index + 1}. ${level.title}: ${solution.army.map(char => char || '空').join(' / ')} → ${solution.rounds} 回合，城门 ${solution.gateHp}`);
  });
});

test('level lessons matter: single-lane merging, two-lane division, and three-lane coverage', () => {
  assert.equal(finish(0, [null, '森', null]).phase, 'won');
  assert.equal(finish(0, [null, '木', null]).phase, 'lost');
  assert.equal(finish(1, ['森', null, '焱']).phase, 'won');
  assert.equal(finish(1, [null, '森', null]).phase, 'lost');
  assert.equal(finish(2, ['森', '焱', '众']).phase, 'won');
  assert.equal(finish(2, ['森', null, '焱']).phase, 'lost');
});

test('guard identity and position are decisive in the damage-soaking lesson', () => {
  assert.equal(finish(3, ['焱', '森', '众']).phase, 'won');
  assert.equal(finish(3, ['森', '焱', '众']).phase, 'lost');
  assert.equal(finish(3, ['焱', '众', '森']).phase, 'lost');
  const armorless = formation(3, ['焱', '森', '众']);
  E.start(armorless);
  armorless.battleArmy[1].armor = 0;
  assert.equal(E.run(armorless).phase, 'lost'); // Without armor the guard falls one round too soon.
  assert.equal(armorless.battleArmy[1], null);
});

test('fire placement and splash are decisive in the fire lesson', () => {
  assert.equal(finish(4, ['森', '焱', '众']).phase, 'won');
  assert.equal(finish(4, ['森', '众', '焱']).phase, 'lost');
  assert.equal(finish(4, ['焱', '森', '众']).phase, 'lost');
  const noSplash = formation(4, ['森', '焱', '众']);
  E.start(noSplash);
  noSplash.battleArmy[1].splash = 0;
  assert.equal(E.run(noSplash).phase, 'lost');
});

test('final lesson makes formation decisive even with identical high-tier units', () => {
  assert.equal(finish(5, ['森', '焱', '众']).phase, 'won');
  const worse = [['森', '众', '焱'], ['焱', '森', '众'], ['焱', '众', '森'], ['众', '森', '焱'], ['众', '焱', '森']];
  worse.forEach(army => assert.equal(finish(5, army).phase, 'lost', army.join('/')));
});

test('save and restore retain material and completed levels but reset every battle value', () => {
  const state = formation(5, ['森', '焱', '众']);
  state.completed = [0, 1, 2, 3, 4];
  E.start(state);
  E.step(state);
  const reset = E.restore(E.save(state));
  assert.equal(reset.phase, 'prepare');
  assert.equal(reset.round, 0);
  assert.equal(reset.gate.hp, levels[5].gateHp);
  assert(reset.enemies.every((unit, lane) => !unit || unit.hp === levels[5].enemies[lane].hp));
  assert.deepEqual(reset.battleArmy, [null, null, null]);
  assert.deepEqual(reset.lastEvents, []);
  assert.deepEqual(reset.army, state.army);
  assert.deepEqual(reset.board, state.board);
  assert.deepEqual(reset.completed, [0, 1, 2, 3, 4]);
  E.run(reset);
  assert.deepEqual(reset.completed, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(E.restore(E.save(reset)).completed, [0, 1, 2, 3, 4, 5]);
});

test('bad saves, fabricated characters, wrong materials, and broken inventory recover safely', () => {
  for (const raw of ['{bad', '{}', 'null', '', null, undefined, '{"v":99}', '[]']) assert.deepEqual(E.restore(raw), E.create());
  const valid = JSON.parse(E.save(formation(5, ['森', '焱', '众'])));
  for (const corrupt of [
    value => { value.level = 99; }, value => { value.v = 2; },
    value => { value.board = []; }, value => { value.army = []; },
    value => { value.board[0] = '森'; }, value => { value.board[3] = null; },
    value => { value.army[0] = '焱'; }, value => { value.army[0] = '龙'; },
    value => { value.army[0] = 'constructor'; }, value => { value.army[0] = 'toString'; },
    value => { value.army[0] = {}; }, value => { value.completed = [999]; }
  ]) {
    const value = structuredClone(valid);
    corrupt(value);
    assert.deepEqual(E.restore(JSON.stringify(value)), E.create());
  }
  const supplied = structuredClone(valid);
  const restored = E.restore(supplied);
  supplied.board[3] = '焱';
  supplied.army[0] = '焱';
  assert.equal(restored.army[0], '森');
  assert.equal(restored.board[3], '木');
  const injected = E.create(5);
  injected.board[0] = '森';
  E.deploy(injected, 0, 0);
  unchanged(injected, () => E.start(injected));
});

test('lane previews match queued first-round combat without mutating the state', () => {
  for (let level = 0; level < 6; level++) {
    const army = E.solve(level).army, state = formation(level, army), before = JSON.stringify(state);
    const predictions = army.map((char,lane)=>char && E.preview(state,char,lane));
    assert.equal(JSON.stringify(state),before);
    E.start(state); const events = E.step(state);
    predictions.forEach((prediction,lane)=>{ if (!prediction) return;
      const attack = events.find(e=>e.side==='army' && e.type==='attack' && e.lane===lane);
      assert.equal(attack.amount,prediction.attack); assert.equal(attack.targetLane,prediction.targetLane);
      const received = events.find(e=>e.side==='enemy' && e.type==='attack' && e.lane===lane);
      assert.equal(received ? received.amount : 0,prediction.incoming);
      assert.deepEqual(events.filter(e=>e.side==='army' && e.type==='splash' && e.lane===lane).map(e=>e.targetLane),prediction.splashTargets);
    });
  }
  assert.equal(E.preview(E.create(), '龙', 0), null); assert.equal(E.preview(E.create(), '木', 3), null);
});
console.log(`Hanzi Battle: ${checks} test groups passed. Six levels solved; recipes, inventory, simultaneous combat, roles, placement, and restore verified.`);
