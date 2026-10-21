# Workshop polish checks

Scope: yarn and screws only. No accounts, analytics, new games or paid dependencies.

- Sixteen puzzles retained for each game. Existing solvable puzzle layouts reordered to introduce consolidation at levels 5, 9 and 13; original completion marks migrate to the matching puzzle, not a different newly numbered puzzle.
- Optional synthesized sound defaults off, only starts after user interaction, and remembers the toggle. No audio downloads or autoplay.
- Every accepted move persists as a bounded, versioned replay. Reload validates moves through the engine; malformed/obsolete runs are ignored.
- Undo can reopen a won/lost run; completed badges remain earned. Restart/level change clear the saved run and cancel pending screw animation. Yarn flight animation is also cleared.
- Match pulse and support-tilt feedback respect reduced motion. Existing 44–48 px controls preserved. New controls use 44 px minimum height and narrow layouts may scroll rather than shrink targets.

Automated commands:

    node tools/yarn-test.js
    node tools/yarn-ui-test.js
    node tools/yarn-contrast-test.js
    node tools/screws-test.js
    node tools/screws-ui-test.js
    node tools/screws-contrast-test.js
    node tools/workshop-polish-test.js

Actual-browser integration still needs: narrow portrait and landscape rendering, sound toggling, undo, reload and animation interruption. Automated DOM tests do not establish perceived audio quality or device-specific Safari behavior.
