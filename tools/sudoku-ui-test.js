#!/usr/bin/env node
'use strict';

// Run: npm ci && node tools/sudoku-ui-test.js
// Or set HAPPY_DOM_PATH to an existing happy-dom package directory.
// Executes the actual gameplay script and shared fullscreen controller. Only the
// test copy exposes state and runs the DOM-ready callback directly. Happy DOM
// validates DOM/events and CSS contracts, not browser geometry or touch hitboxes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'game/sudoku.html'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'css/sudoku.css'), 'utf8');
const sharedCSS = fs.readFileSync(path.join(root, 'css/game-view.css'), 'utf8');
const viewSource = fs.readFileSync(path.join(root, 'js/game-view.js'), 'utf8');
const gameplay = [...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).find(source => source.includes('let Sudoku ='));
assert.ok(gameplay, 'gameplay script exists');
const instrumented = gameplay
    .replace("document.addEventListener('DOMContentLoaded', () => {", '(() => {')
    .replace('            // 初始化游戏\n', '            globalThis.__sudokuTest = { state: Sudoku, updateBoardUI };\n            // 初始化游戏\n')
    .replace(/\}\);\s*$/, '})();');
let checks = 0;
let failed = 0;
const clone = value => JSON.parse(JSON.stringify(value));
function seeded(seed) {
    return () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}
async function test(name, fn) {
    try { await fn(); checks++; console.log('ok - ' + name); }
    catch (error) { failed++; console.error('not ok - ' + name + '\n' + error.stack); }
}

async function main() {
    let dependency = process.env.HAPPY_DOM_PATH;
    try {
        if (!dependency) dependency = require.resolve('happy-dom');
        else if (fs.statSync(dependency).isDirectory()) dependency = path.join(dependency, 'lib/index.js');
    } catch (_) {
        throw new Error('Run npm ci, or set HAPPY_DOM_PATH to an existing happy-dom package directory.');
    }
    const { Window } = await import(pathToFileURL(path.resolve(dependency)).href);
    const windows = [];
    function setup(width = 1440, height = 900) {
        const window = new Window({ url: 'https://example.test/game/sudoku.html', width, height,
            settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
        windows.push(window);
        const document = window.document;
        document.write(page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
        const style = document.createElement('style');
        style.textContent = sharedCSS + '\n' + theme;
        document.head.appendChild(style);
        let nextTimer = 0;
        const intervals = new Map();
        const timeouts = new Map();
        window.setInterval = fn => { intervals.set(++nextTimer, fn); return nextTimer; };
        window.clearInterval = id => intervals.delete(id);
        window.setTimeout = (fn, delay) => { timeouts.set(++nextTimer, { fn, delay }); return nextTimer; };
        window.clearTimeout = id => timeouts.delete(id);
        window.Math.random = seeded(42);
        window.eval(instrumented);
        window.eval(viewSource);
        const state = window.__sudokuTest.state;
        const view = document.querySelector('[data-game-view]');
        const fullscreen = view.querySelector('[data-game-fullscreen]');
        const find = id => document.getElementById(id);
        const cell = (row, col) => find('sudoku-board').querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const key = value => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true }));
        const empty = () => {
            for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
                if (!state.original[row][col]) return { row, col };
            }
            throw Error('Expected editable cell');
        };
        const snapshot = () => clone({ board: state.board, original: state.original, solution: state.solution,
            selectedCell: state.selectedCell, difficulty: state.difficulty, hintCount: state.hintCount,
            hintsEnabled: state.hintsEnabled, elapsedTime: state.elapsedTime, gameStarted: state.gameStarted,
            startTime: state.startTime, timerInterval: state.timerInterval });
        return { window, document, state, view, fullscreen, find, cell, key, empty, snapshot, intervals, timeouts };
    }
    try {
        const game = setup();
        const { document, state, find, cell, key, empty, view, fullscreen, snapshot } = game;
        await test('initial board and every existing control are present', () => {
            assert.equal(find('sudoku-board').children.length, 81);
            assert.equal(state.original.flat().filter(value => !value).length, 30);
            assert.equal(document.querySelectorAll('.num-btn').length, 9);
            ['clear-btn', 'new-game', 'check-solution', 'toggle-hints', 'give-hint', 'easy', 'medium', 'hard',
                'show-rules', 'close-rules', 'close-rules-btn', 'new-game-after-win', 'close-celebration'].forEach(id => assert.ok(find(id), id));
            assert.ok(view.contains(find('rules-modal')) && view.contains(find('celebration-modal')), 'modals remain inside the fullscreen subtree');
        });
        await test('touch keypad enters a value and clear removes it', () => {
            const { row, col } = empty();
            cell(row, col).click();
            const wrong = state.solution[row][col] % 9 + 1;
            document.querySelectorAll('.num-btn')[wrong - 1].click();
            assert.equal(state.board[row][col], wrong);
            assert.equal(cell(row, col).querySelector('.cell-value').textContent, String(wrong));
            assert.ok(cell(row, col).classList.contains('cell-conflict'));
            find('clear-btn').click();
            assert.equal(state.board[row][col], 0);
            assert.equal(cell(row, col).querySelector('.cell-value').textContent, '');
            assert.ok(!cell(row, col).classList.contains('cell-conflict'));
        });
        await test('keyboard input, deletion, and correct-entry advance are preserved', () => {
            const { row, col } = empty();
            cell(row, col).click();
            key(String(state.solution[row][col]));
            assert.equal(state.board[row][col], state.solution[row][col]);
            assert.notDeepEqual(clone(state.selectedCell), { row, col });
            cell(row, col).click();
            key('Backspace');
            assert.equal(state.board[row][col], 0);
            key(String(state.solution[row][col] % 9 + 1));
            key('Delete');
            assert.equal(state.board[row][col], 0);
        });
        await test('original clues cannot be selected for overwrite', () => {
            find('new-game').click();
            const index = state.original.flat().findIndex(Boolean);
            const row = Math.floor(index / 9), col = index % 9;
            const value = state.original[row][col];
            cell(row, col).click();
            assert.equal(state.selectedCell, null);
            key(String(value % 9 + 1));
            find('clear-btn').click();
            assert.equal(state.board[row][col], value);
        });
        await test('check-answer keeps incomplete and error feedback', () => {
            const { row, col } = empty();
            cell(row, col).click();
            key(String(state.solution[row][col] % 9 + 1));
            find('check-solution').click();
            assert.ok(cell(row, col).classList.contains('bg-error'));
            assert.match(find('status-message').textContent, /尚未完成/);
            find('clear-btn').click();
        });
        await test('candidate toggle hides and restores all empty-cell hints', () => {
            find('toggle-hints').click();
            assert.equal(state.hintsEnabled, false);
            assert.ok([...document.querySelectorAll('.cell-hints')].every(element => element.style.display === 'none'));
            find('toggle-hints').click();
            assert.equal(state.hintsEnabled, true);
            const { row, col } = empty();
            assert.equal(cell(row, col).querySelector('.cell-hints').style.display, 'grid');
            assert.ok(find('toggle-hints').classList.contains('bg-gold/40'));
        });
        await test('hint button and H shortcut still fill a correct cell', () => {
            const before = state.board.flat().filter(Boolean).length;
            find('give-hint').click();
            assert.equal(state.hintCount, 1);
            assert.equal(state.board.flat().filter(Boolean).length, before + 1);
            const selected = state.selectedCell;
            assert.equal(state.board[selected.row][selected.col], state.solution[selected.row][selected.col]);
            key('H');
            assert.equal(state.hintCount, 2);
        });
        await test('new game resets timer, selection, hints used, and entries', () => {
            state.elapsedTime = 27;
            find('new-game').click();
            assert.equal(state.gameStarted, false);
            assert.equal(state.selectedCell, null);
            assert.equal(state.elapsedTime, 0);
            assert.equal(state.hintCount, 0);
            assert.equal(game.intervals.size, 0);
            assert.equal(find('time-value').textContent, '00:00');
            assert.deepEqual(clone(state.board), clone(state.original));
        });
        await test('difficulty buttons preserve their existing clue counts', () => {
            for (const [difficulty, removed] of [['hard', 50], ['medium', 40], ['easy', 30]]) {
                find(difficulty).click();
                assert.equal(state.difficulty, difficulty);
                assert.equal(state.original.flat().filter(value => !value).length, removed);
                assert.ok(find(difficulty).classList.contains('active'));
                assert.deepEqual(clone(state.board), clone(state.original));
            }
        });
        await test('rules dialog can open and close repeatedly', () => {
            for (const close of ['close-rules', 'close-rules-btn']) {
                find('show-rules').click();
                assert.ok(!find('rules-modal').classList.contains('pointer-events-none'));
                find(close).click();
                assert.ok(find('rules-modal').classList.contains('pointer-events-none'));
            }
        });
        await test('fallback fullscreen and repeated exit retain the same running puzzle', () => {
            const { row, col } = empty();
            cell(row, col).click();
            key(String(state.solution[row][col] % 9 + 1));
            state.elapsedTime = 37;
            const before = snapshot();
            const boardNode = find('sudoku-board');
            const events = [];
            view.addEventListener('gameviewchange', event => events.push(clone(event.detail)));
            for (let repeat = 0; repeat < 2; repeat++) {
                fullscreen.click();
                assert.ok(view.classList.contains('is-expanded'));
                assert.equal(fullscreen.getAttribute('aria-pressed'), 'true');
                assert.equal(find('sudoku-board'), boardNode);
                assert.deepEqual(snapshot(), before);
                if (repeat) key('Escape'); else fullscreen.click();
                assert.ok(!view.classList.contains('is-expanded'));
                assert.deepEqual(snapshot(), before);
            }
            assert.deepEqual(events.map(event => event.expanded), [true, false, true, false]);
            assert.equal(document.activeElement, fullscreen);
            assert.ok(!document.body.classList.contains('game-view-open'));
        });
        await test('resize and orientation events preserve state and the selected cell node', () => {
            const before = snapshot();
            const selected = cell(state.selectedCell.row, state.selectedCell.col);
            for (const [width, height] of [[390, 844], [844, 390], [1920, 1080]]) {
                game.window.happyDOM.setWindowSize({ width, height });
                game.window.dispatchEvent(new game.window.Event('resize'));
                game.window.dispatchEvent(new game.window.Event('orientationchange'));
                assert.deepEqual(snapshot(), before);
                assert.equal(cell(state.selectedCell.row, state.selectedCell.col), selected);
            }
        });
        await test('native fullscreen enter, browser exit, and rejected API preserve state', async () => {
            let active = null;
            Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => active });
            Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
            view.requestFullscreen = () => {
                active = view;
                document.dispatchEvent(new game.window.Event('fullscreenchange'));
                return Promise.resolve();
            };
            document.exitFullscreen = () => {
                active = null;
                document.dispatchEvent(new game.window.Event('fullscreenchange'));
                return Promise.resolve();
            };
            const before = snapshot();
            fullscreen.click(); await Promise.resolve();
            assert.equal(document.fullscreenElement, view);
            assert.match(fullscreen.textContent, /退出全屏/);
            fullscreen.click(); await Promise.resolve();
            assert.ok(!view.classList.contains('is-expanded'));
            fullscreen.click(); await Promise.resolve();
            active = null;
            document.dispatchEvent(new game.window.Event('fullscreenchange'));
            assert.ok(!view.classList.contains('is-expanded'));
            view.requestFullscreen = () => Promise.reject(new Error('Fullscreen is unsupported'));
            fullscreen.click(); await Promise.resolve();
            assert.ok(view.classList.contains('is-expanded'));
            assert.match(fullscreen.textContent, /退出铺满/);
            key('Escape');
            assert.ok(!view.classList.contains('is-expanded'));
            assert.deepEqual(snapshot(), before);
        });
        await test('completion modal and play-again preserve the existing restart flow', () => {
            state.board = clone(state.solution);
            state.gameStarted = true;
            game.window.__sudokuTest.updateBoardUI();
            find('check-solution').click();
            for (const timer of game.timeouts.values()) if (timer.delay === 1500) timer.fn();
            assert.ok(!find('celebration-modal').classList.contains('pointer-events-none'));
            find('new-game-after-win').click();
            assert.ok(find('celebration-modal').classList.contains('pointer-events-none'));
            assert.equal(state.gameStarted, false);
            assert.equal(state.selectedCell, null);
            assert.equal(state.hintCount, 0);
            assert.deepEqual(clone(state.board), clone(state.original));
        });
        await test('responsive markup has no desktop-hidden keypad or fixed 500px board', () => {
            assert.ok(!document.querySelector('.sudoku-keypad').classList.contains('md:hidden'));
            assert.ok(!find('clear-btn').closest('.md\\:hidden'));
            assert.ok(!page.includes('w-[min(90vw,500px)]'));
            assert.match(page, /viewport-fit=cover/);
            assert.match(theme, /--game-toolbar-bg:\s*#1a1409/);
            assert.match(theme, /aspect-ratio:\s*1/);
            assert.match(theme, /grid-template-columns:\s*repeat\(9, minmax\(0, 1fr\)\)/);
            assert.match(theme, /min-height:\s*44px/);
            assert.match(theme, /env\(safe-area-inset-left\)/);
            assert.match(theme, /100dvh/);
            assert.match(theme, /prefers-reduced-motion:\s*reduce/);
        });
        await test('puzzle values, candidates, and touch digits use aligned numeral typography', () => {
            for (const selector of ['#sudoku-board .cell-value', '#sudoku-board .cell-hints',
                '#sudoku-board .hint-number', '.sudoku-keypad .num-btn']) {
                const computed = game.window.getComputedStyle(document.querySelector(selector));
                assert.equal(computed.fontFamily, 'Arial, Helvetica, sans-serif', selector);
                assert.equal(computed.fontVariantNumeric, 'lining-nums tabular-nums', selector);
                assert.equal(computed.fontFeatureSettings, '"lnum" 1, "tnum" 1', selector);
                assert.equal(computed.lineHeight, '1', selector);
            }
            assert.ok(!game.window.getComputedStyle(document.querySelector('.sudoku-title h1')).fontFamily.includes('Arial'), 'title keeps its theme font');
        });
        await test('portrait and landscape CSS choose accessible keypad/control layouts', () => {
            const style = element => game.window.getComputedStyle(element);
            for (const [width, height, shortLandscape] of [[320, 568, false], [390, 844, false], [768, 1024, false],
                [568, 320, true], [667, 375, true], [844, 390, true], [1440, 900, false], [1920, 1080, false]]) {
                game.window.happyDOM.setWindowSize({ width, height });
                // Happy DOM's computed-style cache needs a DOM mutation after viewport changes.
                view.setAttribute('data-test-viewport', `${width}x${height}`);
                const controls = document.querySelector('.sudoku-controls');
                assert.equal(style(document.querySelector('.sudoku-keypad')).display, 'grid', `${width}x${height}: keypad remains present`);
                assert.equal(style(controls).display, 'grid', `${width}x${height}: controls remain present`);
                assert.ok(style(find('clear-btn')).display !== 'none');
                assert.ok(style(document.querySelector('.sudoku-layout')).gridTemplateColumns, 'explicit responsive grid');
                if (shortLandscape) {
                    assert.equal(style(controls).overflowY, 'auto', `${width}x${height}: controls can scroll`);
                    assert.equal(style(controls).overscrollBehavior, 'contain');
                }
            }
            assert.match(theme, /minmax\(252px, min\(var\(--sudoku-short-height\), 54%\)\)/, 'short landscape reserves a readable board');
            assert.match(theme, /max-width:\s*619px[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/, 'narrow landscape keeps number targets wide');
            assert.match(theme, /\.sudoku-modal\s*>\s*div\s*\{[\s\S]*?max-height:[\s\S]*?overflow-y:\s*auto/, 'short-screen dialogs scroll');
        });
    } finally {
        await Promise.all(windows.map(window => window.happyDOM.close()));
    }
    console.log(`\nSudoku: ${checks} passed; ${failed} failed. Browser geometry is not covered by this DOM test.`);
    if (failed) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
