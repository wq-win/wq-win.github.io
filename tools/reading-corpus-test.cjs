#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const vm=require('node:vm');
const {corpus,exactRecords,validateReview,validateSourceChange}=require('./lib/reading-corpus.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'reading-corpus-'));
let checks=0;
const ok=(v,label)=>{assert.ok(v,label);checks++};
const fails=(f,pattern)=>{assert.throws(f,pattern);checks++};
function fixture(n){
 for(const series of ['rl','llm','robot-learn','robot-classic']){
  const dir=path.join(root,series);fs.mkdirSync(path.join(dir,'js'),{recursive:true});fs.mkdirSync(path.join(dir,'posts'),{recursive:true});
  for(const f of fs.readdirSync(path.join(dir,'posts')))fs.unlinkSync(path.join(dir,'posts',f));
  const count=series==='rl'?n:100;
  const posts=[{slug:'00-reading-guide',file:'00-reading-guide.md',kind:'guide',day:0},{slug:'00-timeline',file:'00-timeline.md',kind:'overview',day:0},...Array.from({length:count},(_,i)=>({slug:String(i+1).padStart(2,'0')+'-paper',file:String(i+1).padStart(2,'0')+'-paper.md',kind:'paper',day:i+1})),{slug:series==='rl'?'61-epilogue':'101-epilogue',file:series==='rl'?'61-系列收尾.md':'101-系列总结.md',kind:'epilogue',day:101}];
  for(const p of posts)fs.writeFileSync(path.join(dir,'posts',p.file),'# fixture');fs.writeFileSync(path.join(dir,'posts/README.md'),'# index');
  write(series,posts);
 }
}
function write(series,posts){fs.writeFileSync(path.join(root,series,'js/catalog.js'),'window.SERIES_POSTS='+JSON.stringify(posts)+';window.SERIES_SLUG_MAP='+JSON.stringify(Object.fromEntries(posts.map(p=>[p.file,p.slug])))+';');}
function review(c){return {coverage:c.sources.map(p=>({path:p,source_sha256:'a'.repeat(64),published_baseline_sha256:'b'.repeat(64),series:p.split('/')[0],kind:c.pages.find(q=>q.path===p)?.kind||'index'})),...Object.fromEntries(['feedback','alignment','structure','inline'].map(k=>[k,c.papers.map(p=>({path:p.path}))])),figure_ledgers:c.series.map(s=>({series:s,articles:c.sources.filter(p=>p.startsWith(s+'/')).map(p=>({path:p}))}))};}
try{
 for(const n of [60,62,100]){
  fixture(n);const c=corpus(root);ok(c.paperCount===n+300&&c.pageCount===n+312&&c.sourceCount===n+316,'derived counts '+n);ok(c.papers.filter(p=>p.series==='rl').length===n,'epilogue excluded despite prefix61');
  const data=review(c);validateReview(data,c);checks++;
  for(const field of ['coverage','feedback','alignment','structure','inline']){
   const missing=structuredClone(data);missing[field].pop();fails(()=>validateReview(missing,c),/missing\/extra/);
   const duplicate=structuredClone(data);duplicate[field].push(duplicate[field][0]);fails(()=>validateReview(duplicate,c),/duplicate/);
   const extra=structuredClone(data);extra[field][0]={...extra[field][0],path:'rl/posts/999-extra.md'};fails(()=>validateReview(extra,c),/missing\/extra/);
  }
  const ledger=structuredClone(data);ledger.figure_ledgers[0].articles.pop();fails(()=>validateReview(ledger,c),/missing\/extra/);
  const wrongKind=structuredClone(data);wrongKind.coverage.find(r=>r.kind==='epilogue').kind='paper';fails(()=>validateReview(wrongKind,c),/coverage kind/);
 }
 fixture(62);let c=corpus(root),posts=c.catalogs.rl.posts;
 write('rl',[...posts,posts[2]]);fails(()=>corpus(root),/duplicate/);
 fixture(62);c=corpus(root);posts=c.catalogs.rl.posts;posts[3].day=1;write('rl',posts);fails(()=>corpus(root),/identity/);
 fixture(62);c=corpus(root);posts=c.catalogs.rl.posts.filter(p=>p.day!==20);fs.unlinkSync(path.join(root,'rl/posts/20-paper.md'));write('rl',posts);fails(()=>corpus(root),/contiguous/);
 fixture(62);fs.unlinkSync(path.join(root,'rl/posts/62-paper.md'));fails(()=>corpus(root),/missing or extra/);
 fixture(62);fs.writeFileSync(path.join(root,'rl/posts/63-orphan.md'),'# orphan');fails(()=>corpus(root),/missing or extra/);
 fixture(62);c=corpus(root);const rows=c.papers.map(p=>({source:p.path}));rows[1]=rows[0];fails(()=>exactRecords(rows,c.papers.map(p=>p.path),'prerequisites','source'),/duplicate/);
 const created={path:'new.md',source_sha256:'a'.repeat(64),published_baseline_sha256:null,change_type:'created'};
 validateSourceChange(created);checks++;
 fails(()=>validateSourceChange({...created,change_type:undefined}),/requires baseline/);
 fails(()=>validateSourceChange({...created,published_baseline_sha256:'b'.repeat(64)}),/no baseline/);
 fails(()=>validateSourceChange({...created,change_type:'revised',published_baseline_sha256:created.source_sha256}),/change baseline/);
 const repo=path.resolve(__dirname,'..'),redirect=fs.readFileSync(path.join(repo,'rl/article.html'),'utf8');
 const script=[...redirect.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('location.replace'));
 const window={};vm.runInNewContext(fs.readFileSync(path.join(repo,'rl/render.js'),'utf8'),{window});
 for(const [slug,target] of [['61-cpo','61-cpo.html'],['62-qr-dqn','62-qr-dqn.html'],['61-系列收尾','61-epilogue.html'],['61-epilogue','61-epilogue.html'],['00-reading-guide','00-reading-guide.html'],['00-强化学习发展时间线总览','00-timeline.html']]){
  let actual;vm.runInNewContext(script,{URLSearchParams,window:{location:{search:'?slug='+encodeURIComponent(slug),replace:value=>{actual=value;}}}});
  ok(actual===target,'legacy redirect '+slug);ok(window.RLRender.postHref({slug})===target,'legacy pager '+slug);
 }
 console.log(checks+' scalable corpus assertions passed (60, 62 and 100 RL papers; missing/extra/duplicate identities rejected).');
}finally{fs.rmSync(root,{recursive:true,force:true});}
