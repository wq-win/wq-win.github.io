# 倒水分色 QA

## Scope
- Eight fixed original puzzles; colour counts 3, 3, 4, 4, 5, 5, 6, 7.
- Every colour has exactly four units, every bottle has capacity four, and every initial puzzle has two spare bottles.
- Select source and destination; pour the maximal same-colour top run that the destination can hold. Empty targets and matching top colours are legal. Moving a full same-colour bottle into an empty bottle is also allowed.
- A win requires every nonempty bottle to be full and monochrome. No time limit, lives, penalties, tools or undo system.
- Original CSS glassware, layered liquid surfaces, per-colour symbols, source lift, animated pouring stream and full-bottle feedback. Local SVG guide illustration; no external asset, font or API dependencies.
- Source re-click/Escape cancels selection. Full and mismatched targets have distinct text and visual feedback. A reachable no-move state explains how to restart and replan.
- Keyboard-native buttons/select; arrow-key focus movement; live announcements; reduced-motion support; shared `../js/game-view.js` fullscreen presentation.
- Versioned storage records and replays a legal action history. Malformed or illegal history resets safely; denied storage remains playable. Restart and level change cancel any pending pour; resize/fullscreen finishes its single valid action without duplicate callbacks.
- Winning level 8 directly says that the last level is complete and reports the actual completed-level count. The all-eight celebration requires all eight completion IDs.

## Executed checks
- `node tools/water-sort-test.js`: PASS. Eight solver traces of 4, 9, 12, 15, 17, 23, 26 and 29 moves. All replayed to a win, checking conservation, capacity, immutability and save/restore at each step. 12,960 valid/invalid transition checks. All 17 symmetry-distinct introductory reachable states explored. Partial monochrome non-win, maximum top-run pour, capacity limit, valid dead-end and malformed-save checks.
- `node tools/water-sort-ui-test.js`: PASS (happy-dom). All eight levels played through UI handlers; direct-final versus complete-all distinction; selected-source cancellation; empty/full/wrong-colour feedback; keyboard focus; reachable no-move message and its restoration; legal save resume; corrupt/denied storage; reduced-motion immediate action; visible normal-duration pour stream; double-input lock; restart, level-change and resize animation races; shared fullscreen/Escape state preservation.
- `node tools/water-sort-contrast-test.js`: PASS. Essential text has at least 4.99:1 contrast; seven unique liquid symbols have 5.43:1–7.35:1 against their base colours. Tests also guard the explicit 44px bottle hit-target minimum and reduced-motion rules.

## Browser verification status
Real-browser visual and pointer QA is assigned to the parent, not executed by this worker. The requested viewports are 1366×768, 390×844, 844×390, 360×640, 640×360, 320×568 and 667×375. Inspect level 8 at every viewport: all nine bottle targets, two rows, visible status/restart/level picker, no horizontal/page overflow, and bottle target dimensions ≥44px. Also inspect level 1, successful/blocked pouring, actual stream motion, win panel, keyboard and full-screen fallback. happy-dom has no layout engine and is not a substitute for these checks.

## Engine / trace API
CommonJS: `const E = require('./game/js/water-sort-engine.js')`.
Browser globals: `WaterSortLevels`, then `WaterSortEngine`.
- `E.create(levelIndex, completedIds = [])` creates immutable-action state. Level indices are zero-based; each bottle array is bottom to top.
- `E.inspect(bottles, from, to)` returns legality, reason, top colour and maximal pour amount without mutation.
- `E.pour(bottles, from, to)` returns `{ ok, bottles, from, to, color, amount, won }` for a legal move; the input is never changed.
- `E.act(state, from, to)` returns `{ ok, state, ...move }`, including recorded history and updated completion IDs.
- `E.legalMoves(bottles)` enumerates all legal player moves.
- `E.won(bottles)` and `E.same(bottle)` inspect completion/uniformity.
- `E.solve(stateOrBottles, options)` returns a legal trace `[{ from, to, amount, color }, ...]`, `[]` if already won, or `null` if no solution is found within search limits. Optional `maxStates` (default 300,000) and `maxDepth` (default 180). It uses symmetry pruning and is not a shortest-path claim.
- `E.save(state)` / `E.restore(raw)` serialize and replay the legal history.

## Delivery files
1. `game/water-sort.html`
2. `game/assets/water-sort.css`
3. `game/js/water-sort-engine.js`
4. `game/js/water-sort-levels.js`
5. `game/js/water-sort.js`
6. `tools/water-sort-test.js`
7. `tools/water-sort-ui-test.js`
8. `tools/water-sort-contrast-test.js`
9. `tools/water-sort-qa.md`

No existing file, entry point or package script was changed. The local `node_modules` symlink is test infrastructure only and is not a delivery file. No commit or push was made.

## Final integration browser verification — 2026-10-19
Cloud Chromium: seven requested viewports fit without scrolling and controls meet 44px. Real source/target clicks completed level 1 (4 pours) and level 8 (29 pours); victory and restart were verified. At 320×568 all nine bottles fit, each target 49×120px. Screenshots and measurements are in the separate release evidence bundle. These are Chromium viewport tests, not physical-device tests.

## 2026-10-21 polish
- Undo restores one prior legal move by replaying recorded history; completed-level awards remain earned. Disabled at initial board and during pour animation.
- Shared opt-in sound/mute is locally persisted. Compact landscape controls use two rows to retain 44px buttons.
