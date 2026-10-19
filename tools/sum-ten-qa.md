# 框选凑十 QA

## Scope

- One 90-second mode. Canonical logical board: 8 rows × 6 columns, integers 1–9. Portrait renders 8 rows × 6 columns; landscape transposes to 6 rows × 8 columns without replacing the state.
- A rectangle totaling exactly 10 removes every nonzero cell inside. Each removed cell earns 1 point. Empty cells count as 0; no refill, bonus, multiplier, rankings, storage, power-ups, or shuffle controls.
- Explicit Start begins the timer. Restart begins a fresh board and cancels prior animation callbacks. The initial random board guarantees at least 24 disjoint legal rectangles using randomly oriented, randomly valued domino pairs; no visible grouping is rendered.
- The timer uses an absolute performance-clock deadline. A release at or after the deadline earns no points. Visibility changes, rules, resizing, orientation, and fullscreen never pause or reset it. An unsolvable board or cleared board ends immediately.
- All fruit, basket, leaf, effects and typography are local CSS/system fonts. No external assets, APIs or packages added.

## Automated verification

Run from the repository root:

```sh
node tools/sum-ten-test.js
node tools/sum-ten-ui-test.js
node tools/sum-ten-contrast-test.js
```

All passed on 2026-10-19.

### Pure engine

10 groups cover all four rectangle directions, exact ten, invalid sums/corners, holes and nonempty-cell scoring, immutable input boards, 1,000 generated opening boards (at least 24 legal moves each), 120 complete clearable boards, exhaustive-vs-prefix-sum rectangle enumeration on 50 sparse boards, no-moves/cleared termination, exact deadline boundary, background time jump, and all 48 transpose mappings.

### DOM interaction

Happy DOM dispatches real PointerEvent objects through the installed pointerdown → pointermove → pointerup handlers. Tests check touch and mouse paths, capture and release, four corner directions, live selection sum and highlight, multiple pointers, cancellation, lost capture, out-of-board release, re-entry, keyboard anchoring/arrows/confirmation/cancel/repeat, transposed keyboard and pointer paths, resize cancellation with board/time preservation, fullscreen, rules, exact-deadline release, background expiration, restart, end-state focus, no-moves and full-clear feedback, reduced motion, old callback cleanup and one active animation frame.

The DOM test uses mocked geometry and media queries. It does not establish rendered layout or real browser capture behavior; those require the separate browser pass.

### Contrast

13 essential text pairs all pass 4.5:1 (lowest 5.16:1). Four selection, focus and time-progress indicators pass 3:1 (lowest 4.91:1). Fruit numbers are dark on light opaque fruit fills, independent of color. Valid selections additionally show a checkmark and the exact total.

## Browser acceptance

The parent handles actual cloud-browser drag and screenshots. Required viewports: 1366×768, 390×844, 844×390, 360×640, 640×360, 320×568, 667×375.

Verify no page overflow or clipped controls, cell boxes at least 44×44 CSS pixels, real drag capture, outside release cancellation, orientation preservation, fullscreen preservation, result view, and deadline expiration. Board CSS alone uses touch-action:none; buttons retain touch-action:manipulation.

## Read-only QA API

- `window.SumTenDebug.snapshot()` returns a detached state copy, including board, score, status, startedAt, deadline, reason, endedAt.
- `window.SumTenDebug.legalRectangles()` returns currently legal `{from:{row,col},to:{row,col}}` in canonical logical coordinates.
- `window.SumTenDebug.layout()` returns current rendered rows, cols and landscape flag.
- `window.SumTenDebug.visual({row,col})` maps canonical coordinates to rendered coordinates; `logical()` is the inverse.
- Engine utilities are available through `window.SumTen` (also CommonJS in Node).

No QA state mutation hooks are shipped. The DOM test injects its own private fixture seam only in the test-evaluated source.

## DOM selectors

- `.ten-app`: `data-phase`, `data-score`, `data-reason`, `data-deadline`, `data-orientation`
- `#ten-board`: `data-selection-sum`, ARIA row and column counts
- `[data-cell="N"]`: canonical index `row*6+col`, with `data-logical-row`, `data-logical-col`, `data-visual-row`, `data-visual-col`, `data-value`
- `#start`, `#score`, `#time`, `#sum`, `#selection-box`, `#feedback`
- `#result`, `#result-title`, `#result-restart`, `#rules-open`, `#rules-dialog`
- Shared fullscreen control: `[data-game-fullscreen]`

## Delivery manifest

Only these eight new files belong to this game:

1. `game/sum-ten.html`
2. `game/assets/sum-ten.css`
3. `game/js/sum-ten-engine.js`
4. `game/js/sum-ten.js`
5. `tools/sum-ten-test.js`
6. `tools/sum-ten-ui-test.js`
7. `tools/sum-ten-contrast-test.js`
8. `tools/sum-ten-qa.md`

The local node_modules symlink is only for test execution and is not a deliverable. No entry page, package manifest, common files, commits or remote state were changed.

## Final integration browser verification — 2026-10-19
Cloud Chromium: seven requested viewports fit without page scrolling. All 48 cells meet 44px, including 640×360 and 667×375. Native browser pointer drags removed a valid pair (+2), a reverse-direction drag in transposed landscape removed another pair (+2), and an invalid rectangle left score and cells unchanged. Canonical cell-ID/value mapping, score and deadline survived orientation changes and fullscreen fallback/Escape. Screenshots and geometry evidence are in the separate release bundle. These are actual Chromium pointer interactions, not physical touch hardware tests.
Natural 90-second expiry was observed without clock injection: phase finished, reason time, time 0, score 4. Result restart returned playing with 90 seconds and score 0. Final integrated pages loaded successfully with no local-origin console errors.
