# 框选凑十 QA

## Scope

- One 90-second mode. Canonical logical board: 8 rows × 6 columns, integers 1–9. Portrait renders 8 rows × 6 columns; landscape transposes to 6 rows × 8 columns without replacing the state.
- A rectangle totaling exactly 10 removes every nonzero cell inside. Each removed cell earns 1 point. Empty cells count as 0; no refill, bonus, multiplier, rankings, power-ups, or shuffle controls.
- Explicit Start begins the timer. Restart begins a fresh board and cancels prior animation callbacks. The initial random board is a full 48-cell, mixed-value board with a replay-verified full-clear certificate. There is no disjoint-pair tiling; later rectangles cross holes made earlier. No solution grouping is rendered.
- The timer uses an absolute performance-clock deadline. A release at or after the deadline earns no points. Rules and document visibility pause it; resize, orientation and fullscreen preserve the existing deadline. An unsolvable board or cleared board ends immediately.
- All fruit, basket, leaf, effects and typography are local CSS/system fonts. No external assets, APIs or packages added.

## Automated verification

Run from the repository root:

```sh
node tools/sum-ten-test.js
node tools/sum-ten-ui-test.js
node tools/sum-ten-contrast-test.js
```

All passed again on 2026-10-26 after the generator redesign.

### Pure engine

10 groups cover all four rectangle directions, exact ten, invalid sums/corners, holes and nonempty-cell scoring, immutable input boards, 1,000 distinct generated boards with complete certificate replays, mandatory multi-number and gap-clearing invariants, pair-only greedy failure, structural diversity and constant-RNG termination, exhaustive-vs-prefix-sum rectangle enumeration on 50 sparse boards, no-moves/cleared termination, exact deadline boundary, background time jump, and all 48 transpose mappings.

### DOM interaction

Happy DOM dispatches real PointerEvent objects through the installed pointerdown → pointermove → pointerup handlers. Tests check touch and mouse paths, capture and release, four corner directions, live selection sum and highlight, multiple pointers, cancellation, lost capture, out-of-board release, re-entry, keyboard anchoring/arrows/confirmation/cancel/repeat, transposed keyboard and pointer paths, resize cancellation with board/time preservation, fullscreen, rules, exact-deadline release, background pause/resume, restart, end-state focus, no-moves and full-clear feedback, reduced motion, old callback cleanup and one active animation frame.

The DOM test uses mocked geometry and media queries. It does not establish rendered layout or real browser capture behavior; those require the separate browser pass.

### Contrast

13 essential text pairs all pass 4.5:1 (lowest 5.16:1). Four selection, focus and time-progress indicators pass 3:1 (lowest 4.91:1). Fruit numbers are dark on light opaque fruit fills, independent of color. Valid selections additionally show a checkmark and the exact total.

## Browser acceptance

**2026-10-26 revision:** real-browser desktop/mobile rendering and drag QA remain blocked because the local preview loopback is isolated from CUA. No external preview was published. DOM pointer-handler and mocked-geometry tests passed, but are not rendered-browser evidence; any earlier browser record below is historical.

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

## 2026-10-21 polish
- Highest finished score is stored locally (storage denial is harmless); opt-in short audio shares a persisted mute preference with the other two games.
- Rules and document visibility pauses freeze remaining time. Resume extends the deadline by actual paused duration; rotating/fullscreen does not restart a game.
- Existing live sum, valid rectangle highlighting, keyboard control and reduced-motion effects are retained.


## 2026-10-26 challenge redesign

- Replaced the twelve independent 2×2 domino patches with 32 different overlapping rectangle partitions. The base partitions are distinct even after reflections and group-label renaming. Numeric compositions are freshly randomized inside each partition; these are not 32 fixed boards with cosmetic changes.
- Every generated board replays its full-clear certificate before it is returned. Positive values stay within 1–9, and all 48 cells are filled initially. Full clears take 14–17 moves because the board total is 140–170. Thus every solution requires multi-number rectangles; a pair-only solver cannot clear the board.
- Every remix protects a 9 from adjacent 1s. Any rectangle collecting this 9 together with its eventual complement must span at least one previously cleared cell. This proves a true gap clear is mandatory in every solution, not just the stored witness.
- Number remixing, bounded quality rejection and reflection retain 32 structural layouts. The target is 5–18 opening rectangles and at most 4 opening pairs; the bounded fallback preserves the hard solvability/multi-number/gap guarantees while allowing that opening preference to relax.
- Model regression over seeds 0–999: 1,000 unique numeric boards, 31 of the 32 structural layouts (120 reflected variants), 10–22 legal openings, at most 5 opening pairs. Certificates use at least 8 multi-number and 6 true gap clears. Unrestricted pair-only greedy clearing succeeds on 0/1,000 and leaves at least 14 cells.
- Wider 10,000-seed inspection: 9,990 unique boards, 9–23 legal openings, 0–5 opening pairs, mean 17.81 openings. Every board's certificate replayed successfully. Counts are observations, not a universal promise about the bounded fallback.
- DOM regression completes generated boards through actual PointerEvent dispatch in portrait and transposed landscape, verifies score 48 / cleared, and restarts into a new full board. Existing exact-deadline, pause/resume, keyboard, input cancellation, best score and reduced-motion regressions still pass. Rendered Chromium layout verification remains the parent integration pass; no browser-render claim is inferred from Happy DOM.
- The existing 90-second score mode is unchanged. No timer penalty, undo feature, new mode, shuffled refill, or extra control was introduced.
- Changed files for this redesign: `game/js/sum-ten-engine.js`, `tools/sum-ten-test.js`, `tools/sum-ten-ui-test.js`, and this QA note.
