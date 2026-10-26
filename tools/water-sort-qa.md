# 倒水分色 QA

## 2026-10-26 challenge revision (current)

- Replaced all eight boards with interleaved 5, 5, 6, 6, 6, 6, 7 and 7-colour puzzles. Every colour still has four units, capacity remains four, and every starting board still has **two** empty bottles. Rules, undo, restart, progression and visual controls are unchanged.
- The first board is no longer a 4-pour paired-layer tutorial. Independent breadth-first search proves minimum solution lengths of **16, 17, 19, 20, 21, 22, 23 and 24 pours**. The production solver also returns and replays a winning trace for every board (22, 21, 31, 25, 26, 24, 24 and 31 pours; it does not claim shortest paths).
- Exhaustive graph analysis canonicalizes interchangeable bottle labels and reverses all reachable edges from the win. All boards have reachable losing states, and **no board can be solved while leaving at least one bottle empty at every step**: both spare-capacity buffers genuinely have to be used.

| Level | Reachable states | Cannot reach a win | No-move dead ends | Matching-first greedy wins / 200 |
| --- | ---: | ---: | ---: | ---: |
| 1 | 1,268 | 102 | 9 | 185 |
| 2 | 1,848 | 112 | 5 | 115 |
| 3 | 4,787 | 397 | 21 | 148 |
| 4 | 4,219 | 337 | 8 | 68 |
| 5 | 3,476 | 334 | 9 | 95 |
| 6 | 2,494 | 179 | 9 | 127 |
| 7 | 4,090 | 506 | 12 | 0 |
| 8 | 6,503 | 1,231 | 7 | 45 |

The greedy benchmark prefers same-colour consolidation, completed bottles and draining a source, breaks ties with 200 deterministic seeds, and avoids repeated states. These are policy-regression metrics, **not human win-rate claims**. Losing-state percentages are graph properties, not random-play probabilities.

### Executed checks

- `node tools/water-sort-test.js`: PASS. All eight complete state graphs, exact shortest solutions, production-solver replay, both-spare requirement, 22,790 valid/invalid transitions, colour conservation, capacity, immutability, no-move traces, undo recovery, save/restore and corrupt-input cases.
- `node tools/water-sort-ui-test.js`: PASS (happy-dom). All eight wins through actual UI handlers; direct-final versus all-complete distinction; new first-board dead end, restore and undo recovery; target errors, source cancellation, keyboard focus, restart/selection/resize animation races, denied storage, fullscreen and progression.
- `node tools/water-sort-contrast-test.js`: PASS. Essential text and all seven colour symbols ≥4.5:1; 44px target and reduced-motion contracts remain intact.
- Save schema is now version 2. Version-1 histories describe different board contents and are **not** replayed: earned completions and selected level survive; an unfinished old board restarts safely. The existing storage key is retained to make this migration possible. UI and engine tests cover it.
- Current real-browser desktop/mobile rendering and inputs were not verified: the retained local HTTP preview is isolated from the CUA browser (connection refused), and an elevated server attempt failed before execution on the restricted mount. No external preview was published. The happy-dom checks above are not a substitute for rendered layout or physical-device testing.

### Changed water-sort files

`game/js/water-sort-levels.js`, `game/js/water-sort-engine.js`, `game/water-sort.html`, `tools/water-sort-analysis.js`, `tools/water-sort-test.js`, `tools/water-sort-ui-test.js`, and this QA note. No new gameplay rules or timer penalties.

---

# Earlier release record (historical, not the current boards)


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
