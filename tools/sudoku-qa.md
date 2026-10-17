# Sudoku responsive UI verification

## Automated checks

Run from the repository root:

```sh
npm ci
node tools/sudoku-ui-test.js
```

If the declared dependency is already installed elsewhere, the test accepts
`HAPPY_DOM_PATH=/path/to/node_modules/happy-dom` without changing dependencies.

The 17 checks execute the real Sudoku script and the shared fullscreen controller
inside Happy DOM. A test-only copy exposes state; no test API is shipped in the
page. Covered behavior:

- All 81 cells, nine touch digits, clear, difficulty, and existing actions remain.
- Touch and keyboard entry, correct-entry advance, Backspace/Delete, protected
  clues, error highlighting, and incomplete-answer feedback.
- Candidate visibility, button/keyboard hints, new-game reset, difficulty-specific
  clue counts, rules close/reopen, completion modal, and play-again.
- Repeated expanded-view enter/exit, Escape, native fullscreen events, rejected
  native API fallback, and preservation of puzzle, selection, timer, and hints.
- Explicit Arial/Helvetica lining and tabular numerals for values, candidate
  digits, and numeric keys, with a shared unit line-height; title typography is preserved.
- Portrait/short-landscape CSS contracts, always-present keypad, scrollable
  controls/dialogs, square board, safe areas, and reduced-motion styles.

Result: 17 passed, 0 failed. All pre-existing inline JavaScript is byte-for-byte
unchanged from the repository HEAD used for these layout changes.

Happy DOM does not calculate real browser rectangles, font rendering, physical
pointer hitboxes, safe-area insets, or browser fullscreen behavior. Passing these
checks does not establish screenshot or touch-device correctness.

## Browser validation matrix

The following checks require an actual browser and are not claimed as completed
by the DOM tests:

| Viewport | Required check |
| --- | --- |
| 320 × 568 / 390 × 844 | Board fits the viewport width; controls remain reachable below it; no horizontal scrolling. |
| 768 × 1024 | Board and controls stay centered and readable in the stacked layout. |
| 568 × 320 | Board remains at least 252 CSS px wide; three-column keypad and clear are usable in the independently scrollable aside. |
| 667 × 375 / 844 × 390 | Square board and control panel sit side by side; digits remain readable; all actions can be reached by scrolling the panel. |
| 1440 × 900 / 1920 × 1080 | Larger square board uses available space; keypad is available without a keyboard. |
| Normal and expanded modes | Toolbar stays reachable; no notch/home-indicator occlusion; Escape/exit restores the same game. |

During a running puzzle, enter a wrong digit, use clear, fill a correct digit,
toggle candidates, ask for a hint, rotate/resize, and enter/exit expanded mode.
Confirm the same board and selection survive. Open rules in short landscape,
scroll to its bottom close action, and repeat in expanded mode. Complete a puzzle
and use play-again to check the modal controls remain reachable.

Actual Chromium viewport and fullscreen results: [four-game responsive QA](game-responsive-qa.md).
