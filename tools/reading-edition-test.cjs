#!/usr/bin/env node
'use strict';
// Full-edition checks replace the old hotfix's intentionally frozen-content scope.
// Content judgment still needs human/source review; these checks prove coverage,
// source identity, links, formatting and preservation of existing reader behavior.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const seriesNames=['rl','llm','robot-learn','robot-classic'];
const expected={rl:64,llm:104,'robot-learn':104,'robot-classic':104};
const relationTypes=new Set(['direct-inheritance','module-composition','parallel-method','teaching-link','historical-context']);
const inspectedTypes=new Set(['full-text','section','abstract','metadata','unavailable']);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let checks=0,Window;
const check=(v,label)=>{assert.ok(v,label);checks++};
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};
function coverage(){
 const all=[];
 for(const series of seriesNames){
  const rows=JSON.parse(read('data/reading-review-data.json')).coverage.filter(r=>r.series===series);
  check(Array.isArray(rows),series+' coverage is an array');equal(rows.length,expected[series],series+' reviewed sources');
  const files=fs.readdirSync(path.join(root,series,'posts')).filter(n=>n.endsWith('.md')).map(n=>series+'/posts/'+n).sort();
  equal(rows.map(r=>r.path).sort(),files,series+' exact one-to-one coverage');
  for(const row of rows){
   check(Array.isArray(row.changes)&&row.changes.length>0,row.path+' describes actual edits');
   check(Array.isArray(row.sources)&&Array.isArray(row.relationships),row.path+' source and relationship arrays');
   check(['verified','partial','blocked'].includes(row.verification),row.path+' verified status');
   check(Array.isArray(row.limitations),row.path+' limitations explicit');
   const current=read(row.path);
   equal(hash(fs.readFileSync(path.join(root,row.path))),row.source_sha256,row.path+' public audit source identity');
   check(row.source_sha256!==row.published_baseline_sha256,row.path+' revised from published baseline');
   check(!/[\uE200-\uE203]/.test(current),row.path+' no internal citation markers');
   check(!/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(current),row.path+' no corrupted TeX control characters');
   if(row.kind==='paper'){
    check(row.paper_title&&row.paper_title.length>3,row.path+' paper identity');
    check(row.sources.length>0,row.path+' explicit research sources');
    check(row.relationships.length>0,row.path+' explicit technical relationships');
    check(row.sources.some(s=>['primary-paper','author-code','official-course'].includes(s.type)),row.path+' primary source');
    if(!row.sources.some(s=>['full-text','section'].includes(s.inspected)))check(row.verification!=='verified'&&row.limitations.length>0,row.path+' evidence bounds for abstract-only research');
   }
   for(const source of row.sources||[]){
    check(/^https?:\/\//.test(source.url),row.path+' source URL');check(inspectedTypes.has(source.inspected),row.path+' actual inspected level');check(source.supports&&source.supports.length>0,row.path+' source supports concrete claim');
   }
   for(const relation of row.relationships||[]){
    check(relationTypes.has(relation.type),row.path+' relationship type');
    check(fs.existsSync(path.resolve(root,relation.target)),row.path+' relationship target exists '+relation.target);
    check(relation.reason&&relation.reason.length>5,row.path+' relationship mechanism');
   }
   all.push(row);
  }
 }
 equal(all.filter(r=>r.kind==='paper').length,360,'360 paper records');
 return all;
}
async function rendered(){
 const {catalog,render}=require('./build-reading.cjs');
 const targetAnchors=new Map();
 const report=JSON.parse(read('data/reading-build-report.json'));
 equal(report.length,372,'all 372 article/guide pages statically built');
 equal(report.flatMap(r=>r.unrenderedMath),[],'every formula parsed by KaTeX');
 for(const series of seriesNames){
  const {posts,map}=catalog(series);
  for(const p of posts){
   const w=new Window({url:'https://mylog.test/'+series+'/'+p.slug+'.html',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}}),d=w.document;
   w.HTMLElement.prototype.scrollIntoView=function(){};
   d.write(read(series+'/'+p.slug+'.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
   const source=read(series+'/posts/'+p.file).replaceAll('\r\n','\n'),body=d.getElementById('article-body');
   check(body?.dataset.staticReading==='true',series+'/'+p.slug+' readable without JS');
   equal(d.getElementById('md-source').value,source,series+'/'+p.slug+' embedded source');
   equal(body.dataset.sourceSha256,hash(fs.readFileSync(path.join(root,series,'posts',p.file))),series+'/'+p.slug+' source identity');
   const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);equal(ids.length,new Set(ids).size,series+'/'+p.slug+' unique anchors');
   const prose=body.cloneNode(true);for(const el of prose.querySelectorAll('pre,code,.reading-math,.mermaid'))el.remove();
   check(!prose.textContent.includes('**'),series+'/'+p.slug+' no leaked prose emphasis markers');
   for(const a of body.querySelectorAll('a[href]')){
    const href=a.getAttribute('href');if(/^(?:[a-z]+:|\/\/)/i.test(href))continue;
    const [file,fragment]=href.split('#');const clean=file&&decodeURIComponent(file.split('?')[0]);const dest=file?(clean.startsWith('/')?path.join(root,clean):path.resolve(root,series,clean)):path.resolve(root,series,p.slug+'.html');
    check(fs.existsSync(dest),series+'/'+p.slug+' local link '+href);
    if(fragment&&!file)check(d.getElementById(decodeURIComponent(fragment)),series+'/'+p.slug+' anchor '+fragment);
    else if(fragment&&dest.endsWith('.html')){
     if(!targetAnchors.has(dest))targetAnchors.set(dest,new Set([...fs.readFileSync(dest,'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])));
     check(targetAnchors.get(dest).has(decodeURIComponent(fragment)),series+'/'+p.slug+' cross-page anchor '+href);
    }
   }
   if(p.slug==='00-reading-guide'){
    const expected=d.createElement('div');expected.innerHTML=render(source,map,series).html;
    equal(body.innerHTML,expected.innerHTML,series+' guide full canonical render');
    const unprotected=body.cloneNode(true);for(const el of unprotected.querySelectorAll('pre,code,.reading-math,.mermaid'))el.remove();
    check(!unprotected.textContent.includes('**'),series+' guide has no leaked bold syntax');
    const before=body.innerHTML,txt=body.textContent,strong=[...body.querySelectorAll('strong')];
    for(const f of ['glossary-data.js','reading-symbols.js','reading-guide.js'])w.eval(read('js/'+f));
    const state=w.ReadingGuide.mount({container:body,series,slug:p.slug,root:'../'});
    check(state.conceptCount>0,series+' guide annotations mount');equal(body.textContent,txt,series+' annotations preserve text');
    check(strong.every((el,i)=>body.querySelectorAll('strong')[i]===el),series+' annotations preserve strong nodes');
    state.destroy();equal(body.innerHTML,before,series+' annotation teardown restores guide');
   }
   await w.happyDOM.close();if(global.gc)global.gc();
  }
 }
 // The separate review is a public-facing artifact, not the raw editorial manifest.
 {
  const review=read('edition-review.html'),w=new Window({url:'https://mylog.test/edition-review.html',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}}),d=w.document;
  d.write(review.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  equal(d.querySelectorAll('.review-card').length,376,'review exposes all source records');
  const logic=[...review.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];w.eval(logic);
  const series=d.getElementById('series');series.value='rl';series.dispatchEvent(new w.Event('change'));
  equal([...d.querySelectorAll('.review-card')].filter(c=>!c.hidden).length,64,'review series filter');
  series.value='all';series.dispatchEvent(new w.Event('change'));const q=d.getElementById('query');q.value='this-phrase-has-no-record';q.dispatchEvent(new w.Event('input'));
  equal([...d.querySelectorAll('.review-card')].filter(c=>!c.hidden).length,0,'review search no-results');
  q.value='';q.dispatchEvent(new w.Event('input'));equal([...d.querySelectorAll('.review-card')].filter(c=>!c.hidden).length,376,'review search reset');
  check(!/CONTRIBUTOR_CONTRACT|\/workspace\/shared|href=["'](?:\.\/)?research\//.test(review),'review contains no internal coordination paths');
  await w.happyDOM.close();
 }
 // Link-resolution regressions: preserve actual cross-series identity and external Markdown URLs.
 const linked=render('[PPO](../../rl/posts/27-ppo.md) [source](https://example.com/README.md)',catalog('llm').map,'llm').html;
 check(linked.includes('href="../rl/27-ppo.html"'),'cross-series Markdown link');check(linked.includes('href="https://example.com/README.md"'),'external Markdown URL unchanged');
 const emphasis=render('**证据一。**正文；**Sim(3)**也成立\n\n`**literal**`\n\n```text\n**literal**\n```\n\n$\\text{**math**}$',{},'rl').html;
 check(emphasis.includes('<strong>证据一。</strong>正文'),'CJK punctuation emphasis');check(emphasis.includes('<strong>Sim(3)</strong>也成立'),'mixed-script emphasis');check(emphasis.includes('<code>**literal**</code>'),'inline code emphasis preserved');check(emphasis.includes('<code class="language-text">**literal**'),'fenced code emphasis preserved');check(emphasis.includes('\\text{**math**}'),'math emphasis preserved');
 const tilde=render('~~~text\n**literal** $NOT_MATH$\n~~~',{},'rl');equal(tilde.math.length,0,'tilde-fenced pseudocode is not interpreted as math');check(tilde.html.includes('**literal** $NOT_MATH$'),'tilde-fenced pseudocode preserves literal emphasis');
 const attrFixture=render('<figure><img src="/sample.png" alt="Result $0.89\\pm0.06$ and **literal**"><figcaption>Score $x+1$</figcaption></figure>',{},'rl');
 equal(attrFixture.math.length,1,'image alt text is not counted or rendered as prose math');check(attrFixture.html.includes('alt="Result $0.89\\pm0.06$ and **literal**"'),'quoted image alt remains exact');check(attrFixture.html.includes('data-tex="x+1"'),'actual figure caption formula still renders');
 const htmlCode=render('<code>$NOT_MATH$ **literal**</code>',{},'rl');equal(htmlCode.math.length,0,'HTML code is not interpreted as math');check(htmlCode.html.includes('$NOT_MATH$ **literal**'),'HTML code preserves literal emphasis');
}
(async()=>{let dep=process.env.HAPPY_DOM_PATH||'happy-dom';if(dep!=='happy-dom'&&fs.statSync(dep).isDirectory())dep=path.join(dep,'lib/index.js');({Window}=await import(dep));const rows=coverage();await rendered();console.log(`${checks} full-edition assertions passed; ${rows.length} reviewed sources, 360 papers, 372 rendered pages.`)})().catch(e=>{console.error(e);process.exitCode=1});
