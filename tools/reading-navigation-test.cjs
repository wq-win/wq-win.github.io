#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {corpus}=require('./lib/reading-corpus.cjs');
const {sourceNavigation,syncSourceNavigation,staticPager}=require('./lib/reading-navigation.cjs');
const root=path.resolve(__dirname,'..');
let checks=0;const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const ok=(a,label)=>{assert.ok(a,label);checks++;};
const epilogue={slug:'61-epilogue',file:'61-系列收尾.md',kind:'epilogue',title:'系列收尾'};
for(const n of [60,62,100]){
 const posts=[...Array.from({length:n},(_,i)=>({slug:String(i+1).padStart(2,'0')+'-paper',file:String(i+1).padStart(2,'0')+'-paper.md',day:i+1,kind:'paper'})),epilogue];
 for(const p of posts.slice(0,-1)){
  const line=sourceNavigation(posts,p),old='[系列首页](README.md) · [系列收尾](61-系列收尾.md)';
  const original='# Paper\n\n'+old+'\n\nA contextual [系列收尾](61-系列收尾.md) link.\n\n'+old+'\n';
  const updated=syncSourceNavigation(original,posts,p);
  equal(updated.split('\n').filter(l=>l.startsWith('[系列首页]')),[line,line],'two synchronized bars '+n+'/'+p.day);
  equal(syncSourceNavigation(updated,posts,p),updated,'idempotent source '+n+'/'+p.day);
  ok(updated.includes('A contextual [系列收尾](61-系列收尾.md) link.'),'contextual citations preserved');
  const target=p.day===n?'61-系列收尾.md':posts[p.day].file;
  ok(line.endsWith(']('+target+')'),'correct next source '+n+'/'+p.day);
 }
 ok(staticPager(posts,posts[59]).includes('href="'+(n===60?'61-epilogue':'61-paper')+'.html"'),'60 next pager across expansion '+n);
 ok(staticPager(posts,posts[n-1]).includes('href="61-epilogue.html"'),'last paper to stable epilogue '+n);
 assert.throws(()=>syncSourceNavigation('# missing bars',posts,posts[0]),/exactly two/);checks++;
}
const c=corpus(root),posts=c.catalogs.rl.posts;
const catalogHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'rl/js/catalog.js'))).digest('hex').slice(0,12);
for(const [i,p] of posts.entries()){
 const html=fs.readFileSync(path.join(root,'rl',p.slug+'.html'),'utf8');
 const pager=html.match(/<!-- READING:PAGER:START -->([\s\S]*?)<!-- READING:PAGER:END -->/)?.[1];
 equal(pager,staticPager(posts,p),'built static pager '+p.slug);
 equal([...pager.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),[posts[i-1],posts[i+1]].filter(Boolean).map(p=>p.slug+'.html'),'real neighboring destinations '+p.slug);
 ok(html.includes('src="js/catalog.js?v='+catalogHash+'"'),'catalog content version '+p.slug);
 // Run the production boot script against a deliberately stale catalog.
 // DOM stubs isolate pager behavior; full reader DOM/layout tests run separately.
 const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const currentSlug'));
 const nodes={'article-pager':{dataset:{staticPager:'true'},innerHTML:pager},'article-nav':{},'md-source':{value:''},'article-body':{}};
 const stale=posts.filter(p=>p.day<=60||p.kind==='epilogue');
 vm.runInNewContext(script,{window:{},document:{getElementById:id=>nodes[id]},RLChrome:{mountChrome(){}},RLRender:{mountMarkdown(){}},RL_POSTS:stale});
 equal(nodes['article-pager'].innerHTML,pager,'stale JS cannot overwrite static pager '+p.slug);
 if(c.papers.some(q=>q.key==='rl/'+p.slug)){
  const source=fs.readFileSync(path.join(root,'rl/posts',p.file),'utf8');
  equal(syncSourceNavigation(source,posts,p),source,'canonical source navigation already synced '+p.slug);
  const body=html.match(/<!-- READING:START -->([\s\S]*?)<!-- READING:END -->/)[1];
  const bars=[...body.matchAll(/<p><a href="index.html">系列首页<\/a>([\s\S]*?)<\/p>/g)];
  const expected=[...sourceNavigation(posts,p).matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]==='README.md'?'index.html':c.catalogs.rl.map[m[1]]+'.html');
  equal(bars.length,2,'two rendered source navigation bars '+p.slug);
  for(const bar of bars)equal([...bar[0].matchAll(/href="([^"]+)"/g)].map(m=>m[1]),expected,'rendered source destinations '+p.slug);
 }
}
console.log(checks+' navigation assertions passed (60/62/100 fixtures, source + static + stale-JS pagers).');
