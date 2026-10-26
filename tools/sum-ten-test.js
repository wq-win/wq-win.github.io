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
check('1,000 mixed boards are full, diverse, replay-solvable and cannot be cleared as pairs', () => {
    const distinct = new Set(), shapes = new Set(), structuralShapes = new Set(); let minOpening = Infinity, maxOpening = 0, minMulti = Infinity, minGaps = Infinity, maxPairs = 0;
    for (let seed = 0; seed < 1000; seed++) {
        const puzzle = E.generatePuzzle(random(seed)), b = puzzle.board, total = b.reduce((a, n) => a + n, 0);
        assert.equal(b.length, 48); assert.ok(b.every(n => Number.isInteger(n) && n >= 1 && n <= 9));
        assert.ok(total >= 140 && total <= 170); assert.equal(total % 10, 0); assert.equal(puzzle.path.length, total / 10);
        // Any full clear takes total/10 moves. Fewer than 24 moves for 48 cells
        // proves that pairs alone cannot solve it, independently of the witness.
        assert.ok(total / 10 < 24);
        const opening = E.legalRectangles(b); assert.ok(opening.length >= 5); assert.ok(opening.length <= 24);
        minOpening = Math.min(minOpening, opening.length); maxOpening = Math.max(maxOpening, opening.length);
        maxPairs = Math.max(maxPairs, opening.filter(m => E.rectangle(b, m.from, m.to).filled.length === 2).length);
        const adjacent = id => [id % 6 ? id - 1 : -1, id % 6 < 5 ? id + 1 : -1, id >= 6 ? id - 6 : -1, id < 42 ? id + 6 : -1].filter(id => id >= 0);
        // This nine has no dense rectangle summing to ten. It MUST eventually
        // cross a cleared cell, whichever solution a player finds.
        assert.ok(b.some((n, id) => n === 9 && adjacent(id).every(j => b[j] >= 2)), 'mandatory gap witness');
        let state = E.start(E.create(b), 0), multi = 0, gaps = 0;
        const groups = [];
        for (const [step, move] of puzzle.path.entries()) {
            const box = E.rectangle(state.board, move.from, move.to), before = state.board.slice();
            assert.equal(box.sum, 10); assert.ok(box.filled.length >= 2);
            multi += box.filled.length > 2; gaps += box.cells.length > box.filled.length; groups.push(box.filled.join('.'));
            const out = E.select(state, move.from, move.to, 100 + step);
            assert.equal(out.accepted, true); assert.deepEqual(state.board, before, 'select is immutable'); state = out.state;
        }
        assert.ok(multi >= 8); assert.ok(gaps >= 6); minMulti = Math.min(minMulti, multi); minGaps = Math.min(minGaps, gaps);
        assert.equal(state.status, 'finished'); assert.equal(state.reason, 'cleared'); assert.equal(state.score, 48); assert.ok(state.board.every(n => !n));
        let greedy = b.slice();
        for (;;) {
            const pair = E.legalRectangles(greedy).map(m => E.rectangle(greedy, m.from, m.to)).find(box => box.filled.length === 2);
            if (!pair) break; pair.filled.forEach(id => { greedy[id] = 0; });
        }
        assert.ok(greedy.filter(Boolean).length >= 14, 'even unrestricted pair-only greedy must leave at least 14 cells');
        distinct.add(b.join(',')); shapes.add(groups.join('/'));
        const reflections = [0, 1, 2, 3].map(flip => groups.map(group => group.split('.').map(Number).map(id => {
            const r = Math.floor(id / 6), c = id % 6;
            return ((flip & 1) ? 7 - r : r) * 6 + ((flip & 2) ? 5 - c : c);
        }).sort((a, b) => a - b).join('.')).sort().join('/'));
        structuralShapes.add(reflections.sort()[0]);
        assert.deepEqual(E.generate(random(seed)), b, 'generate preserves its array API and deterministic injection');
    }
    assert.ok(distinct.size >= 990, `only ${distinct.size} distinct numeric boards`);
    assert.ok(structuralShapes.size >= 30, 'sampled partitions must differ structurally, not just by reflection or label');
    assert.ok(shapes.size >= 100, `only ${shapes.size} different removal layouts, including reflections`);
    console.log(`Challenge metrics: ${distinct.size}/1000 unique boards, ${structuralShapes.size} structural layouts (${shapes.size} reflected variants), ${minOpening}–${maxOpening} opening rectangles, at most ${maxPairs} opening pairs, witness minima ${minMulti} multi-number and ${minGaps} true gap clears; pair-only clear rate 0%.`);
});
check('constant RNGs terminate and still produce a complete legal certificate', () => {
    for (const value of [0, .5, 1]) {
        const { board: initial, path } = E.generatePuzzle(() => value), b = initial.slice();
        for (const move of path) { const box = E.rectangle(b, move.from, move.to); assert.ok(box.valid); box.filled.forEach(id => { b[id] = 0; }); }
        assert.ok(b.every(n => n === 0)); assert.ok(initial.every(n => n > 0));
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
