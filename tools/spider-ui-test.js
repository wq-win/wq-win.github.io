#!/usr/bin/env node
'use strict';

// Dependency-free regression tests for the production Spider engine and event wiring.
// Run: node tools/spider-ui-test.js
// The engine is instrumented only inside this VM; no test API ships to users.
// The minimal DOM does not perform browser layout, CSS painting or pointer hit testing.
// Geometry checks below are explicitly source-derived arithmetic, not browser QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'game/spider.html'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js/spider.js'), 'utf8');
const viewSource = fs.readFileSync(path.join(root, 'js/game-view.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/spider.css'), 'utf8');
let passed = 0;
let failed = 0;
const tests = [];
const test = (name, body) => tests.push({ name, body });
const clone = value => JSON.parse(JSON.stringify(value));
function seeded(seed) {
    return function () {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}

class Element {
    constructor(tag = 'div') {
        this.tagName = tag.toUpperCase();
        this.children = [];
        this.parentNode = null;
        this.attributes = {};
        this.listeners = {};
        this.className = '';
        this.hidden = false;
        this.disabled = false;
        this._text = '';
        this.style = { setProperty(name, value) { this[name] = String(value); }, removeProperty(name) { delete this[name]; } };
        this.dataset = {};
        this.clientWidth = 800;
        this.offsetWidth = 800;
        this.clientHeight = 100;
        this.offsetHeight = 100;
        const self = this;
        this.classList = {
            contains(value) { return self.className.split(/\s+/).includes(value); },
            add(...values) { values.forEach(value => this.toggle(value, true)); },
            remove(...values) { values.forEach(value => this.toggle(value, false)); },
            toggle(value, force) {
                const names = self.className.split(/\s+/).filter(Boolean);
                const on = force === undefined ? !names.includes(value) : !!force;
                self.className = names.filter(name => name !== value).concat(on ? [value] : []).join(' ');
                return on;
            }
        };
    }
    get id() { return this.attributes.id || ''; }
    set id(value) { this.attributes.id = String(value); }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this._text = String(value); this.replaceChildren(); }
    get innerHTML() { return this._html || ''; }
    set innerHTML(value) {
        this._html = String(value);
        this._text = '';
        this.replaceChildren();
        parseHTML(this, String(value));
    }
    get childNodes() { return this.children; }
    get firstChild() { return this.children[0] || null; }
    get lastChild() { return this.children[this.children.length - 1] || null; }
    appendChild(child) {
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        child.ownerDocument = this.ownerDocument || (this.tagName === 'DOCUMENT' ? this : null);
        this.children.push(child);
        return child;
    }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; return child; }
    replaceChildren(...children) {
        this.children.forEach(child => { child.parentNode = null; });
        this.children = [];
        children.forEach(child => this.appendChild(child));
    }
    setAttribute(name, value) {
        this.attributes[name] = String(value);
        if (name === 'class') this.className = String(value);
        if (name === 'hidden') this.hidden = true;
        if (name === 'disabled') this.disabled = true;
        if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
    }
    getAttribute(name) {
        if (name === 'class') return this.className;
        if (name.startsWith('data-')) return this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] ?? null;
        return this.attributes[name] ?? null;
    }
    removeAttribute(name) {
        delete this.attributes[name];
        if (name === 'hidden') this.hidden = false;
        if (name === 'disabled') this.disabled = false;
    }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    matches(selector) {
        return selector.split(',').some(part => {
            let match = true;
            part = part.trim().replace(/\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]/g, (_, name, value) => {
                match = match && this.hasAttribute(name) && (value === undefined || this.getAttribute(name) === value);
                return '';
            });
            const tag = part.match(/^[a-zA-Z][\w-]*/);
            if (tag && this.tagName !== tag[0].toUpperCase()) return false;
            for (const item of part.matchAll(/([#.])([\w-]+)/g)) {
                if (item[1] === '#' ? this.id !== item[2] : !this.classList.contains(item[2])) return false;
            }
            return match;
        });
    }
    querySelectorAll(selector) {
        const out = [];
        function visit(element) {
            element.children.forEach(child => {
                if (child.matches(selector)) out.push(child);
                visit(child);
            });
        }
        visit(this);
        return out;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { return this.matches(selector) ? this : this.parentNode?.closest(selector) || null; }
    contains(element) { return this === element || this.children.some(child => child.contains(element)); }
    addEventListener(type, fn) { (this.listeners[type] || (this.listeners[type] = [])).push(fn); }
    removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(item => item !== fn); }
    dispatchEvent(event) {
        event.target ||= this;
        event.currentTarget = this;
        event.preventDefault ||= function () { this.defaultPrevented = true; };
        event.stopPropagation ||= function () { this.cancelBubble = true; };
        (this.listeners[event.type] || []).slice().forEach(fn => fn(event));
        if (event.bubbles && !event.cancelBubble && this.parentNode) this.parentNode.dispatchEvent(event);
        return !event.defaultPrevented;
    }
    click() { if (!this.disabled) this.dispatchEvent({ type: 'click', bubbles: true, detail: 1 }); }
    focus() { this.focused = true; if (this.ownerDocument) this.ownerDocument.activeElement = this; }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    showModal() { this.open = true; this.setAttribute("open", ""); }
    close() { this.open = false; this.removeAttribute("open"); this.dispatchEvent({ type: "close" }); }
    setPointerCapture() {}
    releasePointerCapture() {}
    hasPointerCapture() { return false; }
    getBoundingClientRect() { return { left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight, width: this.clientWidth, height: this.clientHeight }; }
}

function parseHTML(rootElement, html) {
    const stack = [rootElement];
    const voids = new Set(['AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR']);
    // Scripts/styles are not executed by this minimal DOM. JS is loaded in VM.
    html = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    for (const token of html.matchAll(/<!--[^]*?-->|<![^>]*>|<\/?[^>]+>|[^<]+/g)) {
        const value = token[0];
        if (value.startsWith('<!')) continue;
        if (value.startsWith('</')) {
            if (stack.length > 1) stack.pop();
        } else if (value.startsWith('<')) {
            const match = value.match(/^<([\w-]+)([\s\S]*?)\/?\s*>$/);
            if (!match) continue;
            const element = new Element(match[1]);
            for (const attr of match[2].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
                element.setAttribute(attr[1], attr[2] ?? attr[3] ?? attr[4] ?? '');
            }
            stack[stack.length - 1].appendChild(element);
            if (!voids.has(element.tagName) && !value.endsWith('/>')) stack.push(element);
        } else stack[stack.length - 1]._text += value;
    }
}

function createGame(options = {}) {
    const document = new Element('document');
    document.innerHTML = page;
    document.createElement = tag => { const el = new Element(tag); el.ownerDocument = document; return el; };
    document.getElementById = id => document.querySelector('#' + id);
    document.documentElement = document.querySelector('html');
    document.body = document.querySelector('body');
    document.activeElement = document.body;
    const storage = Object.assign({}, options.storage);
    const random = Object.create(Math);
    random.random = seeded(options.seed || 42);
    const sandbox = {
        console, document, Math: random,
        CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
        localStorage: {
            getItem(name) { return storage[name] ?? null; },
            setItem(name, value) { storage[name] = String(value); }
        }
    };
    sandbox.window = sandbox;
    sandbox.addEventListener = document.addEventListener.bind(document);
    const context = vm.createContext(sandbox);
    const exposed = uiSource.replace(/\}\(\)\);\s*$/, `
        window.__spiderTest = {
            snapshot: function () { return cloneState(state); },
            selection: function () { return selected; },
            history: function () { return past.length; },
            load: function (value) {
                state = cloneState(value); past = []; selected = null; message = ''; render();
            }
        };
    }());`);
    assert.notEqual(exposed, uiSource, 'Test instrumentation must match the production IIFE');
    vm.runInContext(exposed, context, { filename: 'spider.js' });
    vm.runInContext(viewSource, context, { filename: 'game-view.js' });
    const table = document.querySelector('[data-game-view]');
    const game = {
        document, storage, table, context,
        api: sandbox.__spiderTest,
        get(id) { return document.getElementById(id); },
        columns() { return this.get('spider-cols').children; },
        card(col, index) { return this.columns()[col].children[index]; },
        snap() { return clone(this.api.snapshot()); },
        selection() { return clone(this.api.selection()); },
        fullscreen() { return table.querySelector('[data-game-fullscreen]'); }
    };
    return game;
}

let nextId = 1000;
function card(r, s = 'S', up = true) { return { id: nextId++, r, s, up }; }
function fixture(columns, stock = [], done = 0, suits = 1) {
    while (columns.length < 10) columns.push([card(13)]);
    return { columns, stock, done, suits };
}
function rank(r) { return ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[r] || String(r); }
function allCards(state) { return state.columns.flat().concat(state.stock); }
function assertDeck(game, suits) {
    const state = game.snap();
    const cards = allCards(state);
    assert.equal(cards.length, 104);
    assert.equal(new Set(cards.map(c => c.id)).size, 104);
    assert.equal(new Set(cards.map(c => c.s)).size, suits);
    for (const s of new Set(cards.map(c => c.s))) {
        for (let r = 1; r <= 13; r++) assert.equal(cards.filter(c => c.s === s && c.r === r).length, 8 / suits);
    }
}

test('page connects shared view controls and keeps all actions outside the horizontal board', () => {
    const g = createGame();
    const board = g.document.querySelector('.spider-board');
    assert.match(page, /viewport-fit=cover/);
    assert.match(page, /css\/game-view\.css/);
    assert.match(page, /js\/game-view\.js/);
    assert.equal(g.document.querySelectorAll('[data-game-view]').length, 1);
    assert.equal(g.document.querySelectorAll('[data-game-fullscreen]').length, 1);
    assert.equal(board.getAttribute('tabindex'), '0');
    assert.equal(board.getAttribute('role'), 'region');
    assert.match(board.getAttribute('aria-label'), /左右滑动/);
    for (const control of [g.fullscreen(), g.get('spider-new'), g.get('spider-undo'), g.get('spider-hint'), g.get('spider-stock'), g.get('spider-done'), ...g.document.querySelectorAll('[data-suits]')]) {
        assert.ok(g.table.contains(control));
        assert.ok(!board.contains(control));
    }
});

test('initial deal retains 104 unique cards, ten columns, five stock rows and ten face-up cards', () => {
    const g = createGame();
    assertDeck(g, 1);
    const state = g.snap();
    assert.deepEqual(state.columns.map(col => col.length), [6,6,6,6,5,5,5,5,5,5]);
    assert.equal(state.stock.length, 50);
    assert.equal(state.columns.flat().filter(c => c.up).length, 10);
    assert.equal(g.columns().length, 10);
    assert.equal(g.get('spider-cols').querySelectorAll('button').length, 54);
    assert.equal(g.get('spider-stock').textContent, '5 次');
    state.columns.forEach((col, i) => col.forEach((c, j) => {
        const el = g.card(i, j);
        assert.equal(el.type, 'button');
        assert.equal(el.getAttribute('aria-label'), c.up ? rank(c.r) + '♠' : '牌背');
        if (!c.up) assert.equal(el.tabIndex, -1);
    }));
});

test('every exposed rank button selects its exact movable run, including 10 and all face ranks', () => {
    const g = createGame();
    const columns = Array.from({ length: 8 }, () => Array.from({ length: 13 }, (_, i) => card(13 - i)));
    columns.push([], []);
    g.api.load(fixture(columns));
    for (let col = 0; col < 8; col++) {
        for (let index = 0; index < 13; index++) {
            g.card(col, index).click();
            assert.deepEqual(g.selection(), { col, index });
            assert.equal(g.columns()[col].querySelectorAll('.is-selected').length, 13 - index);
            g.card(col, index).click();
            assert.equal(g.selection(), null);
        }
    }
    assert.equal(g.api.history(), 0);
});

test('rank artwork uses identical corners and centered artwork hooks without fixed pile geometry', () => {
    const g = createGame();
    g.api.load(fixture([Array.from({ length: 13 }, (_, i) => card(13 - i))]));
    for (let i = 0; i < 13; i++) {
        const el = g.card(0, i);
        const r = 13 - i;
        assert.equal(el.querySelectorAll('b').length, 2);
        assert.ok(el.querySelectorAll('b').every(b => b.textContent === rank(r)));
        assert.equal(el.querySelectorAll('.spider-corner').length, 2);
        assert.equal(el.querySelectorAll('.spider-corner-bottom').length, 1);
        assert.equal(el.style.top, undefined);
        assert.equal(g.columns()[0].style.height, undefined);
        assert.equal(el.style.zIndex, String(i + 1));
        if (r >= 11) {
            assert.equal(el.querySelectorAll('.spider-court').length, 1);
            assert.equal(el.querySelector('.spider-court').getAttribute('alt'), '');
        } else if (r === 1) assert.equal(el.querySelectorAll('.spider-ace').length, 1);
        else assert.equal(el.querySelectorAll('.spider-pip').length, r);
    }
});

test('five stock-row clicks deal and disable the stock; five undos restore the exact initial deck', () => {
    const g = createGame();
    const initial = g.snap();
    for (let i = 1; i <= 5; i++) {
        const before = g.snap();
        g.get('spider-deal').click();
        const after = g.snap();
        assert.equal(after.stock.length, 50 - i * 10);
        after.columns.forEach((col, index) => {
            assert.equal(col.length, before.columns[index].length + 1);
            assert.equal(col[col.length - 1].up, true);
        });
        assert.equal(g.api.history(), i);
    }
    assert.equal(g.get('spider-deal').disabled, true);
    const exhausted = g.snap();
    g.get('spider-deal').click();
    assert.deepEqual(g.snap(), exhausted);
    for (let i = 0; i < 5; i++) g.get('spider-undo').click();
    assert.deepEqual(g.snap(), initial);
    assert.equal(g.get('spider-deal').disabled, false);
    assert.equal(g.api.history(), 0);
});

test('moving a same-suit run through DOM clicks flips its covered card and undo restores it', () => {
    const g = createGame();
    const initial = fixture([[card(5, 'S', false), card(8), card(7), card(6)], [card(9, 'H')]], [], 0, 2);
    g.api.load(initial);
    g.card(0, 1).click();
    g.card(1, 0).click();
    assert.deepEqual(g.snap().columns[0], [{ ...initial.columns[0][0], up: true }]);
    assert.deepEqual(g.snap().columns[1].map(c => c.r), [9,8,7,6]);
    assert.equal(g.selection(), null);
    assert.equal(g.api.history(), 1);
    g.get('spider-undo').click();
    assert.deepEqual(g.snap(), initial);
});

test('illegal destination and mixed-suit runs retain the original rules and deck', () => {
    const g = createGame();
    const initial = fixture([[card(8), card(7)], [card(11)], [card(6), card(5, 'H')]], [], 0, 2);
    g.api.load(initial);
    g.card(0, 0).click();
    g.card(1, 0).click();
    assert.deepEqual(g.snap(), initial);
    assert.equal(g.api.history(), 0);
    assert.match(g.get('spider-status').textContent, /大 1 点/);
    g.api.load(initial);
    g.card(2, 0).click();
    assert.equal(g.selection(), null);
    assert.deepEqual(g.snap(), initial);
    assert.match(g.get('spider-status').textContent, /同花色/);
});

test('empty column remains a move target while any empty column prevents dealing', () => {
    const g = createGame();
    const initial = fixture([[card(8), card(7)], []], Array.from({ length: 10 }, () => card(2, 'S', false)));
    g.api.load(initial);
    g.get('spider-deal').click();
    assert.deepEqual(g.snap(), initial);
    assert.match(g.get('spider-status').textContent, /空列/);
    assert.equal(g.api.history(), 0);
    g.card(0, 0).click();
    assert.ok(g.columns()[1].classList.contains('is-empty'));
    g.columns()[1].click();
    assert.deepEqual(g.snap().columns[1].map(c => c.r), [8,7]);
    assert.equal(g.snap().columns[0].length, 0);
    g.get('spider-undo').click();
    assert.deepEqual(g.snap(), initial);
});

test('completing a K-to-A suit removes exactly one run and undo restores all thirteen cards', () => {
    const g = createGame();
    const initial = fixture([[card(1)], Array.from({ length: 12 }, (_, i) => card(13 - i))]);
    g.api.load(initial);
    g.card(0, 0).click();
    g.card(1, 11).click();
    assert.equal(g.snap().done, 1);
    assert.equal(g.snap().columns[1].length, 0);
    assert.equal(g.get('spider-done').querySelectorAll('.pcard').length, 1);
    assert.match(g.get('spider-status').textContent, /已收 1\/8/);
    g.get('spider-undo').click();
    assert.deepEqual(g.snap(), initial);
});

test('difficulty and new-game controls retain deck composition and clear selection/history', () => {
    const g = createGame();
    for (const suits of [2,4,1]) {
        g.document.querySelector(`[data-suits="${suits}"]`).click();
        assertDeck(g, suits);
        assert.equal(g.snap().suits, suits);
        assert.equal(g.storage['mylog-spider-suits'], String(suits));
        assert.equal(g.document.querySelectorAll('.is-on').length, 1);
        assert.equal(g.document.querySelector('.is-on').getAttribute('data-suits'), String(suits));
        g.get('spider-deal').click();
        g.card(0, g.columns()[0].children.length - 1).click();
        g.get('spider-new').click();
        assertDeck(g, suits);
        assert.equal(g.snap().stock.length, 50);
        assert.equal(g.selection(), null);
        assert.equal(g.api.history(), 0);
    }
});

test('hint preserves the deck and history while highlighting a legal move', () => {
    const g = createGame();
    const initial = fixture([[card(3, 'S', false), card(8), card(7)], [card(9)]]);
    g.api.load(initial);
    g.get('spider-hint').click();
    assert.deepEqual(g.selection(), { col: 0, index: 1 });
    assert.deepEqual(g.snap(), initial);
    assert.equal(g.api.history(), 0);
    assert.match(g.get('spider-status').textContent, /翻开/);
});

test('fallback fullscreen, orientation and repeated exits preserve game state, selection and scroll', () => {
    const g = createGame();
    g.get('spider-deal').click();
    g.card(0, g.columns()[0].children.length - 1).click();
    const before = g.snap();
    const selection = g.selection();
    const history = g.api.history();
    const board = g.document.querySelector('.spider-board');
    board.scrollLeft = 240;
    const changes = [];
    g.table.addEventListener('gameviewchange', event => changes.push(clone(event.detail)));
    for (let i = 0; i < 3; i++) {
        g.fullscreen().click();
        assert.ok(g.table.classList.contains('is-expanded'));
        assert.equal(g.fullscreen().getAttribute('aria-pressed'), 'true');
        assert.match(g.fullscreen().textContent, /退出/);
        for (const type of ['resize', 'orientationchange']) g.document.dispatchEvent({ type });
        if (i === 1) g.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
        else g.fullscreen().click();
        assert.ok(!g.table.classList.contains('is-expanded'));
        assert.equal(g.fullscreen().getAttribute('aria-pressed'), 'false');
        assert.deepEqual(g.snap(), before);
        assert.deepEqual(g.selection(), selection);
        assert.equal(g.api.history(), history);
        assert.equal(board.scrollLeft, 240);
    }
    assert.deepEqual(changes.map(change => change.expanded), [true,false,true,false,true,false]);
});

test('native-fullscreen events and denied native requests keep a working exit without resetting cards', async () => {
    const g = createGame();
    const initial = g.snap();
    g.table.requestFullscreen = () => Promise.reject(new Error('Not allowed in this browser'));
    g.fullscreen().click();
    await Promise.resolve();
    assert.equal(g.fullscreen().disabled, false);
    assert.ok(g.table.classList.contains('is-expanded'));
    assert.match(g.fullscreen().textContent, /退出铺满/);
    g.fullscreen().click();
    g.table.requestFullscreen = () => {
        g.document.fullscreenElement = g.table;
        g.document.dispatchEvent({ type: 'fullscreenchange' });
        return Promise.resolve();
    };
    g.document.exitFullscreen = () => {
        g.document.fullscreenElement = null;
        g.document.dispatchEvent({ type: 'fullscreenchange' });
        return Promise.resolve();
    };
    g.fullscreen().click();
    await Promise.resolve();
    assert.match(g.fullscreen().textContent, /退出全屏/);
    g.fullscreen().click();
    await Promise.resolve();
    assert.ok(!g.table.classList.contains('is-expanded'));
    g.fullscreen().click();
    await Promise.resolve();
    g.document.fullscreenElement = null;
    g.document.dispatchEvent({ type: 'fullscreenchange' });
    assert.ok(!g.table.classList.contains('is-expanded'));
    assert.deepEqual(g.snap(), initial);
});

test('CSS retains ten readable columns, normal-flow stacking, equal rank metrics and centered art', () => {
    assert.match(css, /--spider-card-min:\s*72px/);
    assert.match(css, /grid-template-columns:\s*repeat\(10, minmax\(var\(--spider-card-min\), 1fr\)\)/);
    assert.match(css, /\.spider-table \.spider-board\s*\{[^}]*overflow-x:\s*auto/);
    assert.match(css, /\.spider-table \.spider-board\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*0/);
    assert.match(css, /\.spider-table \.spider-col \.pcard\s*\{[^}]*position:\s*relative;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*5 \/ 7/);
    assert.match(css, /margin-top:\s*calc\(-140% \+ var\(--spider-step\)\)/);
    assert.match(css, /\.spider-table \.pcard \.spider-corner b\s*\{[^}]*font:\s*700 var\(--spider-rank-size\) \/ 1 Arial/);
    assert.match(css, /font-variant-numeric:\s*lining-nums tabular-nums/);
    assert.match(css, /\.spider-table \.spider-corner\s*\{[^}]*top:\s*4px/);
    assert.match(css, /\.spider-table \.spider-pips\s*\{[^}]*inset:\s*28% 16% 28%/);
    assert.match(css, /\.spider-table \.spider-ace\s*\{[^}]*left:\s*50%;[^}]*top:\s*50%;[^}]*transform:\s*translate\(-50%, -50%\)/);
    assert.match(css, /\.spider-table \.spider-court\s*\{[^}]*left:\s*20%;[^}]*top:\s*25%;[^}]*width:\s*60%;[^}]*height:\s*50%;[^}]*object-fit:\s*contain/);
    assert.match(css, /--game-toolbar-bg:\s*#103f49/);
    assert.match(css, /\.spider-table \.spider-actions button\s*\{[^}]*min-height:\s*44px/);
    assert.doesNotMatch(uiSource, /pile\.style\.height|el\.style\.top/);
});

test('source-derived sizing matrix keeps every rank inside its exposed strip from 320px to 4K', () => {
    // These formulas mirror current CSS, guarded by the assertions above/below.
    assert.match(css, /--spider-column-gap:\s*clamp\(6px, 0\.65vw, 14px\)/);
    assert.match(css, /--spider-step:\s*clamp\(30px, 3\.2vw, 48px\)/);
    assert.match(css, /--spider-rank-size:\s*clamp\(20px, 2\.2vw, 36px\)/);
    assert.match(css, /--spider-suit-size:\s*clamp\(17px, 1\.8vw, 28px\)/);
    assert.match(css, /--spider-pip-size:\s*clamp\(10px, 1\.2vw, 24px\)/);
    assert.match(css, /\.spider-table \.spider-pip\s*\{[^}]*font:\s*normal var\(--spider-pip-size\)/);
    const clamp = (min, value, max) => Math.max(min, Math.min(value, max));
    const sizes = [[320,568],[360,640],[375,667],[390,844],[430,932],[568,320],[667,375],[844,390],[932,430],[768,1024],[1024,768],[1280,800],[1440,900],[1920,1080],[2560,1440],[3840,2160]];
    for (const [width, height] of sizes) for (const expanded of [false, true]) {
        const pagePadding = expanded ? 0 : clamp(8, width * .017, 32);
        const padding = expanded ? width <= 520 ? 10 : 16 : width > height && height <= 600 ? 10 : width <= 600 ? 8 : 16;
        const viewport = width - 2 * pagePadding - 2 * padding - 2;
        const gap = clamp(6, width * .0065, 14);
        const columnWidth = Math.max(72, (viewport - 6 - gap * 9) / 10);
        const step = clamp(30, width * .032, 48);
        const rankSize = clamp(20, width * .022, 36);
        const suitSize = clamp(17, width * .018, 28);
        const pipSize = clamp(10, width * .012, 24);
        assert.ok(columnWidth >= 72, `${width}x${height}: card width`);
        assert.ok(4 + rankSize <= step - 4, `${width}x${height}: rank stays visible even below a raised selected run`);
        assert.ok(columnWidth * .04 + rankSize * 1.2 + 2 + suitSize < columnWidth, `${width}x${height}: 10 plus suit fits`);
        const pipAreaHeight = columnWidth * 1.4 * .44;
        assert.ok(pipAreaHeight * .24 >= pipSize, `${width}x${height}: 10's closest same-column pips do not overlap`);
        assert.ok(columnWidth * 1.4 * .28 + pipAreaHeight * .10 - pipSize / 2 >= 4 + rankSize, `${width}x${height}: top pips clear the corner rank`);
        for (const count of [1,6,13,54,104]) {
            const pileHeight = columnWidth * 1.4 + (count - 1) * step;
            assert.ok(pileHeight >= columnWidth * 1.4);
            assert.equal(Math.round((pileHeight - columnWidth * 1.4) / step), count - 1);
        }
    }
    console.log(`  source-derived geometry: ${sizes.length * 2} viewport/view combinations; no browser-layout claim`);
});

(async function () {
    for (const { name, body } of tests) {
        try {
            await body();
            passed++;
            console.log('ok - ' + name);
        } catch (error) {
            failed++;
            console.error('not ok - ' + name + '\n' + error.stack);
        }
    }
    console.log(`${passed} passed, ${failed} failed. DOM/engine + source arithmetic only; use real-browser QA for rendering and hit testing.`);
    process.exitCode = failed ? 1 : 0;
}());
