#!/usr/bin/env node
// Independent regression checks execute real page boot scripts, without network.
// These tests do not provide browser geometry, touch or screen-reader verification.
// Run with installed happy-dom or HAPPY_DOM_PATH=/path/to/happy-dom.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let Window;
const root=path.resolve(__dirname,'..');
let runtimeChecks=0;
async function testRuntime(){
 for(const [series,slug] of [['rl','01-actor-critic'],['rl','00-reading-guide'],['rl','00-timeline'],['rl','61-epilogue'],['llm','001-lstm'],['llm','00-reading-guide'],['llm','00-timeline'],['llm','101-epilogue'],['robot-learn','001-dmp'],['robot-learn','00-reading-guide'],['robot-learn','00-timeline'],['robot-learn','101-epilogue'],['robot-classic','001-dh'],['robot-classic','00-reading-guide'],['robot-classic','00-timeline'],['robot-classic','101-epilogue']]){
  const w=new Window({url:`https://mylog.test/${series}/${slug}.html`,settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}}),d=w.document;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  const html=fs.readFileSync(`${root}/${series}/${slug}.html`,'utf8');
  d.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const before=d.getElementById('article-body').innerHTML;let scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  // Execute actual production boot scripts; exclude style compiler/external Mermaid and shell/network.
  w.SeriesChrome={mount(){}};w.tailwind={};
  for(const [,attrs,text] of scripts){
   const source=attrs.match(/\bsrc="([^"]+)"/);
   if(source){let src=source[1];if(/https?:/.test(src)||src.endsWith('tailwind.js')||src.endsWith('site-chrome.js'))continue;let file=src.startsWith('/')?root+src:path.resolve(root,series,src);w.eval(fs.readFileSync(file,'utf8'));}
   else w.eval(text);
  }
  assert.equal(d.getElementById('article-body').innerHTML,before,`${series}/${slug} runtime destroys static reading`);
  for(const src of ['glossary-data.js','reading-symbols.js','reading-guide.js','reader.js'])w.eval(fs.readFileSync(`${root}/js/${src}`,'utf8'));
  w.SeriesReader.init({root:'../'});
  assert.equal(d.querySelectorAll('.rg-layout').length,1,`${series}/${slug} reading mount`);
  const pager=[...d.querySelectorAll('#article-pager a')].map(a=>a.getAttribute('href'));
  assert.ok(w.__readingQA.conceptCount>0,`${series}/${slug} missing concept notes`);
  if(slug==='00-reading-guide')assert.deepEqual(pager,['00-timeline.html'],`${series} Day 0 pager must use its own catalog identity`);
  runtimeChecks+=slug==='00-reading-guide'?4:3;
  await w.happyDOM.close();
 }
}

let n=0;const check=(test,message)=>{assert.ok(test,message);n++};
function setupReference(url){const w=new Window({url,settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});w.HTMLElement.prototype.scrollIntoView=function(){};w.document.write(fs.readFileSync(root+'/glossary.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));w.eval(fs.readFileSync(root+'/js/reading-reference.js','utf8'));return w}
async function testReference(){
let w=setupReference('https://mylog.test/glossary.html?series=rl'),d=w.document;
const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);check(ids.length===new Set(ids).size,'duplicate reference ID');
for(const a of d.querySelectorAll('a[href]')){const href=a.getAttribute('href');if(href.startsWith('#')){check(d.getElementById(decodeURIComponent(href.slice(1))),'dead fragment '+href)}else if(!/^https?:/.test(href))check(fs.existsSync(path.resolve(root,href.split(/[?#]/)[0])),'dead relative link '+href);}
let cards=[...d.querySelectorAll('[data-reference]')];check(cards.filter(c=>!c.hidden).every(c=>c.dataset.reference==='terms'&&c.dataset.series.split(' ').includes('rl')),'RL term filtering');
let view=d.getElementById('reference-view');view.value='symbols';view.dispatchEvent(new w.Event('change'));check(cards.filter(c=>!c.hidden).length===20,'RL symbols exactly20');
let q=d.getElementById('glossary-filter');q.value='no-match-guaranteed-zrx';q.dispatchEvent(new w.Event('input'));check(cards.every(c=>c.hidden)&&!d.getElementById('reference-empty').hidden,'empty search');
w.location.hash='#attention';w.dispatchEvent(new w.HashChangeEvent('hashchange'));check(!d.getElementById('attention').hidden,'hash reveal cross-series term');check(q.value==='','hash clears search');check(view.value==='terms','hash switches view');check(d.getElementById('reference-series').value==='all','hash broadens series');
await w.happyDOM.close();
for(const [url,id]of [['?view=symbols&series=llm#symbol-llm-llm-query','symbol-llm-llm-query'],['?series=robot-classic#kalman','kalman'],['?series=invalid&view=invalid#policy','policy']]){w=setupReference('https://mylog.test/glossary.html'+url);check(w.document.getElementById(id)&&!w.document.getElementById(id).hidden,'direct hash '+url);await w.happyDOM.close()}
return n;
}

(async()=>{
 let dependency=process.env.HAPPY_DOM_PATH||'happy-dom';
 if(dependency!=='happy-dom'&&fs.statSync(dependency).isDirectory())dependency=path.join(dependency,'lib/index.js');
 ({Window}=await import(dependency));
 await testRuntime();
 const referenceChecks=await testReference();
 console.log(`${runtimeChecks} production-bootstrap and ${referenceChecks} reference assertions passed.`);
})().catch(error=>{console.error(error);process.exit(1)});
