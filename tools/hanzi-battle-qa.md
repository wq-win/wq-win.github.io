# 字阵出征 — implementation and QA

## Scope

Original, self-contained browser game. No external images, network calls, accounts, currency, random draws, equipment or persistent character upgrades. Shared navigation and package scripts include this game. State key: `ink-hanzi-battle-v1`.

The battlefield, controls and animations are separate from deterministic combat. The engine queues every round's attacks from the old state before resolving damage. A defeated unit's queued attack still lands. Gate destruction takes priority; otherwise clearing all enemies wins even if the final friendly unit falls in the same round.

## Automated commands

- `node tools/hanzi-battle-test.js`: 17 engine test groups passed.
- `node tools/hanzi-battle-ui-test.js`: 11 happy-dom test groups passed, including six complete victories through the actual click handlers.
- `node tools/hanzi-battle-contrast-test.js`: 13 essential color pairs meet 4.5:1. Lowest tested pair is lane labels against the darkest scene background, 4.77:1.
- `node --check` for the three game scripts and three test scripts.

The UI suite checks invalid merges without consumption, legal-pair highlighting, base deployment, recall, directional keyboard movement, six solution click-throughs, loss and re-formation, persistence, battle refresh back to preparation, corrupt storage, unavailable storage, double clicks, restart and level changes during pending callbacks, normal-motion merge cancellation, fullscreen state preservation, help/escape behavior, and isolated final-level completion messaging.

Happy-dom does not perform browser layout. Real browser geometry and visual checks are recorded below.

## Reproducible solutions

All formations below are left / center / right. `HanziBattleEngine.solve(index)` searches all feasible formations, crafts each from the level's actual materials, simulates combat, and returns replayable preparation actions. No test inserts manufactured units directly into a normal level.

| Level | Formation | Rounds | Gate HP |
|---|---|---:|---:|
| 1 一字成阵 | 众 / 森 / 炎 | 2 | 12 |
| 2 两路来敌 | 焱 / 从 / 森 | 3 | 18 |
| 3 三路守望 | 焱 / 森 / 众 | 3 | 10 |
| 4 森立如盾 | 焱 / 森 / 众 | 6 | 12 |
| 5 焱火连营 | 众 / 焱 / 森 | 6 | 8 |
| 6 合字出征 | 森 / 焱 / 众 | 6 | 14 |

Each level's unmerged 木 / 火 / 人 formation loses. The fourth lesson loses if the center guard loses its armor or is replaced by another role. The fifth loses without splash or with the fire unit moved away from center. In the final level, the same three top-tier units lose in the other five permutations.

## Engine API

Browser globals: `HanziBattleEngine` and `HanziBattleLevels`. CommonJS exports are available for Node tests. Load levels before engine, then UI.

- `create(index)` creates a preparation state; normal index is 0–5.
- `combine(state, a, b)` consumes two board positions and puts the result in the first selected position. Inputs are unordered. Only the six listed recipes exist.
- `deploy(state, slot, lane)` deploys a board tile to an empty lane (0–2).
- `recall(state, lane)` returns that unit to the first empty board position.
- Preparation actions and `start(state)` return `{ok, error?}`.
- `step(state)` resolves one synchronous round and returns its presentation events.
- `run(state)` deterministically runs to a terminal state.
- `save(state)` stores only the preparation inventory, formation, level and completed levels.
- `restore(raw)` verifies material conservation and recreates a full-health preparation state. Broken or fabricated saves fall back to a clean first level.
- `solve(index)` returns `{army, actions, rounds, gateHp}`. Replay actions with `combine(state, action.a, action.b)` or `deploy(state, action.slot, action.lane)`, according to `action.type`.

Unit stats are under `UNITS[char]` with `hp`, `attack`, `armor`, `splash`, `role`, `base` and `cost`. Recipes are `RECIPES: [{inputs: [a,b], output}]`.

## Real-browser pass notes

Actual cloud Chromium (not physical phones) was checked at 1366×768, 390×844, 844×390, 360×640, 640×360, 320×568 and 667×375. No document overflow was reported. All card/deployment/control targets were at least 44px. Initial findings were corrected locally:

- The narrow portrait back link now has a 44px minimum and cannot shrink.
- The 320×568 battlefield's enemy and friendly formations were compacted to separate them from the gate strip; no touch target was reduced below 44px.
- The march arrow uses CSS rather than a font glyph.
- Winning only the last level says “终阵已破”; “六阵已破” requires six completed levels.

Actual browser clicks confirmed an actual-click level 6 victory with 森 / 焱 / 众, six rounds, gate 14. The final 320×568 recheck passed: back target 44×44px, deployment bottom at y=231 and gate top at y=236 (5px separation), all three enemies and all three deployment controls visible, bottom controls visible, CSS arrow rendering correctly. Desktop, portrait, compact landscape and 320×568 screenshots were captured. Final geometry checks pass for all seven sizes, including populated formations and result controls. Page fullscreen fallback and Escape preserve formation. No physical-device or universal native-fullscreen claim is made.
