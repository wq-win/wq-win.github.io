# 跑得快 regression checks

Run the dependency-free Node suite from the repository root:

```sh
node tools/paodekuai-ui-test.js
```

The UI suite also runs the original engine tests. To run only the engine tests:

```sh
node -e 'global.print=console.log;require("./js/paodekuai-engine.js");require("./tools/paodekuai-test.js")'
```

The UI harness loads the real HTML, engine and controller in an isolated Node VM with a minimal DOM and controllable timers. It adds private test access only to the in-memory controller source; no debug interface is published in production.

Automated coverage:

- Original 48-card deck: one spade 2, three aces, 16 cards per player
- Original card combinations, spade-3 opening and report-single restrictions
- Mandatory responses, including when a bomb is the only answer
- Forced-pass timing, restart timer cancellation and rejection of stale callbacks
- Legal hint cycling, disabled states and selection without playing
- Public remaining counts derived from the deck, own hand and played-card ledger, with no reliance on hidden opponent identities
- Replay, restart confirmation/cancel, modal pause/resume, endgame action visibility and one-time result recording
- AI/forced-pass pause while confirming restart, stale callback rejection, native close (Escape) resumption and uncounted abandoned deals
- Local page/CSS/image references, dynamic J/Q/K filenames and unique/control IDs
- Keyboard/pointer event logic, range selection, deselection and cancellation (mock geometry only)
- Uncapped shared game wrapper and full-screen control containment
- Card-width-scaled Arial/Helvetica lining/tabular ranks with equal fixed-height boxes, including 10
- Border-aware pip/corner and pip/pip box separation at 44–112px card widths (arithmetic only)
- Centered, uncropped J/Q/K artwork using the original SVG aspect ratio, with rank/suit clearance at 44–112px widths (arithmetic only)
- Shared Arial/Helvetica lining/tabular counter typography for ranks and counts
- Balanced row fitting for ordinary 16-card hands plus 17/20-card geometry stress fixtures, retaining a readable exposed strip without changing card width
- Row-locked horizontal selection for every row of 16/17/20-card fixtures, including reverse drags, lifted cards, row-end taps, cancellation and restoration
- Expanded-view/orientation changes preserve game state and completed selections; restart-modal Escape does not also exit expanded view
- Storage failures do not stop completion
- 12 additional complete UI/controller games with card conservation and rank-by-rank counter checks after every turn

Real-browser checks are still required. The mock cannot validate CSS, image loading, accessibility-tree behavior, touch scrolling, pointer capture or native hit testing:

1. Check 1440×900 and 1920×1080 desktop, 320×568 and 390×844 portrait, and 568×320 and 812×375 landscape viewports. All 16 cards, the counter, controls, avatars and result text must remain usable with no horizontal page overflow. Narrow portrait hands should use balanced rows; card ranks must remain full-size.
2. Click/tap a card twice; selection should toggle and the play button should reflect legality.
3. Drag across several exposed card edges in both directions; the selected range should follow the pointer without flickering or repeatedly toggling. Drag back toward the starting card and check that the range shrinks.
4. Try a long drag, pointer release outside the hand, pointer cancellation and selection while AI is thinking. No stuck drag state or extra click should remain.
5. On touch, a primarily vertical gesture should scroll rather than bulk-select; a horizontal gesture should select without an extra synthetic-click toggle.
6. Repeatedly click Hint; only valid selections should appear, the hint list should cycle, and no cards should be played until Play is pressed.
7. Restart while AI is thinking and while a forced pass is pending. Cancel once, then confirm. Old callbacks must not act in the new deal.
8. Finish a game and replay it: ordinary action buttons disappear at the end, replay is available, result counters reset, and all initial controls return correctly.
9. Check the restart dialog with keyboard focus, Escape, cancel and confirm. Check image loading and screen-reader card labels.

10. Check 6, 8, 9, 10, J, Q, K, A and 2 in the hand and played cards at the same card width. All ranks must have the same font size, line box and numeric baseline. Check both corners, all pip counts, court art, selected cards and the spade-3 marker for clipping or collisions.
11. Select cards in each hand row, drag horizontally in both directions within that row, and drag down to scroll. Vertical touch movement must cancel the pending selection and restore the previous selection. Keyboard activation must still select every card.
12. Enter and exit full-screen repeatedly, both with the Fullscreen API and its in-page fallback. Confirm the same deal, selected cards, hint position, counters and AI state survive. Rotate while expanded, and try Escape. The exit control must stay reachable at the top while the board scrolls vertically on short screens.
13. Open restart confirmation while expanded. Escape should close the dialog first; cancel must resume the same game and confirm must produce one new deal. At a short landscape height the complete dialog must scroll into reach.

Implementation verification (2026-10-17):

- 41 dependency-free UI/engine regression tests passed, including the original 40 simulated games/30 deals and 12 complete controller games.
- The screenshot supplied for review showed uneven old-style numeral heights in both the card hand and the counter. Both now use explicit Arial/Helvetica lining/tabular typography; no overlapping-hand code adjusts individual rank sizes.
- These are production-controller, explicit-geometry and source-contract tests in a Node VM. They do not measure browser glyph pixels, CSS layout, touch behavior or actual Fullscreen API support.
- Real-browser visual, Fullscreen API and physical touch QA must be recorded separately; this suite does not claim those checks passed.

Actual Chromium viewport and fullscreen results: [four-game responsive QA](game-responsive-qa.md).
