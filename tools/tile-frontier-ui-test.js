'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
    const { Window } = await import(pathToFileURL(require.resolve('happy-dom')).href);
    const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'game/tile-frontier.html'), 'utf8'), css = fs.readFileSync(path.join(root, 'game/assets/tile-frontier.css'), 'utf8');
    const windows = [], key = 'tiny-frontier-progress-v1';
    function boot(saved, options = {}) {
        const w = new Window({ url: 'https://example.test/game/tile-frontier.html', settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true } }); windows.push(w);
        w.document.write(html.replace(/<script[\s\S]*?<\/script>/g, ''));
        if (saved !== undefined) w.localStorage.setItem(key, saved);
        if (options.storageFailure) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage disabled'); } });
        w.matchMedia = () => ({ matches: !options.motion });
        ['tile-frontier-engine.js', 'tile-frontier-levels.js', 'tile-frontier.js'].forEach(file => { let source = fs.readFileSync(path.join(root, 'game/js', file), 'utf8'); if (file === 'tile-frontier.js') source = source.replace(/\}\(\)\);\s*$/, 'window.__frontierTest={get state(){return state},get selected(){return selected},get epoch(){return epoch},get timers(){return timers},start,render,perform,choose};}());'); w.eval(source); });
        w.eval(fs.readFileSync(path.join(root, 'js/game-view.js'), 'utf8')); return w;
    }
    function play(w, action) {
        const d = w.document, api = w.__frontierTest;
        const tile = () => d.querySelector('[data-tile="' + action.id + '"]');
        const before = api.state.actions;
        if (action.type === 'reveal' || action.type === 'recruit') tile().click();
        else if (action.type === 'build') { tile().click(); assert.equal(api.state.actions, before, 'Selecting empty ground is free'); d.getElementById(action.building === 'mill' ? 'primary-action' : 'secondary-action').click(); }
        else if (action.type === 'attack') { tile().click(); assert.equal(api.state.actions, before, 'Selecting an enemy is free'); d.getElementById('primary-action').click(); }
        assert.equal(api.state.actions, before + 1, action.type + ' must spend exactly one action');
    }
    function changeLevel(w, n) { const select = w.document.getElementById('level-select'); select.value = String(n); select.dispatchEvent(new w.Event('change')); }
    try {
        const w = boot('{broken'), d = w.document, api = w.__frontierTest;
        assert.ok(api); assert.equal(d.querySelectorAll('#level-select option').length, 6); assert.equal(d.querySelectorAll('.tile').length, 25); assert.equal(d.querySelectorAll('.reachable').length, 3); assert.equal(api.state.index, 0); assert.equal(d.getElementById('result').hidden, true);
        d.querySelector('[data-tile="22"]').click(); assert.equal(api.state.actions, 0); d.querySelector('[data-tile="0"]').click(); assert.equal(api.state.actions, 0); assert.match(d.getElementById('feedback').textContent, /相邻/);
        d.querySelector('[data-tile="22"]').focus(); d.querySelector('[data-tile="22"]').click(); assert.equal(d.activeElement.dataset.tile, '22', 'Tile rerender restores keyboard focus');
        for (let i = 0; i < 6; i++) {
            changeLevel(w, i); for (const action of w.TileFrontier.solution(i)) play(w, action);
            assert.equal(api.state.status, 'won'); assert.equal(d.getElementById('result').hidden, false); assert.equal(d.querySelectorAll('.tile:not(:disabled)').length, 0); assert.equal(d.activeElement.id, 'result-action');
            if (i < 5) { d.getElementById('result-action').click(); assert.equal(api.state.index, i + 1); assert.equal(api.state.actions, 0); assert.equal(d.getElementById('result').hidden, true); }
        }
        assert.deepEqual(JSON.parse(w.localStorage.getItem(key)).completed, [0, 1, 2, 3, 4, 5]); assert.match(d.getElementById('result-copy').textContent, /六关完成/); assert.equal(d.getElementById('progress').textContent, '6 / 6');
        d.getElementById('result-action').click(); assert.equal(api.state.index, 5); assert.equal(api.state.actions, 0);
        changeLevel(w, 0); while (api.state.status === 'playing') play(w, w.TileFrontier.available(api.state).find(action => action.type === 'reveal'));
        assert.equal(api.state.status, 'lost'); assert.match(d.getElementById('result-title').textContent, /行动/); d.getElementById('result-action').click(); assert.equal(api.state.status, 'playing'); assert.equal(api.state.actions, 0);
        play(w, { type: 'reveal', id: 17 }); const snapshot = JSON.stringify(api.state); d.querySelector('[data-game-fullscreen]').click(); assert.ok(d.querySelector('[data-game-view]').classList.contains('is-expanded')); assert.equal(JSON.stringify(api.state), snapshot);
        d.getElementById('rules-open').click(); assert.equal(d.getElementById('rules-dialog').open, true); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' })); assert.ok(d.querySelector('[data-game-view]').classList.contains('is-expanded'), 'Fullscreen Escape ignores open rules dialog');
        d.getElementById('rules-close').click(); assert.equal(d.getElementById('rules-dialog').open, false); assert.equal(d.activeElement.id, 'rules-open'); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' })); assert.equal(d.querySelector('[data-game-view]').classList.contains('is-expanded'), false); assert.equal(JSON.stringify(api.state), snapshot);
        d.getElementById('rules-open').click(); d.getElementById('rules-done').click(); assert.equal(d.getElementById('rules-dialog').open, false);
        const skip = boot(); changeLevel(skip, 5); for (const action of skip.TileFrontier.solution(5)) play(skip, action); assert.doesNotMatch(skip.document.getElementById('result-copy').textContent, /六关完成/); assert.match(skip.document.getElementById('result-copy').textContent, /这一关完成/); assert.equal(skip.document.getElementById('progress').textContent, '1 / 6');
        const restored = boot(w.localStorage.getItem(key)); assert.equal(restored.__frontierTest.state.index, 0); assert.equal(restored.document.getElementById('progress').textContent, '6 / 6');
        for (const saved of ['null', '[]', '5', '{"index":999,"completed":[-1,0,0,2,2.2,7,"3"]}', '{"index":2.5,"completed":{}}']) { const clean = boot(saved); assert.equal(clean.__frontierTest.state.index, 0); assert.equal(clean.__frontierTest.state.actions, 0); }
        const blockedStorage = boot(undefined, { storageFailure: true }); assert.match(blockedStorage.document.getElementById('save-status').textContent, /无法保存/); for (const action of blockedStorage.TileFrontier.solution(0)) play(blockedStorage, action); assert.equal(blockedStorage.__frontierTest.state.status, 'won'); assert.match(blockedStorage.document.getElementById('feedback').textContent, /无法保存/);
        const animated = boot(undefined, { motion: true }), ad = animated.document, aa = animated.__frontierTest;
        play(animated, { type: 'reveal', id: 17 }); assert.ok(ad.querySelector('.flip')); assert.ok(ad.querySelector('.flying-wood')); assert.ok(aa.timers.size);
        const epoch = aa.epoch; ad.getElementById('restart').click(); assert.equal(aa.epoch, epoch + 1); assert.equal(aa.timers.size, 0); assert.equal(ad.querySelector('.flying-wood'), null); assert.equal(aa.state.wood, 2); assert.equal(aa.state.actions, 0);
        play(animated, { type: 'reveal', id: 17 }); changeLevel(animated, 1); assert.equal(aa.state.index, 1); assert.equal(aa.state.actions, 0); assert.equal(aa.timers.size, 0);
        await new Promise(resolve => setTimeout(resolve, 900)); assert.equal(aa.state.index, 1); assert.equal(aa.state.wood, 7); assert.equal(aa.state.actions, 0); assert.equal(ad.querySelector('.flying-wood'), null);
        const quiet = boot(); play(quiet, { type: 'reveal', id: 17 }); assert.equal(quiet.document.querySelector('.flip'), null); assert.equal(quiet.document.querySelector('.flying-wood'), null); assert.equal(quiet.__frontierTest.timers.size, 0);
        assert.match(css, /prefers-reduced-motion:reduce/); assert.doesNotMatch(css, /@import|https?:\/\//); assert.match(css, /min-width:44px;min-height:44px/); assert.match(css, /max-height:375px/);
        { const resume = boot(); play(resume, {type:'reveal',id:17});
        const resumeState = JSON.stringify(resume.__frontierTest.state);
        resume.document.getElementById('sound-toggle').click();
        const savedResume = resume.localStorage.getItem(key), restored = boot(savedResume);
        assert.equal(JSON.stringify(restored.__frontierTest.state), resumeState);
        assert.equal(restored.document.getElementById('sound-toggle').getAttribute('aria-pressed'), 'true');
        assert.match(restored.document.getElementById('feedback').textContent, /已恢复/);
        restored.document.querySelector('[data-tile="21"]').click();
        assert.match(restored.document.getElementById('selected-copy').textContent, /6 次后续行动回本/);
        assert.match(restored.document.getElementById('strategy-note').textContent, /最多产/);
        restored.document.getElementById('restart').click(); assert.equal(restored.__frontierTest.state.actions, 0); }
        console.log('tile-frontier UI: six actual click-through wins, next/retry, selection/invalid actions, failure, jump-to-final copy, keyboard focus, rules, fullscreen/Escape, persistence, malformed saves, storage failure, animation cancellation and reduced motion passed');
        console.log('Layout contracts present for 390x844, 844x390, 360x640, 640x360, 320x568, 1366x768. Browser geometry and screenshots require the separate real-browser QA pass.');
    } finally { windows.forEach(w => w.happyDOM.abort()); }
})().catch(error => { console.error(error); process.exitCode = 1; });
