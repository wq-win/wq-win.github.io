#!/usr/bin/env node
/* Idempotent Day0 catalog/entry wiring. Canonical paper entries are unchanged. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const root=path.resolve(__dirname,'..');
const names={rl:'强化学习',llm:'大语言模型','robot-learn':'机器人学习','robot-classic':'机器人经典'};
for(const [series,label] of Object.entries(names)){
 const file=path.join(root,series,'js/catalog.js'),w={};vm.runInNewContext(fs.readFileSync(file,'utf8'),{window:w});const pname=series==='rl'?'RL_POSTS':'SERIES_POSTS',mname=series==='rl'?'RL_SLUG_MAP':'SERIES_SLUG_MAP';
 const guide=fs.readFileSync(path.join(root,series,'posts/00-reading-guide.md'),'utf8'),title=guide.match(/^# (.+)$/m)[1];
 const post={slug:'00-reading-guide',file:'00-reading-guide.md',title,cardTitle:'Day 0 · 入门导读',day:0,year:null,kind:'guide',question:'先弄清概念的作用、联系和符号约定，再沿时间线读论文。',excerpt:`${label}的入门准备：核心概念、中英文术语、贯穿例子和容易混淆的区别。`,eraId:'overview',eraYears:'',eraLabel:'入门导读'};
 w[pname]=[post,...w[pname].filter(x=>x.slug!==post.slug)];w[mname]['00-reading-guide.md']='00-reading-guide';
 fs.writeFileSync(file,`window.${pname} = ${JSON.stringify(w[pname],null,2)};\nwindow.${mname} = ${JSON.stringify(w[mname],null,2)};\n`);
 const hub=path.join(root,series,'index.html');let html=fs.readFileSync(hub,'utf8');
 const entry=`<nav id="series-reading-entry" aria-label="建议阅读顺序" style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px"><a href="00-reading-guide.html" class="rl-nav-chip">① 入门导读 Day 0</a><a href="00-timeline.html" class="rl-nav-chip">② 发展时间线</a><a href="../glossary.html?series=${series}" class="rl-nav-chip">术语与符号速查 ↗</a></nav>`;
 if(html.includes('id="series-reading-entry"'))html=html.replace(/<nav id="series-reading-entry"[\s\S]*?<\/nav>/,()=>entry);
 else html=html.replace(/(<div class="flex flex-wrap gap-3">)/,()=>entry+'\n            <div class="flex flex-wrap gap-3">');
 if(!html.includes('id="series-reading-entry"')){
  html=html.replace(/(<a href="00-timeline.html"[^>]*>)/,(match)=>entry+'\n            '+match);
 }
 if(!html.includes('id="series-reading-entry"'))throw Error('No hub insertion slot '+series);
 if(series==='rl'&&!html.includes('<li><strong>五个前置概念</strong>'))html=html.replace('<li><strong>背景与问题定义</strong>','<li><strong>五个前置概念</strong>：先掌握本文需要的概念，正文里的术语与符号可随时速查。</li>\n                <li><strong>背景与问题定义</strong>').replace('自构例子、前置概念、后续问题','自构例子、后续问题');
 fs.writeFileSync(hub,html);
}
