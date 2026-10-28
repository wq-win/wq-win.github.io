#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ROOT, COURSE, loadLessons, renderMarkdown, loadLexicons, anchor, lessonPage } = require('./build-english.cjs');
const { normalizeLexicalText, taughtVocabularyRows } = require('./english-source-checks.cjs');
const lessons = loadLessons();
const sources = JSON.parse(fs.readFileSync(path.join(COURSE, 'sources.json'), 'utf8')).sources;
const knownSources = new Set(sources.map(source => source.id));
const ids = new Set(), slugs = new Set(), objectiveIds = new Set();
const sections = ['学习目标', '核心讲解', '例题解析', '练习', '参考答案与解析'];
function section(body, name) {
  const found = body.match(new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
  return found?.[1] || '';
}
function numbers(body) {
  // Authors use either top-level numbered paragraphs or explicit H3 tasks.
  // Prefer task headings so a numbered rubric nested inside one task is not
  // silently counted as additional questions.
  const headings = [...body.matchAll(/^###\s+(\d+)(?:[.)、](?:\s|$)|\s|$)/gm)].map(match => Number(match[1]));
  return headings.length ? headings : [...body.matchAll(/^(\d+)[.)、]\s+/gm)].map(match => Number(match[1]));
}
for (const lesson of lessons) {
  const context = lesson.id;
  assert.equal(lesson.id, 'en-' + lesson.slug, context + ': canonical stable ID');
  assert(!ids.has(context), 'duplicate ID ' + context); ids.add(context);
  assert(!slugs.has(lesson.slug), 'duplicate slug ' + context); slugs.add(lesson.slug);
  assert.equal(lesson.status, 'complete', context + ': incomplete content must not be published');
  assert(Number.isInteger(lesson.order), context + ': stable numeric order');
  assert(typeof lesson.semester === 'string' && lesson.semester.length > 0, context + ': semester/module label');
  assert(lesson.body.length > 600, context + ': real lesson body required');
  assert(lesson.alignment_note?.length > 10, context + ': alignment note');
  assert(Array.isArray(lesson.tags) && lesson.tags.length, context + ': tags required');
  assert(Array.isArray(lesson.source_refs), context + ': explicit source reference list');
  if (!lesson.source_refs.length) {
    assert.equal(lesson.source_type, 'original_instruction', context + ': original teaching must be explicitly distinguished from external references');
    assert(typeof lesson.source_note === 'string' && lesson.source_note.length >= 60, context + ': specific original teaching rationale and source boundaries required');
    assert(lesson.source_note.includes(lesson.objectives[0].text), context + ': original source rationale tied to actual authored objective');
    assert(!/(?:官方笔试说明|CET笔试结构)/.test(lesson.body), context + ': official exam-structure assertions still need an external reference');
  }
  for (const ref of lesson.source_refs) assert(knownSources.has(ref) || /^https:\/\//.test(ref), context + ': unresolved source ' + ref);
  for (const name of sections) assert(section(lesson.body, name).trim().length >= (name === '学习目标' ? 12 : 60), context + ': empty/missing ' + name);
  assert(!/<(?:script|iframe|audio|video)\b|\son[a-z]+\s*=|javascript:/i.test(lesson.body), context + ': unsafe/out-of-scope source markup');
  assert(!/TODO|TBD|待补充正文|待编写|此处填入|占位内容/i.test(lesson.body), context + ': unfinished source');
  const rendered = renderMarkdown(lesson.body);
  const headings = new Set(rendered.headings.map(heading => heading.id));
  assert(lesson.objectives?.length > 0, context + ': objectives required');
  assert.deepEqual(lesson.objective_ids, lesson.objectives.map(objective => objective.id), context + ': objective metadata drift');
  for (const objective of lesson.objectives) {
    assert(!objectiveIds.has(objective.id), 'duplicate objective ' + objective.id); objectiveIds.add(objective.id);
    assert(objective.text.length > 4, context + ': meaningful objective');
    assert(objective.evidence?.length >= 2, context + ': instruction and practice evidence');
    for (const evidence of objective.evidence) assert(headings.has(anchor(typeof evidence === 'string' ? evidence : evidence.anchor)), context + ': missing objective evidence ' + JSON.stringify(evidence));
    assert(objective.evidence.some(evidence => /练习/.test(typeof evidence === 'string' ? evidence : evidence.anchor)), context + ': practice evidence required');
  }
  assert(!/speechSynthesis|SpeechRecognition|getUserMedia|MediaRecorder|new Audio\(/.test(lesson.body), context + ': no audio or recording implementation');
  const questionNumbers = numbers(section(lesson.body, '练习'));
  const answerNumbers = numbers(section(lesson.body, '参考答案与解析'));
  assert(questionNumbers.length > 0, context + ': numbered exercises required');
  assert(answerNumbers.length > 0, context + ': numbered answers required');
  assert.deepEqual(questionNumbers, Array.from({ length: questionNumbers.length }, (_, index) => index + 1), context + ': unique consecutive question numbering');
  assert.deepEqual(answerNumbers, questionNumbers, context + ': exact numbered answer coverage');
  for (const objective of lesson.objectives) {
    if (objective.exercise_numbers) {
      assert(objective.exercise_numbers.length > 0, objective.id + ': explicit exercise evidence');
      for (const number of objective.exercise_numbers) assert(questionNumbers.includes(number), objective.id + ': absent referenced exercise ' + number);
      assert.deepEqual(objective.answer_numbers, objective.exercise_numbers, objective.id + ': matching answer evidence');
    }
  }
  {
    assert(Number.isInteger(lesson.exercise_count) && lesson.exercise_count > 0, context + ': exercise count');
    assert.equal(lesson.answer_count, lesson.exercise_count, context + ': all counted exercises have answers');
    assert.equal(questionNumbers.length, lesson.exercise_count, context + ': declared exercise count matches tasks exactly');
    assert.equal(answerNumbers.length, lesson.answer_count, context + ': declared answer count matches tasks exactly');
  }
  if (lesson.stage === 'college') assert(!/^1[3-6]$/.test(String(lesson.grade)), context + ': no national college grade numbering');
}
const lessonById = new Map(lessons.map(lesson => [lesson.id, lesson]));
function visit(id, active = new Set(), done = new Set()) {
  assert(!active.has(id), id + ': prerequisite cycle');
  if (done.has(id)) return;
  const lesson = lessonById.get(id); assert(lesson, 'missing prerequisite ' + id);
  active.add(id);
  for (const prerequisite of lesson.prerequisites || []) visit(prerequisite, active, done);
  active.delete(id); done.add(id);
}
const checked = new Set(); for (const lesson of lessons) visit(lesson.id, new Set(), checked);
const publicCatalog = JSON.parse(fs.readFileSync(path.join(COURSE, 'catalog.json'), 'utf8'));
assert.equal(publicCatalog.length, lessons.length);
const publicById = new Map(publicCatalog.map(lesson => [lesson.id, lesson]));
const buildReport = JSON.parse(fs.readFileSync(path.join(COURSE, 'build-report.json'), 'utf8'));
assert.equal(buildReport.length, lessons.length, 'all lessons in build report');
const reportById = new Map(buildReport.map(lesson => [lesson.id, lesson]));
for (const lesson of lessons) {
  assert.equal(publicById.get(lesson.id)?.sourceSha256, lesson.sourceSha256, lesson.id + ': catalog source hash matches current authored bytes');
  const report = reportById.get(lesson.id);
  assert.equal(report?.sourceSha256, lesson.sourceSha256, lesson.id + ': build report source hash');
  assert.equal(report.exercise_count, lesson.exercise_count, lesson.id + ': current exercise count');
  assert.equal(report.answer_count, lesson.answer_count, lesson.id + ': current answer count');
  assert.deepEqual(report.objectives, lesson.objective_ids, lesson.id + ': current objective references');
  assert.equal(fs.readFileSync(path.join(COURSE, lesson.slug + '.html'), 'utf8'), lessonPage(lesson, lessons, sources).html, lesson.id + ': generated page exactly reflects current source and navigation');
}
const primaryStats = JSON.parse(fs.readFileSync(path.join(COURSE, 'content/primary/content-stats.json'), 'utf8'));
const primaryLessons = lessons.filter(lesson => lesson.stage === 'primary');
assert.equal(primaryStats.content_characters, primaryLessons.reduce((sum, lesson) => sum + [...lesson.body].length, 0), 'primary public character statistics follow current source');
assert.equal(primaryStats.numbered_exercises, primaryLessons.reduce((sum, lesson) => sum + lesson.exercise_count, 0), 'primary public task statistics');
const search = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/search-index.json'), 'utf8'));
const relatedWindow = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/related-data.js'), 'utf8'), { window: relatedWindow });
for (const lesson of lessons) {
  const item = search.find(item => item.id === lesson.id);
  assert(item && item.kind === 'lesson' && item.series === 'english', lesson.id + ': search must identify actual course lesson');
  assert(!relatedWindow.RELATED_PAPERS[lesson.id], lesson.id + ': no scholarly paper relationship inference');
}
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const lexicon = loadLexicons(lessons);
const lexicalKeys = new Set();
const normalizeText = normalizeLexicalText;
const taughtByLesson = new Map(lessons.map(lesson => [lesson.id, taughtVocabularyRows(lesson.body)]));
const vocabularyFixture = taughtVocabularyRows('| 词项 | 义项与用法 |\n| --- | --- |\n| because | 因为；引出原因 |\n| **look after** | 照料；look after a pet |\n| `one’s own` | 某人自己的 |\n| help | |\n\n| 题号 | 答案 |\n| --- | --- |\n| us | because |');
assert(vocabularyFixture.has('because') && vocabularyFixture.has('look after') && vocabularyFixture.has("one's own"), 'normalize complete explicit vocabulary terms');
assert(!vocabularyFixture.has('us') && !vocabularyFixture.has('a') && !vocabularyFixture.has('look') && !vocabularyFixture.has('help'), 'no substring, answer-grid or empty-row vocabulary evidence');
for (const entry of lexicon) {
  assert(entry.headword && entry.meaning, 'real vocabulary word and meaning');
  assert(entry.collocation || entry.example, entry.headword + ': taught usage required');
  assert(['word', 'phrase'].includes(entry.entry_type), entry.headword + ': word/phrase category');
  const key = entry.stage + ':' + normalizeText(entry.headword);
  assert(!lexicalKeys.has(key), 'duplicate stage lexicon ' + key); lexicalKeys.add(key);
  assert(entry.lesson_ids?.includes(entry.first_lesson_id), entry.headword + ': first lesson in references');
  for (const id of entry.lesson_ids) assert(lessonById.has(id), entry.headword + ': unknown lesson ' + id);
  const first = lessonById.get(entry.first_lesson_id);
  assert(first && first.stage === entry.stage, entry.headword + ': first lesson stage');
  assert.equal(entry.first_lesson_id, [...entry.lesson_ids].sort((a, b) => lessons.findIndex(lesson => lesson.id === a) - lessons.findIndex(lesson => lesson.id === b))[0], entry.headword + ': first lesson follows actual course order');
  for (const id of entry.lesson_ids) {
    assert(taughtByLesson.get(id).has(normalizeText(entry.headword)), entry.headword + ': no exact defined vocabulary-table entry in referenced lesson ' + id);
  }
}
const guides = JSON.parse(fs.readFileSync(path.join(COURSE, 'guide-catalog.json'), 'utf8'));
const files = ['index.html', 'coverage.html', 'sources.html', 'vocabulary.html', ...guides.map(guide => guide.slug + '.html'), ...lessons.map(lesson => lesson.slug + '.html')];
assert.deepEqual(fs.readdirSync(COURSE).filter(file => file.endsWith('.html')).sort(), [...new Set(files)].sort(), 'no orphan or stale generated English page');
const alignment = JSON.parse(fs.readFileSync(path.join(COURSE, 'textbook-alignment.json'), 'utf8'));
assert.equal(alignment.publication_status, 'final', 'reviewed final textbook guide');
const alignmentKeys = new Set(['schema_version','checked_at','purpose','school_edition_status','evidence_scope','default_course_order','coverage_status_legend','introduction_sources','books','legacy_references','limits','publication_status','route_summary']);
for (const key of Object.keys(alignment)) assert(alignmentKeys.has(key), 'unknown public crosswalk schema field: ' + key);
assert.deepEqual(Object.keys(alignment.route_summary).sort(), ['scope_note','verified_books','verified_topic_routes'], 'public route-summary schema');
assert.equal(alignment.route_summary.verified_books, alignment.books.filter(book => book.edition_status === 'verified_new_portal').length, 'verified book statistic');
assert.equal(alignment.route_summary.verified_topic_routes, alignment.books.reduce((sum, book) => sum + book.topics.length, 0), 'topic route statistic');
assert(alignment.route_summary.scope_note.length > 20, 'route counts retain completeness boundary');
const bookFields = new Set(['stage','grade','semester','source_url','edition_status','evidence_note','topics']);
const topicFields = new Set(['unit','theme_zh','course_refs','course_anchors','coverage_status','note']);
const bookKeys = new Set();
for (const book of alignment.books) {
  for (const field of Object.keys(book)) assert(bookFields.has(field), 'unknown public book field: ' + field);
  const key = [book.stage, book.grade, book.semester].join(':'); assert(!bookKeys.has(key), 'duplicate textbook position ' + key); bookKeys.add(key);
  if (book.edition_status === 'unverified') assert.equal(book.topics.length, 0, 'unverified book must not invent a full topic list');
  if (book.edition_status === 'verified_new_portal') assert(/^https:\/\//.test(book.source_url), 'verified book has official reference');
  const units = new Set();
  for (const topic of book.topics) {
    for (const field of Object.keys(topic)) assert(topicFields.has(field), 'unknown public topic field: ' + field);
    assert(!units.has(topic.unit), 'duplicate topic order ' + key); units.add(topic.unit);
    assert(alignment.coverage_status_legend[topic.coverage_status], 'explicit theme coverage status');
    for (const slug of topic.course_refs || []) assert(slugs.has(slug.replace(/^en-/, '')), 'theme links to actual lesson: ' + slug);
    for (const [slug, fragment] of Object.entries(topic.course_anchors || {})) {
      assert(topic.course_refs.includes(slug), 'theme anchor belongs to an actual course reference');
      assert(typeof fragment === 'string' && /^[a-z][a-z0-9-]*$/.test(fragment), 'safe explicit theme anchor');
      const html = fs.readFileSync(path.join(COURSE, slug.replace(/^en-/, '') + '.html'), 'utf8');
      assert(html.includes('id="' + fragment + '"'), 'theme fragment exists in actual lesson: ' + slug + '#' + fragment);
    }
  }
}
const pageCache = new Map();
function readPage(file) { if (!pageCache.has(file)) pageCache.set(file, fs.readFileSync(file, 'utf8')); return pageCache.get(file); }
for (const file of files) {
  const full = path.join(COURSE, file), html = readPage(full);
  const pageIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(pageIds).size, pageIds.length, file + ': duplicate heading/element IDs');
  assert(sitemap.includes('/english/' + file), file + ': sitemap');
  assert(html.includes('lang="zh-CN"'), file + ': document language');
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1].replaceAll('&amp;', '&');
    if (/^(https?:|mailto:|data:)/.test(value)) continue;
    const [pathname, fragment] = value.split('#');
    const clean = pathname.split('?')[0];
    const target = clean ? (clean.startsWith('/') ? path.join(ROOT, clean) : path.resolve(path.dirname(full), decodeURIComponent(clean))) : full;
    assert(target.startsWith(ROOT), file + ': path escape');
    assert(fs.existsSync(target), file + ': missing local resource ' + value);
    if (fragment && target.endsWith('.html')) assert(readPage(target).includes('id="' + decodeURIComponent(fragment) + '"'), file + ': missing anchor ' + value);
  }
}
const config = {}, fallback = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/site-config.js'), 'utf8'), { window: config });
for (const id of ['rl', 'llm', 'robot-learn', 'robot-classic', 'english']) {
  assert(config.SITE.series.some(series => series.id === id), 'existing series remains in shared config: ' + id);
}
assert(config.SITE.series.some(series => series.id === 'english'));
assert(fs.readFileSync(path.join(ROOT, 'js/site-chrome.js'), 'utf8').includes("id: 'english'"), 'old paper pages receive English fallback nav');
assert(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').includes('href="english/index.html"'), 'home entry');
assert(!/reader\.js|SeriesReader|localStorage/.test(fs.readFileSync(path.join(COURSE, 'js/course.js'), 'utf8')), 'course does not track mastery or reading as mastery');
const localPath = /(?:^|[\s"'])\/(?:workspace|root|home|tmp)\//;
function checkPublicHygiene(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) checkPublicHygiene(file);
    else {
      assert(!/\.py$|^\./.test(entry.name), 'private author helper must remain outside public course: ' + file);
      if (/\.(?:md|json|html|css|js)$/.test(entry.name)) assert(!localPath.test(fs.readFileSync(file, 'utf8')), 'local filesystem path leaked into public material: ' + file);
    }
  }
}
checkPublicHygiene(COURSE);
console.log(`English structure: ${lessons.length} real lessons; ${objectiveIds.size} unique objectives with valid evidence; numbered answers, sources, static links, search, sitemap and fifth-series integration passed.`);
