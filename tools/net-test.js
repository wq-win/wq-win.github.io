#!/usr/bin/env node
'use strict';
// Dependency-free model + minimal DOM event regressions. Browser layout is tested separately.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../js/net-engine.js');
let count = 0;
function test(name, fn) { fn(); count++; console.log(`✓ ${name}`); }
const same = (a, b) => assert.deepEqual(Array.from(a), Array.from(b));

test('All 16 tile masks rotate correctly in either direction', () => {
    for (let m = 0; m < 16; m++) { assert.equal(E.rotate(m, 4), m); assert.equal(E.rotate(E.rotate(m), -1), m); assert.equal(E.degree(E.rotate(m)), E.degree(m)); }
    assert.equal(E.rotate(1), 2); assert.equal(E.rotate(8), 1); assert.equal(E.rotate(3), 6); assert.equal(E.rotate(5), 10);
});
test('6,000 generated puzzles across all 20 levels are connected trees, solvable, and initially unsolved', () => {
    for (const size of E.LEVELS) for (let seed = 0; seed < 300; seed++) {
        const b = E.generateLevel(size.level, seed), solved = E.inspect(b.solution, size, b.source);
        assert(solved.solved, `${size}/${seed}`); assert.equal(solved.openEnds, 0); assert.equal(solved.powered.size, size.width * size.height);
        assert.equal(b.solution.reduce((sum, m) => sum + E.degree(m), 0), 2 * (size.width * size.height - 1));
        assert(b.solution.every(m => m > 0 && m < 16)); assert(solved.terminals.length > 0);
        assert(!E.inspect(b.initial, size, b.source).solved);
        b.initial.forEach((m, i) => assert([0, 1, 2, 3].some(t => E.rotate(m, t) === b.solution[i])));
        same(b.masks, b.initial); assert.notEqual(b.masks, b.initial);
    }
});
test('Seeds reproduce puzzles and unsupported sizes reject', () => { same(E.generate(5, 42).initial, E.generate(5, 42).initial); assert.throws(() => E.generate(4)); assert.throws(() => E.inspect([1], 5, 0)); });
test('Only reciprocal edges conduct, with no row wrapping or off-grid connections', () => {
    let masks = [2, 1, 0, 0]; assert.equal(E.inspect(masks, 2, 0).powered.size, 1);
    masks = [2, 8, 0, 0]; assert.equal(E.inspect(masks, 2, 0).powered.size, 2);
    masks = [0, 2, 8, 0]; assert.equal(E.inspect(masks, 2, 1).powered.size, 1); assert.equal(E.inspect(masks, 2, 1).openEnds, 2);
    assert.equal(E.neighbor(0, E.DIRS[0], 5), -1); assert.equal(E.neighbor(4, E.DIRS[1], 5), -1); assert.equal(E.neighbor(24, E.DIRS[2], 5), -1);
    masks = [6, 12, 3, 9]; assert(E.inspect(masks, 2, 0).solved); // Cycles are valid too: no unique-solution assumption.
    masks = [7, 12, 3, 9]; assert(!E.inspect(masks, 2, 0).solved); assert.equal(E.inspect(masks, 2, 0).powered.size, 4);
});
test('Hints calibrate exactly one mismatched tile, enforce budget, and reset preserves initial state', () => {
    for (let seed = 0; seed < 100; seed++) {
        const b = E.generate(5, seed), initial = b.initial.slice();
        for (let h = 0; h < 3; h++) { const before = b.masks.slice(), i = E.hint(b); assert(i >= 0); assert.notEqual(before[i], b.solution[i]); assert.equal(b.masks[i], b.solution[i]); assert.equal(before.filter((m, n) => m !== b.masks[n]).length, 1); }
        assert.equal(b.hintsLeft, 0); assert.equal(E.hint(b), -1);
        E.turn(b, 1); E.reset(b); same(b.masks, initial); same(b.initial, initial); assert.equal(b.moves, 0); assert.equal(b.hintsLeft, 0);
    }
});
test('Win detection, solved-state guard, and replay lifecycle', () => {
    const b = E.generate(5, 77); assert.equal(E.turn(b, -1), false); assert.equal(E.turn(b, 25), false);
    for (let i = 0; i < b.masks.length; i++) for (let j = 0; b.masks[i] !== b.solution[i] && j < 4; j++) E.turn(b, i);
    assert(E.inspect(b.masks, 5, b.source).solved); const moves = b.moves; assert.equal(E.turn(b, 0), false); assert.equal(E.hint(b), -1); assert.equal(b.moves, moves);
    E.reset(b); assert(!E.inspect(b.masks, 5, b.source).solved); assert(E.turn(b, 0));
});

test('20 level sizes strictly increase, are immutable, deterministic, and validate level input', () => {
    assert.equal(E.LEVELS.length, 20);
    let previous = 0;
    for (const config of E.LEVELS) {
        const cells = config.width * config.height;
        assert(cells > previous); previous = cells;
        assert(Object.isFrozen(config));
        same(E.generateLevel(config.level, 42).initial, E.generateLevel(config.level, 42).initial);
    }
    assert.equal(previous, 210);
    for (const invalid of [0, 21, -1, 1.5, NaN, '1']) assert.throws(() => E.generateLevel(invalid));
});
test('Every level resets correctly and advances only after solving; final level never overflows', () => {
    let board = E.generateLevel(1, 99);
    for (let level = 1; level <= 20; level++) {
        assert.equal(board.level, level);
        assert.equal(E.nextLevel(board, 100), null);
        const initial = board.initial.slice();
        E.hint(board); E.turn(board, 0); E.reset(board);
        same(board.masks, initial); assert.equal(board.moves, 0); assert.equal(board.hintsLeft, 2);
        board.masks = board.solution.slice();
        assert(E.inspect(board.masks, board, board.source).solved);
        assert.equal(E.turn(board, 0), false); assert.equal(E.hint(board), -1);
        const next = E.nextLevel(board, 99 + level);
        if (level === 20) assert.equal(next, null);
        else { assert(next.masks.length > board.masks.length); board = next; }
    }
});
test('Rectangular boundaries do not wrap and source is centrally placed', () => {
    for (const config of E.LEVELS) {
        const board = E.generateLevel(config.level, 1), { width, height } = board;
        assert.equal(board.source, Math.floor(height / 2) * width + Math.floor(width / 2));
        assert.equal(E.neighbor(width - 1, E.DIRS[1], board), -1);
        assert.equal(E.neighbor(width * (height - 1), E.DIRS[2], board), -1);
        assert.equal(E.neighbor(width * (height - 1), E.DIRS[0], board), width * (height - 2));
    }
});

class Element {
    constructor(id = '') { this.id = id; this.children = []; this.dataset = {}; this.attributes = {}; this.listeners = {}; this.style = { setProperty() {} }; this.value = '5'; this.hidden = false; this.disabled = false; }
    appendChild(el) { this.children.push(el); el.parent = this; return el; }
    replaceChildren() { this.children = []; }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
    contains(el) { return this.children.includes(el); }
    closest(selector) { return selector === '[data-index]' && this.dataset.index !== undefined ? this : null; }
    focus() { document.activeElement = this; if (this.parent) this.parent.dispatch('focusin', { target: this }); }
    dispatch(type, event = {}) { for (const fn of this.listeners[type] || []) fn({ target: this, preventDefault() {}, ...event }); }
}
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'game/net.html'), 'utf8');
const els = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], new Element(m[1])]));
const document = { getElementById: id => els[id], createElement: () => new Element(), activeElement: null };
let nextSeed = 20;
const window = { NetEngine: E, crypto: { getRandomValues(a) { a[0] = nextSeed++; return a; } } };
const uiSource = fs.readFileSync(path.join(root, 'js/net.js'), 'utf8');
const instrumented = uiSource.replace('    newBoard();\n}());', '    window.testNet = { getBoard: () => board, render, newBoard };\n    newBoard();\n}());');
vm.runInNewContext(instrumented, { window, document, Uint32Array, Math, Date });
const ui = window.testNet, grid = els['net-board'];
function clickCell(i) { grid.dispatch('click', { target: grid.children[i] }); }
function keyCell(i, key) { grid.dispatch('keydown', { target: grid.children[i], key }); }
test('UI renders all cells, counts, accessible labels, and a single roving tab stop', () => {
    assert.equal(grid.children.length, 25); assert.equal(grid.children.filter(el => el.tabIndex === 0).length, 1); assert.equal(els['cell-total'].textContent, 25);
    grid.children.forEach(el => assert.match(el.attributes['aria-label'], /管口朝/)); assert.match(grid.children[12].className, /source/);
});
test('Click rotates once, retains cell identity and focus, and native Enter does not double-rotate', () => {
    const cell = grid.children[0]; cell.focus(); const before = ui.getBoard().masks[0]; clickCell(0);
    assert.equal(ui.getBoard().masks[0], E.rotate(before)); assert.equal(ui.getBoard().moves, 1); assert.equal(grid.children[0], cell); assert.equal(document.activeElement, cell);
    keyCell(0, 'Enter'); assert.equal(ui.getBoard().moves, 1); clickCell(0); assert.equal(ui.getBoard().moves, 2);
    const current = ui.getBoard().masks[0]; keyCell(0, 'r'); assert.equal(ui.getBoard().masks[0], E.rotate(current, -1));
});
test('Arrow navigation respects board boundaries and maintains a single tab stop', () => {
    grid.children[0].focus(); keyCell(0, 'ArrowLeft'); assert.equal(document.activeElement, grid.children[0]);
    keyCell(0, 'ArrowRight'); assert.equal(document.activeElement, grid.children[1]); keyCell(1, 'ArrowDown'); assert.equal(document.activeElement, grid.children[6]);
    assert.equal(grid.children.filter(el => el.tabIndex === 0).length, 1);
});
test('UI hint focuses highlighted tile; reset restores exact starting masks without restoring hint budget', () => {
    els['hint-board'].dispatch('click'); assert.equal(ui.getBoard().hintsLeft, 2); assert.match(document.activeElement.className, /hinted/);
    els['reset-board'].dispatch('click'); same(ui.getBoard().masks, ui.getBoard().initial); assert.equal(ui.getBoard().hintsLeft, 2); assert.equal(ui.getBoard().moves, 0);
});
test('Repeated completion, replay, and difficulty change have no stale victory or focus state', () => {
    for (let round = 0; round < 5; round++) {
        ui.getBoard().masks = ui.getBoard().solution.slice(); ui.render(); assert.equal(els.victory.hidden, false); assert.equal(els['hint-board'].disabled, true); assert.match(els['net-status'].textContent, /万灯俱明/);
        const before = ui.getBoard().masks.slice(); clickCell(0); same(ui.getBoard().masks, before);
        els['play-again'].dispatch('click'); assert.equal(els.victory.hidden, true); assert.equal(ui.getBoard().hintsLeft, 3); assert.equal(document.activeElement, grid.children[ui.getBoard().source]);
    }
    els['board-level'].value = '5'; els['board-level'].dispatch('change'); assert.equal(grid.children.length, 49); assert.equal(grid.children.filter(el => el.tabIndex === 0).length, 1); assert.equal(els['cell-total'].textContent, 49);
    const oldSeed = ui.getBoard().seed; els['new-board'].dispatch('click'); assert.notEqual(ui.getBoard().seed, oldSeed); assert.equal(grid.children.length, 49);
});
test('UI progresses through all 20 levels, reveals next only on victory, and handles final completion', () => {
    els['board-level'].value = '1'; els['board-level'].dispatch('change');
    assert.equal(els['board-level'].children.length, 20);
    for (let level = 1; level <= 20; level++) {
        const board = ui.getBoard(), config = E.LEVELS[level - 1];
        assert.equal(board.level, level); assert.equal(grid.children.length, config.width * config.height);
        assert.equal(els['level-number'].textContent, level); assert.equal(els['board-level'].value, String(level));
        assert.equal(els['next-level'].hidden, true);
        els['next-level'].dispatch('click'); assert.equal(ui.getBoard(), board);
        grid.children[config.width - 1].focus(); keyCell(config.width - 1, 'ArrowRight');
        assert.equal(document.activeElement, grid.children[config.width - 1]);
        grid.children[0].focus(); keyCell(0, 'ArrowDown'); assert.equal(document.activeElement, grid.children[config.width]);
        board.masks = board.solution.slice(); ui.render();
        assert.equal(els['next-level'].hidden, level === 20);
        els['next-level'].dispatch('click');
        if (level < 20) { assert.equal(document.activeElement, grid.children[ui.getBoard().source]); assert.equal(els.victory.hidden, true); }
        else { assert.equal(ui.getBoard(), board); assert.match(els['victory-title'].textContent, /第二十关完成/); assert.match(els['net-status'].textContent, /最后一关/); }
    }
    els['play-again'].dispatch('click'); assert.equal(ui.getBoard().level, 20); assert.equal(els.victory.hidden, true);
    els['board-level'].value = '2'; els['board-level'].dispatch('change'); assert.equal(grid.children.length, 30);
    assert.match(grid.children[29].attributes['aria-label'], /第 6 行第 5 列/);
});
test('Large boards retain 44px touch targets and have a contained two-axis scroll region', () => {
    const css = fs.readFileSync(path.join(root, 'css/net.css'), 'utf8');
    assert(css.includes('minmax(44px,1fr)') && css.includes('min-height:44px'));
    assert(css.includes('overflow:auto') && css.includes('touch-action:pan-x pan-y'));
    assert(html.includes('id="board-scroll"') && html.includes('id="scroll-help"'));
    // Minimum board widths include tile, gap and padding on desktop and mobile.
    for (const level of E.LEVELS) for (const gap of [3, 5]) {
        const padding = gap === 3 ? 6 : 8;
        const width = level.width * (44 + gap) + 3;
        assert((width - padding - (level.width - 1) * gap) / level.width >= 44);
    }
});
test('Page uses only local assets and unchanged shared fullscreen contract', () => {
    assert(html.includes('data-game-view') && html.includes('data-game-fullscreen') && html.includes('data-game-view-status'));
    assert(html.includes('../js/game-view.js') && html.includes('../css/game-view.css')); assert(!/https?:\/\//.test(html));
    assert(!uiSource.includes('testNet')); assert(!html.includes('onclick='));
});
console.log(`\n${count} tests passed (including 6,000 seeded boards).`);
