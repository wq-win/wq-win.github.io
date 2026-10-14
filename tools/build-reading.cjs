#!/usr/bin/env node
/* Build committed progressive-enhancement HTML from canonical article sources.
 * Dependencies are versioned locally. Run: python3 tools/reading-source.py && node tools/build-reading.cjs
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const {marked}=require(path.join(root,'js/vendor/marked.js'));
const katex=require(path.join(root,'js/vendor/katex/katex.min.js'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/reading-prerequisites.json'),'utf8'));
const byKey=new Map(manifest.map(x=>[x.key,x]));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function move(text,m){
 if(!m)return text;
 // Python offsets count Unicode code points, not UTF-16 code units.
 const chars=Array.from(text);const before=chars.slice(0,m.start).join('');const after=chars.slice(m.end).join('');
 const moved=chars.slice(m.start,m.end).join('');if(moved!==m.moved)throw new Error(m.key+' source span mismatch');
 const prefix=chars.slice(0,m.insert).join('');
 const label=moved.startsWith('### ')?'':'### 五个前置概念\n\n';
 return prefix+label+moved+'\n\n'+before.slice(prefix.length)+after;
}
function mathTokens(text){
 const math=[],attributes=[];
 // Protect fenced code and inline code before handling TeX delimiters.
 const code=[];text=text.replace(/(^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\2[ \t]*(?:\n|$))|`[^`\n]+`|<(?:pre|code)\b[^>]*>[\s\S]*?<\/(?:pre|code)>/gim,s=>`CODEPROTECTED${code.push(s)-1}TOKEN`);
 // Attribute values are metadata, not prose TeX. Preserve them through both
 // math/emphasis parsing so an alt such as "$0.89\\pm0.06$" cannot inject a
 // rendered span into the quoted HTML attribute or corrupt the figure markup.
 text=text.replace(/<[A-Za-z][\w:-]*(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\/?>/g,tag=>tag.replace(/(["'])([\s\S]*?)\1/g,(whole,quote,value)=>quote+`READINGATTRTOKEN${attributes.push(value)-1}END`+quote));
 text=text.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g,(whole,a,b,c,d)=>{
  const tex=(a??b??c??d).trim(),display=a!==undefined||b!==undefined;
  let html;try{html=katex.renderToString(tex,{displayMode:display,throwOnError:true,output:'htmlAndMathml',strict:'ignore',macros:{'\\dddot':'\\overset{\\scriptscriptstyle\\cdots}{#1}'}});}catch(error){
   // Historical source errors are visible verbatim; never silently edit the mathematics.
   html=`<code class="reading-math-source" title="原文公式语法无法渲染，保留原式">${esc(whole)}</code>`;
  }
  math.push({tex,display,html,original:whole});return `READINGMATHTOKEN${math.length-1}END`;
 });
 text=text.replace(/CODEPROTECTED(\d+)TOKEN/g,(_,n)=>code[n]);return {text,math,attributes};
}
function normalizeStrong(text){
 // CommonMark's punctuation flanking rules leave **中文句子。**正文 literal.
 // These canonical notes use that form intentionally. Normalize only paired
 // prose markers, after math is stashed and while code remains protected.
 const protectedCode=[];
 let safe=text.replace(/(^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\2[ \t]*(?:\n|$))|`[^`\n]+`|<(?:pre|code)\b[^>]*>[\s\S]*?<\/(?:pre|code)>/gim,s=>`STRONGCODETOKEN${protectedCode.push(s)-1}END`);
 safe=safe.replace(/(?<![\\*])\*\*([^*\n]+?)\*\*(?!\*)/g,'<strong>$1</strong>');
 return safe.replace(/STRONGCODETOKEN(\d+)END/g,(_,n)=>protectedCode[n]);
}
function render(text,slugMap,series){
 // Marked parses emphasis inside inline HTML <code>; retain literal code islands.
 const htmlCode=[];text=text.replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi,s=>`READINGHTMLCODETOKEN${htmlCode.push(s)-1}END`);
 const linked=text.replace(/\]\(([^)\s]+?)\.md(#[^)\s]+)?\)/g,(_,file,fragment='')=>{
  // Resolve links in Markdown source space before translating to public URLs.
  // In particular, ../.. /other-series/posts links must not be flattened into
  // the current series, as they were in the original same-series-only renderer.
  if(/^(?:[a-z]+:|\/\/)/i.test(file))return `](${file}.md${fragment})`;
  const name=file.split('/').pop();let targetSeries=series;
  const cross=file.match(/(?:^|\/)(rl|llm|robot-learn|robot-classic)\/posts\//);
  if(cross)targetSeries=cross[1];
  const map=targetSeries&&targetSeries!==series?catalog(targetSeries).map:slugMap;
  const slug=name==='README'?'index':(map[name+'.md']||map[name]||name);
  const prefix=targetSeries&&series&&targetSeries!==series?'../'+targetSeries+'/':'';
  return `](${prefix}${slug}.html${fragment})`;
 });
 const {text:prepared,math,attributes}=mathTokens(linked);
 const renderer=new marked.Renderer();const code=renderer.code.bind(renderer);
 renderer.code=function(token,info,escaped){const is=typeof token==='object';const value=is?token.text:token,lang=is?token.lang:info;
  if(String(lang||'').trim()==='mermaid')return `<div class="mermaid">${esc(value)}</div>`;
  return code(token,info,escaped);
 };
 let html=marked.parse(normalizeStrong(prepared),{gfm:true,breaks:false,renderer}).replace(/READINGMATHTOKEN(\d+)END/g,(_,n)=>`<span class="reading-math" data-tex="${esc(math[n].tex)}">${math[n].html}</span>`);
 html=html.replace(/READINGATTRTOKEN(\d+)END/g,(_,n)=>attributes[n]);
 html=html.replace(/READINGHTMLCODETOKEN(\d+)END/g,(_,n)=>htmlCode[n]);
 const used={};html=html.replace(/<(h[23])>([\s\S]*?)<\/\1>/g,(_,tag,content)=>{
  const plain=content.replace(/<[^>]*>/g,'').replace(/&[^;]+;/g,'').trim();const base=plain.toLowerCase().replace(/\s+/g,'-').replace(/[^\w\u4e00-\u9fff-]/g,'')||'section';let id=base,n=1;while(used[id])id=base+'-'+(++n);used[id]=true;
  return `<${tag} id="${id}">${content}</${tag}>`;
 });
 html=html.replaceAll('<table>','<div class="reading-table-scroll" tabindex="0" role="region" aria-label="可横向滚动的数据表"><table>').replaceAll('</table>','</table></div>');
 return {html,math};
}
function catalog(series){const window={};vm.runInNewContext(fs.readFileSync(path.join(root,series,'js/catalog.js'),'utf8'),{window});return {posts:window.SERIES_POSTS||window.RL_POSTS,map:window.SERIES_SLUG_MAP||window.RL_SLUG_MAP};}
function inject(html,body,source,sourceHash){
 const bodyRE=/<div id="article-body"[^>]*>[\s\S]*?<\/div>\s*(?=<div id="article-pager")/;
 // Build marker makes replacement independent of nested body divs.
 if(html.includes('<!-- READING:START -->'))html=html.replace(/<!-- READING:START -->[\s\S]*?<!-- READING:END -->/,()=>`<!-- READING:START -->${body}<!-- READING:END -->`);
 else {if(!bodyRE.test(html))throw new Error('No article body slot');html=html.replace(bodyRE,()=>`<!-- READING:START -->${body}<!-- READING:END -->\n            `);}
 html=html.replace(/<textarea id="md-source"[^>]*>[\s\S]*?<\/textarea>/,()=>`<textarea id="md-source" hidden readonly>${esc(source)}</textarea>`);
 html=html.replace('https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js','../js/vendor/marked.js').replaceAll('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css','../js/vendor/katex/katex.min.css').replaceAll('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js','../js/vendor/katex/katex.min.js').replaceAll('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js','../js/vendor/katex/auto-render.min.js');
 html=html.replace('<script src="js/render.js"></script>','<script src="../js/md-render.js"></script>').replace('        mermaid.initialize(', '        if (window.mermaid) mermaid.initialize(');
 if(!html.includes('css/reading-guide.css'))html=html.replace('</head>','    <link id="reading-guide-style" rel="stylesheet" href="../css/reading-guide.css">\n</head>');
 html=html.replace('<link rel="stylesheet" href="../css/reading-guide.css">','<link id="reading-guide-style" rel="stylesheet" href="../css/reading-guide.css">');
 return html;
}
function build(){
 const report=[];
 for(const series of ['rl','llm','robot-learn','robot-classic']){
  const {posts,map}=catalog(series);
  for(const post of posts){
   const key=series+'/'+post.slug,m=byKey.get(key);
   const raw=fs.readFileSync(path.join(root,m?.source||series+'/posts/'+post.file));
   const sourceHash=hash(raw);if(m&&sourceHash!==m.sourceSha256)throw new Error(key+' canonical source changed');const source=raw.toString().replaceAll('\r\n','\n');
   const moved=move(source,m),{html:rendered,math}=render(moved,map,series);
   const body=`<div id="article-body" class="bg-white rounded-xl shadow-card p-6 md:p-10" data-static-reading="true" data-source-sha256="${sourceHash}">${rendered}</div>`;
   const file=path.join(root,key+'.html');
   const title=source.match(/^# (.+)$/m)?.[1]||post.title;
   const template=fs.readFileSync(file,'utf8').replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(title)} | MyLog</title>`).replace(/(<span class="text-gray-500">)[\s\S]*?(<\/span>)/,`$1${esc(post.cardTitle||title)}$2`);
   fs.writeFileSync(file,inject(template,body,source,sourceHash));
   report.push({key,kind:m?'paper':post.kind||'auxiliary',sourceSha256:sourceHash,mathExpressions:math.length,unrenderedMath:math.filter(x=>x.html.includes('reading-math-source')).map(x=>x.tex)});
  }
 }
 fs.writeFileSync(path.join(root,'data/reading-build-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`Built ${report.length} article and guide pages; rendered ${report.reduce((s,x)=>s+x.mathExpressions,0)} TeX expressions. Source render fallbacks: ${report.reduce((s,x)=>s+x.unrenderedMath.length,0)}.`);
}
module.exports={move,render,mathTokens,normalizeStrong,catalog,esc};if(require.main===module)build();
