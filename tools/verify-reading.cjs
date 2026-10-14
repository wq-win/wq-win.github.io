#!/usr/bin/env node
/* Exhaustive canonical-source rendering checks, independent of the span locator.
 * The preview intentionally revises sources; historical source equality belonged
 * to the earlier UI-only task. Edition coverage is checked separately. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/reading-prerequisites.json'))),report=JSON.parse(fs.readFileSync(path.join(root,'data/reading-build-report.json')));
const {render,catalog}=require('./build-reading.cjs');
let checks=0;function check(test,msg){assert.ok(test,msg);checks++;}function equal(a,b,msg){assert.deepEqual(a,b,msg);checks++;}
const sorted=a=>a.slice().sort(),squash=s=>s.replace(/\s/g,''),chars=s=>sorted(Array.from(squash(s))).join('');
async function main(){
 let dep=process.env.HAPPY_DOM_PATH||'happy-dom';if(dep!=='happy-dom'&&fs.statSync(dep).isDirectory())dep=path.join(dep,'lib/index.js');
 const {Window}=await import(dep);
 const create=()=>new Window({url:'https://wq-win.github.io/',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 let w=create(),d=w.document;
 const counts={};let math=0,links=0;
 equal(manifest.length,360,'exactly360 papers');
 for(const m of manifest){
  w=create();d=w.document;
  const raw=fs.readFileSync(path.join(root,m.source)),source=raw.toString().replaceAll('\r\n','\n'),key=m.key,series=key.split('/')[0];counts[series]=(counts[series]||0)+1;
  equal(sha(raw),m.sourceSha256,key+' canonical source hash');
  const a=Array.from(source),block=a.slice(m.start,m.end).join('');equal(block,m.moved,key+' exact original prerequisite span');equal(sha(block),m.movedSha256,key+' concept hash');
  check(m.insert<=m.start,key+' moved forward');const prefix=a.slice(0,m.insert).join(''),middle=a.slice(m.insert,m.start).join(''),suffix=a.slice(m.end).join('');
  const newHeading=block.startsWith('### ')?'':'### 五个前置概念\n\n';const moved=prefix+newHeading+block+'\n\n'+middle+suffix;
  equal(prefix+middle+block+suffix,source,key+' inverse move recovers original character-for-character');
  const rawHTML=fs.readFileSync(path.join(root,key+'.html'),'utf8');d.open();d.write(rawHTML.replace(/<script[\s\S]*?<\/script>/g,''));d.close();
  const body=d.getElementById('article-body');check(body?.dataset.staticReading==='true',key+' no-JS body populated');equal(d.getElementById('md-source').value,source,key+' embedded canonical Markdown');
  const original=d.createElement('div');original.innerHTML=render(source,catalog(series).map,series).html;
  const expected=d.createElement('div');expected.innerHTML=render(moved,catalog(series).map,series).html;
  equal(body.innerHTML,expected.innerHTML,key+' complete static output/order');
  // Extra section label is the only added reading text; whitespace is immaterial.
  let actualText=body.textContent;if(newHeading){const at=actualText.indexOf('五个前置概念');check(at>=0,key+' added prerequisite heading');actualText=actualText.slice(0,at)+actualText.slice(at+'五个前置概念'.length);}
  equal(chars(actualText),chars(original.textContent),key+' original rendered text preserved');
  const mathNodes=[...body.querySelectorAll('.reading-math')];math+=mathNodes.length;
  equal(sorted(mathNodes.map(e=>e.dataset.tex)),sorted([...original.querySelectorAll('.reading-math')].map(e=>e.dataset.tex)),key+' all original TeX expressions');
  const formulaReport=report.find(r=>r.key===key);equal(mathNodes.length,formulaReport.mathExpressions,key+' formula count');
  equal(body.querySelectorAll('.reading-math-source').length,formulaReport.unrenderedMath.length,key+' explicit source fallback count');
  const sourceLinks=[...original.querySelectorAll('a')].map(e=>e.getAttribute('href'));links+=sourceLinks.length;
  equal(sorted([...body.querySelectorAll('a')].map(e=>e.getAttribute('href'))),sorted(sourceLinks),key+' every source link unchanged');
  const ids=[...body.querySelectorAll('[id]')].map(e=>e.id);equal(ids.length,new Set(ids).size,key+' unique heading anchors');
  const hs=[...body.querySelectorAll('h2,h3')],concept=hs.find(e=>e.textContent==='五个前置概念');check(concept,key+' early prerequisite heading');
  const introCount=(prefix.match(/^## /gm)||[]).length;const after=hs.filter(e=>e.tagName==='H2')[introCount];check(after&&Boolean(concept.compareDocumentPosition(after)&4),key+' prerequisites before subsequent body');
  for(const elem of d.querySelectorAll('[src],link[href],#article-body a[href]')){
   const value=elem.getAttribute('src')||elem.getAttribute('href');if(!value||/^(?:[a-z]+:|\/\/|#)/i.test(value))continue;
   const target=value.split(/[?#]/)[0];if(!target)continue;const resolved=target.startsWith('/')?path.join(root,target):path.resolve(root,series,target);check(fs.existsSync(resolved),key+' local asset/link '+value);
  }
  await w.happyDOM.close();
  if(global.gc)global.gc();
 }
 w=create();d=w.document;
 equal(counts,{rl:60,llm:100,'robot-learn':100,'robot-classic':100},'series counts');equal(math,report.filter(r=>r.kind==='paper').reduce((n,r)=>n+r.mathExpressions,0),'all canonical paper formulas');
 const glob={};vm.runInNewContext(fs.readFileSync(path.join(root,'js/glossary-data.js'),'utf8'),{window:glob});vm.runInNewContext(fs.readFileSync(path.join(root,'js/reading-symbols.js'),'utf8'),{window:glob});
 const ids=new Set();for(const t of glob.GLOSSARY){check(!ids.has(t.id),'unique term '+t.id);ids.add(t.id);check(t.zh&&t.en&&t.definition&&t.purpose,'complete bilingual term '+t.id);check(fs.existsSync(path.join(root,t.href.split(/[?#]/)[0])),'term target '+t.id);for(const ref of t.related||[])check(glob.GLOSSARY.some(x=>x.id===(typeof ref==='string'?ref:ref.id)),'related term '+t.id);}
 for(const [series,entries] of Object.entries(glob.READING_SYMBOLS)){for(const e of Array.isArray(entries)?entries:entries.entries){check(e.symbol&&e.meaning&&e.scope,'scoped symbol '+e.id);for(const s of e.articles||[])check(fs.existsSync(path.join(root,series,s+'.html')),'symbol article '+e.id);}}
 for(const series of Object.keys(counts)){
  const f=path.join(root,series,'00-reading-guide.html');check(fs.existsSync(f),'Day0 '+series);d.open();d.write(fs.readFileSync(f,'utf8').replace(/<script[\s\S]*?<\/script>/g,''));d.close();
  const body=d.getElementById('article-body');check(body?.textContent.length>2500,'substantiveDay0 '+series);
  equal(body.querySelectorAll('.reading-math-source').length,0,'guide math all render '+series);
  equal(body.dataset.sourceSha256,sha(fs.readFileSync(path.join(root,series,'posts/00-reading-guide.md'))),'guide source hash '+series);
  check(!fs.readFileSync(f,'utf8').includes('const currentSlug = "01-actor-critic"'),'guide identity '+series);
  for(const a of body.querySelectorAll('a[href]')){const href=a.getAttribute('href');if(/^(https?:|#)/.test(href))continue;const target=href.split(/[?#]/)[0],dest=target.startsWith('/')?path.join(root,target):path.resolve(root,series,target);check(fs.existsSync(dest),'guide local link '+href);if(href.includes('glossary.html')&&href.includes('#'))check(ids.has(href.split('#')[1]),'guide glossary anchor '+href);}
 }
 for(const file of fs.readdirSync(path.join(root,'game')).filter(f=>f.endsWith('.html'))){const relative='game/'+file;equal(sha(fs.readFileSync(path.join(root,relative))),JSON.parse(fs.readFileSync(path.join(root,'data/reading-public-baseline.json'),'utf8')).games[relative],'game page unchanged '+file);}
 await w.happyDOM.close();console.log(`${checks} assertions passed:360 canonical papers,${math} TeX expressions,${links} article links,4 guides,glossary/symbol destinations and game-page preservation.`);
}
main().catch(e=>{console.error(e);process.exit(1);});
