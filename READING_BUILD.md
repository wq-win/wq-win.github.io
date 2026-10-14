# Reading site build

The four series are authored in `*/posts/*.md`. Generated HTML is committed for GitHub Pages.

## Rebuild and test

Use Node.js 20 or later and Python 3. Install the declared npm development dependencies with `npm ci`, and install Pillow with `python3 -m pip install Pillow` for image verification.

- `npm run build`: rebuild all reading pages, catalogs, source metadata, search data and reader-facing review pages.
- `npm test`: check rendered source identity, formulas, local links, image pixels/metadata, reader interactions and the existing game UI.

`data/reading-review-data.json` is the public editorial snapshot used by the review pages. It contains citations, concise scope notes, image identities and explicit missing-figure status. If article or figure content changes, update the matching public audit facts and source hash as part of the same edit. Raw research caches, full source PDFs, private execution records and credentials are not part of this repository or build.

The original self-tests and source references remain in each article. Figures are identified as original excerpts, data/theory redraws or teaching diagrams. A missing figure is not counted as fulfilled merely because its source link is present. Automated tests do not claim independent reproduction of the papers’ experiments or exhaustive scientific peer review.
