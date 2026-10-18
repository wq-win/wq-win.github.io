#!/usr/bin/env node
'use strict';

// Exercise the real controller with Happy DOM and a no-op canvas. State access is
// injected into the test copy only; production scripts expose no debugging API.
// This verifies DOM and events, not browser geometry or visual rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const E = require('../js/tower-defense-engine.js');
const page = fs.readFileSync(path.join(root, 'game/tower-defense.html'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'js/tower-defense.js'), 'utf8');
const instrumented = controller.replace(/\}\)\(\);\s*$/, '\nwindow.__tdTest = { get state() { return state; }, sync };\n})();');
assert.notEqual(instrumented, controller, 'Test-only state instrumentation installed');
const clone = value => JSON.parse(JSON.stringify(value));

async function main() {
    let dependency = process.env.HAPPY_DOM_PATH || require.resolve('happy-dom');
    if (fs.statSync(dependency).isDirectory()) dependency = path.join(dependency, 'lib/index.js');
    const { Window } = await import(pathToFileURL(path.resolve(dependency)).href);
    const window = new Window({ url: 'https://example.test/game/tower-defense.html',
        settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
    try {
        // Happy DOM 21 drops numeric zero instead of applying the browser's
        // DOMString conversion. Normalize this setter to native DOM semantics.
        const textContent = Object.getOwnPropertyDescriptor(window.Element.prototype, 'textContent');
        Object.defineProperty(window.Element.prototype, 'textContent', {
            ...textContent,
            set(value) { textContent.set.call(this, value == null ? '' : String(value)); }
        });
        window.document.write(page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
        const context = new Proxy({}, {
            get(target, key) {
                if (key in target) return target[key];
                if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
                return () => {};
            },
            set(target, key, value) { target[key] = value; return true; }
        });
        window.HTMLCanvasElement.prototype.getContext = () => context;
        let frameCallback;
        let now = 1000;
        window.requestAnimationFrame = callback => { frameCallback = callback; return 1; };
        window.confirm = () => true;
        window.ForestDefense = E;
        window.eval(instrumented);
        const api = window.__tdTest;
        const find = id => window.document.getElementById(id);
        const frame = () => { now += 50; frameCallback(now); };
        const seed = (level, state, wave) => {
            Object.assign(api.state, E.create(level), { state, wave });
            api.sync();
        };
        const assertReset = level => {
            assert.deepEqual(clone(api.state), clone(E.create(level)));
            assert.equal(find('level').textContent, String(level));
            assert.equal(find('wave').textContent, '0');
            assert.equal(find('gold').textContent, '300');
            assert.equal(find('health').textContent, '20');
            assert.equal(find('overlay').hidden, true);
            assert.equal(find('next-wave').disabled, false);
            assert.equal(find('upgrade').hidden, true);
            assert.equal(window.document.querySelectorAll('.td-slot.built').length, 0);
        };
        assertReset(1);
        for (let level = 1; level < E.LEVEL_COUNT; level++) {
            seed(level, 'running', E.WAVES_PER_LEVEL);
            Object.assign(api.state, { gold: 999, health: 3, kills: 200 });
            E.build(api.state, 0, 'arrow');
            // Let the engine and animation loop discover the real clear boundary.
            frame(); frame();
            assert.equal(api.state.state, 'cleared');
            assert.equal(find('overlay').hidden, false);
            assert.match(find('result-title').textContent, new RegExp(`第 ${level} 关`));
            assert.match(find('result-action').textContent, new RegExp(`第 ${level + 1} 关`));
            assert.equal(find('next-wave').disabled, true);
            assert.equal(find('pause').disabled, true);
            find('result-action').click();
            assertReset(level + 1);
            // A queued second click must not skip another level or reset again.
            const stateAfterFirstClick = api.state;
            find('result-action').click();
            assert.equal(api.state, stateAfterFirstClick);
            assertReset(level + 1);
        }
        seed(4, 'lost', 8);
        api.state.health = 0;
        api.sync();
        assert.equal(find('result-action').textContent, '重试本关');
        find('result-action').click();
        assertReset(4);
        const retried = api.state;
        find('result-action').click();
        assert.equal(api.state, retried);

        seed(5, 'running', 15);
        frame();
        assert.equal(api.state.state, 'won');
        assert.equal(find('result-title').textContent, '全部关卡通关！');
        assert.equal(find('result-action').textContent, '从第 1 关再挑战');
        find('result-action').click();
        assertReset(1);
        const restarted = api.state;
        find('result-action').click();
        assert.equal(api.state, restarted);

        seed(2, 'ready', 13);
        assert.doesNotMatch(find('wave-hint').textContent, /首领/);
        seed(2, 'ready', 14);
        assert.match(find('wave-hint').textContent, /最终波.*首领/);
        assert.match(find('next-wave').textContent, /第 15 波/);
        find('next-wave').click();
        assert.equal(api.state.wave, 15);
        assert.equal(api.state.queue.filter(type => type === 'boss').length, 1);
        const queueLength = api.state.queue.length;
        find('next-wave').click();
        assert.equal(api.state.wave, 15);
        assert.equal(api.state.queue.length, queueLength);

        find('pause').click();
        assert.equal(find('pause').getAttribute('aria-pressed'), 'true');
        assert.equal(find('overlay').hidden, false);
        assert.equal(find('result-action').textContent, '继续守卫');
        const pausedState = clone(api.state);
        frame(); frame();
        assert.deepEqual(clone(api.state), pausedState, 'Paused game does not simulate');
        find('result-action').click();
        assert.equal(find('pause').getAttribute('aria-pressed'), 'false');
        assert.equal(find('overlay').hidden, true);
        frame();
        assert.ok(api.state.time > pausedState.time, 'Resume continues the current wave');
        assert.equal(api.state.level, 2);
        assert.equal(api.state.wave, 15);
        console.log('Tower defense UI: level clears/reset, retry, final victory, double-click guards, pause/resume and wave-15 hint passed.');
    } finally {
        await window.happyDOM.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
