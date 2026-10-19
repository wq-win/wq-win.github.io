# Parking puzzle QA

## Implemented
- 16 deterministic, unique 5×5 layouts, growing from 3 to 9 two-cell cars.
- Straight-ahead collision model, immediate blocked-car motion and blocker outlines.
- Departure animation, keyboard-native car buttons, level selection, restart, next-level progression and final-level wrap.
- Validated versioned local save; corrupted and physically impossible saves reset safely.
- Shared fullscreen controller with in-page fallback and Escape exit.
- Responsive portrait/landscape composition and reduced-motion handling.

## Executed tests
- `node tools/parking-test.js`: PASS. Geometry, non-overlap, 16 unique levels, all 295 reachable states exhaustively traversed, legal move existence in every reachable nonterminal state, dependency chains, blocked moves, wins, save/restore.
- `node tools/parking-ui-test.js`: PASS (happy-dom). Blocked feedback, obstacle highlighting, legal exit sequence, level victory, final level, restart during pending departure, saved completed state, malformed save, fullscreen fallback and Escape.

## Visual verification
Shell Chromium screenshot startup was blocked by sandbox socket permissions. Parent browser QA should inspect 1280×800, 390×844, 320×568 and 844×390, and check final-level density plus departing-car motion. No browser screenshots claimed as verified here.

## Contrast follow-up
Essential muted labels/instructions now use #4e6550 (5.55:1 on page, 4.91:1 on board); blocked feedback 5.81:1; select/restart 9.37:1; next-level action 7.31:1. Car arrows/numbers use opaque dark #172a20, ranging 4.94:1–9.12:1 across all nine car paints. Number size increased to 10px. Decorative car palette retained. `node tools/parking-contrast-test.js` verifies these color pairs and CSS contracts; PASS. UI regression still PASS.

## Pointer hit-testing follow-up
Parent browser QA found native car clicks unreliable within the preview iframe when the board used perspective/preserve-3d and hover compositing. Replaced projection with affine rotate/skew/scale, removed preserve-3d and moved hover brightness to the pointer-inert visual child. Car dimensions are unchanged. Model, UI and contrast tests PASS; UI test now guards against reintroducing 3D hit areas. Parent is rechecking native iframe clicks.

## Real cloud Chromium review (2026-10-19)
- Verified pointer-blocked feedback, then pointer-only first-level win, next-level progression and restart. Affine tilt fixed iframe CSS-3D hit testing; final pointer sequence passes.
- Late nine-car layout inspected at 1440×900, 390×844, 320×740, 320×568, 844×390 and 667×375. Final short-phone document dimensions are exactly 320×568, with visible full controls and no page overflow.
- Original car dimensions preserve 44px minimum untransformed hit areas; observed transformed bounding boxes exceed 69px on their shorter dimension at 320px.
- Real top-level browser departure and persisted remaining-car restore also verified. This is desktop Chromium CSS viewport testing, not a physical mobile-device test.
