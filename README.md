# MyLog

[![中文](https://img.shields.io/badge/中文-阅读中文版-64748b?style=for-the-badge)](README.zh-CN.md)
[![English](https://img.shields.io/badge/English-Current-2563eb?style=for-the-badge)](README.md)

Paper-reading notes, interactive algorithm demos, and browser games by **wq-win**.

[Visit the site](https://wq-win.github.io/) · [Demos & games](https://wq-win.github.io/game/) · [RSS](https://wq-win.github.io/rss.xml) · [Report an issue](https://github.com/wq-win/wq-win.github.io/issues)

The site is built with HTML, CSS, and JavaScript and hosted on GitHub Pages. Its articles and game interfaces are primarily in Chinese; the buttons above switch the README language.

## Explore

### Paper-reading series

| Series | Papers | Focus |
| --- | ---: | --- |
| [Reinforcement learning](https://wq-win.github.io/rl/) | 60 | Value estimation, policies, world models, and language-model RL |
| [Large language models](https://wq-win.github.io/llm/) | 100 | Representations, pretraining, retrieval, alignment, and reasoning |
| [Robot learning](https://wq-win.github.io/robot-learn/) | 100 | Demonstrations, interaction, motion primitives, and vision-language-action models |
| [Classic robotics](https://wq-win.github.io/robot-classic/) | 100 | Geometry, estimation, planning, control, and SLAM |

Each series begins with a Day 0 reading guide, followed by a timeline and closing overview. Notes distinguish the paper's claims, evidence from the original source, and explanatory derivations.

- Search across series and browse by research era
- Read Markdown-based articles with formulas, diagrams, and previous/next navigation
- Explore the [concept map](https://wq-win.github.io/map.html), [glossary](https://wq-win.github.io/glossary.html), and related papers
- Read with section-aware navigation and symbols, bilingual first-occurrence notes, and accessible mobile term dialogs
- Search the shared 104-concept glossary and 70 scoped symbol entries
- Use light/dark themes and responsive layouts; choose Static, Floating Light, Aurora or Stardust with strength, speed and pause in the appearance menu

### Interactive demos

The [demo hub](https://wq-win.github.io/game/) includes 17 algorithm demos:

- Reinforcement learning: Q-learning, value iteration, REINFORCE, and SARSA vs. Q-learning
- Language models: attention, positional encoding, Softmax temperature, and BPE
- Classic robotics: A*, RRT, Kalman filtering, potential fields, PID, and ICP
- Robot learning: DMP, DAgger, and domain randomization

### Browser games

- [Mini Tower Defense / 迷你塔防](https://wq-win.github.io/game/tower-defense.html): defend a forest path through five increasingly difficult levels of fifteen waves each with arrow, magic, and cannon towers. Build, upgrade, pause, or speed up the battle.
- [Net / 接线谜题](https://wq-win.github.io/game/net.html): rotate wire tiles to connect the source and light the terminals. Solvable generated boards, reset, hints, and keyboard controls.

- [Paodekuai / 跑得快](https://wq-win.github.io/game/paodekuai.html): play against two computer opponents with 16 cards each. Includes tap/drag selection, cycling legal-move hints, automatic passes when no response is possible, and a public-information card counter. The counter subtracts your hand and played cards without revealing either opponent's hand.
- [Doudizhu endgames / 斗地主残局](https://wq-win.github.io/game/doudizhu.html): 11 one-on-one, face-up puzzles with strategic hints, restart confirmation, saved completion progress, and explicit replay/next-level controls. Hints select a move without playing it; a search-limit fallback is labeled as a legal suggestion rather than a guaranteed win.
- [Spider Solitaire](https://wq-win.github.io/game/spider.html), [Sudoku](https://wq-win.github.io/game/sudoku.html), and [Jianghu Slay](https://wq-win.github.io/game/jianghu-slay.html)

Paodekuai and Doudizhu share blue-and-gold table styling, original character portraits, and illustrated court cards. See the [asset notes](game/assets/paodekuai/README.md) for their provenance.

## Run locally

Requirements: Git and Python 3. Node.js is only needed for the game regression tests.

```sh
git clone https://github.com/wq-win/wq-win.github.io.git
cd wq-win.github.io
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000/> in a browser. Serve the repository root over HTTP so root-relative assets and the fetched search index work correctly. No package installation or build step is needed to preview the committed site. Some article-rendering libraries load from CDNs and require internet access.

## Project structure

```text
wq-win.github.io/
├── index.html                 # Site homepage
├── README.md                  # English guide
├── README.zh-CN.md             # Chinese guide
├── rl/                        # Reinforcement-learning series
├── llm/                       # Language-model series
├── robot-learn/               # Robot-learning series
├── robot-classic/             # Classic-robotics series
│   └── (each series has HTML pages, posts/, and js/catalog.js)
├── game/                      # Games and grouped algorithm demos
│   └── assets/paodekuai/       # Shared card-table artwork
├── css/                       # Site and game styles
├── fonts/                     # Local icon fonts
├── js/                        # Site scripts, renderers, and game engines
├── data/search-index.json     # Generated cross-series search index
├── scripts/                   # Paper-series generation scripts
├── tools/                     # Site-data builder and regression tests
├── map.html                   # Cross-series concept map
├── glossary.html              # Terminology glossary
├── rss.xml                    # RSS feed
└── sitemap.xml                # Sitemap
```

## Maintain the site

### Articles and navigation

1. Keep Markdown sources in the relevant series' `posts/` directory.
2. Update the corresponding HTML page and `js/catalog.js` in that series. Article pages embed their Markdown, so changing a `.md` source alone does not update the published article.
3. For bulk generation, review `scripts/build-rl.py` and `scripts/build-paper-series.py` first. They currently use author-specific local source paths, which must be adapted before running them elsewhere.
4. After updating pages and catalogs, regenerate the search index, related-paper data, sitemap, RSS, and robots file:

```sh
python3 tools/build-site-data.py
```

Site identity and navigation are configured in `js/site-config.js`. Shared appearance lives in `css/style.css`; individual HTML pages also define Tailwind settings. Card-game styles and controllers have their own files under `css/` and `js/`.

### Game checks

Run from the repository root with Node.js:

```sh
node tools/paodekuai-ui-test.js
node tools/doudizhu-ui-test.js
git diff --check
```

These dependency-free tests exercise game logic and controllers in a simulated DOM. They do not replace real-browser checks for layout, touch gestures, image loading, or accessibility. See the [Paodekuai checklist](tools/paodekuai-qa.md) and [Doudizhu checklist](tools/doudizhu-qa.md).

### Reading-layer checks

The 360 paper pages and four Day 0 guides include static text and local KaTeX math, so the article remains readable without JavaScript. Shared scripts add the reading tools. See the [reading build and QA guide](tools/reading-qa.md) for source-preservation checks, regeneration commands and the original LSTM formula caveat.

### GitHub Pages

The committed files form a static site and can be served directly from the repository root. If you fork the project, update site URLs in `js/site-config.js` and `tools/build-site-data.py`, regenerate site data, and configure GitHub Pages for your own repository. Root-relative asset paths assume the site is hosted at the domain root.

## Dependencies and credits

- HTML, CSS, and vanilla JavaScript
- Tailwind CSS v3 and Font Awesome for styling and icons
- AOS for scroll animations
- Marked, KaTeX, and Mermaid for article rendering
- Original blog design inspiration: Lilian Weng's blog
- Card-table artwork: [creation and reuse notes](game/assets/paodekuai/README.md)

## License

MIT, as declared in the original README. A standalone `LICENSE` file is not currently included in this repository. Third-party dependencies retain their own licenses.
