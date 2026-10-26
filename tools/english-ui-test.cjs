#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { ROOT, COURSE, loadLessons } = require('./build-english.cjs');
(async () => {
  const { Window } = await import('happy-dom');
  const lessons = loadLessons();
  const windows = [];
  function setup(file, url, width = 390) {
    const window = new Window({ url: 'https://example.test/english/' + url, width, height: 844, settings: { disableJavaScriptFileLoading:true, disableCSSFileLoading:true, disableJavaScriptEvaluation:true } });
    windows.push(window);
    window.document.write(fs.readFileSync(path.join(COURSE, file), 'utf8'));
    const style = window.document.createElement('style'); style.textContent = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8') + '\n' + fs.readFileSync(path.join(COURSE, 'css/course.css'), 'utf8'); window.document.head.appendChild(style);
    window.eval(fs.readFileSync(path.join(COURSE, 'js/course.js'), 'utf8'));
    return window;
  }
  try {
    for (const width of [320, 390, 1440]) {
      const window = setup('index.html', 'index.html', width), doc = window.document;
      const visible = () => doc.querySelectorAll('[data-course-lesson]:not([hidden])').length;
      assert.equal(visible(), lessons.length);
      assert.equal(window.getComputedStyle(doc.querySelector('.course-lessons')).gridTemplateColumns, width <= 520 ? '1fr' : 'repeat(2,minmax(0,1fr))', 'responsive lesson-column cascade');
      assert.equal(window.getComputedStyle(doc.querySelector('.course-stages')).gridTemplateColumns, width <= 850 ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', 'responsive stage-column cascade');
      const stage = doc.getElementById('course-stage'); stage.value = 'junior'; stage.dispatchEvent(new window.Event('change'));
      assert.equal(visible(), lessons.filter(lesson => lesson.stage === 'junior').length, 'stage filter');
      const query = doc.getElementById('course-query'); query.value = 'this-query-has-no-result'; query.dispatchEvent(new window.Event('input'));
      assert.equal(visible(), 0); assert.equal(doc.getElementById('course-empty').hidden, false);
      doc.getElementById('course-filter').dispatchEvent(new window.Event('reset'));
      assert.equal(visible(), lessons.length); assert(!window.location.search.includes('stage='));
      const first = lessons[0]; query.value = first.title; query.dispatchEvent(new window.Event('input'));
      assert(visible() >= 1); assert(window.location.search.includes('q='));
      window.history.pushState(null, '', 'index.html?stage=college'); window.dispatchEvent(new window.PopStateEvent('popstate'));
      assert.equal(visible(), lessons.filter(lesson => lesson.stage === 'college').length, 'history restores filters');
      query.value = ''; stage.value = ''; stage.dispatchEvent(new window.Event('change'));
      assert.equal(visible(), lessons.length, 'repeat filtering restores all cards');
      const restored = setup('index.html', 'index.html?stage=senior', width);
      assert.equal(restored.document.querySelectorAll('[data-course-lesson]:not([hidden])').length, lessons.filter(lesson => lesson.stage === 'senior').length, 'reload deep link');
    }
    const lesson = lessons[0], window = setup(lesson.slug + '.html', lesson.slug + '.html');
    const details = window.document.querySelector('.course-answers'); assert(details && !details.open, 'answers initially folded');
    window.location.hash = '#%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88%E4%B8%8E%E8%A7%A3%E6%9E%90'; window.dispatchEvent(new window.Event('hashchange'));
    assert(details.open, 'answer anchor reveals details');
    assert(!window.document.querySelector('[data-course-print]'), 'no dedicated printing feature');
    assert(!/window\.print|beforeprint|afterprint/.test(fs.readFileSync(path.join(COURSE, 'js/course.js'), 'utf8')), 'native browser printing only; no automatic print handlers');
    assert(window.document.querySelector('article').textContent.includes('练习'), 'static content without network');
    const collegeLesson = lessons.find(lesson => lesson.stage === 'college');
    const collegeWindow = setup(collegeLesson.slug + '.html', collegeLesson.slug + '.html');
    if (collegeWindow.document.getElementById('answers')) {
      collegeWindow.location.hash = '#answers'; collegeWindow.dispatchEvent(new collegeWindow.Event('hashchange'));
      assert(collegeWindow.document.querySelector('.course-answers').open, 'explicit author answer anchor reveals disclosure');
    }
    assert.equal(window.localStorage.length, 0, 'opening a lesson does not create mastery or reading state');
    const css = fs.readFileSync(path.join(COURSE, 'css/course.css'), 'utf8');
    assert(css.includes('@media print') && css.includes('@media (max-width:520px)') && css.includes('.dark .course-page'));
    const luminance = color => { color = color.length === 4 ? '#' + color.slice(1).split('').map(char => char + char).join('') : color; const channels = /^rgb/.test(color) ? color.match(/[\d.]+/g).slice(0, 3).map(Number) : color.slice(1).match(/../g).map(value => parseInt(value, 16)); const rgb = channels.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; };
    const contrast = (a, b) => { const values = [luminance(a), luminance(b)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); };
    for (const dark of [false, true]) {
      window.document.documentElement.classList.toggle('dark', dark);
      const computed = window.getComputedStyle(window.document.body);
      const palette = Object.fromEntries(['paper','soft','ink','muted','accent','focus'].map(name => [name, computed.getPropertyValue('--course-' + name).trim()]));
      for (const foreground of ['ink', 'muted', 'accent']) for (const background of ['paper', 'soft']) assert(contrast(palette[foreground], palette[background]) >= 4.5, 'course palette normal-text contrast');
      assert(contrast(palette.focus, palette.paper) >= 3, 'visible keyboard focus contrast');
    }
    const chrome = setup('index.html', 'index.html', 390);
    chrome.fetch = async () => ({ json: async () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/search-index.json'), 'utf8')) });
    for (const script of ['site-config.js', 'search.js', 'site-chrome.js']) chrome.eval(fs.readFileSync(path.join(ROOT, 'js', script), 'utf8'));
    chrome.SeriesChrome.mount({ root:'../', active:'english', seriesLabel:'英语学习' });
    await chrome.SiteSearch.init('../');
    const shared = chrome.document;
    assert(shared.querySelector('#mobile-menu a[href="../english/index.html"]'), 'fifth series appears in actual shared mobile navigation');
    shared.getElementById('mobile-menu-button').click(); assert(shared.getElementById('mobile-menu').classList.contains('open'));
    shared.getElementById('close-menu-button').click(); assert(!shared.getElementById('mobile-menu').classList.contains('open'));
    shared.getElementById('site-search-button').click();
    const modal = shared.getElementById('site-search-modal'), input = shared.getElementById('site-search-input');
    assert(!modal.classList.contains('hidden'), 'shared search opens');
    const example = lessons.find(lesson => lesson.stage === 'junior');
    input.value = example.title; input.dispatchEvent(new chrome.Event('input'));
    assert(shared.querySelector('.site-search-hit[href="../english/' + example.slug + '.html"]'), 'actual shared search returns a course lesson');
    assert(shared.getElementById('site-search-results').textContent.includes('英语学习'), 'search result uses English series label');
    input.value = '语态'; input.dispatchEvent(new chrome.Event('input'));
    for (const dark of [false, true]) {
      shared.documentElement.classList.toggle('dark', dark);
      for (const selector of ['.site-search-hit span mark', '.site-search-hit p mark']) {
        const marks = [...shared.querySelectorAll(selector)];
        assert(marks.length > 0, 'actual search produces title and summary highlights');
        for (const mark of marks) {
          const style = chrome.getComputedStyle(mark);
          assert(contrast(style.color, style.backgroundColor) >= 4.5, `${dark ? 'dark' : 'light'} search highlight contrast: ${selector}`);
        }
      }
    }
    const nonCourse = new Window({ settings: { disableJavaScriptEvaluation:true } }); windows.push(nonCourse);
    nonCourse.document.write('<html class="dark"><head><style>' + fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8') + '\n' + css + '</style></head><body><a class="site-search-hit"><span class="text-gray-800"><mark>语态</mark></span><p class="text-gray-500"><mark>语态</mark></p></a></body></html>');
    for (const mark of nonCourse.document.querySelectorAll('.site-search-hit mark')) {
      assert(!mark.matches('.course-page .site-search-hit mark'), 'English override selector excludes non-course pages');
      assert.equal(nonCourse.getComputedStyle(mark).color, nonCourse.getComputedStyle(mark.parentElement).color, 'non-course search retains its existing inherited foreground');
    }
    shared.dispatchEvent(new chrome.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    assert(modal.classList.contains('hidden'), 'shared search dismisses with Escape');
    shared.getElementById('site-search-button').click(); assert(!modal.classList.contains('hidden'), 'shared search can reopen');
    modal.dispatchEvent(new chrome.MouseEvent('click', { bubbles:true })); assert(modal.classList.contains('hidden'), 'shared search backdrop dismisses');
    console.log('English UI: 320/390/1440 DOM navigation, stage/query/empty/reset/repeated filters, reload/history, answer anchors, shared mobile navigation/search and light/dark highlight contrast, native-print CSS and no mastery storage passed. Real-browser geometry remains a separate check.');
  } finally { for (const window of windows) await window.happyDOM.abort(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
