# Yarn puzzle implementation and checks

Files: game/yarn.html; game/assets/yarn.css; game/js/yarn-engine.js; game/js/yarn.js; tools/yarn-test.js; tools/yarn-ui-test.js.

Run from repository root:
- node tools/yarn-test.js
- node tools/yarn-ui-test.js

Rules: Each hanging woven piece is a front-to-back stack. Only its top loop can be pulled. Every picked strand occupies one of six basket slots. Three equal colors immediately clear before checking capacity. Six remaining unmatched strands lose the round. Removing all strands wins. All lower layers are visible and have redundant color symbols. Assistive labels list lower colors in order. Native buttons support keyboard activation. Levels are freely selectable, restartable, and completed-level/current-level progress is saved defensively in localStorage.

Sixteen immutable fixed puzzles increase from 9 to 54 strands. A DFS state-space solver independently of the controller verifies every level. Tests execute each solution, check conservation for every reachable state, triplet ordering versus loss, terminal guards, invalid input, immutable source levels, and fresh-state reset. Happy-dom tests click every move of every solution, test loss/retry, select/replay, saved progress, malformed storage, fullscreen fallback/Escape/rejected request, and directly solving level 16 without claiming all earlier levels complete.

Visual treatment: cream and sage workshop; wood rail; woven textile swatches with raised loop controls; six recessed basket positions and yarn spools. Actual measured source-to-basket SVG strand reels away while a wound ball travels to the slot. Reduced motion hides this effect. Fullscreen has an in-page fallback. Compact landscape keeps the level selector visible between navigation and fullscreen controls.

Parent handles browser visual QA, integration and publication. No publishing performed by this worker.

## Real cloud Chromium review (2026-10-19)
- Actual UI rendered at 1440×900, 390×844, 320×740, 844×390 and 667×375 CSS iframe viewports. Document matches viewport dimensions without page overflow.
- Level 16 at 320px retains four 53.5×53px strand targets; upcoming colors remain visible.
- Real pointer clicks exercised level 1 loss (six unmatched slots), retry, nine-step victory, next-level progression. Win view also fits 320×740.
- Native fullscreen entry/exit preserved the board. Explicitly denied iframe fullscreen used page-fill fallback; keyboard Escape restored layout.
- Browser review prompted measured thread-to-basket animation and restoring landscape level selection; final reviewed files include both fixes.
- Existing game regression suite and lifestyle regression suite pass. Screenshots captured externally for release review. This is Chromium viewport testing, not physical mobile-device testing.

Contrast release check: node tools/yarn-contrast-test.js. Essential secondary copy uses #555b47, verified at 5.05:1 or better against all warm-paper base colors. Yarn color names use solid cream tags (8.56:1). Next-level action is 5.57:1; loss instructions 4.91:1. Dark yarn symbols meet 4.5:1 against every yarn color and a conservative 10%-darkened weave variant. Decorative eyebrows retain muted ink. Regressions pass after contrast changes.

Short-portrait repair: for viewport height <=650px, moves level selector into the navigation row, removes decorative title/footer, keeps top strand buttons >=44px and preserves every upcoming color in 6px woven rows. Compact board/tray/result layout retains restart, progress, capacity mechanics and terminal controls. Model, contrast and happy-dom suites pass; parent verifies real viewport geometry.
- Final short-portrait patch verified in real Chromium: level 16 plus level 1 win/loss states each fit 320×568 exactly; exposed strands remain 61×44px. No document overflow.
