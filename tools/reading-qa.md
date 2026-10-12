# Four-series reading layer

## Build and source contract

Historical Markdown under each series' `posts/` remains byte-identical to the main-branch baseline. The published article HTML is a generated reading view. Only the exact existing prerequisite passage moves, to after the introductory/minute-summary section. Examples, questions, evidence limitations, formulas and links keep their original text. Where the original did not have a separate heading, the view adds “五个前置概念”.

- `tools/reading-source.py` locates and hashes every existing prerequisite passage. It explicitly handles standalone paragraphs, sentence tails, separate headings and five-item lists. Unknown structures fail the build rather than moving arbitrary paragraphs.
- `data/reading-prerequisites.json` records the exact source span and insertion location for all 360 papers.
- `tools/build-reading.cjs` produces static text and locally rendered KaTeX math. Existing timelines and closing overviews keep their prior HTML rendering.
- `js/md-render.js` respects the static marker. Both RL and the other series use that shared renderer on regenerated pages.
- `js/reading-guide.js` progressively adds term buttons, one first-occurrence margin note per concept, section navigation and scoped symbols. It never changes the article text.
- `js/glossary-data.js` is the shared bilingual concept source; `js/reading-symbols.js` keeps notation scoped by series, article and semantic context.
- `tools/build-reading-reference.cjs` generates a no-JS-readable glossary. Filtering enhances those existing entries.
- Four `00-reading-guide.md` files are new editorial content. Their catalog entries are distinct from paper counts and reading progress.

Run from the repository root with Python 3 and Node 20+:

```sh
npm ci --ignore-scripts
npm run build:reading
python3 tools/build-site-data.py
npm run test:reading
npm run test:games
git diff --check
```

The site itself requires no npm runtime or build service. `happy-dom` is only a test dependency. The browser receives the committed static assets. Marked and KaTeX (including WOFF2 fonts and licenses) are local; Mermaid remains the existing CDN enhancement, and its unavailable state must not prevent article text or reading tools from loading.

## Formula source caveat

The existing `llm/posts/001-lstm.md` has malformed delimiters inside its first display equation (`\\phi$c_t$`). The renderer deliberately shows that original expression as code with an explanatory tooltip, rather than silently changing historical content. `data/reading-build-report.json` lists this one original-source fallback. The original triple-dot command in the ZMP article uses an equivalent display macro; its TeX source remains unchanged.

## Appearance controls

The existing paintbrush popover owns Static, A 浮光, B 极光, C 星尘, intensity, speed and pause. Existing static choices persist; the old moving-light choice migrates to A. The defaults apply only when a value was not saved. Backgrounds use bounded CSS animations, no JavaScript frame loop, with reduced-motion, hidden-page and back/forward-cache pause handling. Cursor choices and dark mode remain separate.

## Coverage and limits

`verify-reading.cjs` exhaustively checks the 360 unchanged canonical sources against baseline `d5b293e`, inverse source moves, complete rendered content/order, all 4,160 original math expressions, links/assets/anchors, four guides, glossary destinations and unchanged game HTML. `reading-ui-test.mjs` tests content preservation, one-note/repeated-term semantics, context symbols, dialogs/focus, mobile tools and simulated collision geometry. `reading-motion-test.cjs` covers controls, persistence, lifecycle and reduced-motion. Existing game suites remain regression gates.

Pre-merge real-browser testing was blocked by Chromium socket permissions in the build container. The supported cloud browser could reach production but not authenticate the private preview. DOM/simulated geometry checks do not prove real wrapping, touch behavior, native focus trapping or viewport overflow.

After deploying the exact tested commit, check public representative pages at desktop 1440/1280 and mobile 390/320 widths: RL Actor–Critic and PPO; LLM Transformer/LSTM; robot-learning DMP/diffusion policy; classical Kalman/D–H; all Day0 pages and glossary. Check light/dark, each background, sliders and cross-page persistence; first/repeated terms, Escape and focus return; active TOC/symbols; dense notes/collapse/resize; tables/formulas; back/forward; games. Capture actual screenshots and fix material problems before calling visual verification complete.
