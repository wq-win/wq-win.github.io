// Focused DOM/render-command regressions; real-browser QA is still required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Window } from 'happy-dom';
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const create = (url = 'https://mylog.test/') => new Window({url, settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const scripts = html => [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);

// PPO must not turn “回 + 合法” into Episode, or fall back to an outdated menu.
{
 const w=create('https://mylog.test/rl/27-ppo.html'),d=w.document;
 d.write(read('rl/27-ppo.html').replace(/<script[\s\S]*?<\/script>/g,''));
 w.eval(read('js/glossary-data.js'));
 w.eval(read('js/reading-guide.js'));
 const body=d.getElementById('article-body'),before=body.textContent;
 const state=w.ReadingGuide.mount({container:body,series:'rl',slug:'27-ppo',root:'../'});
 const answer=[...body.querySelectorAll('p')].find(p=>p.textContent.includes('投影回合法区间'));
 check(Boolean(answer),'PPO regression uses the actual self-test answer');
 check(!answer.querySelector('[data-term="episode"]'),'projection back to the feasible interval is not Episode');
 check(body.textContent===before,'PPO article text stays unchanged');
 state.destroy();
 body.innerHTML='<p>投影回合法区间，跳回合法位置。每回合的奖励，一个回合结束后，回合并没有结束。Episode episode episodex。</p>';
 const fixture=body.textContent;
 w.ReadingGuide.mount({container:body,series:'rl',slug:'27-ppo',root:'../'});
 check(JSON.stringify([...body.querySelectorAll('[data-term="episode"]')].map(b=>b.textContent))===JSON.stringify(['回合','回合','回合','Episode','episode']),'legitimate Chinese and English Episode mentions remain clickable');
 check(body.textContent===fixture,'matching never rewrites text');
 await w.happyDOM.close();
}
{
 const menus=[];
 for(const file of ['index.html','rl/27-ppo.html']) {
  const w=create('https://mylog.test/'+file),d=w.document,html=read(file);
  d.write('<div id="site-header"></div><div id="site-footer"></div>');
  // Follow the page's real config/chrome loading order rather than inject a config.
  for(const [,src] of html.matchAll(/<script\s+src="([^"]+)"[^>]*><\/script>/g)) {
   if(/(?:site-config|site-chrome)\.js$/.test(src)) w.eval(read(src.replace(/^\.\.\//,'')));
  }
  w.SeriesChrome.mount({root:file.startsWith('rl/')?'../':'/'});
  const menu=[...d.querySelectorAll('header button')].find(b=>b.textContent.trim()==='演示').parentElement;
  const links=[...menu.querySelectorAll('a')].map(a=>[new URL(a.href).pathname,a.textContent.trim()]);
  menus.push(links);
  for(const target of ['/game/rl/ppo.html','/game/llm/kv-cache.html','/game/yarn.html','/game/function-visualizer.html']) {
   check(links.some(([href])=>href===target),file+' demo menu includes '+target);
   check(Boolean(d.querySelector('#mobile-menu a[href="'+(file.startsWith('rl/')?'../':'/')+target.slice(1)+'"]')),file+' mobile menu includes '+target);
  }
  await w.happyDOM.close();
 }
 check(JSON.stringify(menus[0])===JSON.stringify(menus[1]),'PPO and homepage use the same demo menu labels and destinations');
}

// Keep the original filter nodes so keyboard activation retains focus and tab order.
for (const series of ['robot-classic', 'rl', 'llm', 'robot-learn']) {
 const w=create(), d=w.document;
 d.write(read(`${series}/index.html`).replace(/<script[\s\S]*?<\/script>/g,''));
 w.eval(read(`${series}/js/catalog.js`));
 w.eval(read('js/series-hub.js'));
 w.eval(scripts(read(`${series}/index.html`)).find(s=>s.includes('SeriesHub.init')));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const buttons=[...d.querySelectorAll('[data-era]')];
 check(buttons[0].getAttribute('aria-pressed')==='true', `${series} initial selection`);
 for(const button of [buttons[1], buttons[2], buttons[1], buttons[0]]) {
  button.focus(); button.click();
  check(d.activeElement===button, `${series} activation preserves focused node`);
  check(button.getAttribute('aria-pressed')==='true', `${series} selected state`);
  check(buttons.filter(b=>b.getAttribute('aria-pressed')==='true').length===1, `${series} exclusive selected state`);
  check(button.nextElementSibling===buttons[buttons.indexOf(button)+1], `${series} tab sequence unchanged`);
  if(series==='robot-classic' && button.dataset.era==='几何') check(d.querySelector('#series-count').textContent.includes('6 篇'), 'geometry displays six papers');
 }
 await w.happyDOM.close();
}

// Number intent is confined to the active series catalog. Real reader
// decorations must survive a filter redraw without changing the stored progress.
for (const series of ['rl', 'llm', 'robot-classic', 'robot-learn']) {
 const w=create('https://mylog.test/'+series+'/index.html'), d=w.document, html=read(series+'/index.html');
 d.write(html.replace(/<script[\s\S]*?<\/script>/g,''));
 w.eval(read(series+'/js/catalog.js'));
 const posts=w.RL_POSTS||w.SERIES_POSTS;
 const paper=post=>!post.kind ? !/reading-guide|timeline|epilogue/.test(post.slug) : post.kind==='paper';
 const byDay=day=>posts.find(post=>paper(post)&&Number(post.day)===day);
 const progress=JSON.stringify({[series+':'+byDay(61).slug]:1234});
 w.localStorage.setItem('mylog-progress-v1',progress);
 w.eval(read('js/reader.js'));
 w.eval(read('js/series-hub.js'));
 w.eval(scripts(html).find(s=>s.includes('SeriesHub.init')));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const input=d.querySelector('#series-search, #rl-search');
 const root=d.querySelector('#series-catalog, #rl-catalog');
 const count=d.querySelector('#series-count, #rl-count');
 const buttons=[...d.querySelectorAll('[data-era]')];
 const target=day=>byDay(day).slug+'.html';
 const hits=()=>[...root.querySelectorAll('a.article-card')].map(a=>a.getAttribute('href'));
 const search=value=>{input.value=value;input.dispatchEvent(new w.Event('input'));};
 for(const day of [1,60,61,62,100]) {
  const padded=String(day).padStart(3,'0');
  const full=padded.replace(/\d/g,digit=>String.fromCharCode(0xFF10+Number(digit)));
  for(const query of [String(day),'第'+day+'篇','第 '+padded+' 篇','Day '+day,'第'+full+'天']) {
   search(query);
   assert.deepEqual(hits(),[target(day)],series+' '+query);
   check(count.textContent==='显示 1 篇论文精读', series+' '+query+' count');
   if(day===61) check(root.querySelector('.read-badge')?.textContent==='已读',series+' badge remains');
  }
 }
 const exact=buttons.find(b=>b.dataset.era===byDay(61).eraId);
 const other=buttons.find(b=>b.dataset.era!=='all'&&b!==exact);
 other.focus();other.click();search('第61篇');
 assert.deepEqual(hits(),[],series+' does not fall back to unrelated text within another era');
 check(other.getAttribute('aria-pressed')==='true'&&d.activeElement===other,series+' incompatible era remains selected');
 exact.click();assert.deepEqual(hits(),[target(61)]);
 buttons[0].click();
 for(const query of ['Day 0','0','101','第999篇','2024','Vanilla 61','PPO','学习',' ','']) {
  search(query);
  const expected=Array.from(posts).filter(post=>!query.trim()||[post.title,post.cardTitle,post.shortTitle,post.question,String(post.year||''),post.excerpt,post.eraLabel]
   .join(' ').toLowerCase().includes(query.toLowerCase())).map(post=>post.slug+'.html').sort();
  assert.deepEqual(hits().sort(),expected,series+' unchanged text query '+query);
 }
 check(w.localStorage.getItem('mylog-progress-v1')===progress,series+' filtering never writes badges');
 await w.happyDOM.close();
}

// Glossary uses canonical term as well as visible Chinese/English text.
for(const q of ['RoPE','rope','旋转位置编码','Rotary Position Embedding']) {
 const w=create('https://mylog.test/glossary.html?q='+encodeURIComponent(q)),d=w.document;
 d.write(read('glossary.html').replace(/<script[\s\S]*?<\/script>/g,''));
 w.eval(read('js/reading-reference.js'));
 check(!d.getElementById('rope').hidden, `${q} finds RoPE`);
 check(d.getElementById('reference-count').textContent==='找到 1 项', `${q} returns one term`);
 const input=d.getElementById('glossary-filter'); input.value='no-such-term-xyz';input.dispatchEvent(new w.Event('input'));
 check(!d.getElementById('reference-empty').hidden, 'empty result');
 input.value=q;input.dispatchEvent(new w.Event('input'));
 check(!d.getElementById('rope').hidden,'search again restores match');
 await w.happyDOM.close();
}

// Resolve the actual layered CSS and check WCAG text contrast in both themes.
for(const dark of [false,true]) {
 const w=create(), d=w.document;
 d.documentElement.classList.toggle('dark',dark);
 d.write(`<style>${read('css/style.css')}\n${read('css/reading-guide.css')}</style><div class="rg-layout"><div id="article-nav"><a class="rl-nav-chip">系列目录</a><button class="rl-nav-chip">标为已读</button><button class="rl-nav-chip is-read">已读</button></div></div>`);
 const luminance=color=>(color.startsWith('#') ? color.slice(1).match(/../g).map(v=>parseInt(v,16)) : color.match(/[\d.]+/g).slice(0,3).map(Number)).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 for(const chip of d.querySelectorAll('.rl-nav-chip')) {
   const style=w.getComputedStyle(chip),a=luminance(style.color),b=luminance(style.backgroundColor);
   const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   check(ratio>=4.5,`${dark?'dark':'light'} ${chip.textContent} contrast ${ratio.toFixed(2)}`);
  }
 await w.happyDOM.close();
}

// Record matrix drawing commands, including every supported token count and re-computation.
{
 const w=create(),d=w.document,rects=[];
 d.write(read('game/llm/attention.html').replace(/<script[\s\S]*?<\/script>/g,''));
 const ctx=new Proxy({}, {get:(_,key)=>key==='fillRect'?((...args)=>rects.push(args)):(()=>{}),set:()=>true});
 let height;
 w.SeriesChrome={mount(){}};
 w.DemoKit={setupCanvas(_c,_w,h){height=h;return {ctx};},drawPanel(){rects.length=0;},rangeValue(){return 1;},roundRect(){},viridis(){return '#fff';},pointer(){return {x:818,y:70};}};
 w.eval(scripts(read('game/llm/attention.html')).find(s=>s.includes('function compute')));
 for(const n of [1,9,10,11,12,3,12]) {
  d.getElementById('sentence').value=Array.from({length:n},(_,i)=>'t'+i).join(' ');
  d.getElementById('run').click();
  check(rects.length===n*n,`${n} tokens draw full matrix`);
  check(rects.every(([x,y,width,h])=>y>=0&&y+h<=height-20),`${n} tokens fit vertically with padding`);
  d.getElementById('causal').checked=true;d.getElementById('causal').dispatchEvent(new w.Event('change'));
  check(rects.length===n*n && rects.every(([,y,,h])=>y+h<=height-20),`${n} causal recomputation fits`);
 }
 d.getElementById('c').click();
 check(d.getElementById('explain').textContent.includes('查询「t11」'), 'last token remains selectable');
 d.getElementById('temp').dispatchEvent(new w.Event('input'));
 check(rects.length===144 && rects.every(([,y,,h])=>y+h<=height-20), 'temperature redraw retains full 12-token matrix');
 await w.happyDOM.close();
}
// Optional diagram failure must not remove site chrome or typed article links.
for (const kind of ['offline','missing','throw','reject','silent','ready','dark']) {
 const w=create('https://mylog.test/map.html'),d=w.document,html=read('map.html');
 d.write(html.replace(/<script[\s\S]*?<\/script>/g,''));
 const graph=d.getElementById('concept-graph'), text=d.getElementById('concept-links');
 let mounted=0, theme;
 w.SeriesChrome={mount(){mounted++;}};
 if(kind==='dark')d.documentElement.classList.add('dark');
 if(kind!=='missing')w.mermaid={
  initialize(options){theme=options.theme;if(kind==='throw')throw Error('mermaid unavailable');},
  async run({nodes}){if(kind==='reject')throw Error('render failure');if(kind!=='silent')nodes[0].innerHTML='<svg></svg>';}
 };
 w.eval(scripts(html).find(s=>s.includes('function graphUnavailable')));
 check(mounted===1 && graph.hidden,'site navigation mounts before fetching diagram');
 const alternate=[...text.querySelectorAll('a')].map(a=>a.getAttribute('href')).sort();
 check(JSON.stringify(alternate)===JSON.stringify([...html.matchAll(/click [A-Z]+ "([^"]+)"/g)].map(m=>m[1]).sort()),'ordinary link for every clickable node');
 check(d.querySelectorAll('section[aria-label="对照阅读与演示"] a').length===10,'both reading tracks plus four demos');
 d.querySelector('script[src*="mermaid"]').dispatchEvent(new w.Event(kind==='offline'?'error':'load'));
 await new Promise(resolve => setImmediate(resolve));
 if(kind==='ready'||kind==='dark'){
  check(!graph.hidden && graph.style.visibility==='' && graph.querySelector('svg'),'optional diagram renders on success');
  check(theme===(kind==='dark'?'dark':'neutral'),'diagram inherits launch theme');
 }else check(graph.hidden && text.open && !d.getElementById('concept-graph-unavailable').hidden,'diagram error exposes ordinary links: '+kind);
 await w.happyDOM.close();
}
console.log(`${checks} confirmed UX regression checks passed (DOM and drawing commands, not browser visual QA).`);
