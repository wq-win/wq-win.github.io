#!/usr/bin/env node
/* The supplied five-article series: source bytes stay immutable; only presentation changes. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { render, esc } = require('./build-reading.cjs');
const ROOT = path.resolve(__dirname, '..'), SERIES = path.join(ROOT, 'dahua-rl');
const posts = JSON.parse(fs.readFileSync(path.join(SERIES, 'catalog.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(SERIES, 'source-manifest.json'), 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const slugMap = Object.fromEntries(posts.flatMap(post => [[post.file, post.slug], [post.file.replace(/\.md$/, ''), post.slug]]));
slugMap['README.md'] = slugMap.README = 'index';
function source(file) {
    const bytes = fs.readFileSync(path.join(SERIES, 'posts', file));
    if (hash(bytes) !== manifest.files[file]) throw new Error('Original source changed: ' + file);
    return bytes.toString('utf8');
}
function renderSource(text) {
    // Markdown treats [1][2] as one reference-style link. The supplied articles
    // use adjacent numeric citations, so resolve each label independently.
    const references = Object.fromEntries([...text.matchAll(/^\[(\d+)\]:\s+(https?:\/\/\S+)\s*$/gm)].map(match => [match[1], match[2]]));
    const prepared = text.replace(/\[(\d+)\](?!:)/g, (label, number) => references[number] ? `<a href="${esc(references[number])}">&#91;${number}&#93;</a>` : label);
    const result = render(prepared, slugMap, 'dahua-rl');
    // Markdown lives in posts/, but published pages are one directory above it.
    result.html = result.html.replace(/(<img\b[^>]*\bsrc=")assets\//g, '$1posts/assets/');
    return result;
}
function pager(post) {
    const index = posts.indexOf(post), prev = posts[index - 1], next = posts[index + 1];
    const link = (item, label, right = '') => item ? `<a class="flex-1 bg-white rounded-lg shadow-card p-4 hover:shadow-card-hover ${right}" href="${item.slug}.html"><div class="text-xs text-gray-400 mb-1">${label}</div><div class="font-medium text-gray-800">${esc(item.title)}</div></a>` : '<div class="flex-1"></div>';
    return `<nav id="article-pager" class="flex flex-col sm:flex-row gap-4 mt-8" aria-label="篇间导航">${link(prev, '上一篇')}${link(next, '下一篇', 'text-right')}</nav>`;
}
function page(post, text, rendered) {
    const guide = post.slug === 'index';
    const hasDiagram = /^```mermaid\s*$/m.test(text);
    const description = guide ? text.split('\n\n')[1] : post.question;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${esc(description)}">
    <title>${esc(post.title)} | MyLog</title>
    <link rel="canonical" href="https://wq-win.github.io/dahua-rl/${post.slug}.html">
    <script>try{if(localStorage.getItem('mylog-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}</script>
    <script src="/js/vendor/tailwind.js"></script>
    <link href="/css/font-awesome.min.css" rel="stylesheet">
    <link href="../js/vendor/katex/katex.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <link id="reading-guide-style" rel="stylesheet" href="../css/reading-guide.css">
    <link rel="stylesheet" href="css/series.css">
    <script>tailwind.config={theme:{extend:{colors:{primary:'#3b82f6',secondary:'#64748b',accent:'#f59e0b',dark:'#1e293b',light:'#f8fafc'},fontFamily:{sans:['Inter','system-ui','sans-serif']},boxShadow:{card:'0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06)','card-hover':'0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05)'}}}};</script>
    <link rel="alternate" type="application/rss+xml" title="MyLog RSS" href="../rss.xml">
</head>
<body class="bg-gray-50 text-gray-800 dahua-series">
    <div id="site-header"></div>
    <main class="container mx-auto px-4 py-8">
        <article class="article-content rl-body">
            <nav class="flex flex-wrap items-center gap-2 mb-6 text-sm" aria-label="当前位置">
                <a href="../index.html" class="text-primary hover:underline">Home</a><span class="text-gray-400">/</span>
                ${guide ? '<span class="text-gray-500">大话强化学习算法</span>' : `<a href="index.html" class="text-primary hover:underline">大话强化学习算法</a><span class="text-gray-400">/</span><span class="text-gray-500">${esc(post.cardTitle)}</span>`}
            </nav>
            <nav id="article-nav" class="flex flex-wrap gap-2 mb-6" aria-label="系列导航"><a class="rl-nav-chip" href="index.html"><i class="fa fa-list" aria-hidden="true"></i> 系列目录</a><span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">${guide ? '5 篇算法详解' : `第 ${post.day} / 5 篇`}</span>${guide ? '<a class="rl-nav-chip" href="01-ddpg.html">从 DDPG 开始 →</a>' : ''}</nav>
            <!-- DAHUA:START --><div id="article-body" class="bg-white rounded-xl shadow-card p-6 md:p-10" data-static-reading="true" data-reading-guide="index.html" data-source-sha256="${hash(text)}">${rendered}</div><!-- DAHUA:END -->
${guide ? '' : '            ' + pager(post)}
        </article>
    </main>
    <div id="site-footer"></div>
    <textarea id="md-source" hidden readonly>${esc(text)}</textarea>
    <script src="../js/site-config.js"></script>
    <script src="../js/site-chrome.js"></script>
${hasDiagram ? '    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>' : ''}
    <script>
        SeriesChrome.mount({root:'../',active:'dahua-rl',seriesLabel:'大话强化学习算法'});
${hasDiagram ? "        if(window.mermaid){mermaid.initialize({startOnLoad:false,theme:document.documentElement.classList.contains('dark')?'dark':'neutral',securityLevel:'strict'});mermaid.run({querySelector:'.mermaid'});}" : ''}
    </script>
</body>
</html>
`;
}
function build() {
    for (const [file, expected] of Object.entries(manifest.files)) {
        if (hash(fs.readFileSync(path.join(SERIES, 'posts', file))) !== expected) throw new Error('Original file changed: ' + file);
    }
    const report = [];
    const guide = {slug:'index', file:'README.md', title:'大话强化学习算法 系列导读'};
    for (const post of [guide, ...posts]) {
        const text = source(post.file), result = renderSource(text);
        const failures = result.math.filter(item => item.html.includes('reading-math-source'));
        if (failures.length) throw new Error(post.slug + ': unrendered original formulas: ' + failures.map(item => item.tex).join('; '));
        fs.writeFileSync(path.join(SERIES, post.slug + '.html'), page(post, text, result.html));
        report.push({slug:post.slug, source:post.file, sourceSha256:hash(text), mathExpressions:result.math.length, unrenderedMath:failures.length});
    }
    fs.writeFileSync(path.join(SERIES, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`Built Dahua guide + ${posts.length} articles, ${report.reduce((sum,item)=>sum+item.mathExpressions,0)} formulas; all original Markdown and images verified.`);
}
module.exports = { ROOT, SERIES, posts, manifest, source, renderSource, page, build };
if (require.main === module) build();
