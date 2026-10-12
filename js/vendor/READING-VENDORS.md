# Reading renderer assets

- Marked 17.0.5, the upstream UMD distribution: `marked.js`; MIT license in `MARKED-LICENSE.md`. Used both by the deterministic static build and by the progressive fallback renderer.
- KaTeX 0.16.11: `katex/katex.min.js`, `auto-render.min.js`, `katex.min.css`, and WOFF2 fonts. MIT license in `katex/LICENSE.txt`. CSS retains only the WOFF2 source, omitting legacy WOFF/TTF fallback files to avoid shipping duplicate fonts.

Both packages are committed so paper text and formulas do not depend on external runtime downloads. The upstream copyright notices are retained. Mermaid remains the site's existing CDN-loaded enhancement.
