'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const { Window } = await import(pathToFileURL(require.resolve('happy-dom')).href);
  const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'game/hanzi-battle.html'), 'utf8');
  const windows = [], KEY = 'ink-hanzi-battle-v1'; let checks = 0;
  function boot(saved, motion = true, unavailableStorage = false) {
    const w = new Window({ url: 'https://example.test/game/hanzi-battle.html', settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true } }); windows.push(w);
    w.document.write(html.replace(/<script[\s\S]*?<\/script>/g, ''));
    if (saved) w.localStorage.setItem(KEY, saved);
    if (unavailableStorage) { w.localStorage.getItem = () => { throw new Error('blocked'); }; w.localStorage.setItem = () => { throw new Error('blocked'); }; }
    w.matchMedia = () => ({ matches: motion });
    for (const file of ['hanzi-battle-levels.js', 'hanzi-battle-engine.js', 'hanzi-battle.js']) {
      let code = fs.readFileSync(path.join(root, 'game/js', file), 'utf8');
      if (file === 'hanzi-battle.js') code = code.replace(/\}\)\(\);\s*$/, 'window.__test = { get state() { return state; }, get selected() { return selected; }, get busy() { return busy; }, get timers() { return timers.size; }, render, march, restart }; })();');
      w.eval(code);
    }
    w.eval(fs.readFileSync(path.join(root, 'js/game-view.js'), 'utf8'));
    return w;
  }
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function until(predicate, label, timeout = 3000) { const started = Date.now(); while (!predicate()) { if (Date.now() - started > timeout) throw new Error('Timed out: ' + label); await pause(8); } }
  async function test(name, fn) { await fn(); checks++; console.log('  ✓ ' + name); }
  const w = boot('{broken'), d = w.document, api = w.__test, E = w.HanziBattleEngine;
  const slot = index => d.querySelector('[data-slot="' + index + '"]'), lane = index => d.querySelector('[data-army="' + index + '"]');
  const pickLevel = index => { d.getElementById('level-select').value = String(index); d.getElementById('level-select').dispatchEvent(new w.Event('change')); };
  function replay(solution) {
    solution.actions.forEach(action => {
      if (action.type === 'combine') { slot(action.a).click(); slot(action.b).click(); }
      else { slot(action.slot).click(); lane(action.lane).click(); }
    });
  }
  try {
    console.log('Hanzi Battle UI tests');
    await test('corrupt save recovers, twelve board slots and three deployment controls exist, empty army cannot march', () => {
      assert.equal(api.state.level, 0); assert.equal(api.state.phase, 'prepare'); assert.equal(d.querySelectorAll('[data-slot]').length, 12); assert.equal(d.querySelectorAll('[data-army]').length, 3); assert.equal(d.querySelectorAll('#level-select option').length, 6); assert.equal(d.getElementById('march').disabled, true); assert.equal(d.getElementById('result').hidden, true);
      api.march(); assert.equal(api.state.phase, 'prepare');
    });
    await test('selection highlights only legal pairs; invalid merge leaves all material unchanged; Escape cancels', () => {
      slot(0).click(); assert.equal(api.selected, 0); assert.equal(slot(0).getAttribute('aria-pressed'), 'true'); assert.equal(d.querySelectorAll('.matchable').length, 2); assert.equal(d.querySelectorAll('.deploy-target').length, 3);
      const before = JSON.stringify(api.state.board); slot(3).click(); assert.equal(JSON.stringify(api.state.board), before); assert.equal(api.selected, 0); assert.match(d.getElementById('feedback').textContent, /没有合成/);
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' })); assert.equal(api.selected, null); assert.equal(d.querySelectorAll('.matchable').length, 0);
    });
    await test('unordered merge, base deployment, recall and keyboard movement work through real UI controls', () => {
      slot(1).click(); slot(0).click(); assert.equal(api.state.board[1], '林'); assert.equal(api.state.board[0], null); assert.equal(d.activeElement.dataset.slot, '1');
      slot(2).click(); slot(1).click(); assert.equal(api.state.board[2], '森');
      slot(3).click(); lane(0).click(); assert.equal(api.state.army[0], '火'); assert.equal(d.getElementById('march').disabled, false); lane(0).click(); assert.equal(api.state.army[0], null); assert.equal(api.state.board[0], '火');
      slot(0).focus(); slot(0).dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); assert.equal(d.activeElement.dataset.slot, '2');
    });
    await test('winning only the final level never claims all six levels are complete', async () => {
      const fresh = boot(), doc = fresh.document, testApi = fresh.__test, engine = fresh.HanziBattleEngine;
      testApi.restart(5, false);
      for (const action of engine.solve(5).actions) {
        const choose = index => doc.querySelector('[data-slot="' + index + '"]').click();
        if (action.type === 'combine') { choose(action.a); choose(action.b); }
        else { choose(action.slot); doc.querySelector('[data-army="' + action.lane + '"]').click(); }
      }
      doc.getElementById('march').click(); await until(() => !doc.getElementById('result').hidden, 'isolated final level');
      assert.equal(testApi.state.completed.length, 1); assert.equal(doc.getElementById('result-title').textContent, '终阵已破'); assert.match(doc.getElementById('progress').textContent, /1 \/ 6/); fresh.happyDOM.abort();
    });
    await test('each of six searched solutions can be crafted, deployed and won entirely through UI clicks', async () => {
      for (let i = 0; i < 6; i++) {
        pickLevel(i); const solution = E.solve(i); replay(solution); assert.equal(JSON.stringify(api.state.army), JSON.stringify(solution.army));
        d.getElementById('march').click(); d.getElementById('march').click(); assert.equal(api.state.phase, 'battle'); assert.equal(d.querySelectorAll('.character:not(:disabled)').length, 0); assert.equal(d.querySelectorAll('.army-slot:not(:disabled)').length, 0);
        await until(() => !d.getElementById('result').hidden, 'win level ' + i); assert.equal(api.state.phase, 'won'); assert.equal(api.state.round, solution.rounds); assert.equal(api.state.gate.hp, solution.gateHp); assert.equal(d.activeElement.id, 'result-action');
        assert.match(d.getElementById('result-title').textContent, i === 5 ? /六阵/ : /守住/);
        if (i < 5) { d.getElementById('result-action').click(); assert.equal(api.state.level, i + 1); assert.equal(api.state.phase, 'prepare'); }
      }
      assert.equal(api.state.completed.length, 6); assert.equal(JSON.parse(w.localStorage.getItem(KEY)).completed.length, 6);
    });
    await test('losing formation, result re-formation and complete restart preserve the right state', async () => {
      pickLevel(0); slot(0).click(); lane(0).click(); slot(3).click(); lane(1).click(); slot(5).click(); lane(2).click();
      const army = JSON.stringify(api.state.army), board = JSON.stringify(api.state.board);
      d.getElementById('march').click(); await until(() => !d.getElementById('result').hidden, 'lose'); assert.equal(api.state.phase, 'lost'); assert.match(d.getElementById('result-title').textContent, /失守/);
      d.getElementById('result-action').click(); assert.equal(api.state.phase, 'prepare'); assert.equal(JSON.stringify(api.state.army), army); assert.equal(JSON.stringify(api.state.board), board); assert.equal(api.state.round, 0);
      d.getElementById('restart').click(); assert.equal(api.state.army.filter(Boolean).length, 0); assert.equal(api.state.board.filter(Boolean).length, 8); assert.equal(api.state.completed.length, 6);
    });
    await test('preparation persists and refreshing an active battle restores full-health preparation', () => {
      pickLevel(4); replay(E.solve(4)); d.getElementById('march').click(); const saved = w.localStorage.getItem(KEY), next = boot(saved);
      assert.equal(next.__test.state.level, 4); assert.equal(next.__test.state.phase, 'prepare'); assert.equal(next.__test.state.round, 0); assert.equal(next.__test.state.gate.hp, E.LEVELS[4].gateHp); assert.equal(JSON.stringify(next.__test.state.army), JSON.stringify(api.state.army)); assert.equal(next.__test.state.completed.length, 6); next.happyDOM.abort();
      d.getElementById('restart').click();
    });
    await test('restart and level change invalidate pending battle callbacks', async () => {
      pickLevel(5); replay(E.solve(5)); d.getElementById('march').click(); d.getElementById('restart').click(); await pause(160); assert.equal(api.state.phase, 'prepare'); assert.equal(api.state.round, 0); assert.equal(api.timers, 0);
      replay(E.solve(5)); d.getElementById('march').click(); pickLevel(1); await pause(160); assert.equal(api.state.level, 1); assert.equal(api.state.round, 0); assert.equal(api.state.phase, 'prepare');
    });
    await test('fullscreen fallback and Escape never reset formation; help opens and closes accessibly', () => {
      slot(0).click(); lane(0).click(); const before = JSON.stringify(api.state); d.querySelector('[data-game-fullscreen]').click(); assert.equal(d.querySelector('[data-game-view]').classList.contains('is-expanded'), true); assert.equal(JSON.stringify(api.state), before);
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' })); assert.equal(d.querySelector('[data-game-view]').classList.contains('is-expanded'), false); assert.equal(JSON.stringify(api.state), before);
      d.querySelector('[data-game-fullscreen]').click(); d.getElementById('help-open').click(); assert.equal(d.getElementById('help').open, true); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' })); assert.equal(d.getElementById('help').open, false); assert.equal(d.activeElement.id, 'help-open'); assert.equal(d.querySelector('[data-game-view]').classList.contains('is-expanded'), true); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await test('normal-motion merging cannot consume twice and restart removes its old callbacks and ghosts', async () => {
      const animated = boot(null, false), a = animated.__test, doc = animated.document;
      doc.querySelector('[data-slot="0"]').click(); doc.querySelector('[data-slot="1"]').click(); assert.equal(a.busy, true); assert.equal(a.state.board[0], '林'); assert.equal(doc.querySelectorAll('.merge-ghost').length, 1);
      doc.querySelector('[data-slot="2"]').click(); assert.equal(a.state.board[2], '木');
      doc.getElementById('restart').click(); await pause(390); assert.equal(a.busy, false); assert.equal(a.state.board[0], '木'); assert.equal(a.state.board[1], '木'); assert.equal(doc.querySelectorAll('.merge-ghost').length, 0); assert.equal(a.timers, 0); animated.happyDOM.abort();
    });
    await test('blocked storage does not prevent a playable new game', () => {
      const blocked = boot(null, true, true); blocked.document.querySelector('[data-slot="0"]').click(); blocked.document.querySelector('[data-slot="1"]').click(); assert.equal(blocked.__test.state.board[0], '林'); blocked.happyDOM.abort();
    });
    console.log('Hanzi Battle UI: ' + checks + ' groups passed, including all six complete click-through battles. Browser geometry and visual inspection are separate QA.');
  } finally { for (const window of windows) window.happyDOM.abort(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
