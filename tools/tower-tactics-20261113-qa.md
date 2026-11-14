# Mini tower defense: short tactical encounters (2026-11-13)

## Player-facing changes

- Six waves per level instead of fifteen. Twenty campaign stages combine three authored routes/slot layouts and four enemy encounter profiles. These are not twenty independently handcrafted maps.
- The briefing shows the next enemy group, count, counterplay, and the six-wave track. The track distinguishes an active wave from a completed wave.
- Level-three upgrades branch: **Power** trades 20 range for 40% more damage; **Control** trades 15% damage for 55 range, longer magic slows and wider cannon splash. Both have the same upgrade price; existing level-two stats still apply.
- Between waves, sell a tower for 70% of its total cost to reposition/rebuild. It is deliberately unavailable during combat. Selling does not erase the total-build counter for challenge objectives.
- One star for victory, two for at least 12 health, three for at least 18 health. Every fourth stage additionally requires no more than five builds for three stars. Best stars are stored locally.
- Route direction chevrons, distinct specialization rings, damage flashes, defeat sparks and breach feedback strengthen battlefield readability without external image assets.
- Keeps the pending mobile-session work: restart confirmation, automatic pause, and validated between-wave checkpoints. New saves use a separate v2 key. An old fifteen-wave save is retained untouched; its level number starts a fresh six-wave stage with an explicit migration message. Old economy/wave progress is not applied to incompatible rules.

## Deterministic simulation

`node tools/tower-defense-test.js` runs the actual engine at **1/60 s**, the controller's fixed timestep. All simulations build/upgrade only between waves and use ordinary game functions; no extra resources or altered enemy health.

The fixed mixed strategy starts arrow slot 2 and magic slot 5, fills slots in order 2,5,3,4,6,1,7,8, then upgrades in that order. No decision changes mid-wave.

| Stage | Old combat seconds | New combat seconds | Old final gold | New final gold | New health |
|---|---:|---:|---:|---:|---:|
| 1 | 427 | 140 | 3299 | 377 | 20 |
| 10 | 464 | 137 | 3946 | 337 | 20 |
| 20 | 540 | 200 | 4963 | 458 | 20 |

Across the new twenty stages this strategy wins all twenty in 137–238 simulated combat seconds. It never enters a wave with all eight towers capped. The old version capped all eight towers before waves 11, 10 and 9 in stages 1, 10 and 20 respectively, leaving multiple waves with no upgrades remaining. Preparation time is excluded.

Homogeneous arrow/magic/cannon strategies with the same slot order complete 18/16/18 stages. This demonstrates that tower composition can matter, not that there is no dominant strategy. The test also replays a valid five-tower, three-star witness for each of stages 4, 8, 12, 16 and 20. Unprotected defenses lose. Timing differences at other simulation steps are not used as player difficulty evidence.

## Regression coverage

- Three map geometries, eight in-bounds slots each, four profile orders, six-wave boundaries and boss placement.
- Economy, invalid tower types and indices, capped upgrades, specialization tradeoffs, salvage rules, cumulative build count, armor, slows, splash, terminal guards and bounded wave completion.
- UI state tests with Happy DOM/no-op canvas: all stage transitions, changed map slot positions, specializations and save/restore, sell, canceled restart, invalid checkpoint rejection, legacy migration, final victory, duplicate actions, pause/resume, current/completed wave markers.
- CSS source assertions ensure the briefing has its own named grid area and does not consume the flexible battlefield row. Landscape places briefing above controls beside the battlefield.

## Verification limits

The cloud browser could not connect to the local HTTP preview (`ERR_CONNECTION_REFUSED`). DOM tests do **not** verify actual pixels, canvas art, touch targets or screen geometry. Desktop/mobile browser visual acceptance, physical phones, low-end performance, WeChat/Douyin WebViews and real-player enjoyment remain untested. The simulated policy is a reproducible balance baseline, not a claim about player skill or enjoyment.

## Integration and feedback pass (2026-11-14)

Three-way reconciliation used the recovery archive baseline against the current pending session work. The checkpoint enhancement is retained in v2, including tower branches, cumulative build count and leaks. The v1 key is never overwritten; incompatible fifteen-wave saves restart their stored stage under six-wave rules with an explanation. Other pending game changes and the shared release manifest were not overwritten. Only the tower-defense entry in the lobby was changed.

Added brief build/upgrade and announcement motion, result entrance, outcome colors, and optional shared GameFeedback calls for build, upgrade, sell, wave start, victory and defeat. No sound/haptics are triggered for each projectile or each frame. The shared helper owns opt-in settings. Canvas feedback renders at most 64 active effects; reduced-motion disables character bobbing, hit flashes, expanding defeat/projectile effects and DOM movement while keeping health bars, text, outcome colors and static breach feedback. Reduced-motion is checked live.

Final checks: full tower engine simulations and Happy DOM UI regressions pass. Added assertions cover the reduced-motion path, build feedback event, victory event/outcome and existing v2 specialization checkpoint validation. JavaScript syntax and whitespace checks pass. Browser pixel layout, physical-device haptics and low-end-device frame rates remain unverified.
