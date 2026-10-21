(function (root) {
  'use strict';
  const LEVELS = typeof module !== 'undefined' && module.exports ? require('./hanzi-battle-levels.js') : root.HanziBattleLevels;
  const UNITS = {
    '木': { hp: 18, attack: 3, armor: 1, splash: 0, role: 'guard', name: '木护卫', base: '木', cost: 1 },
    '林': { hp: 36, attack: 5, armor: 2, splash: 0, role: 'guard', name: '林护卫', base: '木', cost: 2 },
    '森': { hp: 60, attack: 7, armor: 3, splash: 0, role: 'guard', name: '森护卫', base: '木', cost: 3 },
    '火': { hp: 10, attack: 6, armor: 0, splash: 1, role: 'fire', name: '火兵', base: '火', cost: 1 },
    '炎': { hp: 20, attack: 11, armor: 0, splash: 3, role: 'fire', name: '炎火兵', base: '火', cost: 2 },
    '焱': { hp: 30, attack: 17, armor: 0, splash: 5, role: 'fire', name: '焱火兵', base: '火', cost: 3 },
    '人': { hp: 14, attack: 4, armor: 0, splash: 0, role: 'troop', name: '人战兵', base: '人', cost: 1 },
    '从': { hp: 29, attack: 8, armor: 0, splash: 0, role: 'troop', name: '从战兵', base: '人', cost: 2 },
    '众': { hp: 45, attack: 12, armor: 1, splash: 0, role: 'troop', name: '众战兵', base: '人', cost: 3 }
  };
  Object.values(UNITS).forEach(Object.freeze);
  Object.freeze(UNITS);
  const RECIPES = [
    { inputs: ['木', '木'], output: '林' }, { inputs: ['林', '木'], output: '森' },
    { inputs: ['火', '火'], output: '炎' }, { inputs: ['炎', '火'], output: '焱' },
    { inputs: ['人', '人'], output: '从' }, { inputs: ['从', '人'], output: '众' }
  ];
  RECIPES.forEach(recipe => { Object.freeze(recipe.inputs); Object.freeze(recipe); });
  Object.freeze(RECIPES);
  const OWN = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const validIndex = (index, size) => Number.isInteger(index) && index >= 0 && index < size;
  const failure = error => ({ ok: false, error });
  const definition = state => state._definition || LEVELS[state.level];
  const recipeFor = (a, b) => RECIPES.find(recipe => (recipe.inputs[0] === a && recipe.inputs[1] === b) || (recipe.inputs[0] === b && recipe.inputs[1] === a));

  function enemiesFor(level) {
    return level.enemies.map(enemy => enemy ? { ...enemy, hp: enemy.hp, maxHp: enemy.hp, armor: enemy.armor || 0 } : null);
  }

  function create(level = 0) {
    const index = typeof level === 'number' ? level : LEVELS.indexOf(level);
    const spec = typeof level === 'number' ? LEVELS[level] : level;
    if (!spec || !Array.isArray(spec.materials) || spec.materials.length < 8 || spec.materials.length > 12 ||
      !spec.materials.every(char => char === '木' || char === '火' || char === '人') ||
      !Array.isArray(spec.enemies) || spec.enemies.length !== 3 || !spec.enemies.some(Boolean) ||
      !Number.isInteger(spec.gateHp) || spec.gateHp < 1 ||
      spec.enemies.some(enemy => enemy && (!Number.isInteger(enemy.hp) || enemy.hp < 1 || !Number.isInteger(enemy.attack) || enemy.attack < 1 || (enemy.armor !== undefined && (!Number.isInteger(enemy.armor) || enemy.armor < 0))))) {
      throw new Error('Invalid Hanzi Battle level');
    }
    const state = {
      level: index, phase: 'prepare', board: spec.materials.concat(Array(12 - spec.materials.length).fill(null)),
      army: [null, null, null], enemies: enemiesFor(spec), gate: { hp: spec.gateHp, maxHp: spec.gateHp },
      round: 0, completed: [], battleArmy: [null, null, null], lastEvents: []
    };
    if (index < 0) Object.defineProperty(state, '_definition', { value: spec, enumerable: false });
    return state;
  }

  function inventoryValid(state, spec) {
    if (!Array.isArray(state.board) || state.board.length !== 12 || !Array.isArray(state.army) || state.army.length !== 3) return false;
    const actual = { '木': 0, '火': 0, '人': 0 };
    const expected = { '木': 0, '火': 0, '人': 0 };
    for (const char of state.board.concat(state.army)) {
      if (char === null) continue;
      if (typeof char !== 'string' || !OWN(UNITS, char)) return false;
      actual[UNITS[char].base] += UNITS[char].cost;
    }
    for (const char of spec.materials) expected[char]++;
    return Object.keys(expected).every(base => actual[base] === expected[base]);
  }

  function combine(state, a, b) {
    if (state.phase !== 'prepare') return failure('战斗中不能合字，请先重新布阵。');
    if (!validIndex(a, 12) || !validIndex(b, 12) || a === b) return failure('请选择两个不同的字格。');
    const recipe = recipeFor(state.board[a], state.board[b]);
    if (!recipe) return failure('这两个字没有合成配方，字料已保留。');
    state.board[a] = recipe.output;
    state.board[b] = null;
    return { ok: true, char: recipe.output, slot: a, consumedSlot: b };
  }

  function deploy(state, slot, lane) {
    if (state.phase !== 'prepare') return failure('战斗中不能调整出征位。');
    if (!validIndex(slot, 12) || !validIndex(lane, 3) || !OWN(UNITS, state.board[slot])) return failure('请先选择字盘中的一个字。');
    if (state.army[lane]) return failure('这一路已有守军，请先撤回。');
    state.army[lane] = state.board[slot];
    state.board[slot] = null;
    return { ok: true, char: state.army[lane], lane, slot };
  }

  function recall(state, lane) {
    if (state.phase !== 'prepare') return failure('战斗中不能撤回守军。');
    if (!validIndex(lane, 3) || !state.army[lane]) return failure('这一路没有可撤回的守军。');
    const slot = state.board.indexOf(null);
    if (slot < 0) return failure('字盘没有空位。');
    const char = state.army[lane];
    state.board[slot] = char;
    state.army[lane] = null;
    return { ok: true, char, lane, slot };
  }

  function start(state) {
    if (state.phase !== 'prepare') return failure('当前不在布阵阶段。');
    if (!state.army.some(Boolean)) return failure('至少派一名守军出征。');
    if (!inventoryValid(state, definition(state))) return failure('字料不完整，请重新开始本关。');
    const spec = definition(state);
    state.phase = 'battle';
    state.round = 0;
    state.gate = { hp: spec.gateHp, maxHp: spec.gateHp };
    state.enemies = enemiesFor(spec);
    state.battleArmy = state.army.map(char => char ? { ...UNITS[char], char, maxHp: UNITS[char].hp } : null);
    state.lastEvents = [];
    return { ok: true };
  }

  function nearestEnemy(enemies, lane) {
    let target = -1, distance = Infinity;
    enemies.forEach((enemy, i) => {
      if (enemy && enemy.hp > 0 && Math.abs(i - lane) < distance) {
        target = i;
        distance = Math.abs(i - lane);
      }
    });
    return target;
  }

  function damage(unit, target) { return Math.max(1, unit.attack - target.armor); }
  // Read-only first-round forecast, not an automatic solver or guaranteed outcome.
  function preview(state, char, lane) {
    if (!OWN(UNITS, char) || !validIndex(lane, 3)) return null;
    const unit = UNITS[char], targetLane = nearestEnemy(state.enemies, lane);
    const enemy = state.enemies[lane];
    return { targetLane, attack: targetLane < 0 ? 0 : damage(unit, state.enemies[targetLane]), incoming: enemy ? damage(enemy, unit) : 0, splashTargets: unit.splash > 0 && targetLane >= 0 ? state.enemies.map((e,i) => e && Math.abs(i-targetLane) === 1 ? i : -1).filter(i => i >= 0) : [] };
  }

  // Queue every attack against the old state. Only then apply all damage and deaths.
  // A unit killed this round still lands its already queued attack.
  function step(state) {
    if (state.phase !== 'battle') return [];
    const events = [];
    const friendlyDamage = [0, 0, 0], enemyDamage = [0, 0, 0];
    let gateDamage = 0;
    state.battleArmy.forEach((unit, lane) => {
      if (!unit || unit.hp <= 0) return;
      const targetLane = nearestEnemy(state.enemies, lane);
      if (targetLane < 0) return;
      const target = state.enemies[targetLane];
      const amount = damage(unit, target);
      enemyDamage[targetLane] += amount;
      events.push({ type: 'attack', side: 'army', lane, targetLane, amount, char: unit.char, support: lane !== targetLane });
      if (unit.splash > 0) {
        state.enemies.forEach((enemy, i) => {
          if (enemy && enemy.hp > 0 && Math.abs(i - targetLane) === 1) {
            const splash = Math.max(1, unit.splash - enemy.armor);
            enemyDamage[i] += splash;
            events.push({ type: 'splash', side: 'army', lane, targetLane: i, amount: splash, char: unit.char });
          }
        });
      }
    });
    state.enemies.forEach((enemy, lane) => {
      if (!enemy || enemy.hp <= 0) return;
      const target = state.battleArmy[lane];
      if (target && target.hp > 0) {
        const amount = Math.max(1, enemy.attack - target.armor);
        friendlyDamage[lane] += amount;
        events.push({ type: 'attack', side: 'enemy', lane, targetLane: lane, amount });
      } else {
        gateDamage += enemy.attack;
        events.push({ type: 'gate', side: 'enemy', lane, amount: enemy.attack });
      }
    });
    state.round++;
    state.gate.hp = Math.max(0, state.gate.hp - gateDamage);
    state.battleArmy.forEach((unit, lane) => {
      if (!unit) return;
      unit.hp = Math.max(0, unit.hp - friendlyDamage[lane]);
      if (unit.hp === 0) {
        events.push({ type: 'defeat', side: 'army', lane, char: unit.char });
        state.battleArmy[lane] = null;
      }
    });
    state.enemies.forEach((enemy, lane) => {
      if (!enemy) return;
      enemy.hp = Math.max(0, enemy.hp - enemyDamage[lane]);
      if (enemy.hp === 0) {
        events.push({ type: 'defeat', side: 'enemy', lane });
        state.enemies[lane] = null;
      }
    });
    // Gate destruction always takes precedence, including simultaneous destruction.
    if (state.gate.hp === 0) state.phase = 'lost';
    else if (!state.enemies.some(Boolean)) {
      state.phase = 'won';
      if (state.level >= 0 && !state.completed.includes(state.level)) state.completed.push(state.level);
    }
    if (state.phase !== 'battle') events.push({ type: state.phase, round: state.round, gateHp: state.gate.hp });
    state.lastEvents = events;
    return events;
  }

  function run(state) {
    if (state.phase === 'prepare' && !start(state).ok) return state;
    while (state.phase === 'battle') step(state);
    return state;
  }

  function save(state) {
    return JSON.stringify({ v: 1, level: state.level, board: state.board, army: state.army, completed: state.completed });
  }

  function restore(raw) {
    try {
      const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!value || value.v !== 1 || !validIndex(value.level, LEVELS.length) ||
        !Array.isArray(value.completed) || value.completed.some(index => !validIndex(index, LEVELS.length))) return create();
      const state = create(value.level);
      state.board = value.board;
      state.army = value.army;
      if (!inventoryValid(state, LEVELS[state.level])) return create();
      state.board = state.board.slice();
      state.army = state.army.slice();
      state.completed = [...new Set(value.completed)].sort((a, b) => a - b);
      return state;
    } catch (_) {
      return create();
    }
  }

  // Search every feasible three-lane formation. Candidate crafting is replayable and
  // consumes real board tiles, so a winning answer cannot invent any material.
  function solve(level = 0) {
    const seed = create(level);
    const spec = definition(seed);
    const supply = { '木': 0, '火': 0, '人': 0 };
    spec.materials.forEach(char => supply[char]++);
    const choices = ['森', '焱', '众', '林', '炎', '从', '木', '火', '人', null];
    let best = null;
    for (const left of choices) for (const middle of choices) for (const right of choices) {
      const army = [left, middle, right];
      if (!army.some(Boolean)) continue;
      const needed = { '木': 0, '火': 0, '人': 0 };
      army.forEach(char => { if (char) needed[UNITS[char].base] += UNITS[char].cost; });
      if (Object.keys(supply).some(base => needed[base] > supply[base])) continue;
      const state = create(level), actions = [];
      army.forEach((char, lane) => {
        if (!char) return;
        const unit = UNITS[char];
        let slot = state.board.indexOf(unit.base);
        for (let count = 1; count < unit.cost; count++) {
          const other = state.board.findIndex((value, i) => value === unit.base && i !== slot);
          combine(state, slot, other);
          actions.push({ type: 'combine', a: slot, b: other });
        }
        deploy(state, slot, lane);
        actions.push({ type: 'deploy', slot, lane });
      });
      run(state);
      if (state.phase !== 'won') continue;
      const score = state.gate.hp * 10000 + state.battleArmy.reduce((total, unit) => total + (unit ? unit.hp : 0), 0) * 100 - state.round;
      if (!best || score > best.score) best = { army, actions, rounds: state.round, gateHp: state.gate.hp, score };
    }
    if (best) delete best.score;
    return best;
  }

  const api = { damage, preview, UNITS, RECIPES, LEVELS, create, combine, deploy, recall, start, step, run, save, restore, solve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HanziBattleEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
