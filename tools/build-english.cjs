#!/usr/bin/env node
'use strict';
// Independent, deterministic English-course compiler; does not import paper audits.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { marked } = require('../js/vendor/marked.js');
const ROOT = path.resolve(__dirname, '..');
const COURSE = path.join(ROOT, 'english');
const STAGES = { primary: { label: '小学英语', scope: '零基础准备 · 三至六年级', summary: '从词句、拼读到短文阅读与基本表达。' }, junior: { label: '初中英语', scope: '七至九年级 · 江西中考衔接', summary: '在主题语篇中组织词汇、语法和读写。' }, senior: { label: '高中英语', scope: '高一至高三 · 新高考衔接', summary: '读懂篇章关系，写出有依据、有逻辑的表达。' }, college: { label: '大学英语', scope: '大学衔接 · 四级 · 六级 · 综合应用', summary: '按能力模块学习，不假定全国统一教材。' } };
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const anchor = value => String(value).replace(/^#/, '').toLowerCase().replace(/<[^>]+>/g, '').replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '') || 'section';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function label(lesson) {
  if (lesson.stage === 'college') return String(lesson.level || lesson.module || lesson.grade || '大学英语');
  if (Number(lesson.grade) === 0) return '零基础准备';
  const grades = { 1:'一年级', 2:'二年级', 3:'三年级', 4:'四年级', 5:'五年级', 6:'六年级', 7:'七年级', 8:'八年级', 9:'九年级', 10:'高一', 11:'高二', 12:'高三' };
  return grades[lesson.grade] || String(lesson.grade);
}
function loadLessons() {
  const lessons = [];
  for (const stage of Object.keys(STAGES)) {
    const catalog = path.join(COURSE, 'content', stage, 'catalog.json');
    if (!fs.existsSync(catalog)) throw new Error(`Missing completed stage catalog: ${catalog}`);
    const entries = JSON.parse(fs.readFileSync(catalog, 'utf8'));
    if (!Array.isArray(entries) || !entries.length) throw new Error(`Empty or invalid catalog: ${stage}`);
    for (const entry of entries) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.slug || '') || !entry.slug.startsWith(stage + '-')) throw new Error(`Unsafe slug: ${entry.slug}`);
      if (entry.stage !== stage || entry.status !== 'complete') throw new Error(`Not a completed ${stage} lesson: ${entry.id}`);
      const source = `english/content/${stage}/${entry.slug}.md`;
      const body = fs.readFileSync(path.join(ROOT, source), 'utf8').replaceAll('\r\n', '\n');
      lessons.push({ ...entry, gradeLabel: label(entry), source, sourceSha256: hash(body), body });
    }
  }
  return lessons.sort((a, b) => Object.keys(STAGES).indexOf(a.stage) - Object.keys(STAGES).indexOf(b.stage) || a.order - b.order);
}
function renderMarkdown(source) {
  // Author-owned Markdown; raw HTML is restricted to presentational elements by the validator.
  source = source.replace(/^# .+\n+/, '').replace(/(?<![\\*])\*\*([^*\n]+?)\*\*(?!\*)/g, '<strong>$1</strong>');
  let html = marked.parse(source, { gfm: true });
  const used = new Set(), headings = [];
  html = html.replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g, (_, n, title) => {
    const base = anchor(title); let id = base, count = 1;
    while (used.has(id)) id = `${base}-${++count}`;
    used.add(id); headings.push({ level: Number(n), id, title: title.replace(/<[^>]+>/g, '') });
    return `<h${n} id="${id}">${title}</h${n}>`;
  });
  html = html.replaceAll('<table>', '<div class="course-table" tabindex="0" role="region" aria-label="可横向滚动的学习表格"><table>').replaceAll('</table>', '</table></div>');
  const answerStart = html.indexOf('<h2 id="参考答案与解析">');
  if (answerStart >= 0) {
    // Keep an author's adjacent explicit answer anchor inside the disclosure,
    // so both #answers and the generated Chinese heading reveal its contents.
    const adjacentAnchor = html.slice(0, answerStart).match(/(?:<p>)?<a id="[^"]+"><\/a>(?:<\/p>)?\s*$/);
    const start = answerStart - (adjacentAnchor?.[0].length || 0);
    html = html.slice(0, start) + '<details class="course-answers"><summary>参考答案与解析 · 完成练习后展开</summary>' + html.slice(start) + '</details>';
  }
  return { html, headings };
}
function shell(title, body, description = '') {
  return `<!DOCTYPE html>\n<html lang="zh-CN"><head>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | MyLog 英语</title>\n<meta name="description" content="${esc(description || title)}">\n<script>try{if(localStorage.getItem('mylog-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}</script>\n<script src="../js/vendor/tailwind.js"></script><link rel="stylesheet" href="../css/font-awesome.min.css"><link rel="stylesheet" href="../css/style.css"><link rel="stylesheet" href="css/course.css">\n</head><body class="course-page"><a class="course-skip" href="#course-main">跳到正文</a><div id="site-header"></div>\n<main id="course-main" class="course-main">${body}</main>\n<noscript><p class="course-main course-small">如需打印，请先手动展开本页答案与说明，再使用浏览器打印。</p></noscript><div id="site-footer"></div><script src="../js/site-config.js"></script><script src="../js/site-chrome.js"></script><script>SeriesChrome.mount({root:'../',active:'english',seriesLabel:'英语学习'});</script><script src="js/course.js"></script>\n</body></html>\n`;
}
function refs(lesson, sources) {
  return (lesson.source_refs || []).map(ref => {
    const source = sources.find(item => item.id === ref || item.url === ref);
    return source ? `<a href="sources.html#${esc(anchor(source.id))}">${esc(source.title)}</a>` : /^https:\/\//.test(ref) ? `<a href="${esc(ref)}" rel="noopener">外部参照（${esc(new URL(ref).hostname)}）</a>` : `<a href="sources.html">${esc(ref)}</a>`;
  }).join(' · ');
}
function lessonPage(lesson, lessons, sources) {
  const rendered = renderMarkdown(lesson.body);
  const position = lessons.indexOf(lesson), previous = lessons[position - 1], next = lessons[position + 1];
  const prerequisites = (lesson.prerequisites || []).map(id => {
    const target = lessons.find(item => item.id === id);
    if (!target) throw new Error(`${lesson.id}: unknown prerequisite ${id}`);
    return `<a href="${esc(target.slug)}.html">${esc(target.title)}</a>`;
  }).join('、');
  const top = `<header class="course-hero"><p class="course-eyebrow"><a href="index.html">英语学习</a> / ${esc(STAGES[lesson.stage].label)} / ${esc(lesson.gradeLabel)} · ${esc(lesson.semester)}</p><h1>${esc(lesson.title)}</h1><p class="course-lead">${esc(lesson.objectives?.[0]?.text || lesson.title)}</p><details class="course-alignment course-small"><summary>本课教材定位与编排说明（暂定参照）</summary><p>${esc(lesson.alignment_note)}</p><a href="sources.html">完整来源与范围</a></details><nav class="course-links" aria-label="本课工具"><a href="index.html?stage=${lesson.stage}&amp;grade=${encodeURIComponent(lesson.gradeLabel)}">返回本阶段目录</a><a href="coverage.html#${esc(lesson.id)}">本课目标与证据</a><a href="vocabulary.html">已讲词汇索引</a><a href="${esc(lesson.source)}" data-source-link>Markdown 原稿</a></nav>${prerequisites ? `<p class="course-small">先修建议：${prerequisites}</p>` : ''}</header>`;
  // Public Markdown is relative to english/, not repository root.
  const header = top.replace(`href="${esc(lesson.source)}"`, `href="${esc(lesson.source.replace(/^english\//, ''))}"`);
  const toc = rendered.headings.filter(heading => heading.level === 2).map(heading => `<li><a href="#${esc(heading.id)}">${esc(heading.title)}</a></li>`).join('');
  const footer = `<div class="course-callout course-small"><p>${lesson.source_note ? esc(lesson.source_note) + ' ' : ''}${lesson.source_refs.length ? '课程参照：' + refs(lesson, sources) : '<a href="sources.html">本站编排与范围说明</a>'}。这里的例文、练习与解析为本站原创，不是教材原文或官方真题。</p></div><nav class="course-pager" aria-label="前后课">${previous ? `<a rel="prev" href="${previous.slug}.html">← 上一课<br>${esc(previous.title)}</a>` : '<span></span>'}${next ? `<a rel="next" href="${next.slug}.html">下一课 →<br>${esc(next.title)}</a>` : ''}</nav>`;
  return { html: shell(lesson.title, header + `<div class="course-lesson-layout"><aside class="course-toc" aria-label="本课目录"><strong>本课目录</strong><ol>${toc}</ol></aside><article class="course-article" data-lesson-id="${esc(lesson.id)}" data-source-sha256="${lesson.sourceSha256}">${rendered.html}</article></div>` + footer), headings: rendered.headings };
}
function indexPage(lessons, guides = []) {
  const objectives = lessons.reduce((sum, item) => sum + (item.objectives || []).length, 0);
  const hero = `<header class="course-hero"><p class="course-eyebrow">MyLog / English Learning</p><h1>把英语，按阶段学明白。</h1><p class="course-lead">小学打基础，初高中系统发展读写能力，再衔接大学英语、四级与六级。每课把讲解、例题、原创练习和答案放在一起，沿年级与学习模块循序推进。</p><div class="course-statline"><span><strong>${lessons.length}</strong>课已编写资料</span><span><strong>${objectives}</strong>项本课程目标</span><span><strong>4</strong>个学习阶段</span></div><div class="course-links"><a href="#course-directory">选择学习阶段 ↓</a><a href="coverage.html">查看目标覆盖与练习证据</a><a href="vocabulary.html">本站已讲词汇索引</a><a href="textbook-guide.html">教材主题路线</a><a href="sources.html">教材、来源与范围说明</a></div></header>`;
  const scope = '<div class="course-callout"><p><strong>使用边界：</strong>本系列不含听力训练。江西、人教版为暂定编排参照，并非已核对你学校每册每单元；大学按能力模块而非“13—16年级”组织。80%是基础巩固目标，95%是提高训练目标，不是考试成绩保证。<a href="sources.html">查看完整说明</a>。</p></div>';
  const stageCards = `<nav class="course-stages" aria-label="学习阶段">${Object.entries(STAGES).map(([id, stage], index) => `<a class="course-stage" href="index.html?stage=${id}#stage-${id}"><span>0${index + 1} / ${lessons.filter(item => item.stage === id).length} 课</span><strong>${stage.label}</strong><span>${stage.scope}</span></a>`).join('')}</nav>`;
  const grades = [...new Set(lessons.map(item => item.gradeLabel))];
  const filter = `<form id="course-filter" class="course-filter" role="search"><label>搜索本课程<input id="course-query" type="search" placeholder="如：七年级、时态、翻译" autocomplete="off"></label><label>学习阶段<select id="course-stage"><option value="">全部阶段</option>${Object.entries(STAGES).map(([id, stage]) => `<option value="${id}">${stage.label}</option>`).join('')}</select></label><label>年级 / 能力模块<select id="course-grade"><option value="">全部</option>${grades.map(grade => `<option value="${esc(grade)}">${esc(grade)}</option>`).join('')}</select></label><button type="reset">清除筛选</button></form><p class="course-result-count" id="course-result-count" aria-live="polite">全部 ${lessons.length} 课；无需登录，按需阅读。</p><noscript><p>浏览器未启用 JavaScript，目录与所有课文仍可阅读；请使用下方分组或浏览器页面查找。</p></noscript><p id="course-empty" class="course-empty" hidden>没有匹配课程。请换个关键词，或清除筛选。</p>`;
  let groups = '';
  for (const [stageId, stage] of Object.entries(STAGES)) {
    const stageLessons = lessons.filter(item => item.stage === stageId);
    const semesters = [...new Set(stageLessons.map(item => `${item.gradeLabel} · ${item.semester}`))];
    groups += `<section id="stage-${stageId}" class="course-group" data-course-group><h2>${stage.label}</h2><p class="course-small">${stage.summary}</p><nav class="course-links course-small" aria-label="${stage.label}学习指南">${guides.filter(guide => guide.stage === stageId).map(guide => `<a href="${guide.slug}.html">${esc(guide.file === 'README.md' ? '本阶段学习指南' : guide.file === 'coverage-matrix.md' ? '详细目标与题号' : guide.file === 'textbook-route.md' ? '本阶段主题路线' : guide.title)}</a>`).join('')}</nav>`;
    for (const semester of semesters) {
      groups += `<section class="course-semester" data-course-group><h3>${esc(semester)}</h3><ol class="course-lessons">`;
      for (const lesson of stageLessons.filter(item => `${item.gradeLabel} · ${item.semester}` === semester)) {
        const search = [lesson.title, lesson.gradeLabel, lesson.semester, STAGES[lesson.stage].label, ...lesson.tags, ...(lesson.objectives || []).map(item => item.text)].join(' ');
        groups += `<li class="course-lesson-card" data-course-lesson data-stage="${stageId}" data-grade="${esc(lesson.gradeLabel)}" data-search="${esc(search)}"><h4><a href="${lesson.slug}.html">${esc(lesson.title)}</a></h4><p>${esc((lesson.objectives || [])[0]?.text || lesson.alignment_note)}</p><div class="course-tags">${lesson.tags.slice(0, 5).map(tag => `<span class="course-tag">${esc(tag)}</span>`).join('')}</div></li>`;
      }
      groups += '</ol></section>';
    }
    groups += '</section>';
  }
  return shell('英语学习：小学—初中—高中—大学', hero + scope + stageCards + `<section id="course-directory"><h2>课程目录</h2>${filter}${groups}</section>`, '江西暂定人教版参照的原创英语分阶段学习资料；每课含讲解、例题、练习和答案。');
}
function coveragePage(lessons) {
  const intro = `<header class="course-hero"><p class="course-eyebrow"><a href="index.html">英语学习</a> / Coverage</p><h1>目标要有落点，练习要有答案。</h1><p class="course-lead">下表统计的是已写成课程的自定学习目标，逐项链接实际讲解和练习。它不是最新版课标逐条审计，也不是全套教材词表／单元已完全覆盖的证明。阶段缺项和教材待核事项见<a href="sources.html">来源与范围</a>。</p></header>`;
  let html = '';
  for (const [stageId, stage] of Object.entries(STAGES)) {
    html += `<section class="course-group"><h2>${stage.label}</h2>`;
    for (const lesson of lessons.filter(item => item.stage === stageId)) {
      html += `<section id="${esc(lesson.id)}" class="course-semester"><h3><a href="${lesson.slug}.html">${esc(lesson.gradeLabel)} · ${esc(lesson.semester)} / ${esc(lesson.title)}</a></h3><div class="course-table" tabindex="0" role="region" aria-label="${esc(lesson.title)}目标证据"><table><thead><tr><th>目标编号</th><th>具体目标</th><th>正文与练习证据</th></tr></thead><tbody>`;
      for (const objective of lesson.objectives || []) html += `<tr><td>${esc(objective.id)}</td><td>${esc(objective.text)}</td><td>${objective.evidence.map(evidence => `<a href="${lesson.slug}.html#${esc(anchor(typeof evidence === 'string' ? evidence : evidence.anchor))}">${esc(typeof evidence === 'string' ? evidence.replace(/^#/, '') : evidence.label || evidence.anchor)}</a>`).join(' · ')}${objective.exercise_numbers ? `<p class="course-small">对应练习 ${esc(objective.exercise_numbers.join('、'))}；答案同号。</p>` : ''}</td></tr>`;
      html += '</tbody></table></div></section>';
    }
    html += '</section>';
  }
  return shell('课程目标与练习覆盖', intro + html);
}
function sourcesPage(registry, lessons, guides) {
  const sources = registry.sources || (Array.isArray(registry) ? registry : []);
  const notes = registry.scope_notes || (registry.scope ? Object.values(registry.scope) : null) || [
    '地区为江西；“人教版”仍是暂定参照。小学 PEP、初中人教英语和高中人教英语分别核对，不能视为同一套书。准确逐册逐单元映射需要用户实际教材封面、版权页和目录。',
    '小学以三至六年级为主，零基础准备是可选内容。初中新版九年级分上下册；高中按主题与必修／选择性必修知识进阶作参考，不宣称学校学期进度已一致。大学按衔接、四级、六级及综合应用模块组织。',
    '已核课程标准日常修订版发布，高中修订版镜像的语法附录已抽核；尚未完成最新课标逐项和学校教材逐课逐词对照，不宣称穷尽覆盖审计完成。',
    '本系列不包含听力。练习材料、例文及解析为原创，来源用于课程与题型依据，不复制整套教材或真题。打开课文、阅读答案不代表已经掌握。',
    '80% 与 95% 仅作为原创书面练习的基础和提高训练目标，须用未见材料、限时训练及人工写作评价验证，不能保证考场得分，也不能据此推算整张含听力试卷成绩。CET 的 710 分是常模参照报道分，不是百分制正确率。'
  ];
  let body = `<header class="course-hero"><p class="course-eyebrow"><a href="index.html">英语学习</a> / Sources & Scope</p><h1>来源、编排与明确的边界。</h1><p class="course-lead">先说明依据是什么，再说明还没有核实什么。课程内容可以使用；教材精确映射与考试届次需持续按实际材料核对。</p></header><article class="course-article"><h2 id="scope">使用范围</h2><ol>${notes.map(note => `<li>${esc(note)}</li>`).join('')}</ol>`;
  if (registry.exam_notes?.length) body += `<h2 id="exam">考试题型参照</h2><ul>${registry.exam_notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul>`;
  body += '<h2 id="method">怎样学习与核验</h2><ol><li>按当前年级或能力模块学习；不熟悉的先修内容先回看。先独立完成练习，再展开答案。</li><li>把错题分为词汇、结构、语篇理解、表达和审题问题；在新例句或新短文中重新使用同一知识点。</li><li>基础目标检查准确性；提高目标还要检查陌生语篇迁移、篇章逻辑、写作修订和限时稳定性。主观题依量规人工评价。</li><li>覆盖表只记录实际写出的目标与证据。词表、课本单元和当前届次试卷仍需按实际书目交叉核对，不能以课程数量替代完整性。</li></ol>';
  body += `<h2 id="sources">可核查来源</h2><ol class="course-source-list">${sources.map(source => `<li id="${esc(anchor(source.id))}"><a href="${esc(source.url)}" rel="noopener">${esc(source.title)}</a>${source.note ? `<p class="course-small">${esc(source.note)}</p>` : ''}</li>`).join('')}</ol>`;
  for (const [stage, info] of Object.entries(STAGES)) {
    const stageGuides = guides.filter(guide => guide.stage === stage);
    if (stageGuides.length) body += `<h2 id="scope-${stage}">${info.label}学习指南与编写说明</h2><ul>${stageGuides.map(guide => `<li><a href="${guide.slug}.html">${esc(guide.title)}</a></li>`).join('')}</ul>`;
  }
  body += '<p><a href="coverage.html">逐项查看已写目标及练习证据 →</a></p></article>';
  return shell('来源与范围说明', body);
}
function loadLexicons(lessons) {
  const items = [];
  for (const stage of Object.keys(STAGES)) {
    const candidates = ['lexicon.json', 'lexical-index.json'];
    const name = candidates.find(name => fs.existsSync(path.join(COURSE, 'content', stage, name)));
    if (!name) throw new Error(`Missing authored lexicon for ${stage}`);
    const raw = JSON.parse(fs.readFileSync(path.join(COURSE, 'content', stage, name), 'utf8'));
    const list = Array.isArray(raw) ? raw : (raw.entries || raw.items);
    if (!Array.isArray(list) || !list.length) throw new Error(`Empty authored lexicon for ${stage}`);
    for (const entry of list) {
      // Preserve authored senses; support the senior author's richer source
      // schema without flattening it in their canonical inventory.
      const references = [...new Set(entry.lesson_ids || [])].sort((a, b) => lessons.findIndex(lesson => lesson.id === a) - lessons.findIndex(lesson => lesson.id === b));
      items.push({ ...entry, stage,
        meaning: entry.meaning || (entry.senses || []).map(sense => [sense.part_of_speech, sense.meaning_zh].filter(Boolean).join(' ')).join('；'),
        collocation: entry.collocation || (entry.senses || []).map(sense => sense.example_collocation).filter(Boolean).join('；'),
        first_lesson_id: entry.first_lesson_id || references[0], lesson_ids: references,
        entry_type: entry.entry_type || (/\s/.test(entry.headword) ? 'phrase' : 'word') });
    }
  }
  return items;
}
function vocabularyPage(items, lessons) {
  const byId = new Map(lessons.map(lesson => [lesson.id, lesson]));
  const normalized = word => word.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[‐‑]/g, '-').trim().replace(/\s+/g, ' ');
  const unique = new Set(items.map(item => normalized(item.headword))).size;
  const wordCount = new Set(items.filter(item => item.entry_type === 'word').map(item => normalized(item.headword))).size;
  const phraseCount = new Set(items.filter(item => item.entry_type === 'phrase').map(item => normalized(item.headword))).size;
  let body = `<header class="course-hero"><p class="course-eyebrow"><a href="index.html">英语学习</a> / Taught Vocabulary</p><h1>本站已讲词汇索引</h1><p class="course-lead">从实际课文的词汇讲解整理，查词义、用法，再回到首讲与复现课。这里不是教材完整词表，也不是四／六级官方词汇表。</p><div class="course-statline"><span><strong>${unique}</strong>个跨阶段去重条目</span><span><strong>${wordCount}</strong>个单词词条</span><span><strong>${phraseCount}</strong>个短语条目</span></div><p class="course-small">共 ${items.length} 条阶段记录；同一词条跨阶段复现保留不同用法，跨阶段重复记录 ${items.length - unique} 条。按不区分大小写的词条文本去重，未把不同词形自动合并成词元。例如 work 与 works 可能分别计入，不代表新增两个独立词根；带斜线或连字符的组合也属于词条统计，不是官方词汇量。可使用浏览器“页面查找”定位词条。</p><nav class="course-links" aria-label="词汇阶段">${Object.entries(STAGES).map(([id, stage]) => `<a href="#vocabulary-${id}">${stage.label}</a>`).join('')}<a href="coverage.html">目标与练习覆盖</a></nav></header>`;
  const link = id => { const lesson = byId.get(id); if (!lesson) throw new Error(`Vocabulary references absent lesson: ${id}`); return `<a href="${lesson.slug}.html">${esc(lesson.title)}</a>`; };
  for (const [stage, info] of Object.entries(STAGES)) {
    const entries = items.filter(item => item.stage === stage).sort((a, b) => a.headword.localeCompare(b.headword, 'en'));
    body += `<section id="vocabulary-${stage}" class="course-group"><h2>${info.label} · ${entries.length} 条阶段词汇</h2><div class="course-table" tabindex="0" role="region" aria-label="${info.label}已讲词汇"><table><thead><tr><th>词条</th><th>类别</th><th>意义与用法</th><th>首讲与复现</th></tr></thead><tbody>`;
    for (const entry of entries) {
      const other = [...new Set(entry.lesson_ids || [])].filter(id => id !== entry.first_lesson_id);
      body += `<tr><th scope="row" lang="en">${esc(entry.headword)}</th><td>${entry.entry_type === 'phrase' ? '短语' : '单词'}</td><td>${esc(entry.meaning)}${entry.collocation && entry.collocation !== entry.meaning ? `<p class="course-small">${esc(entry.collocation)}</p>` : ''}${entry.example ? `<p lang="en">${esc(entry.example)}</p>` : ''}</td><td>${link(entry.first_lesson_id)}${other.length ? `<details><summary>另 ${other.length} 课复现</summary><ul>${other.map(id => `<li>${link(id)}</li>`).join('')}</ul></details>` : ''}</td></tr>`;
    }
    body += '</tbody></table></div></section>';
  }
  return shell('本站已讲词汇索引', body);
}
function collectGuides(lessons) {
  const guides = [];
  for (const [stage, info] of Object.entries(STAGES)) {
    const known = new Set(lessons.filter(lesson => lesson.stage === stage).map(lesson => lesson.slug + '.md'));
    const directory = path.join(COURSE, 'content', stage);
    for (const file of fs.readdirSync(directory).sort()) {
      if (known.has(file) || !/^(README|coverage-matrix|textbook-route|[a-z-]*lexical-index)\.md$/.test(file)) continue;
      const body = fs.readFileSync(path.join(directory, file), 'utf8');
      const slug = stage + '-' + (file === 'README.md' ? 'guide' : file.replace(/\.md$/, '').replace(new RegExp('^' + stage + '-'), ''));
      guides.push({ stage, slug, source: `english/content/${stage}/${file}`, file, body, title: body.match(/^# (.+)$/m)?.[1] || info.label + '学习指南', url: `english/${slug}.html`, sourceSha256: hash(body) });
    }
  }
  return guides;
}
function courseLinks(source, stage, lessons, guides) {
  return source.replace(/\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (whole, target, title) => {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(target)) return whole;
    const [file, fragment] = target.split('#');
    const name = file.split('/').pop();
    const lesson = lessons.find(lesson => lesson.slug + '.md' === name || lesson.slug + '.html' === name);
    const crossStage = Object.keys(STAGES).find(candidate => new RegExp('(?:^|/)' + candidate + '/').test(file));
    const guide = guides.find(guide => guide.stage === (crossStage || stage) && guide.file === name);
    let publicTarget;
    if (lesson) publicTarget = lesson.slug + '.html';
    else if (guide) publicTarget = guide.slug + '.html';
    else if (/\.json$/.test(name)) publicTarget = `content/${crossStage || stage}/${name}`;
    else return whole;
    return `](${publicTarget}${fragment ? '#' + fragment : ''}${title ? ' "' + title + '"' : ''})`;
  });
}
function guidePage(guide, lessons, guides) {
  const rendered = renderMarkdown(courseLinks(guide.body, guide.stage, lessons, guides));
  const toc = rendered.headings.filter(heading => heading.level === 2).map(heading => `<li><a href="#${esc(heading.id)}">${esc(heading.title)}</a></li>`).join('');
  const body = `<header class="course-hero"><p class="course-eyebrow"><a href="index.html">英语学习</a> / ${STAGES[guide.stage].label} / 学习指南</p><h1>${esc(guide.title)}</h1><nav class="course-links" aria-label="指南导航"><a href="index.html?stage=${guide.stage}">阶段课程目录</a><a href="textbook-guide.html">教材主题路线</a><a href="coverage.html">目标覆盖</a><a href="${esc(guide.source.replace(/^english\//, ''))}">Markdown 原稿</a></nav></header><div class="course-lesson-layout"><aside class="course-toc" aria-label="指南目录"><strong>本页目录</strong><ol>${toc}</ol></aside><article class="course-article" data-source-sha256="${guide.sourceSha256}">${rendered.html}</article></div>`;
  return shell(guide.title, body);
}
function textbookGuidePage(alignment, lessons) {
  if (alignment.publication_status !== 'final') throw new Error('Textbook crosswalk must be finalized by its mapper before publication');
  const bySlug = new Map(lessons.map(lesson => [lesson.slug, lesson]));
  const legend = alignment.coverage_status_legend;
  const books = [...alignment.books].sort((a, b) => Object.keys(STAGES).indexOf(a.stage) - Object.keys(STAGES).indexOf(b.stage) || Number(a.grade) - Number(b.grade) || ['上','下','综合'].indexOf(a.semester) - ['上','下','综合'].indexOf(b.semester));
  const topicCount = books.reduce((sum, book) => sum + book.topics.length, 0);
  const verifiedCount = books.filter(book => book.edition_status === 'verified_new_portal').length;
  let body = `<header class="course-hero"><p class="course-eyebrow"><a href="index.html">英语学习</a> / Textbook Theme Guide</p><h1>按教材主题找课，不把课次当 Unit。</h1><p class="course-lead">课程目录按知识依赖递进；这份独立路线按已经核实的官方主题顺序查找资料。跨册学习、只有相关技巧和未核册次都保留说明。</p><div class="course-statline"><span><strong>${verifiedCount}</strong>份已核官方主题目录</span><span><strong>${topicCount}</strong>个主题条目</span></div><p class="course-small">核验记录：${esc(alignment.checked_at)}。以上数量不是完整教材覆盖率。</p></header><div class="course-callout"><p>${esc(alignment.school_edition_status)}</p><p>${esc(alignment.evidence_scope)}</p><p>${esc(alignment.default_course_order)}</p></div><nav class="course-links" aria-label="教材路线阶段">${['primary','junior','senior'].map(stage => `<a href="#textbook-${stage}">${STAGES[stage].label}</a>`).join('')}<a href="index.html?stage=college">大学能力模块（非统一教材）</a></nav><section class="course-article course-legend"><h2>怎样理解对齐标签</h2><ul>${Object.entries(legend).map(([key, value]) => `<li><strong>${esc(value)}</strong> <span class="course-small">${esc(key)}</span></li>`).join('')}</ul></section>`;
  for (const stage of ['primary','junior','senior']) {
    body += `<section id="textbook-${stage}" class="course-group"><h2>${STAGES[stage].label}</h2>`;
    for (const book of books.filter(book => book.stage === stage)) {
      body += `<section class="course-semester" id="book-${stage}-${book.grade}-${esc(book.semester)}"><h3>${esc(label(book))} · ${esc(book.semester)}册 / ${book.edition_status === 'verified_new_portal' ? '已核官方主题目录，不代表学校版本确认' : '新版完整主题／版次未核'}</h3><p class="course-small">${esc(book.evidence_note)}${book.source_url ? ` <a href="${esc(book.source_url)}" rel="noopener">官方目录来源</a>` : ''}</p>`;
      if (!book.topics.length) body += '<div class="course-callout"><p><strong>未核目录，不填造主题。</strong>本站同年级课程仅为建议知识路线，不宣称本册逐单元同步。</p></div>';
      else {
        body += `<div class="course-table" tabindex="0" role="region" aria-label="${esc(label(book) + book.semester)}主题对照"><table><thead><tr><th>目录顺序与主题概括</th><th>本站相关资料</th><th>对齐标签与边界</th></tr></thead><tbody>`;
        for (const topic of book.topics) {
          if (!legend[topic.coverage_status]) throw new Error('Unknown textbook coverage status: ' + topic.coverage_status);
          const links = (topic.course_refs || []).map(slug => {
            const lesson = bySlug.get(slug.replace(/^en-/, ''));
            if (!lesson) throw new Error('Textbook guide missing actual lesson: ' + slug);
            const cross = lesson.grade !== book.grade || lesson.semester !== book.semester;
            const fragment = topic.course_anchors?.[slug];
            return `<li><a href="${lesson.slug}.html${fragment ? '#' + esc(fragment) : ''}">${esc(lesson.title)}</a>${cross ? ` <span class="course-cross">跨册：${esc(lesson.gradeLabel)} · ${esc(lesson.semester)}；先核对本课先备</span>` : ''}</li>`;
          }).join('');
          body += `<tr><th scope="row">${esc(topic.unit)} · ${esc(topic.theme_zh)}</th><td>${links ? `<ul class="course-reference-list">${links}</ul>` : '暂无可对应的实际课文；保留缺口。'}</td><td><strong class="course-alignment-status" data-alignment-status="${esc(topic.coverage_status)}">${esc(legend[topic.coverage_status])}</strong><p class="course-small">${esc(topic.note)}</p></td></tr>`;
        }
        body += '</tbody></table></div>';
      }
      body += '</section>';
    }
    body += '</section>';
  }
  body += `<section class="course-article"><h2>单独保留的旧版入口</h2><p>这些入口只帮助识别新旧版本差异，不会悄悄填进新版路线。</p><ul>${(alignment.legacy_references || []).map(item => `<li><a href="${esc(item.source_url)}">${esc(STAGES[item.stage].label)} ${esc(item.grade)} · ${esc(item.semester)}（旧版参照）</a>：${esc(item.note)}</li>`).join('')}</ul><h2>范围边界</h2><ul>${(alignment.limits || []).map(note => `<li>${esc(note)}</li>`).join('')}</ul><p><a href="sources.html">全部来源与范围说明</a> · <a href="textbook-alignment.json">主题对应原始数据</a></p></section>`;
  return shell('教材主题导航与课程对应', body);
}
function build() {
  const lessons = loadLessons();
  const lexicons = loadLexicons(lessons);
  const guides = collectGuides(lessons);
  const alignment = JSON.parse(fs.readFileSync(path.join(COURSE, 'textbook-alignment.json'), 'utf8'));
  if (alignment.publication_status !== 'final') throw new Error('Textbook crosswalk is not finalized');
  if (new Set(lessons.map(item => item.id)).size !== lessons.length || new Set(lessons.map(item => item.slug)).size !== lessons.length) throw new Error('Duplicate lesson id/slug');
  const registry = JSON.parse(fs.readFileSync(path.join(COURSE, 'sources.json'), 'utf8'));
  const sources = registry.sources || (Array.isArray(registry) ? registry : []);
  const report = [];
  for (const lesson of lessons) {
    const page = lessonPage(lesson, lessons, sources);
    fs.writeFileSync(path.join(COURSE, lesson.slug + '.html'), page.html);
    report.push({ id: lesson.id, source: lesson.source, sourceSha256: lesson.sourceSha256, url: `english/${lesson.slug}.html`, objectives: lesson.objective_ids, headings: page.headings.map(item => item.id), exercise_count: lesson.exercise_count ?? null, answer_count: lesson.answer_count ?? null });
  }
  fs.writeFileSync(path.join(COURSE, 'index.html'), indexPage(lessons, guides));
  fs.writeFileSync(path.join(COURSE, 'coverage.html'), coveragePage(lessons));
  fs.writeFileSync(path.join(COURSE, 'vocabulary.html'), vocabularyPage(lexicons, lessons));
  fs.writeFileSync(path.join(COURSE, 'sources.html'), sourcesPage(registry, lessons, guides));
  fs.writeFileSync(path.join(COURSE, 'textbook-guide.html'), textbookGuidePage(alignment, lessons));
  for (const guide of guides) fs.writeFileSync(path.join(COURSE, guide.slug + '.html'), guidePage(guide, lessons, guides));
  fs.writeFileSync(path.join(COURSE, 'guide-catalog.json'), JSON.stringify([{ slug: 'textbook-guide', title: '教材主题导航与课程对应', url: 'english/textbook-guide.html', kind: 'course' }, ...guides.map(({ body, ...guide }) => ({ ...guide, kind: 'course' }))], null, 2) + '\n');
  fs.writeFileSync(path.join(COURSE, 'catalog.json'), JSON.stringify(lessons.map(({ body, ...meta }) => ({ ...meta, kind: 'lesson', url: `english/${meta.slug}.html` })), null, 2) + '\n');
  fs.writeFileSync(path.join(COURSE, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Built ${lessons.length} English lessons, ${lessons.reduce((sum, item) => sum + item.objectives.length, 0)} authored objectives, directory, coverage and sources. No paper content changed.`);
}
module.exports = { ROOT, COURSE, STAGES, esc, anchor, label, loadLessons, renderMarkdown, lessonPage, indexPage, loadLexicons, vocabularyPage, collectGuides, courseLinks, guidePage, textbookGuidePage, build };
if (require.main === module) build();
