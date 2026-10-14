#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++};
(async()=>{
 const domPath=process.env.HAPPY_DOM_PATH||path.join(root,'node_modules/happy-dom');
 const {Window}=await import(path.join(domPath,'lib/index.js'));
 const w=new Window({url:'https://preview.test/figure-review.html',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 const html=fs.readFileSync(path.join(root,'figure-review.html'),'utf8');w.document.write(html);
 const script=[...w.document.querySelectorAll('script')].filter(x=>!x.src).at(-1);w.eval(script.textContent);
 const d=w.document,cards=[...d.querySelectorAll('.card')],visible=()=>cards.filter(c=>!c.hidden);
 check(cards.length>100,'review is full corpus, not a small sample');
 check(visible().length===cards.length,'initial complete list');
 for(const series of ['rl','llm','robot-learn','robot-classic']){
  d.querySelector('#series').value=series;d.querySelector('#series').dispatchEvent(new w.Event('input'));
  check(visible().length>0&&visible().every(c=>c.dataset.series===series),'series filter '+series);
 }
 d.querySelector('#series').value='all';d.querySelector('#missing').value='yes';d.querySelector('#missing').dispatchEvent(new w.Event('input'));
 check(visible().length===cards.filter(c=>c.dataset.missing==='yes').length,'unresolved filter preserves genuine gaps');
 d.querySelector('#missing').value='all';d.querySelector('#query').value='Dyna';d.querySelector('#query').dispatchEvent(new w.Event('input'));
 check(visible().length>0&&visible().every(c=>c.textContent.toLowerCase().includes('dyna')),'text search');
 check(d.querySelector('#count').textContent.includes(String(visible().length)),'live count matches visible results');
 check(!d.querySelector('iframe'),'figures do not depend on a remote PDF iframe');
 const css=fs.readFileSync(path.join(root,'css/reading-guide.css'),'utf8');
 check(css.includes('max-width: 560px')&&css.includes('height: auto'),'images retain responsive fit');
 check(css.includes('[id]')&&css.includes('scroll-margin-top: var(--rg-anchor-offset)'),'figure anchors share measured header/toolbar offset');
 await w.happyDOM.close();console.log(checks+' figure-reference UI assertions passed (DOM simulation, not real-browser visual acceptance).');
})().catch(e=>{console.error(e);process.exit(1)});
