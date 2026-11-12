'use strict';
const {classify}=require('./reading-corpus.cjs');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

// Paper order comes from the catalog, never the epilogue's historical filename.
function sourceNavigation(posts,post){
 const papers=posts.filter(p=>classify(p)==='paper');
 const i=papers.findIndex(p=>p.slug===post.slug);
 if(i<0)throw new Error('Not a paper: '+post.slug);
 const next=papers[i+1]||posts.find(p=>classify(p)==='epilogue');
 if(!next)throw new Error('Missing epilogue');
 return ['[系列首页](README.md)',...(i?[`[上一篇](${papers[i-1].file})`]:[]),`[${classify(next)==='epilogue'?'系列收尾':'下一篇'}](${next.file})`].join(' · ');
}

function syncSourceNavigation(source,posts,post){
 const bars=[...source.matchAll(/^\[系列首页\]\(README\.md\)(?: · \[[^\]]+\]\([^)]+\))+\s*$/gm)];
 if(bars.length!==2)throw new Error(post.slug+' requires exactly two article navigation bars');
 const line=sourceNavigation(posts,post);
 // Only isolated navigation bars change; contextual citations remain authored.
 return source.replace(/^\[系列首页\]\(README\.md\)(?: · \[[^\]]+\]\([^)]+\))+[ \t]*$/gm,line);
}

function staticPager(posts,post){
 const i=posts.findIndex(p=>p.slug===post.slug);
 if(i<0)throw new Error('Unknown article '+post.slug);
 const link=(p,next)=>p?`<a class="flex-1 bg-white rounded-lg shadow-card p-4 hover:shadow-card-hover${next?' text-right':''}" href="${esc(p.slug)}.html"><div class="text-xs text-gray-400 mb-1">${next?'下一篇':'上一篇'}</div><div class="font-medium text-gray-800">${esc(p.cardTitle||p.title||p.slug)}</div></a>`:'<div class="flex-1"></div>';
 return `<div id="article-pager" class="flex justify-between gap-4 mt-8" data-static-pager="true">${link(posts[i-1],false)}${link(posts[i+1],true)}</div>`;
}
module.exports={sourceNavigation,syncSourceNavigation,staticPager};
