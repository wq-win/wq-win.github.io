# Reading site build

The four series are authored in `*/posts/*.md`. Generated HTML is committed for GitHub Pages.

## Rebuild and test

Use Node.js 20 or later and Python 3. Install the declared npm development dependencies with `npm ci`, and install Pillow with `python3 -m pip install Pillow` for image verification.

- `npm run build`: rebuild all reading pages, catalogs, source metadata, search data and reader-facing review pages.
- `npm test`: check rendered source identity, formulas, local links, image pixels/metadata, reader interactions and the existing game UI.

`data/reading-review-data.json` is the public editorial snapshot used by the review pages. It contains citations, concise scope notes, image identities and explicit missing-figure status. If article or figure content changes, update the matching public audit facts and source hash as part of the same edit. Raw research caches, full source PDFs, private execution records and credentials are not part of this repository or build.

The original self-tests and source references remain in each article. Figures are identified as original excerpts, data/theory redraws or teaching diagrams. A missing figure is not counted as fulfilled merely because its source link is present. Automated tests do not claim independent reproduction of the papers’ experiments or exhaustive scientific peer review.

## Adding papers without frozen totals

`tools/lib/reading-corpus.cjs` validates the canonical `*/js/catalog.js` entries against every Markdown file in `*/posts/`. Node tools and the Python adapter use the same identities. Paper IDs must be unique and contiguous, with matching source filename, public slug and day; the other three established series retain 100 papers each. Counts come from those validated records, not filename-prefix bounds. Each series has one guide, timeline and epilogue, plus its README source. The RL epilogue keeps `61-系列收尾.md` and `61-epilogue.html` even when paper 61 exists; its auxiliary identity is independent of that numeric prefix.

For a new paper, add its canonical catalog entry and Markdown, retain the public slug mapping, and provide an HTML shell with the matching page identity before building. The build deliberately fails for a missing source or shell. Extend every corresponding public review section (`coverage`, `feedback`, `alignment`, `structure`, `inline` and the series figure ledger). Missing, extra or duplicate records fail even if totals happen to match. Keep source/asset hashes, inspected-source levels, limitations and figure provenance accurate; a link is not an embedded figure.

A newly authored coverage record uses `change_type: "created"` and `published_baseline_sha256: null`. A revised existing source retains its real 64-character published baseline hash and must differ from it. Never invent a baseline for a new article. The 1,020 historical self-test records remain a separate preservation check, excluding newly created articles rather than treating their questions as historical.

RL paper header/footer navigation is synchronized from the canonical catalog by `node tools/sync-reading-navigation.cjs` (also part of `npm run build`). After extending the catalog, run this before updating public review source hashes: the previous last paper now links to the newly added paper, while only the new last paper links to the unchanged `61-epilogue.html`. Contextual article references are not rewritten. The build also emits static RL pager links and a content-versioned catalog URL. Old or unavailable JavaScript cannot replace those built pager links. `node tools/reading-navigation-test.cjs` covers 60/62/100-paper fixtures, both source navigation bars, all built RL pagers, and stale catalog execution.

`node tools/reading-corpus-test.cjs` exercises 60, 62 and 100 RL-paper fixtures, the overlapping epilogue prefix, legacy redirects/pagers, creation/revision baseline semantics, and missing/extra/duplicate catalog, source and review records. It runs first in `npm run test:reading`. Then rebuild and run the existing formula, source identity, evidence, image and reader-behavior checks for the actual edition; the fixtures do not replace those checks.
