# Net: twenty progressive levels

## Board progression

Dimensions are columns × rows. Every next level adds cells; no existing level shrinks.

| Level | Dimensions | Cells |
| --- | --- | --- |
| 1 | 5 × 5 | 25 |
| 2 | 5 × 6 | 30 |
| 3 | 6 × 6 | 36 |
| 4 | 6 × 7 | 42 |
| 5 | 7 × 7 | 49 |
| 6 | 7 × 8 | 56 |
| 7 | 8 × 8 | 64 |
| 8 | 8 × 9 | 72 |
| 9 | 9 × 9 | 81 |
| 10 | 9 × 10 | 90 |
| 11 | 10 × 10 | 100 |
| 12 | 10 × 11 | 110 |
| 13 | 11 × 11 | 121 |
| 14 | 11 × 12 | 132 |
| 15 | 12 × 12 | 144 |
| 16 | 12 × 13 | 156 |
| 17 | 13 × 13 | 169 |
| 18 | 13 × 14 | 182 |
| 19 | 14 × 14 | 196 |
| 20 | 14 × 15 | 210 |

Difficulty is increased through board area; randomized puzzle layouts are not claimed to have a strict ordering of solve times or a unique solution.

## Automated verification

Run `node tools/net-test.js` (also included in `npm run test:games`).

17 regression groups cover all 20 sizes, including 6,000 seeded generated puzzles. Checks include reciprocal connectivity, tree edge count, a valid solution, initially unsolved boards, deterministic seeds, rectangular bounds, valid rotations, hint budgets, exact reset, every level transition, no advance before victory, final-level stopping, replay and reroll, keyboard navigation, accessible labels and roving focus, local assets, and the shared fullscreen contract.

## Layout contract and browser checklist

Cells keep a minimum 44 × 44 CSS-pixel target. At mobile sizes, a 14-column board has a minimum width of 661px; it scrolls within the board frame instead of shrinking cells or forcing page-wide overflow. On larger screens, its minimum width is 689px. The scrolling region has a 70svh maximum height (70vh fallback), supports both axes, and is keyboard-focusable. Directional cell navigation and hints move native focus to the relevant cell.

Browser verification should cover:

- At desktop and 390px/320px viewport widths, inspect levels 1, 2 and 20. Confirm square readable cells, no page-wide horizontal overflow and both-axis scrolling for the last level.
- Swipe the large board without rotating a tile accidentally; tap a tile to rotate once.
- Use arrow keys across the five-column/six-row level, including bottom and right boundaries.
- Solve or inject a solved model in the QA browser only; confirm Next Level appears, the next board resets counts and hint budget, and the final level offers replay without level 21.
- Check reset restores the same opening while preserving spent hints, and reroll stays on the selected level.

Browser verification is separate from the dependency-free Node tests; CSS contract assertions do not replace rendering checks.

## Completed cloud Chromium checks
- At 390×844 CSS viewport, level20 renders210 cells, each44×44px. Scroll container318×576px contains667×714px content. Last-cell click scrolls to both far edges and increments rotation count.
- Local-only completion fixtures exercise level19→20 (196→210 cells, cleared victory), final-level completion with no next button, and replay of level20. Fixtures are not shipped.
- Desktop Chromium with simulated CSS viewport; no physical-device/Safari claim.
