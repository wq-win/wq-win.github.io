'use strict';
// Test exact inline controllers with deterministic clocks/canvas stubs. This
// does not simulate real browser pointer behavior or visual layout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const inline = page => [...fs.readFileSync(path.join(root, page), 'utf8')
    .matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
const brush = () => new Proxy({}, { get: () => () => {} });
const chrome = { mount() {} };

function kalman(n, random) {
    const canvas = { style: {}, getContext: brush, getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 520 }) };
    const dom = { c: canvas, noise: { dataset: {}, value: n }, qnoise: { dataset: {}, value: 2 } };
    const document = { getElementById: id => dom[id], readyState: 'loading', addEventListener() {} };
    const window = {};
    new Function('window', 'document', fs.readFileSync(path.join(root, 'game/js/demo-kit.js'), 'utf8'))(window, document);
    let tick;
    const inspect = new Function('window', 'document', 'SeriesChrome', 'DemoKit', 'Math', 'setInterval',
        inline('game/robot-classic/kalman.html') + '\nreturn () => ({ x, P, meas });')(
        window, document, chrome, window.DemoKit, Object.assign(Object.create(Math), { random }), fn => { tick = fn; });
    return { tick, inspect };
}

function dmp() {
    const queue = [], delays = [], events = {};
    const canvas = { addEventListener: (type, fn) => { events[type] = fn; }, setPointerCapture() {} };
    const dom = { c: canvas, play: {}, status: {}, sine: {}, s: {}, az: { value: 25 }, speed: { value: 10 },
        'mode-goal': {}, 'mode-draw': {} };
    const kit = { setupCanvas: () => ({ ctx: brush() }), pointer: (_, event) => event,
        clamp: (x, a, b) => Math.max(a, Math.min(b, x)), drawPanel() {}, rangeValue: id => dom[id].value };
    const inspect = new Function('document', 'SeriesChrome', 'DemoKit', 'setTimeout',
        inline('game/robot-learn/dmp.html') + '\nreturn () => ({ goal, playPath });')(
        { getElementById: id => dom[id] }, chrome, kit, (fn, ms) => { queue.push(fn); delays.push(ms); });
    const advance = async () => { assert.ok(queue.length); queue.shift()(); await Promise.resolve(); };
    const drain = async () => { let n = 0; while (queue.length) { assert.ok(++n < 400); await advance(); } return n; };
    return { dom, events, inspect, advance, drain, delays };
}

async function main() {
    let i = 0;
    const a = kalman(22, () => i++ % 2 ? .25 : .75);
    a.tick();
    const { meas, x, P } = a.inspect();
    const gain = 122 / (122 + 22 * 22 / 3);
    assert.deepEqual(meas, [{ x: 211, y: 229 }], 'same uniform observations');
    assert.ok(Math.abs(x[0] - (200 + 11 * gain)) < 1e-9, 'variance is amplitude squared divided by three');
    assert.ok(Math.abs(P[0][0] - 122 * (1 - gain)) < 1e-9);
    for (const n of [4, 22, 60]) {
        let seed = 1;
        const b = kalman(n, () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 2 ** 32));
        for (let j = 0; j < 200; j++) {
            b.tick();
            const { x, P } = b.inspect();
            assert.ok([...x, ...P.flat()].every(Number.isFinite));
            assert.ok(P[0][0] > 0 && P[1][1] > 0);
        }
    }

    const initial = dmp().inspect().playPath;
    assert.equal(initial.length, 800);
    for (const edit of [
        b => b.events.pointerdown({ x: 310, y: 140 }),
        b => b.dom.s.onclick(),
        b => { b.dom.az.value = 40; b.dom.az.oninput(); }
    ]) {
        for (const finalWait of [false, true]) {
            const b = dmp();
            b.dom.play.onclick();
            // The 115th timeout is already outstanding, including after the
            // last displayed partial frame but before the full trace commit.
            if (finalWait) for (let j = 0; j < 114; j++) await b.advance();
            edit(b);
            const newer = structuredClone(b.inspect().playPath);
            assert.notDeepEqual(newer, initial);
            assert.equal(await b.drain(), 1, 'obsolete replay exits at its next timer boundary');
            assert.deepEqual(b.inspect().playPath, newer);
        }
    }
    const replay = dmp();
    replay.dom.play.onclick();
    replay.dom['mode-draw'].onclick();
    replay.dom.speed.value = 40;
    await replay.drain();
    assert.deepEqual(replay.inspect().playPath, initial);
    assert.ok(replay.delays.includes(4), 'speed remains live');

    const sketch = dmp();
    sketch.dom.play.onclick();
    sketch.dom['mode-draw'].onclick();
    sketch.events.pointerdown({ x: 110, y: 120, pointerId: 1 });
    sketch.dom.play.onclick();
    sketch.events.pointermove({ x: 112, y: 123 });
    sketch.events.pointercancel();
    assert.equal(await sketch.drain(), 1);
    assert.deepEqual(sketch.inspect().playPath, initial, 'short canceled sketch restores full rollout');
    console.log('Teaching demos: uniform Kalman variance; DMP replay ownership, final wait, live speed and short sketch passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
