# 斗地主残局 visual and control regression checks

Run the dependency-free Node suite from the repository root:

```sh
node tools/doudizhu-ui-test.js
node tools/paodekuai-ui-test.js
node --check js/doudizhu.js
node --check tools/doudizhu-ui-test.js
git diff --check
```

The suite loads the real HTML, unchanged rule engine, original levels and controller in an isolated Node VM with a minimal DOM and controllable timers. It injects lexical test access into the in-memory controller only; no test/debug API is published in the production controller. No package installation or browser is needed.

Latest local verification (2026-10-12, after the portrait/card/table refresh): **49 Doudizhu scenario groups passed, 0 failed**, including complete hint-driven playthroughs of all 11 original levels. The separate **Paodekuai suite passed 30 groups, 0 failed**, including its original engine regressions. JavaScript syntax and `git diff --check` also passed. No production defect was found by these automated checks.

The previous 37 Doudizhu groups remain intact. Twelve new groups cover the richer face-up presentation, resource references, decorated input targets, seat state and progress. The same committed engine and level-file SHA-256 expectations still pass.

## Visual structure and asset coverage

- Exactly two player seats and two distinct framed, labeled local portraits. Both 640 × 640 WebP references have valid signatures; the shared portraits were also opened and verified with Pillow in a separate offline asset check.
- Decorative card backs stay outside the two hands and inside the `aria-hidden` table ornament. Both original hands remain face-up and have accurate count labels in every level.
- All 54 deck identities render with distinct accessible rank/suit names and correct red/black classification, including both jokers. This full-deck fixture checks rendering only; it is not a new playable level.
- All 52 ordinary faces have matching top/bottom indices. Their decorative index copies are hidden from assistive technology.
- Aces have one large central suit; every 2–10 has exactly its rank's number of distinct, bounded pips, with lower pips inverted.
- J, Q and K use three distinct local double-ended SVG court illustrations with empty alternative text and disabled native image dragging. The SVG files were also parsed as XML offline.
- Every page, theme-CSS and dynamically generated artwork reference resolves to a nonempty repository file. Court SVGs contain no scripts or remote resource references.
- The theme stylesheet loads after the shared card stylesheet, scopes its selectors to `.dd-table`, and includes wrapping-hand, narrow-layout and reduced-motion rules. This is a source-level check, not proof of layout quality.
- Nested card artwork clicks select/deselect without submitting a move. The played-card area uses the same face renderer and remains passive.
- Seat indicators follow player/opponent turns, hint computation, restart pause/cancel and winner/replay states. Progress counts only real levels, ignoring unrelated stored keys.

## Automated coverage

- Original engine and all 11 original levels match the pre-refresh SHA-256 snapshots.
- Every original level loads its original hands and remains solvable via the real hint, play and pass event handlers.
- Small joker, big joker and rocket remain distinct, selectable and legal under the original rules.
- Passing remains available when a higher legal card exists; passing cannot start a trick.
- Empty, illegal, unavailable and non-beating moves cannot be submitted.
- Human actions are guarded during opponent turns, restart confirmation and finished games.
- Hints select a winning move without playing it. A physically valid position where passing is the only winning move, despite a legal higher single, is covered explicitly.
- Hints handle positions without a legal response without auto-passing.
- Asynchronous hints disable action submission while computing, cannot be queued twice, pause/resume safely and reject stale callbacks after navigation or restart. Search-budget fallback is clearly labeled as a legal reference rather than a winning guarantee.
- Wins and losses display explicit in-table actions. No timer advances to the next level; replay resets the same level; the final level has no next action.
- Winning only the final level does not falsely claim all levels are cleared. The all-cleared message appears after all 11 levels have been won.
- Navigation and restart reject already-queued stale AI callbacks, not only canceled timeout IDs.
- Restart confirmation pauses AI; cancel, native Escape/cancel and native close resume exactly one turn. Human selection survives cancellation.
- Repeated opponent scheduling cannot duplicate turns.
- A queued native close event cannot cancel a newly reopened restart dialog.
- Card labels and pressed state update correctly; the controller retains keyboard selection focus and restores top-restart focus on cancellation in the simulated DOM. Required IDs are unique and referenced local assets exist.
- Blocked storage reads, blocked writes, malformed JSON and non-object stored data do not interrupt initialization or completion; prior progress is retained.

## Verification limits

This report covers static/VM QA and offline asset decoding only. An earlier local Chromium attempt in this task environment was blocked with `socket() failed: Operation not permitted`; it was not retried for this refresh and sandbox restrictions were not weakened. The cloud browser reaches the owner-login screen for the private preview, so authenticated real-browser gameplay and layout QA remain unverified. The refresh does not change access permissions or claim browser acceptance.

The minimal DOM does not implement CSS layout, real image decoding/loading, the browser accessibility tree, native focus management, pointer hit testing, touch scrolling or asynchronous native dialog event timing. A passing VM suite does not prove those browser behaviors.

## Browser checklist

1. Test desktop and 520px, 390px, 360px and 320px widths: both visible hands, central hint/play/pass actions, top restart button, status and level navigation should fit without horizontal page overflow. Cards should wrap without covering indices or neighboring rows.
2. Select and deselect cards with mouse, touch and keyboard. Raised cards and selected styling should be clear; the play button should accurately reflect legality.
3. Check the two portraits and frames load sharply. Verify ordinary 10s, ace symbols, all J/Q/K art, both corner indices, both joker labels and the two-card rocket remain legible at each size, especially in the smaller played-card area.
4. Request a hint in an opening position and a response position. The hinted cards should be selected without being played. A pass hint should clear selection, explain the pass and leave the pass action available.
5. Restart while an opponent turn is pending. Cancel once, press Escape once and then confirm. The position should be retained after dismissal and reset only after confirmation, with no extra opponent move.
6. Verify the dialog traps keyboard focus and restores focus to a useful control after cancel/confirm. Check delayed native close events during rapid reopen/confirm flows.
7. Change levels repeatedly while the opponent is thinking; no old callback should alter the new level.
8. Finish a level: ordinary central actions should disappear, clear next/replay actions should appear inside the table, and the level should remain unchanged until an action is chosen.
9. Lose a level and retry it. Win the final level and replay it. Each flow should restore a usable initial state.
10. Check screen-reader card names, pressed selection state, disabled controls, hint announcements, result announcements and reduced-motion behavior.
