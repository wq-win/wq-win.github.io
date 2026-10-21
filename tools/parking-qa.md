# Parking dense-lot upgrade

## Changes
- 16 levels: 50, 70, 90, …, 350 cars (exact 20-car increments).
- Deterministic concentric domino layout, non-overlapping geometry, guaranteed outward dependency ordering. Level data is generated immediately without rejection sampling.
- Cached spatial lookup for blockers, iterative solver and bounded save validation.
- Compact responsive overview, zoom controls (up to a 48px cell), native pan/scroll, accessible per-car buttons and direction labels.
- Independent outgoing animations allow consecutive successful taps. Blocked cars highlight obstructions.
- Optional short procedural sound, persisted mute setting. Versioned v2 progress avoids reusing old 3–9-car saved states.

## Completed checks
- `node tools/parking-test.js`: all 16 exact counts, in-bounds non-overlapping dominoes, complete solutions, blocked moves do not mutate state, persistence, malformed/impossible/old saves, 25,600 exits across random legal orders. Passed (~3.3s).
- `node tools/parking-contrast-test.js`: all essential UI ink/paint pairs >=4.5:1. Passed.
- `node --check game/js/parking.js` and engine syntax. Passed.
- Baseline files compared against public-main snapshot 990a911; identical before changes.

## Browser acceptance
Cloud Chromium checks at 390x844 and 844x390 iframe viewports verified dense layouts, level 1 / level 16 counts, zoom/pan, blocked feedback, successful exits, and reload restoration. Fifty consecutive valid pointer clicks cleared level 1 and opened the win panel; the next level showed 70 cars. Departing-car overflow was clipped to prevent transient scroll expansion during consecutive exits.

See `game-polish-20261021-qa.md` for the integrated verification record and limits. Physical-phone testing and manual clears of every level were not performed. Automated model and DOM regressions cover all levels and interrupted/repeated flows.

`tools/parking-ui-test.js` contains DOM regression coverage (requires happy-dom).
