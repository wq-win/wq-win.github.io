# Snow Camp prototype QA

Original single-player HTML/Canvas game, tested 2026-10-18.

## Automated

- `npm run test:games` passes, including existing game regressions, snow-camp engine and controller tests.
- Deterministic 480-second policy (kitchen, housing, clinic, appropriate heat) wins with all 8 residents; unattended camp loses.
- Staffing bounds, fuel use, real construction progress, upgrade limits, cold/hunger damage, final outcomes, pause/restart, versioned save validation and resumed evolution covered.
- Independent randomized check: 200 campaigns and 34,933 simulation ticks, validating save/restore invariants after every tick.
- Canvas smoke test covers night/storm, active/inactive/starved furnace and exact 0/5/8 living-resident drawing.
- `git diff --check` passes.
- `npm run test:reading` remains blocked by the pre-existing `game page unchanged doudizhu.html` hash baseline assertion. No existing card game or reading content changed.

## Real cloud Chromium

- Start, pause, workforce reassignment, construction payment and actual kitchen completion verified through visible UI.
- Browser reload presents saved camp; resume retains resources, jobs and building progress.
- Fullscreen enter/exit preserves paused game state and resources.
- Desktop day/night scene visually inspected; original buildings, furnace and animated snow/residents rendered.
- Same-origin viewport harness checks narrow 390px and 320px frames. Fixed resource wrapping, scene clipping and workforce overflow. 320px frame (305px content width with desktop scrollbar) reports no horizontal overflow.
- Responsive iframe check is not a physical-device touch test. Local save is device/browser-specific; clearing site data removes it. Hidden tabs automatically pause; no offline resource progression.

## Scope

Five-day / roughly eight-minute single-player scenario, eight initial residents, minimum five survivors. Four upgradeable facilities, six jobs, four heat settings, two storm periods. No accounts, payments, backend, multiplayer, hero collection or copied commercial assets. All game assets are local; scene is original Canvas artwork.
