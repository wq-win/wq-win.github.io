#!/usr/bin/env node
'use strict';

// Dependency-free UI regressions. Run from any directory with:
//   node tools/doudizhu-ui-test.js
// The production IIFE is instrumented only in this VM; no debug API ships.
// This intentionally does not model CSS layout or native pointer hit testing.
// Verify desktop/mobile layout and native interactions in a real browser too.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'game/doudizhu.html'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'js/doudizhu-engine.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js/doudizhu.js'), 'utf8');
const viewSource = fs.readFileSync(path.join(root, 'js/game-view.js'), 'utf8');
const viewCss = fs.readFileSync(path.join(root, 'css/game-view.css'), 'utf8');
const levelsSource = fs.readFileSync(path.join(root, 'js/doudizhu-levels.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(root, 'css/doudizhu.css'), 'utf8');
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
function counts(...ranks) { const result = Array(15).fill(0); ranks.forEach(rank => { result[rank] += 1; }); return result; }
function single(rank) { return { t: 'single', r: rank, n: 1, kick: [], cards: [rank], pass: false }; }
function key(move) { return move.pass ? 'pass' : move.cards.slice().sort((a, b) => a - b).join(','); }
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
    focus() { if (this.disabled) return; this.focused = true; if (this.ownerDocument) this.ownerDocument.activeElement = this; }
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
    document.elementFromPoint = () => null;
    const timers = new Map();
    const allTimers = new Map();
    let timerId = 0;
    const storage = Object.assign({}, options.storage);
    const sandbox = {
        CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
        document, console, innerWidth: 1024, innerHeight: 768,
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
            getItem(name) { if (options.blockRead || options.blockStorage) throw Error('Storage read blocked'); return storage[name] ?? null; },
            setItem(name, value) { if (options.blockWrite || options.blockStorage) throw Error('Storage write blocked'); storage[name] = value; }
        }
    };
    sandbox.Math = Object.create(Math);
    sandbox.Math.random = seeded(options.seed || 42);
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.requestAnimationFrame = fn => sandbox.setTimeout(fn, 16);
    sandbox.cancelAnimationFrame = sandbox.clearTimeout;
    const context = vm.createContext(sandbox);
    vm.runInContext(engineSource, context, { filename: 'doudizhu-engine.js' });
    vm.runInContext(levelsSource, context, { filename: 'doudizhu-levels.js' });
    if (options.levels) sandbox.DOUDIZHU_LEVELS = clone(options.levels);
    const navigationScripts = Array.from(page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))
        .filter(match => !/\bsrc=/.test(match[1]) && match[2].includes('dd-levels') && match[2].includes('DOUDIZHU_LEVELS'));
    assert.equal(navigationScripts.length, 1, 'Expected exactly one inline level navigation initializer.');
    vm.runInContext(navigationScripts[0][2], context, { filename: 'doudizhu.html:level-navigation' });
    const instrumentation = `
    window.__uiTest = {
        get state() { return state; },
        set state(value) { state = value; },
        get selected() { return selected; },
        set selected(value) { selected = value; },
        get paused() { return paused; },
        get hinting() { return hinting; },
        get thinking() { return thinking; },
        set thinking(value) { thinking = value; },
        render: render, load: load, selectedCounts: selectedCounts,
        matchingMove: matchingMove, playMove: playMove, playPass: playPass,
        opponentTurn: opponentTurn, showHint: showHint,
        requestRestart: requestRestart, cancelRestart: cancelRestart
    };
`;
    assert.match(uiSource, /\}\(\)\);\s*$/, 'The UI should retain an isolated IIFE; update test instrumentation if its module format changes.');
    vm.runInContext(uiSource.replace(/\}\(\)\);\s*$/, instrumentation + '}());'), context, { filename: 'doudizhu.js' });
    vm.runInContext(viewSource, context, { filename: 'game-view.js' });
    const api = sandbox.__uiTest;
    return {
        api, DD: sandbox.Doudizhu, levels: sandbox.DOUDIZHU_LEVELS, document, sandbox, timers, allTimers, storage,
        el(id) { const element = document.getElementById(id); assert.ok(element, 'Missing #' + id); return element; },
        click(id) { this.el(id).click(); },
        hint() {
            this.click('dd-hint');
            assert.equal(api.hinting, true, 'Hint should yield before computing.');
            assert.equal(this.timers.size, 1);
            this.drainOne();
            assert.equal(api.hinting, false);
        },
        drainOne() {
            const timer = timers.values().next().value;
            assert.ok(timer, 'Expected a pending timeout');
            timers.delete(timer.id);
            timer.fn();
            return timer;
        },
        fixture(update = {}) {
            api.load(0);
            timers.clear();
            api.thinking = false;
            api.selected = {};
            api.state = Object.assign(clone(api.state), {
                you: counts(0, 2), opp: counts(3, 4),
                turn: 'you', lead: null, last: null, over: null, moves: 1
            }, update);
            api.render();
            return api.state;
        },
        select(ranks) {
            api.selected = {};
            const available = api.state.youView.slice();
            ranks.forEach(rank => {
                const index = available.findIndex(c => c.r === rank);
                assert.ok(index >= 0, 'Selection must be owned: ' + rank);
                api.selected[available[index].id] = 1;
                available.splice(index, 1);
            });
            api.render();
        }
    };
}

function visible(element) { return !element.hidden && (!element.parentNode || visible(element.parentNode)); }
function localResource(url, base = path.join(root, 'game')) {
    assert.equal(typeof url, 'string', 'A resource must have a URL.');
    assert.doesNotMatch(url, /^(?:[a-z]+:|\/\/)/i, 'Game artwork should load from the repository, not a remote service.');
    const pathname = url.split(/[?#]/)[0];
    const resolved = pathname.startsWith('/') ? path.join(root, pathname.slice(1)) : path.resolve(base, pathname);
    assert.ok(resolved.startsWith(root + path.sep), 'A resource must stay in the published repository: ' + url);
    assert.ok(fs.existsSync(resolved), 'Missing local asset: ' + url);
    assert.equal(fs.statSync(resolved).isFile(), true, 'Expected an asset file: ' + url);
    const bytes = fs.readFileSync(resolved);
    assert.ok(bytes.length, 'Empty local asset: ' + url);
    return { resolved, bytes };
}

function fullDeck(game) {
    const deck = Array(13).fill(4).concat([1, 1]);
    game.fixture({ you: deck, opp: counts() });
    return game.api.state.youView.map(card => ({
        card,
        face: game.el('dd-you').querySelector('[data-card-id="' + card.id + '"]')
    }));
}

function gameState(game) {
    const s = game.api.state;
    return JSON.stringify({ level: s.level, you: s.you, opp: s.opp, lead: s.lead, turn: s.turn, last: s.last, over: s.over });
}
function win(game) {
    game.fixture({ you: counts(3), opp: counts(4, 5) });
    game.select([3]);
    game.click('dd-play');
    assert.equal(game.api.state.over, 'you');
}
function pendingOpponent(game) {
    game.fixture({ you: counts(0, 2), opp: counts(3, 4), turn: 'opp', lead: single(1) });
    game.api.opponentTurn();
    assert.equal(game.api.thinking, true);
    assert.equal(game.timers.size, 1);
    return Array.from(game.timers.values());
}
const STORAGE_KEY = 'mylog-doudizhu-cleared-v2';

// Level contents and rule implementation must remain unchanged by a UI refresh.
test('original engine remains byte-for-byte unchanged', () => {
    assert.equal(crypto.createHash('sha256').update(engineSource).digest('hex'), '50f034fdea65f512e751b8264f5ab3e0e70c1d81514bea0e75b56b41187fa09b');
});

test('the first 11 levels stay, and five later levels add other patterns', () => {
    const game = createGame();
    assert.equal(game.levels.length, 16);
    assert.deepEqual(clone(game.levels.map(level => level.id)), Array.from({ length: 16 }, (_, i) => i + 1));
    assert.deepEqual(clone(game.levels.slice(0, 11).map(level => [level.youText, level.oppText])), [
        ['Q J J 8 8 6 5 5', '小王 9 9 4 4'],
        ['Q J J 10 6 6 5 5', '大王 J J 6 5 5'],
        ['Q Q J 9 6 6 3 3', '小王 K 10 10 8 4 4'],
        ['Q J J 10 8 8 7 7 3', '大王 2 10 9 9 5'],
        ['Q Q J 6 6 5 5 3', '小王 7 7 4 4'],
        ['Q Q J 9 9 4 4 3', '小王 2 9 9 5 4 4'],
        ['Q Q J 10 7 7 6 6 5', '小王 K 10 8 8 5'],
        ['Q J J 9 8 8 7 6 6 3', '大王 2 10 8 8 7 3 3'],
        ['Q J 10 10 8 8 6 5 5 5', '大王 小王 J J J 9 7 6 3'],
        ['Q Q J 10 10 9 8 7 6 6', 'A K K 10 8 5 5'],
        ['Q 10 10 9 8 6 6 4 4', '小王 10 10 9 6 5 5']
    ]);
    assert.deepEqual(clone(game.levels.slice(11).map(level => level.youText)), [
        'A K J 9 7 6 5 4 3',
        'A 10 10 9 9 8 8 7',
        '2 10 10 9 9 8 8 6',
        'A 10 10 9 3 3 3 3',
        'A K K Q J 10 9'
    ]);
});

test('required controls are unique and local page assets exist', () => {
    const ids = Array.from(page.matchAll(/\bid="([^"]+)"/g), match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'Duplicate IDs make action routing ambiguous.');
    for (const match of uiSource.matchAll(/(?:element|document\.getElementById)\('([^']+)'\)/g)) {
        assert.ok(ids.includes(match[1]), 'Missing controller target #' + match[1]);
    }
    for (const match of page.matchAll(/(?:src|href)="([^"#]+)"/g)) {
        const url = match[1];
        if (/^(?:https?:|data:|mailto:)/.test(url)) continue;
        const assetPath = url.split(/[?#]/)[0];
        const local = assetPath.startsWith('/') ? path.join(root, assetPath) : path.resolve(root, 'game', assetPath);
        assert.ok(fs.existsSync(local), 'Missing page asset or link: ' + url);
    }
    assert.doesNotMatch(page, /id="dd-win"/, 'The old fullscreen auto-advance result layer should be gone.');
    assert.match(page, /<dialog\b[^>]*id="dd-restart-dialog"/);
});

test('all static, CSS and dynamically rendered artwork references are local and nonempty', () => {
    const game = createGame();
    fullDeck(game);
    const references = [];
    for (const match of page.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
        if (!/^(?:[a-z]+:|#|\/\/)/i.test(match[1])) references.push([match[1], path.join(root, 'game')]);
    }
    for (const match of cssSource.matchAll(/url\(\s*["']?([^\)"']+)/g)) {
        references.push([match[1].trim(), path.join(root, 'css')]);
    }
    game.document.querySelectorAll('img').forEach(img => references.push([img.getAttribute('src'), path.join(root, 'game')]));
    references.forEach(([url, base]) => localResource(url, base));
});

test('theme selectors stay scoped and load after shared card styles', () => {
    assert.ok(page.indexOf('../css/cards.css') < page.indexOf('../css/doudizhu.css'));
    const uncommented = cssSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = Array.from(uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g));
    assert.ok(rules.length > 0);
    rules.forEach(rule => rule[1].trim().split(',').forEach(selector => {
        assert.match(selector.trim(), /^\.dd-(?:table|page(?:-body)?)(?:[\s.:#>]|$)/, 'Theme selector escapes the Dou Dizhu page: ' + selector.trim());
    }));
    assert.match(cssSource, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    assert.match(cssSource, /@media\s*\(max-width:\s*520px\)/);
    assert.match(cssSource, /\.dd-table\s+\.dd-row\s*\{[^}]*flex-wrap:\s*wrap/);
});

test('every original level keeps two face-up hands and accurate visible counts', () => {
    const game = createGame();
    game.levels.forEach((level, index) => {
        game.api.load(index);
        for (const [host, view, hand, count] of [
            ['dd-you', 'youView', 'you', 'dd-you-count'],
            ['dd-opp', 'oppView', 'opp', 'dd-opp-count']
        ]) {
            const cards = game.el(host).querySelectorAll('.pcard');
            assert.equal(cards.length, game.DD.sum(game.api.state[hand]));
            assert.match(game.el(count).textContent, new RegExp('^' + cards.length + ' 张'));
            assert.equal(visible(game.el(host)), true);
            assert.equal(game.el(host).getAttribute('aria-hidden'), null);
            cards.forEach((face, i) => {
                const card = game.api.state[view][i];
                assert.equal(visible(face), true);
                assert.equal(face.classList.contains('back'), false, 'Opponent cards must remain public in this 1v1 puzzle.');
                assert.equal(face.getAttribute('aria-label'), card.r >= 13 ? game.DD.RANK_NAME[card.r] : card.s + game.DD.RANK_NAME[card.r]);
                assert.equal(face.disabled, host === 'dd-opp');
            });
        }
    });
});

test('all 54 rendered cards retain unique rank/suit names and correct red/black identity', () => {
    const game = createGame();
    const deck = fullDeck(game);
    assert.equal(deck.length, 54);
    assert.equal(new Set(deck.map(({ face }) => face.getAttribute('aria-label'))).size, 54);
    deck.forEach(({ card, face }) => {
        assert.equal(face.classList.contains('red'), card.s === '♥' || card.s === '♦' || card.r === 14);
        assert.equal(face.classList.contains('dd-joker'), card.r >= 13);
        assert.equal(face.classList.contains('dd-joker-big'), card.r === 14);
        assert.equal(face.getAttribute('aria-pressed'), 'false');
        assert.equal(face.querySelectorAll('button, a, input, select, textarea').length, 0, 'Card artwork must not contain interactive descendants.');
    });
    assert.equal(deck.filter(({ face }) => face.classList.contains('red')).length, 27);
});

test('exactly two framed portraits identify the visible 1v1 seats', () => {
    const game = createGame();
    assert.equal(game.document.querySelectorAll('.dd-seat').length, 2);
    assert.equal(game.document.querySelectorAll('.dd-avatar').length, 2);
    const sources = new Set();
    for (const who of ['you', 'opp']) {
        const seat = game.el('dd-' + who + '-seat');
        assert.equal(seat.contains(game.el('dd-' + who)), true);
        const frame = seat.querySelector('.dd-avatar');
        assert.ok(frame, 'Each player should have a framed portrait.');
        assert.ok(frame.querySelector('.dd-avatar-badge'));
        const image = frame.querySelector('img');
        assert.ok(image);
        assert.ok(image.getAttribute('alt').trim(), 'Portraits should have descriptive alternative text.');
        assert.equal(image.getAttribute('draggable'), 'false');
        assert.equal(image.getAttribute('width'), '640');
        assert.equal(image.getAttribute('height'), '640');
        const { bytes } = localResource(image.getAttribute('src'));
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
        sources.add(image.getAttribute('src'));
    }
    assert.equal(sources.size, 2, 'The human and opponent should have distinct portraits.');
    const emblem = game.document.querySelector('.dd-deck-emblem');
    assert.ok(emblem);
    assert.equal(emblem.closest('[aria-hidden="true"]').classList.contains('dd-table-mark'), true);
    assert.equal(emblem.querySelectorAll('img').length, 2);
    emblem.querySelectorAll('img').forEach(img => {
        assert.equal(img.getAttribute('alt'), '');
        assert.equal(img.getAttribute('draggable'), 'false');
    });
    for (const who of ['you', 'opp']) {
        assert.equal(game.el('dd-' + who).querySelectorAll('img').some(img => /card-back/.test(img.getAttribute('src'))), false);
    }
});

test('all 52 normal faces have two matching accessible-hidden corner indices', () => {
    const game = createGame();
    const normal = fullDeck(game).filter(({ card }) => card.r < 13);
    assert.equal(normal.length, 52);
    normal.forEach(({ card, face }) => {
        const corners = face.querySelectorAll('.dd-corner');
        assert.equal(corners.length, 2);
        assert.equal(corners[0].classList.contains('dd-corner-bottom'), false);
        assert.equal(corners[1].classList.contains('dd-corner-bottom'), true);
        corners.forEach(corner => {
            assert.equal(corner.getAttribute('aria-hidden'), 'true');
            assert.equal(corner.querySelector('b').textContent, game.DD.RANK_NAME[card.r]);
            assert.equal(corner.querySelector('i').textContent, card.s);
        });
        assert.equal(face.querySelector('.dd-joker-mark'), null);
    });
});

test('ace and 2 through 10 use the correct number of distinct suit pips', () => {
    const game = createGame();
    fullDeck(game).filter(({ card }) => card.r <= 7 || card.r >= 11 && card.r < 13).forEach(({ card, face }) => {
        const label = game.DD.RANK_NAME[card.r];
        assert.equal(face.querySelector('.dd-court'), null);
        if (label === 'A') {
            const ace = face.querySelector('.dd-ace');
            assert.ok(ace);
            assert.equal(ace.textContent, card.s);
            assert.equal(ace.getAttribute('aria-hidden'), 'true');
            assert.equal(face.querySelectorAll('.dd-pip').length, 0);
        } else {
            const pips = face.querySelectorAll('.dd-pip');
            assert.equal(pips.length, Number(label), label + ' must have exactly ' + label + ' pips.');
            assert.equal(face.querySelector('.dd-pips').getAttribute('aria-hidden'), 'true');
            assert.equal(new Set(pips.map(pip => pip.getAttribute('style'))).size, pips.length);
            pips.forEach(pip => {
                assert.equal(pip.textContent, card.s);
                const point = pip.getAttribute('style').match(/^left:([\d.]+)%;top:([\d.]+)%$/);
                assert.ok(point, 'Pips must have explicit relative coordinates.');
                assert.ok(Number(point[1]) > 0 && Number(point[1]) < 100);
                assert.ok(Number(point[2]) > 0 && Number(point[2]) < 100);
                assert.equal(pip.classList.contains('is-flipped'), Number(point[2]) > 50);
            });
        }
    });
});

test('each court rank uses distinct local double-ended artwork with decorative image semantics', () => {
    const game = createGame();
    const sources = new Map();
    fullDeck(game).filter(({ card }) => card.r >= 8 && card.r <= 10).forEach(({ card, face }) => {
        const court = face.querySelector('.dd-court');
        assert.ok(court);
        assert.equal(court.tagName, 'IMG');
        assert.equal(court.getAttribute('alt'), '');
        assert.equal(court.getAttribute('draggable'), 'false');
        assert.equal(face.querySelectorAll('.dd-pip').length, 0);
        const label = game.DD.RANK_NAME[card.r];
        const expected = { J: 'jack', Q: 'queen', K: 'king' }[label];
        assert.ok(court.getAttribute('src').endsWith('court-' + expected + '.svg'));
        const { bytes } = localResource(court.getAttribute('src'));
        const svg = bytes.toString('utf8');
        assert.match(svg, /<svg\b/);
        assert.match(svg, /<use\b[^>]*rotate\(180\)/, 'Court artwork should be double-ended.');
        assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\bon\w+=|(?:href|src)=["'](?:https?:|\/\/)/i);
        sources.set(label, crypto.createHash('sha256').update(bytes).digest('hex'));
    });
    assert.equal(sources.size, 3);
    assert.equal(new Set(sources.values()).size, 3);
});

test('seat indicators follow turns, hinting, paused restart and winner state', () => {
    const game = createGame();
    const active = who => game.el('dd-' + who + '-seat').classList.contains('is-turn');
    assert.equal(active('you'), true);
    assert.equal(active('opp'), false);
    game.click('dd-hint');
    assert.match(game.el('dd-you-state').textContent, /提示/);
    game.drainOne();
    pendingOpponent(game);
    assert.equal(active('you'), false);
    assert.equal(active('opp'), true);
    assert.match(game.el('dd-opp-state').textContent, /思考/);
    game.click('dd-retry');
    for (const who of ['you', 'opp']) {
        assert.equal(active(who), false);
        assert.match(game.el('dd-' + who + '-state').textContent, /暂停/);
    }
    game.click('dd-restart-cancel');
    assert.equal(active('opp'), true);
    win(game);
    assert.equal(active('you'), false);
    assert.equal(active('opp'), false);
    assert.equal(game.el('dd-you-seat').classList.contains('is-winner'), true);
    assert.equal(game.el('dd-opp-seat').classList.contains('is-winner'), false);
    assert.match(game.el('dd-you-state').textContent, /获胜/);
    game.click('dd-replay');
    assert.equal(active('you'), true);
    assert.equal(game.el('dd-you-seat').classList.contains('is-winner'), false);
});

test('progress display counts all 16 levels and updates after a win', () => {
    const game = createGame({ storage: { [STORAGE_KEY]: '{"2":1,"7":1,"999":1}' } });
    assert.equal(game.el('dd-progress').textContent, '第 1 / 16 关 · 已过 2 关');
    win(game);
    assert.equal(game.el('dd-progress').textContent, '第 1 / 16 关 · 已过 3 关');
    game.click('dd-next');
    assert.equal(game.el('dd-progress').textContent, '第 2 / 16 关 · 已过 3 关');
});

test('nested card artwork clicks select and deselect without submitting a move', () => {
    const game = createGame();
    game.fixture({ you: counts(0, 7, 8, 9, 10, 11, 12, 13, 14), opp: counts(1, 2) });
    const before = gameState(game);
    const ids = game.api.state.youView.map(card => card.id);
    ids.forEach(id => {
        let face = game.el('dd-you').querySelector('[data-card-id="' + id + '"]');
        assert.ok(face.firstChild, 'A decorated card should have a nested face.');
        face.firstChild.dispatchEvent({ type: 'click', bubbles: true, detail: 1 });
        face = game.el('dd-you').querySelector('[data-card-id="' + id + '"]');
        assert.equal(face.getAttribute('aria-pressed'), 'true');
        assert.equal(face.classList.contains('is-selected'), true);
        assert.equal(game.DD.sum(game.api.selectedCounts()), 1);
        assert.equal(gameState(game), before);
        face.lastChild.dispatchEvent({ type: 'click', bubbles: true, detail: 1 });
        face = game.el('dd-you').querySelector('[data-card-id="' + id + '"]');
        assert.equal(face.getAttribute('aria-pressed'), 'false');
        assert.equal(game.DD.sum(game.api.selectedCounts()), 0);
        assert.equal(gameState(game), before);
    });
    assert.equal(game.timers.size, 0);
});

test('played cards use the same rank artwork and remain passive', () => {
    const game = createGame();
    for (let rank = 0; rank < 15; rank += 1) {
        game.fixture({
            you: counts(rank), opp: counts((rank + 1) % 15),
            last: { who: 'you', move: single(rank), counts: counts(rank) }
        });
        const mine = game.el('dd-you').querySelector('.pcard');
        const played = game.el('dd-trick').querySelector('.pcard');
        assert.ok(played);
        assert.equal(played.innerHTML, mine.innerHTML, 'Trick artwork should use the same face renderer for ' + game.DD.RANK_NAME[rank]);
        assert.equal(played.getAttribute('aria-label'), mine.getAttribute('aria-label'));
        assert.equal(played.disabled, true);
        assert.equal(played.getAttribute('aria-pressed'), null);
        const before = gameState(game);
        played.dispatchEvent({ type: 'click', bubbles: true });
        assert.equal(gameState(game), before);
        assert.equal(game.DD.sum(game.api.selectedCounts()), 0);
    }
});

test('original rank and move rules retain both jokers, bombs and strategic passing', () => {
    const context = vm.createContext({});
    vm.runInContext(engineSource, context);
    const DD = context.Doudizhu;
    assert.equal(DD.RANK_NAME.length, 15);
    assert.equal(DD.RANK_NAME[13], '小王');
    assert.equal(DD.RANK_NAME[14], '大王');
    assert.equal(DD.beats(single(14), single(13)), true);
    assert.equal(DD.beats(single(13), single(14)), false);
    const moves = DD.generateMoves(counts(0, 0, 0, 0, 13, 14));
    const rocket = moves.find(move => move.t === 'rocket');
    const bomb = moves.find(move => move.t === 'bomb');
    assert.ok(rocket && bomb);
    assert.equal(DD.beats(rocket, bomb), true);
    assert.equal(DD.beats(bomb, rocket), false);
    assert.equal(DD.legalMoves(counts(0, 0, 0, 0), rocket).length, 1);
    assert.equal(DD.legalMoves(counts(0, 0, 0, 0), rocket)[0].pass, true);
    assert.equal(DD.legalMoves(counts(0, 0), null).some(move => move.pass), false);
    assert.equal(DD.legalMoves(counts(2), single(1)).some(move => move.pass), true);
});

test('each original level loads original cards and level navigation marks one active item', () => {
    const game = createGame();
    game.levels.forEach((level, index) => {
        const button = game.document.querySelector('[data-level="' + level.id + '"]');
        assert.ok(button);
        button.click();
        assert.equal(game.api.state.level.id, level.id);
        assert.deepEqual(clone(game.api.state.you), clone(level.you));
        assert.deepEqual(clone(game.api.state.opp), clone(level.opp));
        assert.equal(game.document.querySelectorAll('[data-level]').filter(el => el.classList.contains('is-on')).length, 1);
        assert.equal(game.api.state.turn, 'you');
        assert.equal(game.api.state.over, null);
        assert.equal(game.timers.size, 0);
    });
});

test('both joker ranks render, select and remain distinct', () => {
    const game = createGame();
    game.fixture({ you: counts(0, 13, 14), opp: counts(1, 2) });
    const hand = game.el('dd-you');
    assert.match(hand.textContent, /小王/);
    assert.match(hand.textContent, /大王/);
    for (const rank of [13, 14]) {
        game.select([rank]);
        assert.equal(game.api.matchingMove().t, 'single');
        assert.equal(game.api.matchingMove().r, rank);
        assert.equal(game.el('dd-play').disabled, false);
    }
});

test('rocket beats a bomb and can be played as two selected jokers', () => {
    const game = createGame();
    const bomb = game.DD.generateMoves(counts(12, 12, 12, 12)).find(move => move.t === 'bomb');
    game.fixture({ you: counts(0, 13, 14), opp: counts(1, 2), lead: bomb });
    game.select([13, 14]);
    assert.equal(game.api.matchingMove().t, 'rocket');
    game.click('dd-play');
    assert.deepEqual(clone(game.api.state.you), counts(0));
    assert.equal(game.api.state.last.move.t, 'rocket');
    assert.equal(game.api.state.turn, 'opp');
});

test('passing is allowed even when a legal higher card exists', () => {
    const game = createGame();
    game.fixture({ you: counts(0, 11), opp: counts(2, 3), lead: single(10) });
    assert.ok(game.DD.legalMoves(game.api.state.you, game.api.state.lead).some(move => !move.pass));
    assert.equal(game.el('dd-pass').disabled, false);
    const before = clone(game.api.state.you);
    game.click('dd-pass');
    assert.deepEqual(clone(game.api.state.you), before);
    assert.equal(game.api.state.last.pass, true);
    assert.equal(game.api.state.lead, null);
    assert.equal(game.api.state.turn, 'opp');
    assert.equal(game.timers.size, 1);
});

test('leading cannot pass even if the click handler is invoked directly', () => {
    const game = createGame();
    const before = gameState(game);
    assert.equal(game.el('dd-pass').disabled, true);
    game.el('dd-pass').dispatchEvent({ type: 'click' });
    game.api.playPass();
    assert.equal(gameState(game), before);
    assert.equal(game.timers.size, 0);
});

test('empty and illegal mixed selection cannot play', () => {
    const game = createGame();
    game.fixture({ you: counts(0, 2, 6), opp: counts(4, 5) });
    const before = gameState(game);
    assert.equal(game.api.matchingMove(), null);
    assert.equal(game.el('dd-play').disabled, true);
    game.el('dd-play').dispatchEvent({ type: 'click' });
    assert.equal(gameState(game), before);
    game.select([0, 2]);
    assert.equal(game.api.matchingMove(), null);
    assert.equal(game.el('dd-play').disabled, true);
    game.el('dd-play').dispatchEvent({ type: 'click' });
    assert.equal(gameState(game), before);
});

test('forged, out-of-hand and non-beating moves cannot mutate state', () => {
    const game = createGame();
    game.fixture({ you: counts(0, 2), opp: counts(4, 5), lead: single(1) });
    const before = gameState(game);
    for (const move of [null, undefined, {}, single(0), single(14), { ...single(2), cards: [2, 2] }, game.DD.passMove()]) {
        assert.doesNotThrow(() => game.api.playMove(move));
        assert.equal(gameState(game), before);
    }
    assert.equal(game.timers.size, 0);
});

test('human commands are guarded while the opponent thinks and after completion', () => {
    const game = createGame();
    for (const update of [{ turn: 'opp' }, { turn: 'you', over: 'opp' }, { turn: 'you', over: 'you' }]) {
        game.fixture({ you: counts(0, 2), opp: counts(4, 5), lead: single(1), ...update });
        const before = gameState(game);
        game.api.playMove(single(2));
        game.api.playPass();
        game.api.showHint();
        game.el('dd-play').dispatchEvent({ type: 'click' });
        game.el('dd-pass').dispatchEvent({ type: 'click' });
        game.el('dd-hint').dispatchEvent({ type: 'click' });
        assert.equal(gameState(game), before);
        assert.equal(game.timers.size, 0);
        for (const id of ['dd-play', 'dd-pass', 'dd-hint']) assert.equal(game.el(id).disabled, true);
    }
});

test('a strategic hint selects a winning move without submitting it', () => {
    const game = createGame();
    const before = gameState(game);
    const wins = game.DD.winningMoves(game.api.state.you, game.api.state.opp, game.api.state.lead, { n: 0, limit: 2000000 });
    game.hint();
    assert.equal(gameState(game), before);
    const move = game.api.matchingMove();
    assert.ok(move);
    assert.ok(wins.some(winMove => key(winMove) === key(move)));
    assert.equal(game.el('dd-play').disabled, false);
    assert.ok(game.el('dd-hint-text').textContent.trim());
    assert.equal(game.timers.size, 0);
});

test('strategic pass hint is offered even when beating is possible', () => {
    const game = createGame();
    game.fixture({ you: counts(0, 0, 1, 3), opp: counts(0, 1, 1, 2), lead: single(1) });
    const wins = game.DD.winningMoves(game.api.state.you, game.api.state.opp, game.api.state.lead, { n: 0, limit: 2000000 });
    assert.equal(wins.length, 1);
    assert.equal(wins[0].pass, true);
    game.select([3]);
    const before = gameState(game);
    game.hint();
    assert.equal(gameState(game), before);
    assert.equal(game.DD.sum(game.api.selectedCounts()), 0);
    assert.match(game.el('dd-hint-text').textContent, /不出|过牌/);
    assert.equal(game.el('dd-pass').disabled, false);
    assert.equal(game.el('dd-play').disabled, true);
});

test('no-answer hint recommends pass and does not auto-pass', () => {
    const game = createGame();
    game.fixture({ you: counts(0, 2), opp: counts(4, 5), lead: single(14) });
    const before = gameState(game);
    assert.equal(game.el('dd-hint').disabled, false);
    game.hint();
    assert.equal(gameState(game), before);
    assert.match(game.el('dd-hint-text').textContent, /不出|过牌/);
    assert.equal(game.timers.size, 0);
});

test('pending hints disable actions and cannot be submitted or queued twice', () => {
    const game = createGame();
    const before = gameState(game);
    game.click('dd-hint');
    assert.equal(game.api.hinting, true);
    assert.equal(game.timers.size, 1);
    const pending = Array.from(game.timers.values())[0];
    game.api.showHint();
    game.api.playMove(single(9));
    game.api.playPass();
    for (const id of ['dd-hint', 'dd-play', 'dd-pass']) {
        assert.equal(game.el(id).disabled, true);
        game.el(id).dispatchEvent({ type: 'click' });
    }
    assert.equal(game.timers.size, 1);
    assert.equal(Array.from(game.timers.values())[0], pending);
    assert.equal(gameState(game), before);
    game.drainOne();
    assert.equal(game.api.hinting, false);
    assert.equal(gameState(game), before);
    assert.ok(game.api.matchingMove());
});

test('level navigation invalidates pending hints and their already-queued callbacks', () => {
    const game = createGame();
    game.click('dd-hint');
    const old = Array.from(game.timers.values());
    game.document.querySelector('[data-level="2"]').click();
    const before = gameState(game);
    const text = game.el('dd-hint-text').textContent;
    assert.equal(game.api.hinting, false);
    assert.equal(game.timers.size, 0);
    old.forEach(timer => timer.fn());
    assert.equal(gameState(game), before);
    assert.equal(game.DD.sum(game.api.selectedCounts()), 0);
    assert.equal(game.el('dd-hint-text').textContent, text);
});

test('restart pauses a hint, then cancel resumes exactly one fresh hint callback', () => {
    const game = createGame();
    game.fixture({ you: counts(0, 0, 1, 3), opp: counts(0, 1, 1, 2), lead: single(1) });
    game.click('dd-hint');
    const old = Array.from(game.timers.values());
    const before = gameState(game);
    game.click('dd-retry');
    assert.equal(game.api.paused, true);
    assert.equal(game.el('dd-restart-dialog').open, true);
    assert.equal(game.timers.size, 0);
    old.forEach(timer => timer.fn());
    assert.equal(gameState(game), before);
    assert.equal(game.DD.sum(game.api.selectedCounts()), 0);
    game.click('dd-restart-cancel');
    assert.equal(game.api.paused, false);
    assert.equal(game.api.hinting, true);
    assert.equal(game.timers.size, 1);
    old.forEach(timer => timer.fn());
    assert.equal(game.api.hinting, true);
    assert.equal(gameState(game), before);
    game.drainOne();
    assert.equal(game.api.hinting, false);
    assert.match(game.el('dd-hint-text').textContent, /不出/);
    assert.equal(game.timers.size, 0);
});

test('confirmed restart discards pending hint and its stale selection callback', () => {
    const game = createGame();
    game.fixture();
    game.click('dd-hint');
    const old = Array.from(game.timers.values());
    game.click('dd-retry');
    game.click('dd-restart-confirm');
    assert.equal(game.api.hinting, false);
    assert.equal(game.api.paused, false);
    assert.equal(game.timers.size, 0);
    const before = gameState(game);
    old.forEach(timer => timer.fn());
    assert.equal(gameState(game), before);
    assert.equal(game.DD.sum(game.api.selectedCounts()), 0);
});

test('hint search budget failure still offers an explicitly qualified legal move', () => {
    const game = createGame();
    game.DD.winningMoves = () => { throw Error('budget'); };
    const before = gameState(game);
    game.hint();
    assert.equal(gameState(game), before);
    assert.ok(game.api.matchingMove());
    assert.match(game.el('dd-hint-text').textContent, /上限.*合法参考/);
    assert.doesNotMatch(game.el('dd-hint-text').textContent, /保留胜机/);
});

test('all original levels remain winnable through UI hint/play/pass controls', () => {
    const game = createGame();
    game.levels.forEach((level, index) => {
        game.api.load(index);
        let turns = 0;
        while (!game.api.state.over && turns++ < 60) {
            assert.equal(game.api.state.turn, 'you');
            game.hint();
            if (game.api.matchingMove()) game.click('dd-play');
            else {
                assert.match(game.el('dd-hint-text').textContent, /不出|过牌/);
                game.click('dd-pass');
            }
            if (!game.api.state.over) game.drainOne();
        }
        assert.equal(game.api.state.over, 'you', 'Original level ' + level.id + ' should still be solvable.');
        assert.equal(game.api.state.level.id, level.id, 'Completion must not auto-advance.');
        assert.equal(game.timers.size, 0);
    });
    assert.equal(Object.keys(JSON.parse(game.storage[STORAGE_KEY])).length, 16);
    assert.match(game.el('dd-result-title').textContent, /全部通关/);
});

test('win shows in-table next/replay actions and never auto-advances', () => {
    const game = createGame();
    win(game);
    assert.equal(game.api.state.level.id, 1);
    assert.equal(game.timers.size, 0);
    assert.equal(visible(game.el('dd-result')), true);
    assert.equal(visible(game.el('dd-next')), true);
    assert.equal(visible(game.el('dd-replay')), true);
    assert.equal(visible(game.el('dd-play')), false);
    assert.equal(visible(game.el('dd-pass')), false);
    assert.equal(visible(game.el('dd-hint')), false);
    const before = gameState(game);
    game.api.playMove(single(3));
    game.api.playPass();
    assert.equal(gameState(game), before);
    game.click('dd-next');
    assert.equal(game.api.state.level.id, 2);
    assert.equal(game.api.state.over, null);
    assert.equal(visible(game.el('dd-result')), false);
});

test('win replay resets the same level; final win has no next level', () => {
    const game = createGame();
    win(game);
    game.click('dd-replay');
    assert.equal(game.api.state.level.id, 1);
    assert.equal(game.api.state.over, null);
    assert.deepEqual(clone(game.api.state.you), clone(game.levels[0].you));
    game.api.load(game.levels.length - 1);
    game.api.state.you = counts(3);
    game.api.state.opp = counts(4, 5);
    game.api.render();
    game.select([3]);
    game.click('dd-play');
    assert.equal(game.api.state.over, 'you');
    assert.doesNotMatch(game.el('dd-result-title').textContent, /全部通关/, 'Winning only the last level must not claim all levels are cleared.');
    assert.equal(visible(game.el('dd-next')), false);
    assert.equal(visible(game.el('dd-replay')), true);
    assert.equal(game.timers.size, 0);
    game.el('dd-next').dispatchEvent({ type: 'click' });
    assert.equal(game.api.state.level.id, 16);
});

test('opponent completion shows loss retry and resets same level', () => {
    const game = createGame();
    game.fixture({ you: counts(0, 2), opp: counts(4), lead: single(1), turn: 'opp' });
    game.api.opponentTurn();
    game.drainOne();
    assert.equal(game.api.state.over, 'opp');
    assert.equal(game.api.thinking, false);
    assert.equal(game.timers.size, 0);
    assert.equal(visible(game.el('dd-result')), true);
    assert.equal(visible(game.el('dd-next')), false);
    assert.equal(visible(game.el('dd-replay')), true);
    game.click('dd-replay');
    assert.equal(game.api.state.over, null);
    assert.equal(game.api.state.level.id, 1);
});

test('next/replay commands cannot bypass a still-active level', () => {
    const game = createGame();
    game.select([9]);
    const before = gameState(game);
    game.el('dd-next').dispatchEvent({ type: 'click' });
    game.el('dd-replay').dispatchEvent({ type: 'click' });
    assert.equal(gameState(game), before);
});

test('changing level invalidates old AI callbacks even if already queued', () => {
    const game = createGame();
    const old = pendingOpponent(game);
    game.document.querySelector('[data-level="2"]').click();
    assert.equal(game.api.state.level.id, 2);
    assert.equal(game.api.thinking, false);
    old.forEach(timer => assert.equal(game.timers.has(timer.id), false));
    const before = gameState(game);
    old.forEach(timer => timer.fn());
    assert.equal(gameState(game), before);
    assert.equal(game.timers.size, 0);
});

test('restart dialog pauses AI and blocks background commands until dismissed', () => {
    const game = createGame();
    const old = pendingOpponent(game);
    const before = gameState(game);
    game.click('dd-retry');
    assert.equal(game.el('dd-restart-dialog').open, true);
    old.forEach(timer => assert.equal(game.timers.has(timer.id), false));
    old.forEach(timer => timer.fn());
    assert.equal(gameState(game), before);
    game.api.playMove(single(2));
    game.api.playPass();
    game.api.showHint();
    assert.equal(gameState(game), before);
    game.click('dd-restart-cancel');
    assert.equal(game.el('dd-restart-dialog').open, false);
    assert.equal(gameState(game), before);
    assert.equal(game.timers.size, 1);
    old.forEach(timer => timer.fn());
    assert.equal(gameState(game), before, 'A resumed turn must use a new callback, never the paused callback.');
    game.drainOne();
    assert.equal(game.api.state.turn, 'you');
    assert.equal(game.api.thinking, false);
});

test('restart cancel preserves human selection and current position', () => {
    const game = createGame();
    game.select([9]);
    game.api.state.moves = 1;
    const before = gameState(game);
    const picked = JSON.stringify(game.api.selected);
    game.click('dd-retry');
    assert.equal(game.el('dd-restart-dialog').open, true);
    game.click('dd-restart-cancel');
    assert.equal(gameState(game), before);
    assert.equal(JSON.stringify(game.api.selected), picked);
    assert.equal(game.timers.size, 0);
});

test('restart confirmation resets current level and cannot revive stale AI', () => {
    const game = createGame();
    const old = pendingOpponent(game);
    game.click('dd-retry');
    game.click('dd-restart-confirm');
    assert.equal(game.el('dd-restart-dialog').open, false);
    assert.equal(game.api.state.level.id, 1);
    assert.equal(game.api.state.turn, 'you');
    assert.deepEqual(clone(game.api.state.you), clone(game.levels[0].you));
    const before = gameState(game);
    old.forEach(timer => timer.fn());
    assert.equal(gameState(game), before);
    assert.equal(game.timers.size, 0);
});

test('native Escape/cancel resumes exactly one paused opponent turn', () => {
    const game = createGame();
    pendingOpponent(game);
    game.click('dd-retry');
    const before = gameState(game);
    const dialog = game.el('dd-restart-dialog');
    const event = { type: 'cancel', cancelable: true };
    const useDefault = dialog.dispatchEvent(event);
    if (useDefault) dialog.close();
    assert.equal(dialog.open, false);
    assert.equal(gameState(game), before);
    assert.equal(game.timers.size, 1);
    dialog.dispatchEvent({ type: 'close' });
    assert.equal(game.timers.size, 1, 'Repeated close events must not schedule duplicate turns.');
    game.drainOne();
    assert.equal(game.api.state.turn, 'you');
});

test('native dialog close resumes exactly one paused opponent turn', () => {
    const game = createGame();
    pendingOpponent(game);
    game.click('dd-retry');
    const before = gameState(game);
    game.el('dd-restart-dialog').close();
    assert.equal(gameState(game), before);
    assert.equal(game.timers.size, 1);
    game.drainOne();
    assert.equal(game.api.state.turn, 'you');
});

test('an old queued native close event cannot cancel a newly reopened dialog', () => {
    const game = createGame();
    pendingOpponent(game);
    game.click('dd-retry');
    game.click('dd-restart-cancel');
    assert.equal(game.timers.size, 1);
    game.click('dd-retry');
    const before = gameState(game);
    assert.equal(game.el('dd-restart-dialog').open, true);
    game.el('dd-restart-dialog').dispatchEvent({ type: 'close' });
    assert.equal(game.el('dd-restart-dialog').open, true);
    assert.equal(game.api.paused, true);
    assert.equal(game.timers.size, 0);
    assert.equal(gameState(game), before);
    game.click('dd-restart-cancel');
    assert.equal(game.api.paused, false);
    assert.equal(game.timers.size, 1);
});

test('card accessibility state updates and keyboard selection retains focus', () => {
    const game = createGame();
    const card = game.el('dd-you').querySelector('[data-card-id]');
    const id = card.getAttribute('data-card-id');
    assert.ok(card.getAttribute('aria-label'));
    assert.equal(card.getAttribute('aria-pressed'), 'false');
    card.focus();
    card.click();
    const selected = game.el('dd-you').querySelector('[data-card-id="' + id + '"]');
    assert.equal(selected.getAttribute('aria-pressed'), 'true');
    assert.equal(game.document.activeElement, selected);
    game.el('dd-opp').querySelectorAll('button').forEach(button => assert.equal(button.disabled, true));
    game.api.state.moves = 1;
    game.el('dd-retry').focus();
    game.click('dd-retry');
    assert.equal(game.document.activeElement, game.el('dd-restart-cancel'));
    game.click('dd-restart-cancel');
    assert.equal(game.document.activeElement, game.el('dd-retry'));
});

test('repeated opponent scheduling does not create duplicate callbacks', () => {
    const game = createGame();
    pendingOpponent(game);
    game.api.opponentTurn();
    game.api.opponentTurn();
    assert.equal(game.timers.size, 1);
    game.drainOne();
    assert.equal(game.api.state.turn, 'you');
    assert.equal(game.timers.size, 0);
});

test('blocked localStorage read and write cannot break completion', () => {
    for (const options of [{ blockRead: true }, { blockWrite: true }, { blockStorage: true }]) {
        const game = createGame(options);
        assert.doesNotThrow(() => win(game));
        assert.equal(game.api.state.over, 'you');
        assert.equal(visible(game.el('dd-result')), true);
    }
});

test('malformed localStorage shapes cannot break initialization or completion', () => {
    for (const value of ['{', 'null', '[]', 'false', '1', '"text"', '{"1":1,"unrelated":true}']) {
        const game = createGame({ storage: { [STORAGE_KEY]: value } });
        assert.doesNotThrow(() => win(game), value);
        assert.equal(game.api.state.over, 'you');
        assert.equal(visible(game.el('dd-result')), true);
    }
});

test('existing cleared progress is retained when another level is won', () => {
    const game = createGame({ storage: { [STORAGE_KEY]: '{"2":1,"7":1}' } });
    assert.equal(game.document.querySelector('[data-level="2"]').classList.contains('is-cleared'), true);
    win(game);
    const progress = JSON.parse(game.storage[STORAGE_KEY]);
    assert.equal(progress[1], 1);
    assert.equal(progress[2], 1);
    assert.equal(progress[7], 1);
});


test('wide page and safe-area fullscreen remain scoped to Dou Dizhu', () => {
    assert.doesNotMatch(page, /max-w-5xl/);
    assert.match(page, /viewport-fit=cover/);
    assert.match(cssSource, /\.dd-page\s*\{[^}]*width:\s*100%[^}]*max-width:\s*none/);
    assert.match(viewCss, /\.game-page \.game-view\.is-expanded\s*\{[^}]*100dvh[^}]*overflow:\s*auto[^}]*safe-area-inset-top[^}]*safe-area-inset-bottom/);
    assert.doesNotMatch(viewCss, /\.is-expanded,\s*[^{}]*:fullscreen/);
    assert.match(cssSource, /\.dd-table \.dd-levels\s*\{[^}]*overflow-x:\s*auto/);
    assert.match(cssSource, /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*560px\)/);
});

test('all ordinary ranks use one proportional fixed-size lining-numeral box, including 10', () => {
    const game = createGame();
    const deck = fullDeck(game);
    deck.filter(item => item.card.r < 13).forEach(({ face }) => {
        face.querySelectorAll('.dd-corner b').forEach(rank => {
            assert.equal(rank.getAttribute('style'), null, 'No rank-specific shrinking.');
        });
    });
    const rankRules = Array.from(cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter(rule => /\.dd-corner b/.test(rule[1]));
    assert.equal(rankRules.length, 1, 'No breakpoint or trick overrides may disconnect rank size from card size.');
    assert.match(rankRules[0][2], /height:\s*calc\(var\(--dd-card-width\)\s*\*\s*\.31\)/);
    assert.match(rankRules[0][2], /font:\s*700 calc\(var\(--dd-card-width\)\s*\*\s*\.27\)\s*\/\s*1 Arial/);
    assert.match(rankRules[0][2], /font-variant-numeric:\s*lining-nums tabular-nums/);
    assert.match(cssSource, /\.dd-table \.dd-joker-name\s*\{[^}]*height:\s*calc\(var\(--dd-card-width\)\s*\*\s*\.31\)[^}]*font:\s*700 calc\(var\(--dd-card-width\)\s*\*\s*\.27\)/);
    const selectedRanks = new Set(deck.map(item => item.face.getAttribute('aria-label').replace(/[♣♦♥♠]/, '')));
    for (const rank of ['10', 'J', 'Q', 'K', 'A', '小王', '大王']) assert.ok(selectedRanks.has(rank));
});

test('17- and 20-card fixtures keep every card selectable after view changes', () => {
    for (const total of [17, 20]) {
        const game = createGame();
        const hand = Array(15).fill(0);
        for (let index = 0; index < total; index += 1) hand[index % 13] += 1;
        game.fixture({ you: hand, opp: counts(12, 13, 14) });
        game.click('dd-fullscreen');
        assert.equal(game.el('dd-you').querySelectorAll('.pcard').length, total);
        game.el('dd-you').querySelectorAll('.pcard').forEach(face => {
            assert.equal(face.disabled, false);
            face.click();
        });
        assert.equal(game.DD.sum(game.api.selectedCounts()), total);
        game.click('dd-fullscreen');
        assert.equal(game.DD.sum(game.api.selectedCounts()), total);
    }
});

test('unsupported fullscreen falls back to an accessible page-fill toggle without resetting state', () => {
    const game = createGame();
    game.select([8]);
    const state = gameState(game);
    const selection = JSON.stringify(game.api.selected);
    const button = game.el('dd-fullscreen');
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    game.click('dd-fullscreen');
    assert.equal(game.el('dd-table').classList.contains('is-expanded'), true);
    assert.equal(game.document.body.classList.contains('game-view-open'), true);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.match(button.textContent, /退出铺满/);
    game.click('dd-fullscreen');
    assert.equal(game.el('dd-table').classList.contains('is-expanded'), false);
    assert.equal(game.document.body.classList.contains('game-view-open'), false);
    assert.equal(gameState(game), state);
    assert.equal(JSON.stringify(game.api.selected), selection);
    assert.equal(game.document.activeElement, button);
});

test('a disabled Fullscreen API or synchronous rejection retains the usable fallback', () => {
    for (const mode of ['disabled', 'throw']) {
        const game = createGame();
        let calls = 0;
        game.el('dd-table').requestFullscreen = () => { calls += 1; throw Error('Denied'); };
        if (mode === 'disabled') game.document.fullscreenEnabled = false;
        game.click('dd-fullscreen');
        assert.equal(calls, mode === 'disabled' ? 0 : 1);
        assert.equal(game.el('dd-table').classList.contains('is-expanded'), true);
        assert.equal(game.el('dd-fullscreen').disabled, false);
        assert.match(game.el('dd-fullscreen').textContent, /退出铺满/);
        game.click('dd-fullscreen');
        assert.equal(game.document.body.classList.contains('game-view-open'), false);
    }
});

test('pending fullscreen requests are not duplicated, and rejection keeps page-fill usable', () => {
    const game = createGame();
    let calls = 0;
    let reject;
    game.el('dd-table').requestFullscreen = () => { calls += 1; return { then(resolve, failure) { reject = failure; } }; };
    game.click('dd-fullscreen');
    game.click('dd-fullscreen');
    assert.equal(calls, 1);
    assert.equal(game.el('dd-fullscreen').disabled, true);
    reject(Error('Permission denied'));
    assert.equal(game.el('dd-fullscreen').disabled, false);
    assert.equal(game.el('dd-table').classList.contains('is-expanded'), true);
    game.click('dd-fullscreen');
    assert.equal(game.el('dd-table').classList.contains('is-expanded'), false);
});

test('Escape during a pending request restores focus after rejection reenables the button', () => {
    const game = createGame();
    const table = game.el('dd-table');
    const button = game.el('dd-fullscreen');
    let reject;
    table.requestFullscreen = () => ({ then(resolve, failure) { reject = failure; } });
    button.focus();
    game.click('dd-fullscreen');
    assert.equal(button.disabled, true);
    // Real browsers can drop focus when the invoking button becomes disabled.
    game.document.body.focus();
    button.focus();
    assert.equal(game.document.activeElement, game.document.body, 'Disabled controls cannot receive focus.');
    game.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.equal(table.classList.contains('is-expanded'), false);
    assert.equal(game.document.activeElement, game.document.body);
    reject(Error('Permission denied'));
    assert.equal(button.disabled, false);
    assert.equal(game.document.activeElement, button, 'Restore the exit focus after the pending request settles.');
    assert.equal(game.document.body.classList.contains('game-view-open'), false);
});

test('native fullscreen entry and browser Escape restore button, body and selected cards', () => {
    const game = createGame();
    const table = game.el('dd-table');
    let resolve;
    table.requestFullscreen = () => ({ then(success) { resolve = success; } });
    game.select([8]);
    const selection = JSON.stringify(game.api.selected);
    game.click('dd-fullscreen');
    game.document.fullscreenElement = table;
    game.document.dispatchEvent({ type: 'fullscreenchange' });
    resolve();
    assert.match(game.el('dd-fullscreen').textContent, /退出全屏/);
    game.document.fullscreenElement = null;
    game.document.dispatchEvent({ type: 'fullscreenchange' });
    assert.equal(table.classList.contains('is-expanded'), false);
    assert.equal(game.document.body.classList.contains('game-view-open'), false);
    assert.equal(game.el('dd-fullscreen').getAttribute('aria-pressed'), 'false');
    assert.equal(JSON.stringify(game.api.selected), selection);
});

test('native exit failures remain recoverable, then a successful exit restores the page', () => {
    const game = createGame();
    const table = game.el('dd-table');
    table.requestFullscreen = () => {
        game.document.fullscreenElement = table;
        game.document.dispatchEvent({ type: 'fullscreenchange' });
    };
    game.click('dd-fullscreen');
    game.document.exitFullscreen = () => { throw Error('Exit denied'); };
    game.click('dd-fullscreen');
    assert.equal(game.el('dd-fullscreen').disabled, false);
    assert.equal(table.classList.contains('is-expanded'), true);
    assert.match(game.el('dd-view-status').textContent, /请按 Esc/);
    game.document.exitFullscreen = () => {
        game.document.fullscreenElement = null;
        game.document.dispatchEvent({ type: 'fullscreenchange' });
    };
    game.click('dd-fullscreen');
    assert.equal(table.classList.contains('is-expanded'), false);
    assert.equal(game.el('dd-fullscreen').disabled, false);
});

test('fallback Escape closes only the view, leaving an open restart dialog to handle Escape first', () => {
    const game = createGame();
    game.fixture();
    game.click('dd-fullscreen');
    game.click('dd-retry');
    assert.equal(game.el('dd-restart-dialog').open, true);
    game.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.equal(game.el('dd-table').classList.contains('is-expanded'), true);
    game.el('dd-restart-dialog').dispatchEvent({ type: 'cancel' });
    assert.equal(game.api.paused, false);
    assert.equal(game.el('dd-table').classList.contains('is-expanded'), true);
    game.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.equal(game.el('dd-table').classList.contains('is-expanded'), false);
});

test('Escape during a pending request also exits a late native fullscreen entry', () => {
    const game = createGame();
    const table = game.el('dd-table');
    let resolve;
    let exits = 0;
    table.requestFullscreen = () => ({ then(success) { resolve = success; } });
    game.document.exitFullscreen = () => {
        exits += 1;
        game.document.fullscreenElement = null;
        game.document.dispatchEvent({ type: 'fullscreenchange' });
    };
    game.click('dd-fullscreen');
    game.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    game.document.fullscreenElement = table;
    game.document.dispatchEvent({ type: 'fullscreenchange' });
    resolve();
    assert.equal(exits, 1);
    assert.equal(table.classList.contains('is-expanded'), false);
    assert.equal(game.document.body.classList.contains('game-view-open'), false);
    assert.equal(game.el('dd-fullscreen').disabled, false);
});

test('view changes preserve pending hints and opponent timers', () => {
    for (const kind of ['hint', 'opponent']) {
        const game = createGame();
        if (kind === 'hint') game.click('dd-hint');
        else pendingOpponent(game);
        const timerIds = Array.from(game.timers.keys());
        const state = gameState(game);
        game.click('dd-fullscreen');
        game.click('dd-fullscreen');
        assert.deepEqual(Array.from(game.timers.keys()), timerIds);
        assert.equal(gameState(game), state);
        game.drainOne();
        assert.equal(game.timers.size, 0);
    }
});

console.log('\n' + passed + ' passed; ' + failed + ' failed');
if (failed) process.exitCode = 1;
