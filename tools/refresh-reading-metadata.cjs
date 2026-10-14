#!/usr/bin/env node
'use strict';
// Keep catalog titles and search excerpts in step with canonical revisions while
// retaining every URL, number, era, and curated research-question field.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const root=path.resolve(__dirname,'..');
const plain=s=>s.replace(/<[^>]+>/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[*_`$]/g,'').replace(/\s+/g,' ').trim();
for(const series of ['rl','llm','robot-learn','robot-classic']){
 const file=path.join(root,series,'js/catalog.js'),w={};vm.runInNewContext(fs.readFileSync(file,'utf8'),{window:w});const pn=series==='rl'?'RL_POSTS':'SERIES_POSTS',mn=series==='rl'?'RL_SLUG_MAP':'SERIES_SLUG_MAP';
 for(const post of w[pn]){
  const source=fs.readFileSync(path.join(root,series,'posts',post.file),'utf8').replaceAll('\r\n','\n');
  post.title=source.match(/^# (.+)$/m)?.[1]||post.title;
  if(post.day>0&&!post.slug.includes('epilogue'))post.cardTitle=post.title.replace(/^(?:第\s*\d+\s*天\s*[｜|·:：]|\d{2,3}\s*[｜|·:：])\s*/,'');
  const start=source.search(/^## /m),text=start>=0?source.slice(start):source;
  const first=text.split(/\n\s*\n/).find(b=>!/^\s*(?:#|\||```|\d+\.|[-*] )/.test(b)&&plain(b).length>=60);
  if(first)post.excerpt=plain(first).slice(0,220);
 }
 fs.writeFileSync(file,`window.${pn} = ${JSON.stringify(w[pn],null,2)};\nwindow.${mn} = ${JSON.stringify(w[mn],null,2)};\n`);
}
console.log('Refreshed all four catalogs without changing article identities.');
