# Game polish QA — 2026-10-21

Base: 990a9117133fa4449782fd3afe951584e3426518.

## Automated
Full npm run test:games passed after integration. Supplemental workshop-polish-test.js passed. After the actual-browser parking animation/scroll fix, test:parking was rerun and passed. git diff --check passed.

## Actual cloud Chromium checks
Using a local preview and 390x844/844x390 iframe viewports, not physical iOS hardware:
- All eight pages loaded and portrait layouts visually inspected. Screws and frontier were inspected after full initialization.
- Parking level1 50 cars, level16 350 cars, zoom/pan controls, blocked feedback, successful exit to349, reload restoration349.
- Rapid 50 valid pointer clicks originally left9 due departing-car transient overflow. Clipping board overflow fixed it; identical sequence then reached0 and win panel. Next level shows70.
- Screws remove and undo restored9 screws. Water move and undo restored original bottles; water landscape layout inspected.
- Sum-ten start/drag and rules panel inspected; timing/pause correctness is covered by automated tests.

## Limits
No physical-phone test; not every level manually cleared. Solvability and all-level flows are covered by automated tests.
