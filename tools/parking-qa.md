# Parking eight-direction challenge redesign

## Scope and behavior
- The existing 16 single-player levels still contain 50, 70, 90, …, 350 cars.
- Replaced concentric domino rings with deterministic, perforated mixed-direction lots. Every level substantially represents all eight headings; no straight same-heading lane exceeds four cars (the first two levels have no adjacent same-heading lane).
- Reverse legal-exit construction guarantees an acyclic unlock graph. The gameplay solver independently checks continuous swept rectangular car bodies, including diagonal corner clips rather than only centre rays.
- Difficulty is finding available exits and following interleaved unlocks. Legal removals are monotonic and **cannot create strategic deadlocks**; no new movement rules, penalties, timers, or forced order were added.
- Rotated buttons and visible bodies share the exact 1.8 × 0.84-cell collision footprint. Max zoom is 56px per cell (47.04px narrow hit side). All departure animations travel far enough to leave the clipped lot, including diagonals crossing the full board.
- Restart, next/select level, save/resume, keyboard and rapid clicks remain supported. v2 saves retain selected level and sanitized earned completions, while the incompatible active ring-board removals restart on the new board; subsequent saves use v3.

## Measured challenge (final engine)
| Level | Cars | Initially free | Unlock depth | Longest same-heading lane | Exits in one row-major sweep |
|---|---:|---:|---:|---:|---:|
| 1 | 50 | 4 | 12 | 1 | 8 |
| 2 | 70 | 4 | 14 | 1 | 11 |
| 3 | 90 | 4 | 21 | 2 | 12 |
| 4 | 110 | 4 | 22 | 3 | 15 |
| 5 | 130 | 4 | 24 | 2 | 10 |
| 6 | 150 | 4 | 34 | 3 | 16 |
| 7 | 170 | 4 | 29 | 3 | 19 |
| 8 | 190 | 4 | 32 | 2 | 17 |
| 9 | 210 | 4 | 40 | 4 | 52 |
| 10 | 230 | 4 | 40 | 3 | 10 |
| 11 | 250 | 4 | 55 | 4 | 18 |
| 12 | 270 | 4 | 39 | 4 | 15 |
| 13 | 290 | 4 | 65 | 4 | 63 |
| 14 | 310 | 4 | 49 | 4 | 36 |
| 15 | 330 | 4 | 49 | 4 | 14 |
| 16 | 350 | 4 | 50 | 4 | 12 |

## Automated verification (2026-10-26)
- `npm run test:parking`: model, DOM/input, and contrast suites pass.
- Model: all exact car counts, deterministic generation, in-bounds rotated bodies, every pair non-overlapping, and complete solutions. An independent convex swept-polygon SAT oracle checks every car's blockers on every level, plus 3,136 heading/offset combinations and dedicated diagonal clip/near-miss/behind-tail cases.
- 25,600 randomized legal exits verify solvability after arbitrary valid choices and the monotonic property that a legal exit stays legal. Blocked/duplicate/invalid moves do not advance the game; valid/invalid/legacy saves are covered.
- DOM/input: all 3,200 rendered car transforms have exact model footprint and finish completely beyond one board edge; all diagonal labels present. Blocked feedback, keyboard clears, rapid pointer exits during animations, restart race, save/resume, next/final level, completion titles, fullscreen fallback, and legacy-save migration pass.
- Responsive formula tests exercise desktop, portrait and landscape container sizes, fit/reset behavior, maximum zoom, and >=44px car-body hit width at maximum zoom. These are DOM/formula tests, not a browser rendering claim.
- Essential text/paint contrast remains >=4.5:1. Engine/UI syntax and `git diff --check` pass.

## Rendering verification limit
Current cloud CUA cannot reach the local HTTP server in the execution environment, and the attempted environment escalation was blocked. Actual desktop/mobile browser rendering and physical touch interaction were **not verified for this revision**. No alternate browser/CDP route or external hosting was used. Prior visual checks of the old ring layout do not validate these new diagonal layouts.


## Live-QA control-clipping correction (2026-10-26)
- Live Chromium at 1188 × 761 found restart spanning y728.19–772.19 and the level picker y729.19–771.19. The app was fixed to 761px with `overflow:hidden`, so the bottom 11px were inaccessible to ordinary scrolling. The desktop play column was 603.38px tall inside a 553px row: the 58dvh scene did not yield to the heading/navigation/control height.
- Minimal desktop-only CSS correction: make the play column a full-row-height flex column, retain the full height of every non-scene child, and let the scene shrink to its existing 260px minimum. `safe center` keeps overflowing content top-aligned on exceptionally short rows; `overflow-y:auto` on the app provides an ordinary scroll fallback. Existing narrow and low-landscape natural document flow is unchanged.
- No puzzle rules, geometry, car targets, zoom range or controller behavior changed. The lot viewport still scrolls independently; overview sizing uses the resulting scene size and the same max zoom still produces 47.04px narrow car targets.
- Regression coverage checks the actual CSS cascade at 1188×761,1366×768,800×500,761×481,390×844,320×568,844×390 and667×375, including fullscreen fallback. Existing controller tests now also exercise 391px and 260px high lot containers, fit/reset and max-zoom targets.
- These CSS/DOM checks do not prove pixel layout. Final live rendering, wheel-scroll reachability and hit testing must be rechecked after deployment by the parent QA thread.
