# Tower-defense levels QA

2026-10-18. Baseline: main de0e8bc (previously 10 waves).

## Scope
- Five sequential levels, each 15 waves, with a boss on wave 15.
- Each level starts with 20 health, 300 gold and no towers. Retry stays on the current level; final replay returns to level 1. Refresh starts a new campaign.
- Relative to level 1, enemy HP scales by 1 + 0.12 × (level − 1), speed by 1 + 0.03 × (level − 1), and each wave adds 2 × (level − 1) enemies. Spawn intervals are divided by 1 + 0.04 × (level − 1).
- Existing map, towers and rewards retained. No persistent unlocks or new game systems.

## Automated
- `npm run test:games` passes all existing games plus expanded engine and new controller tests.
- Engine: complete all 75 waves with a legitimate between-wave building strategy; 15-wave boundary, bosses, increasing HP/speed/count, terminal guards, reset, invalid level, defeat, economy and tower mechanics.
- Controller: levels 1–4 clear/advance, reset economy/towers, failure retry same level, final victory/restart, repeated clicks, pause/resume, final-wave hint. State setup is test-only, with no shipped debug API.
- `git diff --check` and JavaScript syntax checks pass.
- `npm run test:reading` still fails the historical `game page unchanged doudizhu.html` hash assertion. That file is unchanged from baseline; reading baselines were not modified.

## Cloud Chromium
- Real clicks: initial arrow/magic construction, first-wave combat, speed toggle.
- Local-only scenario fixtures verify rendered clear-to-next-level, failure-to-same-level retry, and final victory-to-level-1 flows using the production controller with test-only initial state setup. Full campaigns are engine simulations, not manually played browser runs.
- Narrow 320px CSS viewport caught clipped counters; responsive counter grid fixed and visually rechecked. Also checked 390×844, 741×700 and 844×390 CSS viewports.
- Browser checks use desktop Chromium and simulated CSS viewports, not physical mobile devices or Safari.
