#!/usr/bin/env node
'use strict';
// Independent, no-network regression for the four Day 0 formatting corrections.
// Baseline is the published pre-fix revision, not generated expected output.
// Run with installed happy-dom or HAPPY_DOM_PATH=/path/to/happy-dom.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const baseline = 'a798c697f64fb81a80d76d5f3cbd52a5d3ce34e8';
const seriesNames = ['rl', 'llm', 'robot-learn', 'robot-classic'];
const expectedBoldCounts = [35, 29, 26, 39];
let Window;
let assertions = 0;
function equal(actual, expected, message) {
    assert.deepEqual(actual, expected, message);
    assertions += 1;
}
function check(value, message) {
    assert.ok(value, message);
    assertions += 1;
}
function git(...args) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}
function old(file) { return git('show', baseline + ':' + file); }
function current(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function elements(body, selector) { return [...body.querySelectorAll(selector)]; }
function markup(body, selector) { return elements(body, selector).map(node => node.outerHTML); }
function strongText(body) { return elements(body, 'strong').map(node => node.textContent); }
function withoutArticleAndSource(html) {
    return html.replace(/<!-- READING:START -->[\s\S]*?<!-- READING:END -->/, '<!-- ARTICLE -->')
        .replace(/<textarea id="md-source"[^>]*>[\s\S]*?<\/textarea>/, '<!-- SOURCE -->');
}
function openDocument(html, series) {
    const w = new Window({
        url: 'https://mylog.test/' + series + '/00-reading-guide.html',
        settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true }
    });
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
    return w;
}
function loadGuideRuntime(w) {
    for (const file of ['glossary-data.js', 'reading-symbols.js', 'reading-guide.js']) {
        w.eval(current('js/' + file));
    }
}

async function verifyGuides() {
    let totalMath = 0;
    let totalBold = 0;
    for (const [index, series] of seriesNames.entries()) {
        const sourcePath = series + '/posts/00-reading-guide.md';
        const htmlPath = series + '/00-reading-guide.html';
        const originalSource = old(sourcePath);
        const expectedBold = [...originalSource.matchAll(/\*\*([^*\n]+?)\*\*/g)].map(match => match[1]);
        equal(expectedBold.length, expectedBoldCounts[index], series + ': baseline intended emphasis count');
        const fixedSource = current(sourcePath);
        equal(fixedSource, originalSource.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>'),
            series + ': source changes are exclusively explicit strong markup');
        const originalHTML = old(htmlPath);
        const fixedHTML = current(htmlPath);
        equal(withoutArticleAndSource(fixedHTML), withoutArticleAndSource(originalHTML),
            series + ': navigation, metadata, scripts and shell unchanged');
        const before = openDocument(originalHTML, series);
        const after = openDocument(fixedHTML, series);
        try {
            const oldBody = before.document.getElementById('article-body');
            const body = after.document.getElementById('article-body');
            check(oldBody && body, series + ': static article bodies exist');
            equal(body.dataset.staticReading, 'true', series + ': readable without JavaScript');
            equal(body.dataset.sourceSha256, sha256(Buffer.from(fixedSource)), series + ': generated source hash');
            equal(after.document.getElementById('md-source').textContent, fixedSource,
                series + ': embedded source matches canonical guide');
            check(!body.innerHTML.includes('**') && !body.textContent.includes('**'),
                series + ': no leaked Markdown bold markers');
            equal(strongText(body), expectedBold, series + ': every intended bold span is a strong element, in order');
            equal(body.textContent, oldBody.textContent.replaceAll('**', ''),
                series + ': all article text unchanged except removed leaked markers');
            equal(markup(body, 'a'), markup(oldBody, 'a'), series + ': all original links and labels unchanged');
            equal(markup(body, 'annotation[encoding="application/x-tex"]'),
                markup(oldBody, 'annotation[encoding="application/x-tex"]'), series + ': exact original TeX annotations');
            equal(markup(body, '.reading-math'), markup(oldBody, '.reading-math'),
                series + ': complete rendered math markup unchanged');
            const mathCount = elements(body, 'annotation[encoding="application/x-tex"]').length;
            totalMath += mathCount;
            totalBold += expectedBold.length;

            const text = body.textContent;
            const strongNodes = elements(body, 'strong');
            const protectedSelector = 'a, pre, code, .katex, math, .mermaid, svg, [data-no-reading]';
            const protectedMarkup = markup(body, protectedSelector);
            const articleMarkup = body.innerHTML;
            loadGuideRuntime(after);
            const options = { container: body, series, slug: '00-reading-guide', root: '../' };
            const mounted = after.ReadingGuide.mount(options);
            check(mounted.conceptCount > 0, series + ': real glossary decoration ran');
            check(body.querySelector('strong .rg-term-trigger'), series + ': terms inside strong elements are decorated');
            equal(body.textContent, text, series + ': runtime decoration preserves fixed text');
            equal(strongText(body), expectedBold, series + ': runtime preserves every strong span');
            equal(elements(body, 'strong').length, strongNodes.length, series + ': runtime strong count');
            check(elements(body, 'strong').every((node, i) => node === strongNodes[i]),
                series + ': runtime preserves original strong elements');
            equal(markup(body, protectedSelector), protectedMarkup, series + ': code, links and math stay untouched');
            check(!body.textContent.includes('**'), series + ': runtime does not reintroduce bold markers');
            const decoratedMarkup = body.innerHTML;
            equal(after.ReadingGuide.mount(options), mounted, series + ': repeated mount reuses the instance');
            equal(body.innerHTML, decoratedMarkup, series + ': repeated mount is idempotent');
            mounted.destroy();
            equal(body.innerHTML, articleMarkup, series + ': destroy restores article markup');
            const remounted = after.ReadingGuide.mount(options);
            equal(body.textContent, text, series + ': remount preserves article text');
            equal(strongText(body), expectedBold, series + ': remount preserves all emphasis');
            equal(markup(body, protectedSelector), protectedMarkup, series + ': remount protects code, links and math');
            remounted.destroy();
            equal(body.innerHTML, articleMarkup, series + ': second destroy restores article markup');
        } finally {
            await before.happyDOM.close();
            await after.happyDOM.close();
        }
    }
    equal(totalBold, 129, 'all 129 intended bold spans verified');
    equal(totalMath, 106, 'all 106 original guide math annotations verified');
}

async function verifyProtectedFixture() {
    // Guides have no fenced-code examples. This fixture proves decoration does
    // not mistake literal Markdown in code or math for repairable prose.
    const fixture = '<main><article><div id="article-body">' +
        '<h2 id="fixture">Protection fixture</h2><p><strong>策略（policy）</strong>是动作规则。</p>' +
        '<pre><code>**策略（policy）** = policy(s)</code></pre>' +
        '<p><code>**策略**</code></p><a href="policy.html">**策略**</a>' +
        '<span class="katex"><span class="katex-mathml"><math><semantics>' +
        '<mtext>策略</mtext><annotation encoding="application/x-tex">\\text{**策略**}</annotation>' +
        '</semantics></math></span><span class="katex-html">策略</span></span>' +
        '<code class="reading-math-source">$**策略**$</code>' +
        '<div class="mermaid">graph LR; 策略--&gt;动作</div>' +
        '<span data-no-reading>**策略**</span><svg><text>策略</text></svg>' +
        '</div></article></main>';
    const w = openDocument(fixture, 'rl');
    try {
        const body = w.document.getElementById('article-body');
        const selector = 'a, pre, code, .katex, math, .mermaid, [data-no-reading], svg';
        const protectedMarkup = markup(body, selector);
        const articleMarkup = body.innerHTML;
        const text = body.textContent;
        loadGuideRuntime(w);
        const state = w.ReadingGuide.mount({ container: body, series: 'rl', slug: '00-reading-guide' });
        check(body.querySelector('strong .rg-term-trigger'), 'fixture: prose is actually decorated');
        equal(body.textContent, text, 'fixture: text including intentional code markers remains exact');
        equal(markup(body, selector), protectedMarkup, 'fixture: code, math, links, diagram and opt-out markup stays exact');
        check(elements(body, selector).every(node => !node.querySelector('.rg-term-trigger')),
            'fixture: no term controls inserted into protected nodes');
        state.destroy();
        equal(body.innerHTML, articleMarkup, 'fixture: destroy restores exact article markup');
    } finally {
        await w.happyDOM.close();
    }
}

function verifyChangeScope() {
    const manifest = JSON.parse(old('data/reading-prerequisites.json'));
    equal(manifest.length, 360, 'baseline contains 360 canonical historical papers');
    for (const paper of manifest) {
        equal(sha256(fs.readFileSync(path.join(root, paper.source))), paper.sourceSha256,
            paper.key + ': original canonical paper source is untouched');
    }
    const allowed = new Set(['package.json', 'tools/reading-guide-format-test.cjs']);
    for (const series of seriesNames) {
        allowed.add(series + '/posts/00-reading-guide.md');
        allowed.add(series + '/00-reading-guide.html');
    }
    // Include committed and uncommitted differences, plus non-ignored new files.
    const changed = new Set([
        ...git('diff', '--name-only', '-z', baseline, '--').split('\0'),
        ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0')
    ].filter(Boolean));
    equal([...changed].filter(file => !allowed.has(file)), [],
        'formatting hotfix changes only four guide sources/HTML and its test/package hook');
}

(async () => {
    let dependency = process.env.HAPPY_DOM_PATH || 'happy-dom';
    if (dependency !== 'happy-dom') {
        dependency = path.resolve(dependency);
        if (fs.statSync(dependency).isDirectory()) dependency = path.join(dependency, 'lib/index.js');
        dependency = pathToFileURL(dependency).href;
    }
    ({ Window } = await import(dependency));
    verifyChangeScope();
    await verifyGuides();
    await verifyProtectedFixture();
    console.log(`${assertions} guide-format assertions passed: 4 guides, 129 strong spans, 106 math annotations, 360 unchanged paper sources, protected runtime decoration.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
