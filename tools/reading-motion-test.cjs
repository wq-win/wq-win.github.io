#!/usr/bin/env node
'use strict';
// DOM/lifecycle regressions, not a substitute for rendered browser QA.
// Requires happy-dom: npm install --no-save happy-dom
// Or: HAPPY_DOM_PATH=/path/to/happy-dom node tools/reading-motion-test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let Window;
const root = path.resolve(__dirname, '..');
let checks = 0;
function check(value, message) { assert.ok(value, message); checks += 1; }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

function setup(saved = {}, options = {}) {
    const w = new Window({ url: 'https://mylog.test/' + (options.pathname || 'rl/04-q-learning.html'), settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
    const d = w.document;
    const listeners = { window: new Map(), document: new Map() };
    for (const [name, target] of [['window', w], ['document', d]]) {
        const add = target.addEventListener.bind(target);
        const remove = target.removeEventListener.bind(target);
        target.addEventListener = (type, fn, options) => {
            if (!listeners[name].has(type)) listeners[name].set(type, new Set());
            listeners[name].get(type).add(fn);
            return add(type, fn, options);
        };
        target.removeEventListener = (type, fn, options) => {
            if (listeners[name].has(type)) listeners[name].get(type).delete(fn);
            return remove(type, fn, options);
        };
    }
    const queries = {};
    w.matchMedia = query => {
        if (!queries[query]) {
            queries[query] = new w.EventTarget();
            queries[query].matches = query === '(pointer: fine)';
            queries[query].addListener = fn => queries[query].addEventListener('change', fn);
            queries[query].removeListener = fn => queries[query].removeEventListener('change', fn);
        }
        return queries[query];
    };
    const pending = new Map();
    let serial = 0;
    w.requestAnimationFrame = fn => { pending.set(++serial, fn); return serial; };
    w.cancelAnimationFrame = id => pending.delete(id);
    w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (_, key) => key === 'canvas' ? null : () => {} });
    for (const [key, value] of Object.entries(saved)) w.localStorage.setItem(key, String(value));
    if (options.storageDenied) {
        w.Storage.prototype.getItem = () => { throw new Error('Storage disabled'); };
        w.Storage.prototype.setItem = () => { throw new Error('Storage disabled'); };
    }
    d.body.className = 'bg-gray-50';
    d.body.innerHTML = '<div id="site-header"></div><main><div id="article-body">Opaque paper surface.</div></main><div id="site-footer"></div>';
    const script = d.createElement('script');
    script.src = 'https://mylog.test/js/site-chrome.js';
    d.head.appendChild(script);
    w.eval(source('js/site-background.js'));
    w.eval(source('js/site-chrome.js'));
    w.SeriesChrome.mount({ root: '../', active: 'rl' });
    return { w, d, queries, pending, listeners };
}
function click(t, selector) { t.d.querySelector(selector).click(); }
function input(t, selector, value) {
    const el = t.d.querySelector(selector);
    el.value = value;
    el.dispatchEvent(new t.w.Event('input', { bubbles: true }));
}
function changeReduced(t, value) {
    const q = t.queries['(prefers-reduced-motion: reduce)'];
    q.matches = value;
    q.dispatchEvent(new t.w.Event('change'));
}
function snapshot(t) {
    return Object.fromEntries(['mylog-bg', 'mylog-bg-strength', 'mylog-bg-speed', 'mylog-bg-paused', 'mylog-theme', 'mylog-cursor'].map(k => [k, t.w.localStorage.getItem(k)]).filter(([, v]) => v !== null));
}

(async () => {
    let dependency = process.env.HAPPY_DOM_PATH || 'happy-dom';
    if (dependency !== 'happy-dom' && fs.statSync(dependency).isDirectory()) dependency = path.join(dependency, 'lib/index.js');
    ({ Window } = await import(dependency));
    let t = setup();
    check(t.w.SiteBackground.getState().mode === 'orbs', 'A is the new unset default');
    check(t.d.documentElement.dataset.bgMotion === 'running', 'default animation runs');
    check(t.d.querySelectorAll('#look-panel [data-bg]').length === 4, 'four choices in existing popover');
    check(t.d.querySelectorAll('#look-panel [data-cursor]').length === 4, 'all four mouse choices retained');
    check(t.d.querySelectorAll('#site-bg').length === 1 && t.d.querySelectorAll('.site-bg-star').length === 52, 'one bounded background layer');
    check(t.pending.size === 0, 'background uses no requestAnimationFrame');
    check(t.d.querySelector('#site-bg').getAttribute('aria-hidden') === 'true', 'decorative layer hidden from accessibility tree');
    click(t, '#look-toggle');
    check(t.d.querySelector('#look-toggle').getAttribute('aria-expanded') === 'true', 'paintbrush opens existing panel');
    click(t, '#look-panel [data-bg="aurora"]');
    check(t.w.SiteBackground.getState().mode === 'aurora', 'B selection applies');
    input(t, '#look-bg-strength', 65);
    input(t, '#look-bg-speed', 1.75);
    check(t.w.SiteBackground.getState().strength === 65 && t.w.SiteBackground.getState().speed === 1.75, 'native sliders update state');
    check(t.d.querySelector('#look-bg-strength-value').textContent === '65%' && t.d.querySelector('#look-bg-speed-value').textContent === '1.75×', 'live values update');
    check(Math.abs(Number(t.d.documentElement.style.getPropertyValue('--site-bg-time-scale')) - 1 / 1.75) < .0001, 'speed changes shared animation time scale');
    click(t, '#look-bg-pause');
    check(t.d.documentElement.dataset.bgMotion === 'paused', 'pause stops animations');
    check(t.d.querySelector('#look-bg-pause').getAttribute('aria-pressed') === 'true', 'pause has accessible pressed state');
    const saved = snapshot(t);
    for (const pathname of ['rl/index.html', 'llm/015-transformer.html', 'robot-learn/index.html', 'robot-classic/004-kalman.html', 'game/rl/q-learning.html']) {
        const other = setup(saved, { pathname });
        check(JSON.stringify(other.w.SiteBackground.getState()) === JSON.stringify(t.w.SiteBackground.getState()), 'preferences persist to ' + pathname);
        await other.w.happyDOM.close();
    }
    click(t, '#look-bg-pause');
    changeReduced(t, true);
    check(t.d.documentElement.dataset.bgReason === 'reduced-motion' && t.d.querySelector('#look-bg-pause').disabled, 'system reduce-motion stops and disables manual override');
    check(t.w.SiteBackground.getState().paused === false, 'automatic pause does not overwrite personal pause preference');
    changeReduced(t, false);
    check(t.d.documentElement.dataset.bgMotion === 'running', 'system change resumes prior state');
    Object.defineProperty(t.d, 'hidden', { configurable: true, value: true });
    t.d.dispatchEvent(new t.w.Event('visibilitychange'));
    check(t.d.documentElement.dataset.bgReason === 'hidden', 'hidden page automatically pauses');
    Object.defineProperty(t.d, 'hidden', { configurable: true, value: false });
    t.d.dispatchEvent(new t.w.Event('visibilitychange'));
    check(t.d.documentElement.dataset.bgMotion === 'running', 'visible page resumes');
    t.w.dispatchEvent(new t.w.Event('pagehide'));
    check(t.d.documentElement.dataset.bgMotion === 'paused', 'bfcache pagehide pauses');
    t.w.dispatchEvent(new t.w.Event('pageshow'));
    check(t.d.documentElement.dataset.bgMotion === 'running', 'bfcache pageshow resumes');
    input(t, '#look-bg-strength', 0);
    check(t.d.documentElement.dataset.bgReason === 'zero-strength', 'zero strength conserves motion work');
    input(t, '#look-bg-strength', 45);
    click(t, '#look-panel [data-bg="static"]');
    check(t.d.documentElement.dataset.bgMotion === 'paused' && t.d.querySelector('#look-bg-speed').disabled, 'static stops motion and disables speed');
    click(t, '#look-panel [data-bg="stars"]');
    check(t.d.documentElement.dataset.bgMotion === 'running' && !t.d.querySelector('#look-bg-speed').disabled, 'C restores motion and speed control');
    click(t, '#theme-toggle');
    check(t.d.documentElement.classList.contains('dark'), 'existing dark-theme toggle retained');
    click(t, '#look-panel [data-cursor="comet"]');
    check(t.pending.size === 1, 'comet retains a single loop');
    click(t, '#look-panel [data-bg="orbs"]');
    check(t.pending.size === 1, 'background changes do not duplicate cursor loop');
    changeReduced(t, true);
    check(t.pending.size === 0 && t.d.documentElement.dataset.cursor === 'dot', 'reduced-motion also stops cursor loop with dot fallback');
    changeReduced(t, false);
    check(t.pending.size === 1, 'cursor resumes one loop when reduced-motion is disabled');
    Object.defineProperty(t.d, 'hidden', { configurable: true, value: true });
    t.d.dispatchEvent(new t.w.Event('visibilitychange'));
    check(t.pending.size === 0, 'hidden page cancels cursor RAF');
    Object.defineProperty(t.d, 'hidden', { configurable: true, value: false });
    t.d.dispatchEvent(new t.w.Event('visibilitychange'));
    click(t, '#look-panel [data-cursor="system"]');
    check(t.pending.size === 0 && !t.d.documentElement.hasAttribute('data-cursor'), 'system cursor stops all cursor frames');
    const listenerCounts = () => JSON.stringify(Object.fromEntries(Object.entries(t.listeners).map(([name, types]) => [name, [...types].map(([type, fns]) => [type, fns.size])])));
    const beforeRemountListeners = listenerCounts();
    for (let i = 0; i < 15; i += 1) t.w.SeriesChrome.mount({ root: '../', active: 'rl' });
    check(listenerCounts() === beforeRemountListeners, 'repeated mounts do not accumulate global listeners');
    check(t.d.querySelectorAll('#site-bg').length === 1 && t.d.querySelectorAll('.site-bg-star').length === 52, 'repeated mounts do not duplicate background nodes');
    click(t, '#look-toggle');
    click(t, '#look-bg-pause');
    check(t.w.SiteBackground.getState().paused === true, 'repeated mounts do not duplicate pause listeners');
    t.d.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Escape' }));
    check(t.d.querySelector('#look-toggle').getAttribute('aria-expanded') === 'false' && t.d.activeElement.id === 'look-toggle', 'Escape closes panel and restores focus');
    click(t, '#look-toggle');
    click(t, '#article-body');
    check(t.d.querySelector('#look-toggle').getAttribute('aria-expanded') === 'false', 'outside click dismisses after remounts');
    t.w.localStorage.setItem('mylog-bg', 'aurora');
    t.w.localStorage.setItem('mylog-bg-paused', 'false');
    t.w.dispatchEvent(new t.w.StorageEvent('storage', { key: 'mylog-bg', newValue: 'aurora' }));
    check(t.w.SiteBackground.getState().mode === 'aurora' && !t.w.SiteBackground.getState().paused, 'storage events synchronize another tab');
    t.w.SiteBackground.destroy();
    check(!t.d.querySelector('#site-bg'), 'destroy removes layer');
    t.w.SiteBackground.init();
    check(t.d.querySelectorAll('.site-bg-star').length === 52, 'init after destroy recreates one bounded layer');
    await t.w.happyDOM.close();

    for (const [value, expected] of [['static', 'static'], ['drift', 'orbs'], ['not-a-mode', 'orbs']]) {
        t = setup({ 'mylog-bg': value });
        check(t.w.SiteBackground.getState().mode === expected, 'saved mode migration: ' + value);
        if (value === 'drift') check(t.w.localStorage.getItem('mylog-bg') === 'orbs', 'drift migration saved once');
        await t.w.happyDOM.close();
    }
    t = setup({ 'mylog-bg-strength': 'NaN', 'mylog-bg-speed': '99' });
    check(t.w.SiteBackground.getState().strength === 45 && t.w.SiteBackground.getState().speed === 2, 'invalid values normalize and clamp');
    await t.w.happyDOM.close();
    t = setup({}, { storageDenied: true });
    click(t, '#look-panel [data-bg="stars"]');
    input(t, '#look-bg-strength', 70);
    input(t, '#look-bg-speed', .5);
    click(t, '#look-bg-pause');
    check(t.w.SiteBackground.getState().mode === 'stars' && t.w.SiteBackground.getState().strength === 70 && t.w.SiteBackground.getState().speed === .5 && t.w.SiteBackground.getState().paused, 'blocked storage still keeps all in-page background controls usable');
    await t.w.happyDOM.close();

    const css = source('css/site-background.css');
    check(css.includes('#article-body { background-color: #fff; }') && css.includes('html.dark #article-body { background-color: #111827; }'), 'reading paper has solid light and dark surfaces');
    check(css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('animation-play-state: paused !important'), 'CSS independently enforces system reduced-motion');
    check(!/requestAnimationFrame|setInterval/.test(source('js/site-background.js')), 'background module contains no RAF or repeating timer');
    console.log(`${checks} appearance/motion DOM and lifecycle checks passed. Real geometry, rendering and touch hit targets require browser QA.`);
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
