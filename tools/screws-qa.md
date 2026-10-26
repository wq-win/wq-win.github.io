# 松木螺丝铺 QA

## 2026-10-26 challenge revision (current)

- Replaced all 16 boards without changing removal/matching rules. The first four now have six mixed-colour plates (18 screws, four colours), rather than mostly flat nine-screw tutorials; later boards grow to seven, eight and nine plates. Five-slot tray, lower-colour preview, undo and restart remain.
- Stack order now matters to the shared tray: the fixed left-to-right tie-break “take the colour already most represented in the tray” policy loses on all 16 boards. Every board is nevertheless solver-verified, and **every first click remains recoverable**. This is an approachable opening, not a hidden wrong-first-click trap.
- Four boards also contain a verified same-colour choice where the immediate tray is identical but selecting a screw from a different plate changes whether completion remains possible. This directly checks meaningful reveal ordering, beyond merely preferring one colour.
- Exact winning probabilities for that same tray-greedy policy with uniformly random tied screws are listed below. These are enumerated policy metrics, not human win-rate or fun claims. Baseline levels 1–3 were 100% under this policy.

| Level | Screws | Exact greedy win probability |
| --- | ---: | ---: |
| 1 | 18 | 26.1% |
| 2 | 18 | 39.3% |
| 3 | 18 | 28.0% |
| 4 | 18 | 25.1% |
| 5 | 21 | 23.5% |
| 6 | 21 | 20.7% |
| 7 | 21 | 12.5% |
| 8 | 21 | 26.1% |
| 9 | 24 | 8.6% |
| 10 | 24 | 13.7% |
| 11 | 24 | 4.0% |
| 12 | 24 | 9.0% |
| 13 | 27 | 14.8% |
| 14 | 27 | 13.4% |
| 15 | 27 | 1.3% |
| 16 | 27 | 8.2% |

### Executed checks

- `npm run test:screws`: PASS. All 16 solution traces, legal reveals, full tray/matching, terminal and invalid actions, solver purity, exact greedy probabilities and all 144 first-click continuations.
- UI-handler tests (happy-dom): full win/progression, exact one-step undo, undo after win/loss, preview/non-interactive hidden screws, old-save migration, new-save resume, fullscreen fallback, and restart during a pending animation.
- Save schema version 3 preserves selected level and previously earned completions. Old version-2 in-progress moves are not replayed against different boards; new histories resume exactly. The pre-version-2 level-order migration still applies only to those older saves.
- Essential contrast checks pass unchanged. Existing 48px screw targets (44px compact landscape) and keyboard-native buttons are retained.
- **Current real-browser rendering/input QA is blocked**: the retained local HTTP preview is isolated from the CUA browser, which receives connection refused. An elevated local-server attempt failed before execution on the restricted sessions mount; no external preview was published. Desktop/mobile CSS rendering is therefore not claimed as verified for this revision. Earlier screenshots/release checks below are historical, not new evidence.

---

## Earlier release record (historical)

Entry: `game/screws.html`. No remote font, image or audio requests. Uses shared `js/game-view.js` for native fullscreen and in-page fallback.

## Verified automatically
- `node tools/screws-test.js`: 16/16 levels solved against the same model used by UI; 9–27 screws with 3–5 colors; every level also has reachable losing choices.
- Counts are multiples of three; lower plates remain blocked until the entire upper plate is removed; unavailable/repeated actions do not mutate state; terminal states reject actions; solver does not mutate live game.
- `node tools/screws-ui-test.js`: happy-dom checks start, 16-level selector, complete solved play, persistence, corrupted-save fallback, next/restart, lower-layer preview, no interactive hidden screws, loss/retry, fallback fullscreen/Escape without state loss, restart cancelling pending screw animation.
- Symbols distinguish every color. Screws are 48px targets (44px compact landscape). Native buttons support Tab/Enter/Space. Status updates and localized accessible labels included.
- Reduced-motion media preference skips timers' animation delay and all CSS animation. No clock or audio.

## Visual QA for parent browser pass
- Desktop 1280×720; portrait 390×844, 360×640, 320×568; landscape 844×390.
- Check workbench, five-slot tray and controls remain visible in one viewport; plate/preview spacing at tiny widths.
- Verify removal turn, last-screw falling plank, lower-layer reveal and triple-match tray flash.

## Rules
Five rack slots. A third screw of a color immediately removes that color's triple. Reaching five retained screws loses; clearing all plates wins. Each of three stacks reveals its next plate only after all three screws from the previous plate have been removed. Lower colors are previewed left to right in depth order. Completion badges and selected level persist locally; in-progress attempts intentionally restart on page reload.

## Contrast audit
- `node tools/screws-contrast-test.js` passed: essential secondary ink 5.13:1 on darkest cream surface; board preview labels 4.90:1; screw/preview symbols 10.06:1; result button 5.74:1.
- All instructions, progress, level labels, helper text and status use darker warm-brown ink. Screw symbols use an opaque dark engraved center inside the existing colored metal rim; lower previews use matching high-contrast centers with colored rings. This keeps symbol contrast independent of brass/highlight gradients.
- UI tests rerun after the symbol markup change and passed.

## Narrow-phone final spacing regression
- Parent real-browser QA confirmed pointer win, loss/retry, and exact 667×375 landscape fit.
- Late-level 16 at 320×740 originally scrolled 9px. Final <=360px portrait override trims header, board-to-tray, layout and helper spacing by ~33px without changing 48px screw targets or 44px controls.
- Existing <=600px portrait workbench rule still applies at 320×568 (218px board, 210px minimum); final spacing override further reduces this compact layout by ~7px. Parent browser recheck requested for both sizes.
- 320×568 follow-up measured only 1px overflow (569px document). Reduced narrow-portrait bottom padding from 10px to 2px to leave 7px rounding tolerance, with all controls unchanged.

## Real cloud Chromium review (2026-10-19)
- Pointer-only level 1 victory verified through all nine removals, including turning/falling feedback; losing five-slot path and retry verified separately.
- Level 16 preview and 44px+ screw targets inspected in phone view. Final document fits exactly at 320×568, 320×740 and 667×375; 390×844 and 1440×900 visually reviewed.
- Denied native fullscreen successfully falls back to page-fill; Escape restores ordinary view with state preserved.
- Browser review prompted small-screen spacing fixes and higher-contrast labels/symbols. Tests are actual desktop Chromium CSS viewports, not physical mobile devices.
