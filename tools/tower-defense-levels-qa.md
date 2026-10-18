# Tower-defense 20-level QA

2026-10-18. Baseline: main 42bb767 (five 15-wave levels).

## Scope and balance
- Twenty sequential levels, each 15 waves, with a boss on wave 15.
- Each level starts with 20 health, 300 gold and no towers. Retry stays on the current level; final replay returns to level 1. Refresh starts a new campaign.
- Let p = (level − 1) / 19. Enemy HP multiplier is 1 + 0.48p, speed multiplier 1 + 0.12p, additional enemies per wave floor(8p), and spawn interval divisor 1 + 0.16p.
- Every corresponding wave gains HP and speed each level; counts never decrease. This spreads the previously proven difficulty range across twenty steps rather than extrapolating against unchanged level-three tower caps.
- Existing map, towers, rewards and controls retained.

## Automated
- All 300 waves completed with legal between-wave building/upgrades, with no extra resources or mid-wave automation. Levels 1–17: 20 health; levels 18–19: 15 health; level 20: 14 health.
- Every corresponding wave checked for stronger HP/speed and nondecreasing count, plus boss boundaries, terminal guards, resets, invalid levels, economy and tower mechanics.
- Real controller test exercises all 19 advances, level-20 retry, final victory/restart, repeated clicks, pause/resume and final-wave hint. State injection exists only in test copies.
- Full `npm run test:games` passes. `git diff --check` and JavaScript syntax checks pass.
- Reading suite retains the pre-existing `game page unchanged doudizhu.html` hash failure; doudizhu.html is unchanged from baseline and unrelated baselines were not edited.

## Cloud Chromium
- 320px simulated mobile viewport visually checked: 1/20 counter, all four stat cells and controls fit; arrow tower built through real UI click.
- Local-only scenarios verify level 19 clear → level 20 reset, level 20 defeat → retry level 20, and final victory → level 1 restart.
- Browser runs are desktop Chromium with CSS-sized iframe viewports, not physical devices or Safari. Full campaigns were engine simulations, not manually played browser runs.
