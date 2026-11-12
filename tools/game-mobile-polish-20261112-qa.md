# Mobile game experience pass — 2026-11-12

This is a focused usability pass, not a claim of feature parity with a particular commercial mini-game, nor an integration with Douyin or WeChat.

## Changed

- Game lobby: games move above learning demos; 16 game cards, three categories, keyboard-accessible filters and a local recent-game shortcut. No login, advertising or analytics added.
- Water sort: bounded on-demand solver hints, move count, personal best and completion progress. Hints never move a bottle on the player's behalf.
- Sum ten: optional two-tap corner selection for one-handed play; explicit pause/resume preserves the remaining time across background tabs.
- Yarn, parking and screws: rules available from the game; restart/level changes ask before discarding current moves. Parking distinguishes a drag from a vehicle tap.
- Meadow match: validated replay-based automatic save and restore, progress and match feedback.
- Hanzi battle: explicit battle pause/resume; tile frontier: action-budget warning and directional-key map navigation.
- Shared fullscreen CSS now also handles standalone game shells. Existing card/puzzle rules and Jianghu Slay saves are untouched.

## Reproducible checks

`npm run build`, `npm test`, `npm run test:game-polish`, `git diff --check`.

The new game-polish suite covers lobby filtering/URL allowlisting, cancellation and repeated actions in confirmation sheets, save restoration/corruption and pause/resume. Existing water/sum UI suites cover hint races, two-tap input and manual/background pause combinations.

## Limits

Local preview was unreachable from the available browser. DOM tests are not rendered-layout checks. Real-device touch, WebView differences, notches, low-end-device performance and every game's level balance remain outside this pass. Actual public-page checks are recorded separately after deployment; do not infer mobile-device verification from desktop observations.
