'use strict';
const assert = require('node:assert/strict');
const E = require('../game/js/tile-frontier-engine.js');
const levels = require('../game/js/tile-frontier-levels.js');
E.configure(levels);
const r = id => ({ type: 'reveal', id }), b = (id, building) => ({ type: 'build', id, building }), n = id => ({ type: 'recruit', id }), a = id => ({ type: 'attack', id });
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function rejected(state, action) { const before = JSON.stringify(state); const result = E.act(state, action); assert.equal(result.ok, false); assert.equal(JSON.stringify(state), before, 'Invalid action must not mutate any state'); }
check('six 5x5 maps, independent initial states and orthogonal adjacency', () => {
    assert.equal(levels.length, 6); assert.deepEqual(E.neighbors(0), [1, 5]); assert.deepEqual(E.neighbors(4), [9, 3]); assert.deepEqual(E.neighbors(12), [7, 13, 17, 11]); assert.deepEqual(E.neighbors(25), []);
    levels.forEach((level, i) => { const state = E.create(i); assert.equal(state.tiles.length, 25); assert.equal(state.tiles.filter(t => t.revealed).length, 1); assert.equal(state.tiles.filter(t => t.owned).length, 1); assert.equal(state.tiles[level.camp].terrain, 'camp'); assert.equal(state.target, Object.keys(level.outposts).length); });
    const one = E.create(0), two = E.create(0); E.act(one, r(17)); assert.equal(two.tiles[17].revealed, false); assert.throws(() => E.create(99), RangeError);
});
check('invalid and selection-like actions never spend resources, turn or mill progress', () => {
    const state = E.create(0);
    [null, {}, { type: 'select', id: 22 }, r(-1), r(25), r(1.5), r(0), r(16), r(22), b(22, 'mill'), b(17, 'mill'), b(21, 'bad'), n(22), a(12)].forEach(action => rejected(state, action));
});
check('forest harvest only once; enemies reveal without ownership; camp/forest cannot build', () => {
    const state = E.create(0); const gain = E.act(state, r(17)); assert.equal(gain.harvested, 3); assert.equal(state.wood, 5); assert.equal(state.tiles[17].owned, true); rejected(state, r(17)); rejected(state, b(17, 'mill'));
    E.act(state, r(12)); assert.equal(state.tiles[12].owned, false); assert.equal(E.adjacent(state, 7), false); rejected(state, r(7)); rejected(state, a(12)); rejected(state, b(12, 'barracks'));
});
check('build costs, single building occupancy, recruitment costs and troop consumption', () => {
    const state = E.create(0); E.act(state, r(21)); rejected(state, b(21, 'barracks')); E.act(state, r(17)); E.act(state, b(21, 'barracks')); assert.equal(state.wood, 2); rejected(state, b(21, 'mill')); E.act(state, n(21)); assert.equal(state.wood, 0); assert.equal(state.troops, 2); rejected(state, n(21)); E.act(state, r(12)); E.act(state, a(12)); assert.equal(state.troops, 0); assert.equal(state.captured, 1); assert.equal(state.tiles[12].owned, true);
});
check('mill excludes its construction turn, uses only valid actions, and clocks are independent', () => {
    E.configure([{ camp: 12, wood: 30, troops: 10, budget: 30, forests: { 7: 4 }, outposts: { 0: 2 } }]);
    try {
        const state = E.create(0); E.act(state, r(11)); E.act(state, b(11, 'mill')); assert.equal(state.tiles[11].age, 0); assert.equal(state.wood, 28);
        E.act(state, r(13)); assert.equal(state.tiles[11].age, 1); E.act(state, b(13, 'mill')); assert.equal(state.tiles[11].age, 2); assert.equal(state.tiles[13].age, 0);
        const result = E.act(state, r(7)); assert.equal(result.produced, 1); assert.deepEqual(result.producers, [11]); assert.equal(result.harvested, 4); assert.equal(state.tiles[11].age, 0); assert.equal(state.tiles[13].age, 1); assert.equal(state.wood, 31); rejected(state, r(7)); rejected(state, b(7, 'mill'));
        E.act(state, r(2)); const next = E.act(state, r(1)); assert.deepEqual(next.producers, [13]); assert.equal(state.tiles[11].age, 2);
    } finally { E.configure(levels); }
});
check('all six authored victory certificates replay legally with nonnegative resources', () => {
    levels.forEach((level, i) => { const state = E.create(i); const solution = E.solution(i); for (const [j, action] of solution.entries()) { const before = state.actions; assert.ok(E.available(state).some(candidate => JSON.stringify(candidate) === JSON.stringify(action)), 'Certificate action is offered by available()'); const result = E.act(state, action); assert.equal(result.ok, true, `Level ${i + 1}, step ${j + 1}`); assert.equal(state.actions, before + 1); assert.ok(state.wood >= 0 && state.troops >= 0); }
        assert.equal(state.status, 'won'); assert.equal(state.captured, state.target); assert.equal(state.actions, level.solution.length); assert.equal(E.replay(i).state.status, 'won'); console.log(`  level ${i + 1} ${level.name}: ${state.actions}/${state.budget} actions, wood ${state.wood}, troops ${state.troops}`);
    });
});
check('last-action capture wins before action-exhaustion; terminal states reject every action', () => {
    const state = E.replay(3).state; assert.equal(state.actions, state.budget); assert.equal(state.status, 'won'); assert.equal(state.endReason, 'captured'); rejected(state, r(0)); rejected(state, a(7)); assert.deepEqual(E.available(state), []);
    const lost = E.create(0); while (lost.status === 'playing') E.act(lost, E.available(lost).find(x => x.type === 'reveal')); assert.equal(lost.status, 'lost'); assert.equal(lost.endReason, 'budget'); rejected(lost, r(0)); assert.deepEqual(E.available(lost), []);
});
check('no legal action is an explicit deadlock loss even with remaining action budget', () => {
    const state = E.create(5); state.wood = 0; state.troops = 0; state.tiles.forEach(tile => Object.assign(tile, { terrain: 'forest', revealed: true, owned: true, building: null, wood: 0 }));
    Object.assign(state.tiles[0], { terrain: 'outpost', owned: false, guard: 99 }); Object.assign(state.tiles[24], { terrain: 'plain', revealed: false, owned: false });
    assert.deepEqual(E.available(state), [r(24)]); E.act(state, r(24)); assert.equal(state.status, 'lost'); assert.equal(state.endReason, 'blocked'); assert.ok(state.actions < state.budget); assert.deepEqual(E.available(state), []);
});
check('investment and routing matter: mandatory production, alternate route, late-investment trap', () => {
    assert.equal(Object.keys(levels[1].forests).length, 0); assert.ok(levels[1].wood < E.COSTS.barracks + 3 * E.COSTS.recruit, 'Level 2 cannot win without production'); assert.ok(E.replay(1).results.reduce((sum, result) => sum + result.produced, 0) >= 4);
    const alternate = [r(17), r(12), r(7), r(2), r(11), r(10), r(21), b(21, 'barracks'), n(21), n(21), n(21), n(21), a(2)]; const viaWoods = E.replay(4, alternate); assert.equal(viaWoods.state.status, 'won'); assert.equal(viaWoods.state.actions, 13); assert.equal(viaWoods.state.wood, 1);
    const late = E.replay(4, alternate.slice(0, 11).concat(b(11, 'mill'))).state; assert.equal(late.actions, 12); assert.equal(late.wood, 1); assert.equal(late.troops, 6); rejected(late, n(21)); E.act(late, r(6)); E.act(late, r(1)); assert.equal(late.status, 'lost');
    // A two-step side trip cannot fit the exact-budget chokepoint certificate.
    const detour = E.replay(3, [r(23), r(24)].concat(E.solution(3))); assert.equal(detour.state.status, 'lost'); assert.ok(detour.state.captured < detour.state.target);
});
check('deterministic random legal play cannot trivialize the maps', () => {
    let seed = 0x41ab; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < levels.length; i++) { let wins = 0; for (let run = 0; run < 250; run++) { const state = E.create(i); while (state.status === 'playing') { const choices = E.available(state); assert.ok(choices.length); E.act(state, choices[Math.floor(random() * choices.length)]); } if (state.status === 'won') wins++; } assert.ok(wins < 25, 'Random legal actions should rarely win'); console.log(`  level ${i + 1}: ${wins}/250 random wins`); }
});
check('current-run save replays legal actions, rejects corruption and never trusts fabricated resources', () => {
    for (let i = 0; i < levels.length; i++) {
        const state = E.replay(i, E.solution(i).slice(0, 4)).state;
        assert.deepEqual(E.restore(JSON.stringify(E.save(state))), state);
        const data = E.save(state); data.wood = 999; assert.equal(E.restore(data).wood, state.wood);
        data.history = data.history.concat({type:'recruit',id:0}); assert.equal(E.restore(data), null);
        assert.deepEqual(E.restore(E.save(E.replay(i).state)), E.replay(i).state);
    }
    ['{}','{bad',null,{v:1,index:99,history:[]},{v:1,index:0,history:Array(50).fill({type:'reveal',id:1})}].forEach(raw=>assert.equal(E.restore(raw),null));
});
console.log(`tile-frontier engine: ${checks} groups passed`);
