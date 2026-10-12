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
- Storage failures do not stop completion
- 12 additional complete UI/controller games with card conservation and rank-by-rank counter checks after every turn

Real-browser checks are still required. The mock cannot validate CSS, image loading, accessibility-tree behavior, touch scrolling, pointer capture or native hit testing:

1. Check desktop and narrow mobile viewports: all 16 cards, the counter, controls, avatars and result text remain usable with no horizontal page overflow.
2. Click/tap a card twice; selection should toggle and the play button should reflect legality.
3. Drag across several exposed card edges in both directions; the selected range should follow the pointer without flickering or repeatedly toggling. Drag back toward the starting card and check that the range shrinks.
4. Try a long drag, pointer release outside the hand, pointer cancellation and selection while AI is thinking. No stuck drag state or extra click should remain.
5. On touch, a primarily vertical gesture should scroll rather than bulk-select; a horizontal gesture should select without an extra synthetic-click toggle.
6. Repeatedly click Hint; only valid selections should appear, the hint list should cycle, and no cards should be played until Play is pressed.
7. Restart while AI is thinking and while a forced pass is pending. Cancel once, then confirm. Old callbacks must not act in the new deal.
8. Finish a game and replay it: ordinary action buttons disappear at the end, replay is available, result counters reset, and all initial controls return correctly.
9. Check the restart dialog with keyboard focus, Escape, cancel and confirm. Check image loading and screen-reader card labels.
