'use strict';
const assert = require('node:assert/strict');
const E = require('../game/js/sum-ten-engine.js');
function random(seed) { return function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function board(entries) { const b = Array(48).fill(0); for (const [id, value] of entries) b[id] = value; return b; }
const p = id => ({ row: Math.floor(id / 6), col: id % 6 });
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
check('ready state never starts time; start uses an absolute 90 second deadline', () => {
    const s = E.create(E.generate(random(3))); assert.equal(s.status, 'ready'); assert.equal(s.deadline, null); assert.equal(E.remaining(s, 1000000), 90000); assert.equal(E.settle(s, 9999999), s);
    const started = E.start(s, 1234); assert.equal(started.deadline, 91234); assert.equal(E.remaining(started, 2234), 89000); assert.equal(s.deadline, null); assert.equal(E.start(started, 5000), started);
});
check('all four rectangle drag directions return the same ten and points', () => {
    const b = board([[7, 1], [8, 2], [13, 3], [14, 4], [40, 9], [41, 1]]);
    for (const [a, z] of [[7, 14], [14, 7], [8, 13], [13, 8]]) {
        const s = E.start(E.create(b), 0), out = E.select(s, p(a), p(z), 10);
        assert.equal(out.accepted, true); assert.equal(out.rectangle.sum, 10); assert.deepEqual(out.removed, [7, 8, 13, 14]); assert.equal(out.state.score, 4); assert.equal(out.state.board[40], 9); assert.equal(s.board[7], 1); assert.equal(out.state.status, 'playing');
    }
});
check('holes count as zero; all nonempty cells in a larger box are removed once', () => {
    const b = board([[0, 2], [2, 3], [12, 5], [40, 1], [41, 9]]), s = E.start(E.create(b), 10), out = E.select(s, p(0), p(14), 50);
    assert.equal(out.rectangle.cells.length, 9); assert.equal(out.rectangle.sum, 10); assert.deepEqual(out.removed, [0, 2, 12]); assert.equal(out.state.score, 3); assert.equal(out.state.board.filter(Boolean).length, 2);
    const again = E.select(out.state, p(0), p(14), 60); assert.equal(again.accepted, false); assert.equal(again.state.score, 3);
});
check('invalid totals and corners never change board, score or deadline', () => {
    const s = E.start(E.create(E.generate(random(9))), 300);
    for (const [a, z] of [[p(0), p(0)], [{ row: -1, col: 0 }, p(2)], [null, p(0)], [{ row: 1.5, col: 0 }, p(3)]]) { const out = E.select(s, a, z, 301); assert.equal(out.accepted, false); assert.equal(out.state, s); }
    assert.throws(() => E.create([1]), /48/); assert.throws(() => E.create(Array(48).fill(10)), /48/); assert.throws(() => E.start(E.create(), NaN), /timestamp/);
});
check('1,000 seeded boards contain only 1–9 and at least 24 legal opening rectangles', () => {
    for (let seed = 0; seed < 1000; seed++) { const b = E.generate(random(seed)); assert.equal(b.length, 48); assert.ok(b.every(n => n >= 1 && n <= 9)); assert.ok(E.legalRectangles(b).length >= 24); }
    assert.ok(E.legalRectangles(E.generate(() => 0)).length >= 24); assert.ok(E.legalRectangles(E.generate(() => 1)).length >= 24);
});
check('120 complete generated boards can be cleared via their initial disjoint pairs', () => {
    for (let seed = 1; seed <= 120; seed++) {
        const b = E.generate(random(seed)), pairs = [];
        for (let r = 0; r < 8; r += 2) for (let c = 0; c < 6; c += 2) { const i = r * 6 + c; if (b[i] + b[i + 1] === 10 && b[i + 6] + b[i + 7] === 10) pairs.push([i, i + 1], [i + 6, i + 7]); else pairs.push([i, i + 6], [i + 1, i + 7]); }
        let s = E.start(E.create(b), 0);
        pairs.forEach(([a, z], i) => { const out = E.select(s, p(a), p(z), 100 + i); assert.equal(out.accepted, true); s = out.state; });
        assert.equal(s.status, 'finished'); assert.equal(s.reason, 'cleared'); assert.equal(s.score, 48); assert.ok(s.board.every(n => !n));
    }
});
check('prefix-sum legal finder agrees with exhaustive rectangles including holes', () => {
    const rng = random(80);
    for (let sample = 0; sample < 50; sample++) {
        const b = Array.from({ length: 48 }, () => rng() < .5 ? 0 : 1 + Math.floor(rng() * 9)), direct = [];
        for (let t = 0; t < 8; t++) for (let z = t; z < 8; z++) for (let l = 0; l < 6; l++) for (let r = l; r < 6; r++) if (E.rectangle(b, { row: t, col: l }, { row: z, col: r }).sum === 10) direct.push({ from: { row: t, col: l }, to: { row: z, col: r } });
        assert.deepEqual(E.legalRectangles(b), direct); assert.equal(E.legalRectangles(b, 1).length, direct.length ? 1 : 0);
    }
});
check('no legal rectangle ends immediately, with correct remaining time and reason', () => {
    const s = E.start(E.create(board([[0, 9]])), 30); assert.equal(s.status, 'finished'); assert.equal(s.reason, 'no-moves'); assert.equal(E.remaining(s, 900000), 90000);
    const playing = E.start(E.create(board([[0, 4], [1, 6], [47, 9]])), 0); const out = E.select(playing, p(0), p(1), 123); assert.equal(out.state.status, 'finished'); assert.equal(out.state.reason, 'no-moves'); assert.equal(out.state.score, 2); assert.equal(E.remaining(out.state, 50000), 89877);
});
check('release before deadline scores, at and after deadline cannot score', () => {
    const b = board([[0, 4], [1, 6], [40, 1], [41, 9]]), s = E.start(E.create(b), 500);
    assert.equal(E.select(s, p(0), p(1), 90499.999).accepted, true);
    for (const time of [90500, 90500.001, 500000]) { const out = E.select(s, p(0), p(1), time); assert.equal(out.accepted, false); assert.equal(out.state.score, 0); assert.equal(out.state.reason, 'time'); assert.equal(out.state.board[0], 4); assert.equal(E.remaining(out.state, time), 0); }
    const asleep = E.settle(s, 1000000); assert.equal(asleep.reason, 'time'); assert.equal(asleep.endedAt, 90500);
});
check('portrait and landscape transpose mappings are bijective for all 48 cells', () => {
    for (let id = 0; id < 48; id++) for (const land of [false, true]) { const q = E.visual(p(id), land); assert.ok(q.row < (land ? 6 : 8)); assert.ok(q.col < (land ? 8 : 6)); assert.deepEqual(E.logical(q, land), p(id)); }
});
console.log(`sum-ten engine: ${checks} test groups passed.`);
