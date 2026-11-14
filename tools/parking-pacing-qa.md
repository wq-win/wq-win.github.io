# Parking short-session pacing

The previous catalog required 50, 70, …, 350 departures (3,200 across 16 levels). The new catalog requires 12,16,20,24 / 18,24,28,32 / 24,30,36,40 / 30,36,42,48 (460 total, 85.625% fewer mandatory moves). Levels 5, 9 and 13 deliberately ease off before the next ramp. No wall-clock completion-time claim is made.

Difficulty is not increased by car count alone. The longest blocker-dependency chains are 4,5,6,7 / 5,6,7,8 / 6,9,10,11 / 8,10,11,13. Every board begins with four exits, contains all eight directions and has no uniform same-direction lane longer than two cars. Later levels require noticing interleaved blockers instead of just repeatedly tapping a row. All legal departures remain safe: this is a visual planning puzzle, not an irreversible-choice or time-pressure game.

Tests: `npm run test:parking` and `node tools/workshop-session-test.cjs`. Independent polygon geometry validates all boards' physical collision rules; 3,680 randomized legal departures verify solvability, and all sixteen v3 saved-run migrations retain the exact old board, remaining IDs, and completion records. Existing runs only switch catalogs when the player explicitly restarts, picks a level or proceeds to the next level. UI tests verify legacy progress display, continued play and explicit transition. Current saves use v4 in the existing storage key, without deleting the key or silently discarding unfinished work.

Browser/device rendering of this pacing revision has not been claimed by these model/DOM tests.
