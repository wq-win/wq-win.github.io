# Four-game responsive UI checks — 2026-10-17

Scope: Dou Dizhu puzzles, Paodekuai, Spider Solitaire and Sudoku. Changes are presentation/input-layout only; existing rules, level data and puzzle-generation scripts remain unchanged.

## Automated checks

```sh
npm ci
npm run test:games
```

- Paodekuai: 41 VM/UI/engine groups
- Dou Dizhu: 61 VM/UI/engine groups, including every existing level
- Spider: 15 VM/UI/engine groups
- Sudoku: 17 Happy DOM groups
- Source-derived geometry: 68 Dou Dizhu combinations and 32 Spider combinations
- JavaScript syntax checks and `git diff --check`

All pass. The geometry arithmetic and DOM tests do not substitute for browser rendering.

## Actual browser checks

Desktop Chromium rendered the real local pages in same-origin iframes with explicit CSS viewport sizes. Disallowing iframe fullscreen exercised the page-fill fallback; allowing it exercised native fullscreen at the host browser's available screen size.

- All four pages were inspected at 320×740, 390×844, 844×390 and 1440×900 CSS viewports. Document width did not exceed viewport width.
- Native fullscreen entry and exit preserved the current cards or Sudoku board for all four games, and restored the original iframe viewport. Dou Dizhu selection was also preserved. The native and fallback exit labels reflected the active mode.
- Dou Dizhu's final landscape layout was additionally checked at 667×375. The level strip remains at least 66px high rather than collapsing its grid track. Hands retain 72px cards, and the final card is reachable by horizontal scrolling. All card-art centers aligned with the whole-card center to within 0.01 CSS px in sampled ordinary, court, ace and joker faces. Both joker titles remain exposed under the following card. The 844×390 action buttons are 44px high and lie within the initial viewport; extra status/decoration remains vertically scrollable.
- Paodekuai uses balanced hand rows on narrow screens and equal rank boxes. The counter uses the same lining-numeral font family. Exit, restart and play controls were verified at least 44px tall in narrow/short-landscape views; player avatars and counter information are retained. Desktop play-control and replay minimum heights are also set to 44px in CSS; replay was not live-observed. In the short landscape, vertical scrolling brings the whole hand into view while the exit stays pinned and actions remain reachable.
- Spider retains ten columns and a 72px minimum card width. On phones, the tableau alone scrolls sideways; stock, difficulty, hint, undo and exit remain outside that horizontal scroller. All ten columns fit at the tested 844px and desktop widths.
- Sudoku keeps all 81 cells on a square board. Sample expanded-board widths were approximately 269px (320px portrait), 339px (390px portrait), 294px (844×390 landscape) and 700px (1440px desktop). The landscape board and keypad sit side by side; the control pane scrolls independently. Exit targets are 44px tall.

The browser pass caught and corrected a collapsed landscape level strip, undersized short-landscape controls, and an unnecessarily narrow court illustration before release.

## Limits

This is real Chromium CSS-layout/fullscreen testing, not physical iPhone/Android touch testing. Synthetic 17/20-card hand fixtures, drag selection and rare fullscreen-request races are covered by DOM/source tests, not claimed as physical-device checks. Safe-area rules were reviewed in source; real notch/home-indicator insets, mobile browser chrome, touch gestures, iOS fullscreen availability and accessibility-tree behavior still require device testing. Final full-page screenshots capture the complete iframe viewport; a vertically scrollable game still shows its current internal scroll position, not every part of the table at once.
