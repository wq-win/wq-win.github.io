#!/usr/bin/env node
'use strict';

// Dependency-free UI regressions. Run from any directory with:
//   node tools/paodekuai-ui-test.js
// The production IIFE is instrumented only in this VM; no debug API ships.
// This intentionally does not model CSS layout or native pointer hit testing.
// Verify desktop/mobile layout and drag gestures in a real browser as well.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'game/paodekuai.html'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'js/paodekuai-engine.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js/paodekuai.js'), 'utf8');
const themeSource = fs.readFileSync(path.join(root, 'css/paodekuai.css'), 'utf8');
const viewSource = fs.readFileSync(path.join(root, 'js/game-view.js'), 'utf8');
let passed = 0;
let failed = 0;

function test(name, body) {
    try {
        body();
        passed += 1;
        console.log('ok - ' + name);
    } catch (error) {
        failed += 1;
        console.error('not ok - ' + name + '\n' + error.stack);
    }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function card(rank, suit = 0) { return { r: rank, s: suit }; }
function key(cards) { return cards.map(c => c.r + ':' + c.s).sort().join(','); }
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
    focus() { this.focused = true; }
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
    document.createElement = tag => new Element(tag);
    document.getElementById = id => document.querySelector('#' + id);
    document.documentElement = document.querySelector('html');
    document.body = document.querySelector('body');
    document.activeElement = document.body;
    document.elementFromPoint = () => null;
    const timers = new Map();
    const allTimers = new Map();
    let timerId = 0;
    const storage = Object.assign({}, options.storage);
    const sandbox = {
        document,
        console,
        CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; Object.assign(this, init); } },
        innerWidth: 1024,
        innerHeight: 768,
        navigator: { maxTouchPoints: 0 },
        performance: { now: () => 1000 },
        getComputedStyle: () => ({ getPropertyValue: () => '44px' }),
        matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
        addEventListener: document.addEventListener.bind(document),
        removeEventListener: document.removeEventListener.bind(document),
        setTimeout(fn, delay) {
            const id = ++timerId;
            const timer = { id, fn, delay };
            timers.set(id, timer);
            allTimers.set(id, timer);
            return id;
        },
        clearTimeout(id) { timers.delete(id); },
        localStorage: {
            getItem(name) { if (options.blockStorage) throw Error('Storage blocked'); return storage[name] ?? null; },
            setItem(name, value) { if (options.blockStorage) throw Error('Storage blocked'); storage[name] = value; }
        }
    };
    sandbox.Math = Object.create(Math);
    sandbox.Math.random = seeded(options.seed || 42);
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.requestAnimationFrame = fn => sandbox.setTimeout(fn, 16);
    sandbox.cancelAnimationFrame = sandbox.clearTimeout;
    const context = vm.createContext(sandbox);
    vm.runInContext(engineSource, context, { filename: 'paodekuai-engine.js' });
    if (options.deal) sandbox.Paodekuai.deal = () => clone(options.deal);
    // Keep lexical access restricted to this isolated test context. Production
    // source is neither changed on disk nor made globally inspectable in-browser.
    const instrumentation = `
    window.__uiTest = {
        get state() { return state; },
        set state(value) {
            state = value;
            // Fixture injection emulates a state transition and invalidates the
            // controller's derived hint cache, just as commit/start do.
            if (typeof moveCache !== 'undefined') moveCache = null;
            if (typeof hintIndex !== 'undefined') hintIndex = -1;
            if (typeof hintMessage !== 'undefined') hintMessage = '';
            if (typeof revision !== 'undefined') revision += 1;
        },
        get selected() { return selected; },
        set selected(value) { selected = value; },
        get thinking() { return thinking; },
        set thinking(value) { thinking = value; },
        render: render, start: start, commit: commit, poke: poke,
        playable: playable, selectedCards: selectedCards,
        fitCards: fitCards, fitRow: fitRow, pips: PIPS, rangeIndex: rangeIndex
    };
`;
    assert.match(uiSource, /\}\(\)\);\s*$/, 'The UI should retain an isolated IIFE; update test instrumentation if its module format changes.');
    vm.runInContext(uiSource.replace(/\}\(\)\);\s*$/, instrumentation + '}());'), context, { filename: 'paodekuai.js' });
    if (options.gameView) vm.runInContext(viewSource, context, { filename: 'game-view.js' });
    const api = sandbox.__uiTest;
    return {
        api, PK: sandbox.Paodekuai, document, sandbox, timers, allTimers, storage,
        el(id) { const element = document.getElementById(id); assert.ok(element, 'Missing #' + id); return element; },
        click(id) { this.el(id).click(); },
        drainOne() {
            const timer = timers.values().next().value;
            assert.ok(timer, 'Expected a pending timeout');
            timers.delete(timer.id);
            timer.fn();
            return timer;
        },
        clearTimers() { timers.clear(); },
        fixture(update) {
            timers.clear();
            api.thinking = false;
            api.selected = {};
            api.state = Object.assign(clone(api.state), {
                hands: [[card(0, 0), card(2, 0)], [card(3, 0), card(4, 0)], [card(5, 0), card(6, 0)]],
                turn: 0, lead: null, leadSeat: 0, passes: 0, opening: false,
                last: null, over: null, thrown: [0, 0, 0], recorded: false,
                played: [], history: []
            }, update);
            api.render();
            return api.state;
        },
        select(cards) {
            api.selected = {};
            cards.forEach(c => { api.selected[sandbox.Paodekuai.cardKey(c)] = 1; });
            api.render();
        }
    };
}

function rule(game, seat = 0) {
    return {
        require: game.api.state.opening ? card(0, 0) : null,
        nextCount: game.api.state.hands[(seat + 1) % 3].length
    };
}
function selectedMove(game) {
    const picked = game.api.selectedCards();
    return game.PK.classify(picked, picked.length === game.api.state.hands[0].length, !!game.api.state.lead);
}
function visible(element) {
    return !element.hidden && (!element.parentNode || visible(element.parentNode));
}

// Original rules are exercised through the exact production engine plus its
// existing randomized regression suite, with browser-only `print` supplied.
test('original engine regression suite (40 games, 30 deals)', () => {
    const context = vm.createContext({ print() {} });
    vm.runInContext(engineSource, context);
    vm.runInContext(fs.readFileSync(path.join(root, 'tools/paodekuai-test.js'), 'utf8'), context);
});

test('original 48-card deck keeps only spade 2 and exactly three aces', () => {
    const game = createGame();
    const deck = clone(game.PK.freshDeck());
    assert.equal(deck.length, 48);
    assert.equal(new Set(deck.map(game.PK.cardKey)).size, 48);
    assert.deepEqual(deck.filter(c => c.r === 12), [card(12, 0)]);
    assert.deepEqual(deck.filter(c => c.r === 11).map(c => c.s), [1, 2, 3]);
    assert.deepEqual(clone(game.api.state.hands.map(hand => hand.length)), [16, 16, 16]);
});

test('opening selection must contain spade 3', () => {
    const game = createGame();
    game.fixture({ opening: true, hands: [[card(0, 0), card(0, 1), card(5, 0)], [card(2), card(3)], [card(4), card(6)]] });
    game.select([card(5)]);
    assert.equal(game.api.playable(), null);
    assert.equal(game.el('pdk-play').disabled, true);
    game.select([card(0, 0), card(0, 1)]);
    assert.equal(game.api.playable().t, 'pair');
    assert.equal(game.el('pdk-play').disabled, false);
});

test('report-single requires largest single and rejects illegal response', () => {
    const game = createGame();
    game.fixture({ hands: [[card(3), card(11, 1), card(12)], [card(4)], [card(5), card(6)]] });
    game.select([card(11, 1)]);
    assert.equal(game.api.playable(), null);
    game.select([card(12)]);
    assert.equal(game.api.playable().r, 12);
    game.api.state.lead = game.PK.classify([card(12)], true, false);
    game.select([card(11, 1)]);
    assert.equal(game.api.playable(), null);
});

test('manual pass cannot evade a legal bomb response', () => {
    const game = createGame();
    game.fixture({ hands: [[card(1, 0), card(1, 1), card(1, 2), card(1, 3), card(2)], [card(4), card(5)], [card(6), card(7)]], lead: game.PK.classify([card(12)], true, false), leadSeat: 2 });
    game.api.poke();
    assert.equal(game.timers.size, 0, 'The human must not be auto-passed when a bomb can answer.');
    const before = JSON.stringify(game.api.state);
    const pass = game.document.getElementById('pdk-pass');
    if (pass) pass.dispatchEvent({ type: 'click' });
    assert.equal(JSON.stringify(game.api.state), before);
});

test('forced pass is scheduled only with zero legal answers', () => {
    const game = createGame();
    game.fixture({ hands: [[card(0, 1), card(1, 1)], [card(3), card(4)], [card(5), card(6)]], lead: game.PK.classify([card(12)], true, false), leadSeat: 2 });
    assert.equal(game.PK.answerMoves(game.api.state.hands[0], game.api.state.lead, rule(game)).length, 0);
    game.api.poke();
    assert.ok(game.timers.size > 0);
    game.drainOne();
    assert.equal(game.api.state.last.seat, 0);
    assert.equal(game.api.state.last.pass, true);
    assert.equal(game.api.state.turn, 1);
    assert.equal(game.api.state.hands[0].length, 2);
});

test('a legal ordinary response prevents forced pass', () => {
    const game = createGame();
    game.fixture({ hands: [[card(11, 1), card(1, 1)], [card(3), card(4)], [card(5), card(6)]], lead: game.PK.classify([card(10)], true, false), leadSeat: 2 });
    game.api.poke();
    assert.equal(game.timers.size, 0);
    game.select([card(11, 1)]);
    assert.equal(game.el('pdk-play').disabled, false);
});

test('restart cancels AI timeout and rejects an already-queued old callback', () => {
    const game = createGame();
    game.fixture({ turn: 1 });
    game.api.poke();
    assert.equal(game.api.thinking, true);
    const oldTimers = Array.from(game.timers.values());
    assert.ok(oldTimers.length);
    game.PK.deal = () => [[card(0, 0), card(1)], [card(2), card(3)], [card(4), card(5)]];
    game.api.start();
    assert.equal(game.api.thinking, false);
    oldTimers.forEach(timer => assert.equal(game.timers.has(timer.id), false));
    const fresh = JSON.stringify(game.api.state);
    oldTimers.forEach(timer => timer.fn());
    assert.equal(JSON.stringify(game.api.state), fresh, 'A callback from the old deal must not play in the new deal.');
});

test('restart cancels forced pass and rejects an already-queued old callback', () => {
    const game = createGame();
    game.fixture({ hands: [[card(0, 1), card(1, 1)], [card(3), card(4)], [card(5), card(6)]], lead: game.PK.classify([card(12)], true, false), leadSeat: 2 });
    game.api.poke();
    const oldTimers = Array.from(game.timers.values());
    assert.ok(oldTimers.length);
    game.PK.deal = () => [[card(0, 0), card(1)], [card(2), card(3)], [card(4), card(5)]];
    game.api.start();
    oldTimers.forEach(timer => assert.equal(game.timers.has(timer.id), false));
    const fresh = JSON.stringify(game.api.state);
    oldTimers.forEach(timer => timer.fn());
    assert.equal(JSON.stringify(game.api.state), fresh, 'A new opening cannot be auto-passed by the previous deal.');
});

test('winning updates stats once and has no pending turn callback', () => {
    const game = createGame();
    game.fixture({ hands: [[card(3, 0), card(3, 1)], [card(4), card(5)], [card(6), card(7)]] });
    game.select([card(3, 0), card(3, 1)]);
    game.click('pdk-play');
    assert.equal(game.api.state.over, 0);
    assert.equal(game.api.state.hands[0].length, 0);
    assert.equal(game.timers.size, 0);
    assert.equal(visible(game.el('pdk-result')), true);
    assert.match(game.el('pdk-result-title').textContent, /赢/);
    assert.deepEqual(JSON.parse(game.storage['mylog-paodekuai']), { wins: 1, games: 1 });
    game.api.render();
    game.click('pdk-play');
    assert.deepEqual(JSON.parse(game.storage['mylog-paodekuai']), { wins: 1, games: 1 });
});

test('blocked browser storage does not interrupt a completed game', () => {
    const game = createGame({ blockStorage: true });
    game.fixture({ hands: [[card(3)], [card(4), card(5)], [card(6), card(7)]] });
    game.select([card(3)]);
    assert.doesNotThrow(() => game.click('pdk-play'));
    assert.equal(game.api.state.over, 0);
    assert.equal(visible(game.el('pdk-result')), true);
});

// Feature checks deliberately fail if upgraded controls disappear.
function counterValues(game) {
    const cells = game.el('pdk-counter-ranks').querySelectorAll('[data-rank]');
    assert.equal(cells.length, 13, 'Counter must show every rank.');
    const values = Array(13).fill(null);
    cells.forEach(cell => {
        const rank = Number(cell.getAttribute('data-rank'));
        assert.ok(Number.isInteger(rank) && rank >= 0 && rank <= 12);
        assert.equal(values[rank], null, 'Counter must not repeat a rank.');
        const count = cell.querySelector('b');
        assert.ok(count, 'Each rank must expose its visible count.');
        values[rank] = Number(count.textContent);
        assert.ok(Number.isInteger(values[rank]) && values[rank] >= 0);
    });
    return values;
}
function expectedCounter(game) {
    const values = Array(13).fill(0);
    game.PK.freshDeck().forEach(c => { values[c.r] += 1; });
    game.api.state.hands[0].forEach(c => { values[c.r] -= 1; });
    game.api.state.played.forEach(c => { values[c.r] -= 1; });
    return values;
}
function assertCounter(game) {
    const expected = expectedCounter(game);
    assert.deepEqual(counterValues(game), expected);
    assert.equal(Number(game.el('pdk-remaining').textContent), expected.reduce((sum, count) => sum + count, 0));
}
function hintCycle(game) {
    const before = JSON.stringify({ hands: game.api.state.hands, turn: game.api.state.turn, thrown: game.api.state.thrown });
    const moves = game.PK.answerMoves(game.api.state.hands[0], game.api.state.lead, rule(game));
    assert.ok(moves.length >= 2, 'Fixture should offer more than one legal hint.');
    const legal = new Set(moves.map(move => key(move.cards)));
    const seen = [];
    for (let index = 0; index <= legal.size; index += 1) {
        game.click('pdk-hint');
        const current = key(game.api.selectedCards());
        assert.ok(legal.has(current), 'Hint must select a currently legal move.');
        assert.ok(game.api.playable(), 'Hint must satisfy the same validator as the play button.');
        assert.equal(game.el('pdk-play').disabled, false);
        seen.push(current);
    }
    assert.equal(new Set(seen.slice(0, -1)).size, legal.size, 'Hints should visit every distinct legal choice before repeating.');
    assert.equal(seen[seen.length - 1], seen[0], 'Hint sequence should wrap to its first choice.');
    assert.equal(JSON.stringify({ hands: game.api.state.hands, turn: game.api.state.turn, thrown: game.api.state.thrown }), before, 'Hints select but never play cards.');
}

test('public counter starts at 32 and matches the original deck rank-by-rank', () => {
    const game = createGame();
    assertCounter(game);
    assert.equal(Number(game.el('pdk-remaining').textContent), 32);
    assert.ok(counterValues(game)[11] <= 3);
    assert.ok(counterValues(game)[12] <= 1);
});

test('public counter never reads hidden opponent card identities', () => {
    const game = createGame();
    const before = counterValues(game);
    // Change hidden identities while leaving public hand sizes untouched.
    game.api.state.hands[1] = game.api.state.hands[1].map(() => card(12));
    game.api.state.hands[2] = game.api.state.hands[2].map(() => card(0));
    game.api.render();
    assert.deepEqual(counterValues(game), before);
    assertCounter(game);
});

test('own play leaves public unknown counts unchanged; opponent play decreases them', () => {
    const game = createGame();
    game.fixture({ hands: [[card(0, 0), card(1)], [card(2), card(3)], [card(4), card(5)]] });
    const before = counterValues(game);
    game.api.commit(0, game.PK.classify([card(0, 0)], false, false));
    game.api.render();
    assert.deepEqual(counterValues(game), before);
    assert.equal(game.api.state.played.length, 1);
    game.api.commit(1, game.PK.classify([card(2)], false, true));
    game.api.render();
    const next = before.slice();
    next[2] -= 1;
    assert.deepEqual(counterValues(game), next);
    assertCounter(game);
    const afterPlay = counterValues(game);
    game.api.commit(2, game.PK.passMove());
    game.api.render();
    assert.deepEqual(counterValues(game), afterPlay, 'Passing must not alter the public ledger.');
    assert.equal(game.api.state.played.length, 2);
});

test('hints cycle legal spade-3 opening choices without playing', () => {
    const game = createGame();
    game.fixture({ opening: true, hands: [[card(0, 0), card(0, 1), card(5)], [card(2), card(3)], [card(4), card(6)]] });
    hintCycle(game);
    assert.ok(game.PK.hasCard(game.api.selectedCards(), card(0, 0)));
});

test('response hints cycle ordinary moves and legal bombs', () => {
    const game = createGame();
    game.fixture({ hands: [[card(11, 1), card(12), card(1, 0), card(1, 1), card(1, 2), card(1, 3)], [card(3), card(4)], [card(5), card(6)]], lead: game.PK.classify([card(10)], true, false), leadSeat: 2 });
    hintCycle(game);
});

test('hint honors report-single and still offers a bomb as the only answer', () => {
    const game = createGame();
    game.fixture({ hands: [[card(11, 1), card(12), card(1, 1)], [card(3)], [card(5), card(6)]], lead: game.PK.classify([card(10)], true, false), leadSeat: 2 });
    game.click('pdk-hint');
    assert.equal(selectedMove(game).t, 'single');
    assert.equal(selectedMove(game).r, 12);
    game.fixture({ hands: [[card(1, 0), card(1, 1), card(1, 2), card(1, 3), card(2)], [card(3), card(4)], [card(5), card(6)]], lead: game.PK.classify([card(12)], true, false), leadSeat: 2 });
    game.click('pdk-hint');
    assert.equal(selectedMove(game).t, 'bomb');
    assert.ok(game.api.playable());
});

test('hint is disabled during AI turns, forced pass and endgame', () => {
    const game = createGame();
    game.fixture({ turn: 1 });
    assert.equal(game.el('pdk-hint').disabled, true);
    game.fixture({ lead: game.PK.classify([card(12)], true, false), leadSeat: 2 });
    assert.equal(game.el('pdk-hint').disabled, true);
    game.fixture({ over: 1, turn: 1 });
    assert.equal(game.el('pdk-hint').disabled, true);
});

test('endgame hides ordinary actions and shows replay for every winner', () => {
    const game = createGame();
    for (const seat of [0, 1, 2]) {
        const hands = [[card(0), card(1)], [card(2), card(3)], [card(4), card(5)]];
        hands[seat] = [];
        game.fixture({ hands, over: seat, turn: seat });
        assert.equal(visible(game.el('pdk-actions')), false);
        assert.equal(visible(game.el('pdk-play')), false);
        assert.equal(visible(game.el('pdk-pass')), false);
        assert.equal(visible(game.el('pdk-hint')), false);
        assert.equal(visible(game.el('pdk-again')), true);
        assert.equal(visible(game.el('pdk-result')), true);
    }
    game.click('pdk-again');
    assert.equal(game.api.state.over, null);
    assert.equal(visible(game.el('pdk-actions')), true);
    assert.equal(visible(game.el('pdk-again')), false);
    assert.equal(visible(game.el('pdk-result')), false);
    assert.equal(game.api.state.played.length, 0);
    assertCounter(game);
});

test('restart dialog cancel preserves current game and confirm resets it', () => {
    const game = createGame();
    game.fixture({ hands: [[card(0, 0), card(1)], [card(2), card(3)], [card(4), card(5)]] });
    game.select([card(1)]);
    const before = JSON.stringify(game.api.state);
    game.click('pdk-restart');
    assert.equal(game.el('pdk-restart-dialog').open, true);
    game.click('pdk-restart-cancel');
    assert.equal(game.el('pdk-restart-dialog').open, false);
    assert.equal(JSON.stringify(game.api.state), before);
    game.click('pdk-restart');
    game.click('pdk-restart-confirm');
    assert.equal(game.el('pdk-restart-dialog').open, false);
    assert.deepEqual(clone(game.api.state.hands.map(hand => hand.length)), [16, 16, 16]);
    assert.equal(game.api.state.played.length, 0);
    assert.equal(game.api.selectedCards().length, 0);
    assertCounter(game);
});

test('restart confirmation pauses a near-winning AI and rejects its stale callback', () => {
    const game = createGame();
    game.fixture({ turn: 1, hands: [[card(0), card(1)], [card(2)], [card(3), card(4)]] });
    game.api.poke();
    const stale = Array.from(game.timers.values());
    assert.equal(stale.length, 1);
    const before = JSON.stringify(game.api.state);
    game.click('pdk-restart');
    assert.equal(game.timers.size, 0);
    assert.match(game.el('pdk-status').textContent, /暂停/);
    assert.equal(game.el('pdk-play').disabled, true);
    assert.equal(game.el('pdk-hint').disabled, true);
    stale.forEach(timer => timer.fn());
    game.api.poke();
    assert.equal(game.timers.size, 0);
    assert.equal(JSON.stringify(game.api.state), before);
    assert.equal(game.storage['mylog-paodekuai'], undefined);
    game.click('pdk-restart-confirm');
    stale.forEach(timer => timer.fn());
    assert.equal(game.api.state.over, null);
    assert.equal(game.api.state.played.length, 0);
    assert.equal(game.storage['mylog-paodekuai'], undefined, 'Confirming restart must not record the abandoned deal.');
});

test('cancel and native dialog close each resume exactly one pending AI turn', () => {
    for (const closeMode of ['cancel', 'native-close']) {
        const game = createGame();
        game.fixture({ turn: 1, hands: [[card(0), card(1)], [card(2)], [card(3), card(4)]] });
        game.api.poke();
        const stale = Array.from(game.timers.values());
        game.click('pdk-restart');
        if (closeMode === 'cancel') game.click('pdk-restart-cancel');
        else game.el('pdk-restart-dialog').close(); // Models the close event after Escape.
        assert.equal(game.el('pdk-restart-dialog').open, false);
        assert.equal(game.timers.size, 1);
        stale.forEach(timer => timer.fn());
        assert.equal(game.api.state.over, null);
        game.drainOne();
        assert.equal(game.api.state.over, 1);
        assert.deepEqual(JSON.parse(game.storage['mylog-paodekuai']), { wins: 0, games: 1 });
        assert.equal(game.timers.size, 0);
    }
});

test('restart pauses forced pass; cancel or native close resumes it without an old callback', () => {
    for (const closeMode of ['cancel', 'native-close']) {
        const game = createGame();
        game.fixture({ hands: [[card(0, 1), card(1, 1)], [card(3), card(4)], [card(5), card(6)]], lead: game.PK.classify([card(12)], true, false), leadSeat: 2 });
        game.api.poke();
        const stale = Array.from(game.timers.values());
        const before = JSON.stringify(game.api.state);
        game.click('pdk-restart');
        assert.equal(game.timers.size, 0);
        stale.forEach(timer => timer.fn());
        assert.equal(JSON.stringify(game.api.state), before);
        if (closeMode === 'cancel') game.click('pdk-restart-cancel');
        else game.el('pdk-restart-dialog').close();
        assert.equal(game.timers.size, 1);
        stale.forEach(timer => timer.fn());
        assert.equal(JSON.stringify(game.api.state), before);
        game.drainOne();
        assert.equal(game.api.state.last.seat, 0);
        assert.equal(game.api.state.last.pass, true);
        assert.equal(game.api.state.turn, 1);
    }
});

test('all local page, CSS and dynamically rendered card image references resolve', () => {
    const refs = [];
    for (const match of page.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) refs.push({ base: path.join(root, 'game'), url: match[1] });
    const css = fs.readFileSync(path.join(root, 'css/paodekuai.css'), 'utf8');
    for (const match of css.matchAll(/url\(["']?([^\)"']+)/g)) refs.push({ base: path.join(root, 'css'), url: match[1] });
    const game = createGame();
    game.PK.freshDeck().forEach(c => {
        game.fixture({ hands: [[c], [card(0, 1), card(1, 1)], [card(2), card(3)]] });
        game.el('pdk-you').querySelectorAll('img').forEach(img => refs.push({ base: path.join(root, 'game'), url: img.getAttribute('src') }));
    });
    refs.filter(ref => !/^(?:[a-z]+:|#|\/\/)/i.test(ref.url)).forEach(ref => {
        const pathname = ref.url.split(/[?#]/)[0];
        const resolved = pathname.startsWith('/') ? path.join(root, pathname.slice(1)) : path.resolve(ref.base, pathname);
        assert.ok(fs.existsSync(resolved), 'Missing local asset: ' + ref.url);
    });
    assert.ok(refs.some(ref => ref.url.includes('court-jack.svg')));
    assert.ok(refs.some(ref => ref.url.includes('court-queen.svg')));
    assert.ok(refs.some(ref => ref.url.includes('court-king.svg')));
    const ids = Array.from(page.matchAll(/\bid="([^"]+)"/g), match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique.');
    for (const match of uiSource.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) assert.ok(ids.includes(match[1]), 'Missing control: ' + match[1]);
});

// These verify pointer-event controller logic with explicit rectangles, not
// browser-native hit testing, pointer capture, scrolling or CSS geometry.
function pointerHand(game) {
    const hand = game.el('pdk-you');
    const faces = hand.querySelectorAll('.pcard');
    hand.dataset.cardColumns = String(faces.length);
    faces.forEach((face, index) => {
        face.getBoundingClientRect = () => ({ left: index * 30, top: 0, right: index * 30 + 60, bottom: 90, width: 60, height: 90 });
    });
    return {
        hand, faces,
        dispatch(type, index, update = {}) {
            const target = faces[index].querySelector('.pdk-corner') || faces[index];
            hand.dispatchEvent(Object.assign({ type, target, pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, clientX: index * 30 + 5, clientY: 20 }, update));
        },
        selectedIndices() { return faces.flatMap((face, index) => game.api.selected[face.dataset.key] ? [index] : []); }
    };
}
function gestureFixture(game) {
    game.fixture({ hands: [[card(0, 0), card(1), card(2), card(3), card(4), card(5)], [card(6), card(7)], [card(8), card(9)]] });
    return pointerHand(game);
}

test('keyboard selection toggles while synthetic pointer click does not double-toggle', () => {
    const game = createGame();
    const input = gestureFixture(game);
    const face = input.faces[0];
    face.dispatchEvent({ type: 'click', detail: 0, bubbles: true });
    assert.deepEqual(input.selectedIndices(), [0]);
    face.dispatchEvent({ type: 'click', detail: 1, bubbles: true });
    assert.deepEqual(input.selectedIndices(), [0]);
    face.dispatchEvent({ type: 'click', detail: 0, bubbles: true });
    assert.deepEqual(input.selectedIndices(), []);
});

test('pointer drag changes a contiguous range without rebuilding the hand DOM', () => {
    const game = createGame();
    const input = gestureFixture(game);
    input.dispatch('pointerdown', 1);
    input.dispatch('pointermove', 4);
    assert.deepEqual(input.selectedIndices(), [1, 2, 3, 4]);
    input.dispatch('pointermove', 3);
    assert.deepEqual(input.selectedIndices(), [1, 2, 3]);
    input.dispatch('pointermove', 3);
    assert.deepEqual(input.selectedIndices(), [1, 2, 3]);
    input.dispatch('pointerup', 3);
    input.faces[3].dispatchEvent({ type: 'click', detail: 1, bubbles: true });
    assert.deepEqual(input.selectedIndices(), [1, 2, 3]);
    assert.equal(input.hand.querySelectorAll('.pcard')[1], input.faces[1]);
    assert.equal(input.hand.classList.contains('is-dragging'), false);
});

test('drag starting on a selected card deselects its range and preserves other cards', () => {
    const game = createGame();
    gestureFixture(game);
    game.select([card(5), card(4), card(3), card(0)]);
    const input = pointerHand(game);
    assert.deepEqual(input.selectedIndices(), [0, 1, 2, 5]);
    input.dispatch('pointerdown', 1);
    input.dispatch('pointermove', 3);
    input.dispatch('pointerup', 3);
    assert.deepEqual(input.selectedIndices(), [0, 5]);
});

test('vertical touch gesture and pointer cancellation restore the pre-gesture selection', () => {
    const game = createGame();
    gestureFixture(game);
    game.select([card(0)]);
    const input = pointerHand(game);
    input.dispatch('pointerdown', 1, { pointerType: 'touch' });
    input.dispatch('pointermove', 1, { pointerType: 'touch', clientY: 70 });
    assert.deepEqual(input.selectedIndices(), [5]);
    input.dispatch('pointerdown', 1);
    input.dispatch('pointermove', 3);
    input.dispatch('pointercancel', 3);
    assert.deepEqual(input.selectedIndices(), [5]);
    assert.equal(input.hand.classList.contains('is-dragging'), false);
});

test('blur or resize cancels an unfinished drag and off-turn input is ignored', () => {
    const game = createGame();
    const input = gestureFixture(game);
    for (const type of ['blur', 'resize']) {
        input.dispatch('pointerdown', 1);
        input.dispatch('pointermove', 3);
        game.document.dispatchEvent({ type });
        assert.deepEqual(input.selectedIndices(), []);
    }
    game.fixture({ turn: 1 });
    const offTurn = pointerHand(game);
    offTurn.dispatch('pointerdown', 0);
    offTurn.faces[0].dispatchEvent({ type: 'click', detail: 0, bubbles: true });
    assert.equal(game.api.selectedCards().length, 0);
});

test('shared full-screen wrapper contains all controls and has no capped main width', () => {
    const game = createGame();
    const main = game.document.querySelector('main');
    const view = game.document.querySelector('[data-game-view]');
    assert.ok(game.document.body.classList.contains('game-page-body'));
    assert.ok(main.classList.contains('game-page'));
    assert.doesNotMatch(main.className, /container|max-w-/);
    assert.equal(view.parentNode, main);
    assert.ok(view.classList.contains('game-view'));
    for (const id of ['pdk-you', 'pdk-trick', 'pdk-actions', 'pdk-restart-dialog', 'pdk-again']) assert.ok(view.contains(game.el(id)));
    assert.equal(view.querySelector('[data-game-fullscreen]').getAttribute('aria-pressed'), 'false');
    assert.ok(view.querySelector('.game-view-toolbar'));
    assert.ok(page.indexOf('../css/game-view.css') < page.indexOf('../css/paodekuai.css'));
    assert.match(themeSource, /@media \(orientation: landscape\) and \(max-height: 540px\)/);
});

test('short landscape keeps 44px controls, every avatar and counter information', () => {
    // Source contracts only; real hit-target sizes are checked in browser QA.
    const landscape = themeSource.slice(themeSource.indexOf('@media (orientation: landscape) and (max-height: 540px)'));
    assert.match(landscape, /\.pdk-table \.game-fullscreen, \.pdk-table \.pdk-restart \{[^}]*min-height: 44px/);
    assert.match(landscape, /\.pdk-table \.dd-actions button, \.pdk-replay \{[^}]*min-height: 44px/);
    assert.match(landscape, /\.pdk-avatar-you \{[^}]*width: 36px; height: 36px; flex: 0 0 36px/);
    assert.doesNotMatch(landscape, /(?:\.pdk-avatar-you|\.pdk-avatar-badge|\.pdk-counter[^{}]*|\.pdk-room small)[^{}]*\{[^}]*display: none/);
    assert.match(landscape, /\.pdk-player-line > div:not\(\.pdk-avatar-you\)/);
});

test('card-width typography has fixed equal rank boxes without overlap-driven font shrinking', () => {
    const rule = themeSource.match(/\.pdk-table \.pcard \.pdk-corner b \{([^}]+)\}/)[1];
    assert.match(rule, /font-family: Arial, Helvetica, sans-serif/);
    assert.match(rule, /font-variant-numeric: lining-nums tabular-nums/);
    assert.match(rule, /font-size: calc\(var\(--card-width\) \* \.27\)/);
    assert.match(rule, /height: calc\(var\(--card-width\) \* \.31\)/);
    assert.match(rule, /line-height: calc\(var\(--card-width\) \* \.31\)/);
    assert.match(rule, /letter-spacing: 0/);
    assert.doesNotMatch(themeSource + uiSource, /hand-rank-size|hand-suit-size|data-rank[^\n]*10[^\n]*font-size/);
    const game = createGame();
    for (const rank of [3, 5, 6, 7, 8, 9, 10, 11, 12]) {
        game.fixture({ hands: [[card(rank, rank === 11 ? 1 : 0)], [card(0, 1)], [card(1, 1)]] });
        const face = game.el('pdk-you').querySelector('.pcard');
        assert.equal(face.dataset.rank, game.PK.RANK_NAME[rank]);
        const boxes = face.querySelectorAll('b');
        assert.equal(boxes.length, 2);
        assert.equal(boxes[0].textContent, boxes[1].textContent);
    }
});

test('every pip box clears both corner boxes and other pips at all card sizes', () => {
    // Arithmetic checks explicit CSS geometry, including the 1px borders.
    // Browser glyph rasterization remains a separate visual QA requirement.
    assert.match(themeSource, /\.pdk-pips \{[^}]*\.22\)[^}]*\.36\)/);
    assert.match(themeSource, /\.pdk-pip \{[^}]*width: calc\(var\(--card-width\) \* \.12\)[^}]*height: calc\(var\(--card-width\) \* \.13\)/);
    const game = createGame();
    const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (const width of [44, 48, 54, 56, 68, 72, 80, 96, 112]) {
        const innerWidth = width - 2;
        const innerHeight = width * 1.43 - 2;
        const corner = { x: width * .03, y: width * .03, w: width * .31, h: width * .53 };
        const opposite = { x: innerWidth - corner.x - corner.w, y: innerHeight - corner.y - corner.h, w: corner.w, h: corner.h };
        for (const [rank, points] of Object.entries(game.api.pips)) {
            const pips = points.map(([x, y]) => ({
                x: width * .36 + (innerWidth - width * .72) * x / 100 - width * .06,
                y: width * .22 + (innerHeight - width * .44) * y / 100 - width * .065,
                w: width * .12, h: width * .13
            }));
            pips.forEach((pip, index) => {
                assert.equal(intersects(pip, corner), false, `${width}px ${rank}: top corner`);
                assert.equal(intersects(pip, opposite), false, `${width}px ${rank}: bottom corner`);
                pips.slice(index + 1).forEach(other => assert.equal(intersects(pip, other), false, `${width}px ${rank}: separate pip boxes`));
            });
        }
    }
});

test('counter ranks and counts share lining/tabular typography without rank-specific offsets', () => {
    const rule = themeSource.match(/\.pdk-counter-cell span, \.pdk-counter-cell b \{([^}]+)\}/)[1];
    assert.match(rule, /font: 700 15px\/1\.2 Arial, Helvetica, sans-serif/);
    assert.match(rule, /font-variant-numeric: lining-nums tabular-nums/);
    const game = createGame();
    const cells = game.el('pdk-counter-ranks').children;
    assert.equal(cells.length, 13);
    assert.deepEqual(cells.map(cell => cell.querySelector('span').textContent), ['2', 'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3']);
    cells.forEach(cell => {
        assert.ok(cell.querySelector('b'));
        assert.equal(cell.querySelector('span').getAttribute('style'), null);
    });
});

test('complete court artwork is centered, uncropped and clear of the rank and suit boxes', () => {
    const rule = themeSource.match(/\.pdk-court \{([^}]+)\}/)[1];
    assert.match(rule, /left: 50%; top: 50%; width: 38%; height: auto/);
    assert.match(rule, /aspect-ratio: 98 \/ 166/);
    assert.match(rule, /transform: translate\(-50%, -50%\)/);
    assert.match(rule, /object-fit: contain/);
    assert.match(themeSource, /\.pdk-table \.pcard \.pdk-corner i \{[^}]*width: calc\(var\(--card-width\) \* \.20\)/);
    for (const rank of ['jack', 'queen', 'king']) {
        const svg = fs.readFileSync(path.join(root, 'game/assets/paodekuai/court-' + rank + '.svg'), 'utf8');
        assert.match(svg, /viewBox="0 0 98 166"/);
    }
    const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (const width of [44, 48, 54, 56, 68, 72, 80, 96, 112]) {
        const innerWidth = width - 2;
        const innerHeight = width * 1.43 - 2;
        const court = { x: innerWidth * .31, y: (innerHeight - innerWidth * .38 * 166 / 98) / 2, w: innerWidth * .38, h: innerWidth * .38 * 166 / 98 };
        const rank = { x: width * .03, y: width * .03, w: width * .31, h: width * .31 };
        const suit = { x: width * .085, y: width * .34, w: width * .20, h: width * .22 };
        for (const box of [rank, suit]) {
            const opposite = { x: innerWidth - box.x - box.w, y: innerHeight - box.y - box.h, w: box.w, h: box.h };
            assert.equal(overlaps(court, box), false, width + 'px: top corner');
            assert.equal(overlaps(court, opposite), false, width + 'px: bottom corner');
        }
        assert.ok(Math.abs(court.x + court.w / 2 - innerWidth / 2) < 1e-9);
        assert.ok(Math.abs(court.y + court.h / 2 - innerHeight / 2) < 1e-9);
    }
});

test('16-card hands and 17/20-card stress fixtures retain readable strips and fit balanced rows', () => {
    const game = createGame();
    // Explicit sizes model typical phone, landscape and desktop content widths.
    // They test the real layout algorithm, not CSS rendering or native hit tests.
    for (const [hostWidth, width] of [[276, 68], [316, 68], [378, 68], [520, 56], [704, 64], [920, 80], [1300, 96], [1760, 112]]) {
        for (const count of [1, 16, 17, 20]) {
            const host = new Element();
            host.clientWidth = hostWidth;
            const faces = Array.from({ length: count }, () => {
                const face = new Element('button');
                face.getBoundingClientRect = () => ({ width });
                return face;
            });
            game.api.fitRow(host, faces);
            const columns = Number(host.dataset.cardColumns);
            const match = host.style.gridTemplateColumns.match(/^repeat\((\d+), ([\d.]+)px\) ([\d.]+)px$/);
            if (count === 1) { assert.equal(columns, 1); assert.equal(host.style.gridTemplateColumns, width + 'px'); continue; }
            assert.ok(match, host.style.gridTemplateColumns);
            const step = Number(match[2]);
            assert.ok(step >= Math.max(24, width * .40) - 1e-9, 'Do not obscure the rank to avoid wrapping.');
            assert.ok(width + (columns - 1) * step <= hostWidth - 12 + 1e-9, 'Every row stays inside the host.');
            assert.ok(columns <= count);
            assert.equal(Number(match[1]) + 1, columns);
            assert.equal(Number(match[3]), width, 'Card width is never changed by overlap.');
        }
    }
    const host = new Element();
    host.clientWidth = 316;
    game.api.fitRow(host, Array.from({ length: 16 }, () => ({ getBoundingClientRect: () => ({ width: 68 }) })));
    assert.equal(host.dataset.cardColumns, '8');
    host.clientWidth = 278;
    game.api.fitRow(host, Array.from({ length: 16 }, () => ({ getBoundingClientRect: () => ({ width: 68 }) })));
    assert.equal(host.dataset.cardColumns, '8', 'A 320px phone should retain two eight-card rows.');
    game.api.fitRow(host, []);
    assert.equal(host.style.gridTemplateColumns, 'none');
    assert.equal(host.dataset.cardColumns, '0');
});

test('two-row horizontal selection stays in its row and cancellation restores selection', () => {
    const game = createGame();
    const input = gestureFixture(game);
    input.hand.dataset.cardColumns = '3';
    input.faces.forEach((face, index) => {
        const left = (index % 3) * 30;
        const top = Math.floor(index / 3) * 115;
        face.getBoundingClientRect = () => ({ left, top, right: left + 60, bottom: top + 90, width: 60, height: 90 });
    });
    input.dispatch('pointerdown', 0, { clientX: 5, clientY: 20 });
    input.dispatch('pointermove', 2, { clientX: 65, clientY: 20 });
    input.dispatch('pointerup', 2, { clientX: 65, clientY: 20 });
    assert.deepEqual(input.selectedIndices(), [0, 1, 2]);
    input.dispatch('pointerdown', 3, { clientX: 5, clientY: 135 });
    input.dispatch('pointermove', 5, { clientX: 65, clientY: 135 });
    assert.deepEqual(input.selectedIndices(), [0, 1, 2, 3, 4, 5]);
    input.dispatch('pointercancel', 5, { clientX: 65, clientY: 135 });
    assert.deepEqual(input.selectedIndices(), [0, 1, 2]);
    input.dispatch('pointerdown', 4, { clientX: 35, clientY: 135 });
    input.dispatch('pointerup', 4, { clientX: 35, clientY: 135 });
    assert.deepEqual(input.selectedIndices(), [0, 1, 2, 4]);
});

test('16/17/20-card hands keep tap, drag and reverse-drag selection inside every grid row', () => {
    for (const count of [16, 17, 20]) {
        const game = createGame();
        game.fixture({ hands: [clone(game.PK.freshDeck()).slice(0, count), [card(11, 1), card(11, 2)], [card(10, 1), card(10, 2)]] });
        const input = pointerHand(game);
        const width = 68;
        input.hand.clientWidth = 316;
        input.faces.forEach(face => { face.getBoundingClientRect = () => ({ width }); });
        game.api.fitRow(input.hand, input.faces);
        const columns = Number(input.hand.dataset.cardColumns);
        const step = Number(input.hand.style.gridTemplateColumns.match(/repeat\(\d+, ([\d.]+)px\)/)[1]);
        const point = (index, lift = false) => ({
            clientX: (index % columns) * step + 8,
            clientY: Math.floor(index / columns) * (width * 1.43 + 25) + (lift ? -8 : 20)
        });
        input.faces.forEach((face, index) => {
            face.getBoundingClientRect = () => {
                const left = (index % columns) * step;
                const top = Math.floor(index / columns) * (width * 1.43 + 25) - (face.classList.contains('is-selected') ? 17 : 0);
                return { left, top, right: left + width, bottom: top + width * 1.43, width, height: width * 1.43 };
            };
        });
        for (let first = 0; first < count; first += columns) {
            const last = Math.min(first + columns, count) - 1;
            const row = Array.from({ length: last - first + 1 }, (_, index) => first + index);
            input.dispatch('pointerdown', first, point(first));
            input.dispatch('pointermove', last, point(last));
            input.dispatch('pointerup', last, point(last));
            assert.deepEqual(input.selectedIndices(), row, count + ' cards: forward row ' + first);
            // The raised edge is above unselected neighbors. A reverse drag
            // from it must still traverse this row, without jumping to another.
            input.dispatch('pointerdown', last, point(last, true));
            input.dispatch('pointermove', first, point(first, true));
            input.dispatch('pointerup', first, point(first, true));
            assert.deepEqual(input.selectedIndices(), [], count + ' cards: reverse row ' + first);
            input.dispatch('pointerdown', last, point(last));
            input.dispatch('pointerup', last, point(last));
            assert.deepEqual(input.selectedIndices(), [last], count + ' cards: tap row end');
            input.dispatch('pointerdown', first, point(first));
            input.dispatch('pointermove', last, point(last));
            input.dispatch('pointercancel', last, point(last));
            assert.deepEqual(input.selectedIndices(), [last], 'Cancellation restores row selection.');
            input.dispatch('pointerdown', last, point(last));
            input.dispatch('pointerup', last, point(last));
            assert.deepEqual(input.selectedIndices(), []);
        }
    }
});

test('dragging from a lifted card reaches unselected neighbors and stays in its original row', () => {
    const game = createGame();
    const input = gestureFixture(game);
    input.hand.dataset.cardColumns = '3';
    input.faces.forEach((face, index) => {
        face.getBoundingClientRect = () => {
            const left = (index % 3) * 30;
            const top = Math.floor(index / 3) * 115 - (face.classList.contains('is-selected') ? 17 : 0);
            return { left, top, right: left + 60, bottom: top + 90, width: 60, height: 90 };
        };
    });
    input.dispatch('pointerdown', 1, { clientX: 35, clientY: 20 });
    input.dispatch('pointerup', 1, { clientX: 35, clientY: 20 });
    input.dispatch('pointerdown', 1, { clientX: 35, clientY: -8 });
    input.dispatch('pointermove', 2, { clientX: 65, clientY: -8 });
    input.dispatch('pointerup', 2, { clientX: 65, clientY: -8 });
    assert.deepEqual(input.selectedIndices(), []);
    input.dispatch('pointerdown', 0, { clientX: 5, clientY: 20 });
    // Large horizontal movement with some vertical drift must remain in row 1.
    input.dispatch('pointermove', 5, { clientX: 250, clientY: 135 });
    assert.deepEqual(input.selectedIndices(), [0, 1, 2]);
    input.dispatch('pointercancel', 5, { clientX: 250, clientY: 135 });
    assert.deepEqual(input.selectedIndices(), []);
});

test('expanded view and orientation changes preserve state and selection; modal Escape stays modal', () => {
    const game = createGame({ gameView: true });
    gestureFixture(game);
    game.select([card(5), card(3)]);
    const state = JSON.stringify(game.api.state);
    const selection = key(game.api.selectedCards());
    const view = game.document.querySelector('[data-game-view]');
    const fullscreen = view.querySelector('[data-game-fullscreen]');
    fullscreen.click();
    assert.ok(view.classList.contains('is-expanded'));
    assert.equal(fullscreen.getAttribute('aria-pressed'), 'true');
    while (game.timers.size) game.drainOne();
    assert.equal(JSON.stringify(game.api.state), state);
    assert.equal(key(game.api.selectedCards()), selection);
    game.document.dispatchEvent({ type: 'orientationchange' });
    while (game.timers.size) game.drainOne();
    assert.equal(key(game.api.selectedCards()), selection);
    game.click('pdk-restart');
    game.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.ok(view.classList.contains('is-expanded'));
    game.click('pdk-restart-cancel');
    assert.equal(JSON.stringify(game.api.state), state);
    assert.equal(key(game.api.selectedCards()), selection);
    game.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.equal(view.classList.contains('is-expanded'), false);
    assert.equal(fullscreen.getAttribute('aria-pressed'), 'false');
    assert.equal(JSON.stringify(game.api.state), state);
    assert.equal(key(game.api.selectedCards()), selection);
});

test('12 complete UI games conserve every card and update public counts every turn', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
        const game = createGame({ seed });
        game.clearTimers();
        game.api.thinking = false;
        let steps = 0;
        while (game.api.state.over === null && steps < 300) {
            const state = game.api.state;
            const seat = state.turn;
            const move = game.PK.chooseMove(state.hands[seat], state.lead, rule(game, seat));
            assert.ok(move);
            const answers = game.PK.answerMoves(state.hands[seat], state.lead, rule(game, seat));
            if (move.pass) assert.equal(answers.length, 0, 'No legal answer may be skipped.');
            else {
                assert.ok(answers.some(answer => key(answer.cards) === key(move.cards)));
                if (state.opening) assert.ok(game.PK.hasCard(move.cards, card(0, 0)));
            }
            game.api.commit(seat, move);
            game.api.render();
            const all = [].concat(...game.api.state.hands, game.api.state.played);
            assert.equal(all.length, 48);
            assert.equal(new Set(all.map(game.PK.cardKey)).size, 48);
            assertCounter(game);
            assert.equal(Number(game.el('pdk-remaining').textContent), game.api.state.hands[1].length + game.api.state.hands[2].length);
            steps += 1;
        }
        assert.ok(steps < 300, 'A complete game must terminate.');
        assert.equal(visible(game.el('pdk-again')), true);
        assert.equal(visible(game.el('pdk-actions')), false);
        const saved = JSON.parse(game.storage['mylog-paodekuai']);
        assert.equal(saved.games, 1);
        assert.equal(saved.wins, game.api.state.over === 0 ? 1 : 0);
    }
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exitCode = 1;
