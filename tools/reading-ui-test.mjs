import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Dependency-free site; only this optional DOM test uses happy-dom.
// npm install --prefix /tmp/mylog-reading-tests --no-save happy-dom
// HAPPY_DOM_PATH=/tmp/mylog-reading-tests/node_modules/happy-dom node tools/reading-ui-test.mjs
const require = createRequire(import.meta.url);
let dependency = process.env.HAPPY_DOM_PATH;
try {
  if (!dependency) dependency = require.resolve('happy-dom');
  else if (fs.statSync(dependency).isDirectory()) dependency = path.join(dependency, 'lib/index.js');
} catch (_) {
  console.error('Install happy-dom locally or set HAPPY_DOM_PATH to its package directory; see the comment at the top of this test.');
  process.exit(1);
}
const { Window } = await import(pathToFileURL(path.resolve(dependency)).href);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(repo + '/css/reading-guide.css', 'utf8');
const script = fs.readFileSync(repo + '/js/reading-guide.js', 'utf8');
let checks = 0;
const ok = (condition, label) => { assert.ok(condition, label); checks++; };
async function setup(width = 1440, slug = '01-actor-critic') {
  const w = new Window({url: 'https://example.test/rl/' + slug + '.html', width, height: 1000, settings: {disableJavaScriptFileLoading: true, disableCSSFileLoading: true}});
  w.innerWidth = width;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.document.write('<html><head><style>' + css + '</style></head><body><main><article class="article-content rl-body"><div>outside</div><div id="article-body"><h1>Actor</h1><p>Actor and Critic, Actor &amp; Critic. <code>Actor TD</code><a href="#x">TD</a> CATD TD3 and $Q$.</p><h2>方法</h2><p>时序差分 TD 和 TD 的反馈。</p><h3>关键公式</h3><p><span class="katex"><span class="katex-html">Q</span><math><annotation encoding="application/x-tex">Q(s,a)</annotation></math></span></p><h2>总结</h2><p>Q means nothing without context here. <em>Actor</em></p></div><div id="article-pager"></div></article></main></body></html>');
  w.GLOSSARY = [
    {id:'actor',term:'Actor',zh:'行动者',en:'Actor',aliases:[],purpose:'选择动作',definition:'定义',example:'例子'},
    {id:'critic',term:'Critic',zh:'评价者',en:'Critic',aliases:[],definition:'评价'},
    {id:'td',term:'TD',zh:'时序差分',en:'Temporal Difference',aliases:['时序差分'],definition:'误差'},
    {id:'q',term:'Q',aliases:[],definition:'never auto match single symbols'},
    {id:'wrong-series',term:'CATD',aliases:[],definition:'must not be used here',series:['llm']}
  ];
  w.READING_SYMBOLS = {rl:[
    {id:'q-rl',symbol:'Q(s,a)',meaning:'动作价值',match:['Q(s,a)'],articles:['01-actor-critic']},
    {id:'q-wrong',symbol:'Q',meaning:'别的文章的 Q',match:['时序差分'],articles:['different']},
    {id:'gamma',symbol:'γ',meaning:'折扣',match:['时序差分']},
    {id:'single',symbol:'s',meaning:'should never match',match:['Q']}
  ]};
  const body = w.document.getElementById('article-body');
  const before = body.textContent;
  w.eval(script);
  const state = w.ReadingGuide.mount({container:body,series:'rl',slug,root:'../'});
  await new Promise(r=>setTimeout(r,30));
  return {w,d:w.document,body,before,state};
}
let {w,d,body,before,state} = await setup();
ok(body.textContent === before, 'all article text exactly unchanged');
ok(state.conceptCount === 3, 'one note per matching concept');
ok(d.querySelectorAll('.rg-term-trigger').length === 8, 'every repeated alias is clickable');
ok(!body.querySelector('code button,a button,.katex button,h1 button'), 'protected text never decorated');
ok(!body.querySelector('[data-term=q]'), 'no single-letter glossary decoration');
ok(!body.querySelector('[data-term=wrong-series]'), 'other-series glossary definitions do not leak');
ok(body.querySelector('p').textContent.includes('CATD TD3'), 'English word boundaries preserved');
ok(d.querySelectorAll('.rg-margin-note').length === 3, 'three unique notes');
ok(w.ReadingGuide.mount({container:body}) === state, 'idempotent mounting');
ok(d.querySelectorAll('dialog').length === 1, 'one shared dialog');
ok(state.sections.find(s=>s.title==='关键公式').symbols.includes('q-rl'), 'KaTeX annotation source provides local context');
ok(!state.sections.find(s=>s.title==='总结').symbols.includes('q-rl'), 'Q in prose is not falsely annotated');
ok(state.sections.every(s=>!s.symbols.includes('q-wrong')&&!s.symbols.includes('single')), 'article scope and non-letter matching enforced');
ok(w.ReadingGuide.selectSymbols(w.READING_SYMBOLS.rl,{slug:'01-actor-critic',text:'q(s,a)',heading:''}).length===0,'case-sensitive formulas do not confuse Q and q');
const first = body.querySelector('.rg-term-trigger'); first.click();
ok(d.querySelector('dialog').open, 'dialog opens');
ok(d.querySelector('.rg-dialog-content').textContent.includes('直观例子：例子'), 'purpose and example available');
ok(first.getAttribute('aria-expanded')==='true', 'expanded state set');
d.querySelector('.rg-dialog-close').click(); await new Promise(r=>setTimeout(r,0));
ok(!d.querySelector('dialog').open, 'dialog closes');
ok(d.activeElement===first, 'focus restored');
ok(first.getAttribute('aria-expanded')==='false', 'expanded state reset');
const later = [...body.querySelectorAll('[data-term=actor]')].at(-1); later.click();
ok(d.querySelectorAll('dialog').length===1, 'repeat occurrence reuses dialog');
d.querySelector('dialog').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
ok(!d.querySelector('dialog').open, 'Escape dismisses');
d.querySelector('.rg-notes-toggle').click(); ok(d.querySelector('.rg-notes').inert, 'hidden notes inert');
d.querySelector('.rg-notes-toggle').click(); ok(!d.querySelector('.rg-notes').inert, 'notes reopen');
let index=0;
for(const note of d.querySelectorAll('.rg-margin-note')) {
  Object.defineProperty(note,'offsetHeight',{get:()=>note.open?140:44});
  const i=index++;
  d.querySelector('#term-'+note.dataset.term).getBoundingClientRect=()=>({top:180+i*20});
}
state.refresh(); await new Promise(r=>setTimeout(r,30));
let bottom=0; for(const note of d.querySelectorAll('.rg-margin-note')) {ok(Number.parseFloat(note.style.top)>=bottom,'notes do not collide');bottom=Number.parseFloat(note.style.top)+note.offsetHeight;}
state.destroy(); ok(body.textContent===before, 'destroy restores exact text');ok(d.querySelectorAll('.rg-layout,dialog,.rg-term-trigger').length===0,'destroy cleans DOM');await w.happyDOM.close();
({w,d,body,state}=await setup(390));ok(!d.querySelector('.rg-toc-disclosure').open,'mobile TOC collapsed');ok(!d.querySelector('.rg-symbols-disclosure').open,'mobile symbols collapsed');d.querySelector('.rg-toc-disclosure').open=true;d.querySelector('.rg-toc a').click();ok(!d.querySelector('.rg-toc-disclosure').open,'TOC closes on mobile navigation');d.querySelector('.rg-term-trigger').click();ok(d.querySelector('dialog').open,'mobile glossary dialog');await w.happyDOM.close();


// Check the actual static article markup and the production shared reference data.
for (const [series, slug] of [
  ['rl', '01-actor-critic'],
  ['llm', '015-transformer'],
  ['robot-learn', '001-dmp'],
  ['robot-classic', '002-kalman']
]) {
  const w = new Window({url: 'https://example.test/' + series + '/' + slug + '.html', width:1440, height:1000, settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  w.innerWidth=1440;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  const html=fs.readFileSync(path.join(repo,series,slug+'.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  w.document.write(html);
  const d=w.document;
  const body=d.getElementById('article-body');
  ok(body && body.dataset.staticReading==='true','static article exists: '+series);
  const textBefore=body.textContent;
  const mathBefore=[...body.querySelectorAll('annotation[encoding="application/x-tex"]')].map(n=>n.textContent);
  const linksBefore=[...body.querySelectorAll('a')].map(n=>[n.textContent,n.getAttribute('href')]);
  for(const filename of ['glossary-data.js','reading-symbols.js','reading-guide.js']) w.eval(fs.readFileSync(path.join(repo,'js',filename),'utf8'));
  const state=w.ReadingGuide.mount({container:body,series,slug,root:'../'});
  await new Promise(r=>setTimeout(r,30));
  ok(body.textContent===textBefore,'exact production article text preserved: '+series);
  assert.deepEqual([...body.querySelectorAll('annotation[encoding="application/x-tex"]')].map(n=>n.textContent),mathBefore);checks++;
  assert.deepEqual([...body.querySelectorAll('a')].map(n=>[n.textContent,n.getAttribute('href')]),linksBefore);checks++;
  ok(state.conceptCount>0,'actual article has glossary annotations: '+series);
  ok(d.querySelectorAll('.rg-margin-note').length===state.conceptCount,'one actual note per concept: '+series);
  ok(state.sections.some(s=>s.symbols.length),'actual article has section-scoped symbols: '+series);
  ok(!body.querySelector('a button,code button,pre button,.katex button,.mermaid button,h1 button,h2 button,h3 button,.reading-math-source button'),'all protected production markup retained: '+series);
  for(const note of d.querySelectorAll('.rg-margin-note')) {
    const term=w.GLOSSARY.find(t=>t.id===note.dataset.term);
    ok(!term.series || term.series.includes(series),'term is in the current series: '+note.dataset.term);
    ok(note.querySelector('.rg-term-en').textContent.trim(),'bilingual note: '+note.dataset.term);
    ok(note.querySelector('a').getAttribute('href')==='../glossary.html?series='+series+'#'+encodeURIComponent(term.id),'deep term link: '+note.dataset.term);
  }
  const first=body.querySelector('.rg-term-trigger');first.click();
  ok(d.querySelector('dialog').open,'production term dialog: '+series);
  const focusable=[...d.querySelector('dialog').querySelectorAll('button,a[href]')];
  focusable.at(-1).focus();
  d.querySelector('dialog').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  ok(d.activeElement===d.querySelector('.rg-dialog-close'),'dialog keyboard focus loop: '+series);
  d.querySelector('dialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));
  await new Promise(r=>setTimeout(r,0));
  ok(!d.querySelector('dialog').open && d.activeElement===first,'native cancel and focus restore: '+series);
  state.destroy();ok(body.textContent===textBefore,'production destroy keeps source intact: '+series);
  await w.happyDOM.close();
}
console.log(checks+' reading-guide DOM assertions passed. Geometry is simulated; this is not a substitute for real-browser layout, touch, or screen-reader checks.');
