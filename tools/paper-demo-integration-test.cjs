'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const demos=[['rl','dyna-q','03-dyna','game:rl-dyna',7],['llm','lora','047-lora','game:llm-lora',7],['robot-classic','prm','035-prm','game:classic-prm',9],['robot-learn','promp','008-promp','game:learn-promp',6]];
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/site-config.js'),'utf8'),ctx);vm.runInNewContext(fs.readFileSync(path.join(root,'js/related-data.js'),'utf8'),ctx);
const search=JSON.parse(fs.readFileSync(path.join(root,'data/search-index.json')));
for(const [cat,id,paper,searchid,count] of demos){
 const url=`game/${cat}/${id}.html`,file=path.join(root,url),html=fs.readFileSync(file,'utf8');
 assert(html.includes('viewport'),'responsive viewport');assert(html.includes(`../../${cat}/${paper}.html`),'paper link');
 assert(fs.readFileSync(path.join(root,`game/${cat}/index.html`),'utf8').includes(`href="${id}.html"`),'category entry');
 assert(ctx.window.SITE.demos.some(x=>x.href===url),'site navigation');
 assert.equal(ctx.window.SITE.demos.filter(x=>x.cat===cat).length,count,'category demo count');
 assert(search.some(x=>x.id===searchid&&x.url===url),'search index');
 assert(ctx.window.RELATED_PAPERS[`${cat}:${paper}`].some(x=>x.url===url),'article related demo');
 assert(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').includes(url),'sitemap');
 for(const m of html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)){
  const u=m[1];if(/^(https?:|data:|mailto:)/.test(u))continue;
  const dest=u.startsWith('/')?path.join(root,u):path.resolve(path.dirname(file),u.split('?')[0]);
  assert(fs.existsSync(dest),`broken local asset ${url}: ${u}`);
 }
}
assert.equal(ctx.window.SITE.demos.filter(x=>x.cat).length,29,'29 paper demos');
console.log('paper-demo integration: 4 pages, catalogs, article links, search, related maps, assets and 29 total PASS');
