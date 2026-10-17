# Mini Tower Defense and Net QA

2026-10-17. Browser-only, single-player additions. Existing games, Jianghu and article files are unchanged.

## Automated checks

`npm run test:games` passes the existing suites and both new suites. Tower-defense checks cover economy, upgrade limits, wave guards, armor, slowing, splash damage, defeat, and a legitimate ten-wave victory. Net checks include 6,000 seeded solvable, initially unsolved boards, reciprocal edges, borders, hints, exact reset and keyboard/replay behavior. An independent controller pass checked tower animation-loop ownership, pause/blur, restart and defeat/replay.

`git diff --check` passes. The broader `npm run test:reading` currently fails its historical `game page unchanged doudizhu.html` hash assertion. That page was already changed by the prior published four-game release and is untouched in this change; the reading baseline was not rewritten.

## Cloud Chromium checks

- Real Chromium with same-origin iframe viewports: 320×740, 390×844, 844×390 and 1440×900 for both games. No horizontal document overflow, and no visible button smaller than 24×24 CSS pixels. Net's densest 7×7 board at 320px has 34px tiles with spacing; 5×5 is the touch-friendlier default.
- Tower defense: build arrow/magic towers, begin and complete a wave, speed toggle, pause/resume, upgrade, native fullscreen enter/exit with preserved state, cancel and confirm restart.
- Net: solve an entire 5×5 board through 29 real tile clicks; all 25 cells/10 terminals powered and victory shown. Replay, hint, reset retaining consumed hint budget, arrow-key navigation, Enter rotation, and native fullscreen enter/exit.
- Original forest battlefield and decorative lake artwork rendered locally. Runtime log noise from the browser extension is unrelated to game scripts.

This verifies desktop Chromium with simulated CSS viewports, not physical mobile hardware or Safari. No backend, account, payment, or network gameplay is used.
