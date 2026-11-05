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
console.log(`${checks} confirmed UX regression checks passed (DOM and drawing commands, not browser visual QA).`);
