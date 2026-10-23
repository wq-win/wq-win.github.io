(function(){
'use strict';
const E=window.SheepTriple,$=id=>document.getElementById(id);
if(!E){$('message').textContent='游戏资源未加载，请刷新重试。';return;}
const art=[
// All card art is drawn for this game: apple, carrot, leaf, flower, wheat, mushroom, pear, berry,
// pumpkin, corn, clover, egg, milk, wool, boot, watering can.
'<path d="M21 15c-8-7-16 0-13 10s10 13 16 8c6 5 13 0 15-8s-7-18-15-10" fill="#df685a"/><path d="M24 15V8m0 2q8-7 10-2-3 7-10 5" fill="#81a752"/>',
'<path d="m18 16 16 5-19 19q-4 2-3-3Z" fill="#e99b47"/><path d="M24 18 20 7m6 12 5-14m-3 14 10-7" fill="none" stroke="#70a360" stroke-width="4"/><path d="m18 25 5 2m-8 4 4 1" fill="none"/>',
'<path d="M11 33Q5 11 37 9q4 28-26 24Z" fill="#83aa69"/><path d="m10 38 20-21m-10 12-2-10m7 4 8 1" fill="none"/>',
'<g fill="#e9a4a9"><circle cx="24" cy="13" r="8"/><circle cx="35" cy="21" r="8"/><circle cx="31" cy="34" r="8"/><circle cx="17" cy="34" r="8"/><circle cx="12" cy="21" r="8"/></g><circle cx="24" cy="24" r="7" fill="#e8c058"/>',
'<path d="M24 40V9" fill="none"/><g fill="#dfbb5e"><ellipse cx="18" cy="14" rx="4" ry="7" transform="rotate(-38 18 14)"/><ellipse cx="30" cy="18" rx="4" ry="7" transform="rotate(38 30 18)"/><ellipse cx="18" cy="26" rx="4" ry="7" transform="rotate(-38 18 26)"/><ellipse cx="30" cy="30" rx="4" ry="7" transform="rotate(38 30 30)"/></g>',
'<path d="m19 23-2 16q7 5 14 0l-2-16" fill="#ecdfbf"/><path d="M6 25c0-23 36-23 36 0Z" fill="#bc7662"/><g fill="#fff4d8" stroke="none"><circle cx="16" cy="16" r="3"/><circle cx="29" cy="12" r="3"/><circle cx="34" cy="21" r="2"/></g>',
'<path d="M20 13h8c-1 11 13 15 9 23-4 10-27 8-27-3 0-8 11-12 10-20Z" fill="#c4cb63"/><path d="M24 14V7q6-3 10 0-3 6-10 4" fill="#6f9d65"/>',
'<g fill="#9290b3"><circle cx="17" cy="23" r="8"/><circle cx="29" cy="21" r="8"/><circle cx="25" cy="33" r="8"/></g><path d="M23 16Q9 14 14 7q11 0 9 9 8-14 13-7-1 9-13 7" fill="#80a26b"/>',
'<path d="M23 15 27 7" fill="none" stroke-width="4"/><ellipse cx="24" cy="28" rx="18" ry="14" fill="#dda05c"/><ellipse cx="24" cy="28" rx="9" ry="14" fill="#eab067"/>',
'<ellipse cx="25" cy="22" rx="10" ry="17" fill="#e7c666"/><path d="M24 39Q7 35 8 17q13 4 16 22 3-19 16-21-2 17-16 21" fill="#90ae69"/><path d="M21 10v18m8-18v16m-12-9h16m-16 7h16" fill="none" opacity=".5"/>',
'<g fill="#7ea981"><path d="M24 24C5 23 5 5 17 8q9 2 7 16Z"/><path d="M24 24C23 5 41 5 40 17q-2 9-16 7Z"/><path d="M24 24C43 23 43 41 31 40q-9-2-7-16Z"/><path d="M24 24C25 43 7 43 8 31q2-9 16-7Z"/></g><path d="m24 24 13 16" fill="none"/>',
'<path d="M24 6C15 6 7 26 11 35s22 9 26 0S33 6 24 6Z" fill="#f1e4c4"/><path d="M16 25q0-8 5-12" fill="none" stroke="#fffaf0" stroke-width="4"/>',
'<path d="M19 7h10v9l6 7v18H13V23l6-7Z" fill="#e7eee7"/><path d="M18 7h12v7H18Z" fill="#8eb2b4"/><path d="M13 26h22v10H13Z" fill="#9fc1be"/><path d="M24 28c-7 7-2 9 0 9s7-2 0-9" fill="#f8f4e6"/>',
'<g fill="#e8dcc3"><circle cx="24" cy="12" r="8"/><circle cx="14" cy="21" r="9"/><circle cx="34" cy="21" r="9"/><circle cx="17" cy="33" r="9"/><circle cx="31" cy="33" r="9"/></g><path d="M15 22q8-9 18 0M16 29q8-9 17 0" fill="none" stroke="#bbad8e"/>',
'<path d="M15 8h16v21l8 4v8H10V28h5Z" fill="#bd9275"/><path d="M14 9h18v6H14ZM10 37h29v5H10Z" fill="#96745e"/><path d="M20 21h8m-8 5h8" fill="none"/>',
'<path d="M14 18h20v21H14Zm20 5 9-6 1 5-10 11" fill="#8cb8b1"/><path d="M14 20C0 12 1 36 14 32m7-14V9h10v9" fill="none" stroke-width="4"/><path d="m40 12 5 8" fill="none" stroke-width="4"/>'
];
function icon(type){return '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="#5a6549" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+art[type%art.length]+'</svg>';}
const music=window.SheepTripleAudio?.create({onChange:updateMusic});
function updateMusic(s){
 $('music-toggle').setAttribute('aria-pressed',String(s.enabled));
 $('music-toggle').textContent=s.enabled?'♫ 关闭音乐':'♫ 开启音乐';
 $('music-toggle').disabled=!s.supported;
 $('music-volume').disabled=!s.supported;
 $('music-status').textContent=({off:'原创牧场循环 · 点击开启',starting:'音乐启动中…',playing:'原创牧场循环 · 正在播放',paused:'已暂停 · 返回页面继续',unavailable:'当前浏览器不支持音乐',error:'音乐未能播放，请点击重试',destroyed:'音乐已停止'})[s.status]||'';
}
if(music){updateMusic(music.getState());$('music-toggle').addEventListener('click',()=>music.toggle());$('music-volume').addEventListener('input',()=>music.setVolume(Number($('music-volume').value)/100));}
else{$('music-toggle').disabled=true;$('music-volume').disabled=true;$('music-status').textContent='音乐资源未加载，仍可继续游戏';}
let state=E.create(0),busy=false;
function tileById(id){return state.tiles.find(t=>t.id===id);}
function name(t){return E.TYPES[t.type]?.name||('图案 '+(t.type+1));}
function message(text){$('message').textContent=text;}
function resize(){
 const field=document.querySelector('.field'),board=$('board');
 const scale=Math.max(.1,Math.min((field.clientWidth-20)/360,(field.clientHeight-20)/375));
 board.style.transform='scale('+scale+')';
 board.style.left=((field.clientWidth-360*scale)/2)+'px';
 board.style.top=((field.clientHeight-375*scale)/2)+'px';
}
function render(){
 const gone=new Set(state.removed),available=new Set(E.available(state));
 $('board').replaceChildren();
 state.tiles.forEach(t=>{if(gone.has(t.id))return;const b=document.createElement('button');b.type='button';b.className='tile '+(available.has(t.id)?'available':'covered');b.style.left=t.x+'px';b.style.top=t.y+'px';b.style.zIndex=t.z+1;b.dataset.id=t.id;b.disabled=!available.has(t.id)||state.status!=='playing';b.setAttribute('aria-label',name(t)+'，卡牌 '+(t.id+1)+(available.has(t.id)?'，可选':'，被遮挡'));b.innerHTML=icon(t.type);b.addEventListener('click',()=>pick(t.id));$('board').append(b);});
 $('rack').replaceChildren();for(let i=0;i<7;i++){const div=document.createElement('div'),t=tileById(state.rack[i]);div.className='slot'+(t?' filled':'');if(t){div.innerHTML=icon(t.type);div.setAttribute('aria-label',name(t));}else div.setAttribute('aria-label','空槽 '+(i+1));$('rack').append(div);} $('rack').classList.toggle('danger',state.rack.length>=5);$('rack-count').textContent=state.rack.length+' / 7';
 $('holding').replaceChildren();for(let i=0;i<3;i++){const t=tileById(state.holding[i]),b=document.createElement(t?'button':'span');b.className='slot'+(t?' filled':'');if(t){b.innerHTML=icon(t.type);b.setAttribute('aria-label','放回 '+name(t));b.disabled=state.status!=='playing';b.addEventListener('click',()=>pick(t.id));} $('holding').append(b);}
 const level=state.level;$('level-name').textContent='第 '+(level+1)+' 关';$('remaining').textContent=(state.tiles.length-state.matched)+' 张待消除';$('allowance').textContent='每种道具各 '+(5-level)+' 次';
 document.querySelectorAll('.level').forEach((b,i)=>{if(i===level)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 for(const tool of ['remove','undo','shuffle']){$('count-'+tool).textContent=state.counts[tool];$('tool-'+tool).disabled=state.counts[tool]<=0||state.status==='won'||(tool==='remove'&&(state.rack.length===0||state.holding.length>0))||(tool==='undo'&&state.history.length===0)||(tool==='shuffle'&&state.status==='lost');}
 $('result').hidden=state.status==='playing';if(state.status==='won'){$('result-title').textContent=level===4?'五关挑战完成':'牧场清空了！';$('result-text').textContent=level===4?'从五次帮助到最后一次，你完成了这场层叠挑战。':'下一关会生成新牌局，每种道具再减少一次。';$('next').hidden=level===4;message('全部卡牌已消除。');}else if(state.status==='lost'){$('result-title').textContent='收集槽装满了';$('result-text').textContent='试试可用的移出或撤回道具，或者重新开始调整顺序。';$('next').hidden=true;message('槽满了，仍可尝试移出或撤回。');}
 resize();
}
function pick(id){if(busy)return;busy=true;const before=state.matched;if(E.take(state,id)){render();if(state.status==='playing')message(state.matched>before?'三张配成一组，继续向下探索。':state.rack.length>=5?'收集槽快满了，留意已有的图案。':'找到同样的图案，再放入收集槽。');}busy=false;}
function use(tool){if(busy)return;busy=true;if(E.tool(state,tool)){render();if(state.status==='playing')message(state.message||{remove:'已移入暂存区，点选卡牌可放回。',undo:'已撤回一步，换个顺序试试。',shuffle:'剩余卡牌已重新排列。'}[tool]);}else message(state.message||'现在不能使用这个道具。');busy=false;}
function start(level){state=E.create(level,undefined,state.layout);render();message('先看看哪些卡牌没有被压住。');}
for(let i=0;i<5;i++){const b=document.createElement('button');b.className='level';b.innerHTML='<strong>0'+(i+1)+'</strong><small>道具各 '+(5-i)+' 次</small>';b.setAttribute('aria-label','第 '+(i+1)+' 关，每种道具 '+(5-i)+' 次');b.addEventListener('click',()=>start(i));$('levels').append(b);}
for(const t of ['remove','undo','shuffle'])$('tool-'+t).addEventListener('click',()=>use(t));
$('restart').addEventListener('click',()=>start(state.level));$('next').addEventListener('click',()=>start(Math.min(4,state.level+1)));$('help').addEventListener('click',()=>{if(!$('help-dialog').open)$('help-dialog').showModal();});for(const id of ['close-help','understood'])$(id).addEventListener('click',()=>$('help-dialog').close());window.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(document.querySelector('.field'));render();
})();
