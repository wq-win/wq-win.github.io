'use strict';
// Single count/identity authority for both Node and Python reading tools.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const SERIES=['rl','llm','robot-learn','robot-classic'];
const sorted=a=>Array.from(a).sort();
function exactRecords(rows,expected,label,field='path'){
 assert.ok(Array.isArray(rows),label+' must be an array');
 const actual=rows.map(r=>r[field]);
 assert.equal(new Set(actual).size,actual.length,label+' duplicate '+field);
 assert.deepEqual(sorted(actual),sorted(expected),label+' missing/extra '+field);
}
function classify(post){
 if(post.slug==='00-reading-guide'){assert.ok(!post.kind||post.kind==='guide','guide kind');return 'guide';}
 if(post.slug==='00-timeline'){assert.ok(!post.kind||['overview','timeline'].includes(post.kind),'timeline kind');return 'timeline';}
 if(/^\d+-epilogue$/.test(post.slug)){assert.ok(!post.kind||post.kind==='epilogue','epilogue kind');return 'epilogue';}
 assert.ok(!post.kind||post.kind==='paper','unknown catalog kind '+post.kind);
 assert.match(post.slug,/^\d{2,3}-[a-zA-Z0-9-]+$/,'paper slug');
 return 'paper';
}
function corpus(root=path.resolve(__dirname,'../..')){
 const pages=[],sources=[],papers=[],counts={},sourceCounts={},catalogs={};
 for(const series of SERIES){
  const window={};vm.runInNewContext(fs.readFileSync(path.join(root,series,'js/catalog.js'),'utf8'),{window});
  const posts=JSON.parse(JSON.stringify(window.RL_POSTS||window.SERIES_POSTS));
  const map=JSON.parse(JSON.stringify(window.RL_SLUG_MAP||window.SERIES_SLUG_MAP));
  assert.ok(Array.isArray(posts)&&posts.length>3,series+' populated catalog');
  exactRecords(posts,posts.map(p=>p.slug),series+' catalog slugs','slug');
  exactRecords(posts,posts.map(p=>p.file),series+' catalog files','file');
  const entries=posts.map(p=>{
   assert.equal(path.basename(p.file),p.file,series+' local source filename');assert.ok(p.file.endsWith('.md'),series+' Markdown source');
   assert.equal(map[p.file],p.slug,series+' canonical slug mapping '+p.file);
   const kind=classify(p),entry={...p,kind,series,key:series+'/'+p.slug,path:series+'/posts/'+p.file};
   if(kind==='paper'){
    assert.ok(Number.isInteger(p.day)&&p.day>0,entry.key+' positive paper ID');
    assert.equal(Number(p.file.split('-')[0]),p.day,entry.key+' file/day identity');
    assert.equal(Number(p.slug.split('-')[0]),p.day,entry.key+' slug/day identity');
   }
   return entry;
  });
  for(const kind of ['guide','timeline','epilogue'])assert.equal(entries.filter(p=>p.kind===kind).length,1,series+' exactly one '+kind);
  const ps=entries.filter(p=>p.kind==='paper');
  if(series!=='rl')assert.equal(ps.length,100,series+' established 100-paper series');
  assert.deepEqual(ps.map(p=>p.day),Array.from({length:ps.length},(_,i)=>i+1),series+' contiguous ordered paper IDs');
  const sourcePaths=[...entries.map(p=>p.path),series+'/posts/README.md'];
  const files=fs.readdirSync(path.join(root,series,'posts')).filter(f=>f.endsWith('.md')).map(f=>series+'/posts/'+f);
  assert.deepEqual(sorted(files),sorted(sourcePaths),series+' catalog/source missing or extra Markdown');
  counts[series]=ps.length;sourceCounts[series]=sourcePaths.length;pages.push(...entries);papers.push(...ps);sources.push(...sourcePaths);
  catalogs[series]={posts,map};
 }
 return {series:SERIES,catalogs,pages,papers,sources,counts,sourceCounts,paperCount:papers.length,pageCount:pages.length,sourceCount:sources.length};
}
function validateSourceChange(row){
 assert.match(row.source_sha256||'',/^[a-f0-9]{64}$/,row.path+' current source hash');
 if(row.change_type==='created')assert.equal(row.published_baseline_sha256,null,row.path+' created source has no baseline');
 else{
  assert.ok(row.change_type===undefined||row.change_type==='revised',row.path+' known change type');
  assert.match(row.published_baseline_sha256||'',/^[a-f0-9]{64}$/,row.path+' revision requires baseline');
  assert.notEqual(row.source_sha256,row.published_baseline_sha256,row.path+' revision must change baseline');
 }
}
function validateReview(data,c){
 exactRecords(data.coverage,c.sources,'coverage');
 const kinds=new Map(c.pages.map(p=>[p.path,p.kind]));
 for(const row of data.coverage){
  validateSourceChange(row);
  assert.equal(row.series,row.path.split('/')[0],row.path+' coverage series');
  assert.equal(row.kind,kinds.get(row.path)||'index',row.path+' coverage kind');
 }
 for(const key of ['feedback','alignment','structure','inline'])exactRecords(data[key],c.papers.map(p=>p.path),key);
 exactRecords(data.figure_ledgers,c.series,'figure ledger series','series');
 for(const ledger of data.figure_ledgers)exactRecords(ledger.articles,c.sources.filter(p=>p.startsWith(ledger.series+'/')),'figure ledger '+ledger.series);
}
module.exports={corpus,exactRecords,classify,validateReview,validateSourceChange};
if(require.main===module){const c=corpus(process.argv[2]);if(process.argv.includes('--review'))validateReview(JSON.parse(fs.readFileSync(path.join(process.argv[2],'data/reading-review-data.json'),'utf8')),c);process.stdout.write(JSON.stringify(c));}
