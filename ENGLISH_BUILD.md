# English course build

The English series is independent of the four paper series. Do not add it to the scholarly reading generator or reduce the existing 360-paper checks.

## Sources and schema

Author lessons in `english/content/{primary,junior,senior,college}/`. Each stage owns `catalog.json` (an array) and one `{slug}.md` per lesson. The catalog requires stable unique `id`, `slug`, `stage`, descriptive `grade` (0 for optional preparation, a school grade or a college level string/null), `semester`, `title`, `order`, `objective_ids`, `objectives` (`id`, `text`, `evidence` heading anchors), `prerequisites` (lesson IDs), `tags`, `source_refs`, `alignment_note`, and `status: "complete"`. College may provide `level` or `module`; it is not a national grade 13–16 curriculum. Include exact `exercise_count` and `answer_count` for independently numbered tasks. `source_refs` must contain genuine external references, or be an explicit empty list with `source_type: "original_instruction"` and a specific `source_note` explaining the authored teaching objective and its source boundaries. Do not attach decorative official citations to original language instruction. Claims about official exam structure still require traceable official references; `exam_structure_reference` labels such references without implying that original passages or exercises come from an official textbook.

Each stage also provides `lexicon.json` (or `lexical-index.json`): an array of actually taught entries with `headword`, `meaning`, `collocation`/`example`, `first_lesson_id`, `lesson_ids`, and `entry_type: "word" | "phrase"`. Stage duplicates are rejected; the static reference page separately counts cross-stage repeated entries and never labels this as a complete textbook wordlist.

Required sections: `学习目标`, `核心讲解`, `例题解析`, `练习`, `参考答案与解析`. Exercises and their explanations are original; open-ended tasks include criteria and a sample, not a claim of a unique answer. `english/sources.json` holds the verified source registry and scope notes. Textbook edition mapping remains provisional until the user's actual books are confirmed.

## Commands

- `npm run build:english`: build all real lesson pages, the course directory, authored-objective coverage, source/scope page, and refresh shared search/sitemap.
- `npm run test:english`: check metadata, authored evidence links, answer coverage, generated pages, local links, search separation, and navigation interactions.
- `npm test`: existing full regression plus English checks. A focused pass is not a full regression pass.

Generated HTML and `english/catalog.json` are committed for GitHub Pages. Browser JavaScript only enhances filtering and navigation; lesson bodies and answers remain readable without it. No accounts, automatic marking, mastery dashboard, audio or recording is implemented. Counts describe authored material, not textbook completeness, independent editorial approval, mastery, or score predictions.

## Static guides and publication hygiene

The finalized `english/textbook-alignment.json` requires `publication_status: "final"`. It separately preserves verified theme indexes, cross-semester course references, partial/related/gap labels, unverified books and legacy references. It must not claim complete unit or school-edition alignment. Author stage README, coverage matrix and textbook routes render as ordinary static guide pages; their lesson/source links are rewritten to public URLs while original Markdown remains available.

Keep authoring helpers, reviewer coordination, workspace paths and internal task notes outside the public repository. The public English check validates the published crosswalk schema against allowed fields and checks for hidden helpers and local filesystem paths. A separate private publication preflight and changed-file manifest review must cover any confidential editorial or coordination metadata.

Vocabulary evidence checks parse actual Markdown vocabulary tables: the normalized complete first cell must equal the indexed term and labelled meaning/usage cells must be nonempty. Every referenced lesson is checked, including the first. A substring in unrelated prose or an answer table is not evidence of teaching. This structural check does not establish semantic accuracy or full official-vocabulary coverage.
