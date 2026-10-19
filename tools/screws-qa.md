# 松木螺丝铺 QA

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
