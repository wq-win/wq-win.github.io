(function(){
'use strict';
const E=window.ScrewPuzzle,$=id=>document.getElementById(id),colors=['var(--red)','var(--blue)','var(--yellow)','var(--green)','var(--purple)'],symbols=['○','△','□','◇','✚'];
const KEY='pine-screw-progress-v1';let completed=[],index=0,busy=false,timer=0,token=0;
const levelOrder=[0,1,3,4,2,5,7,8,6,9,11,12,10,13,14,15];
function decodeProgress(raw){
 let saved;
 try{saved=JSON.parse(raw);}catch(_){}
 if(!saved||typeof saved!=='object'||Array.isArray(saved))return {index:0,completed:[]};
 const valid=n=>Number.isInteger(n)&&n>=0&&n<levelOrder.length;
 const order=n=>!saved.version||saved.version<2?levelOrder.indexOf(n):n;
 return {index:order(valid(saved.index)?saved.index:0),completed:Array.isArray(saved.completed)?[...new Set(saved.completed.filter(valid).map(order))]:[]};
}
let initialReadable=true, saveIssue='';
function initialRead(key){try{return localStorage.getItem(key);}catch(_){initialReadable=false;return null;}}
({completed,index}=decodeProgress(initialRead(KEY)));
let state=E.create(index),history=[];const sound=window.WorkshopFeedback?window.WorkshopFeedback($('sound')):{play(){}};
try{const run=JSON.parse(initialRead(KEY+'-run'));if(run&&run.version===3&&run.index===index&&Array.isArray(run.moves)&&run.moves.length<=30){const candidate=E.create(index);if(run.moves.every(id=>E.take(candidate,id))){state=candidate;history=run.moves.slice();}}}catch(_){}
function noteClear(){if(state.status==='won'&&!completed.includes(state.index))completed.push(state.index);}
noteClear(); // Recover a badge from a verified winning replay without writing during boot.
function save(){
 if(!initialReadable)return false;
 try{
  const durable=decodeProgress(localStorage.getItem(KEY));
  completed=[...new Set([...durable.completed,...completed])];
  localStorage.setItem(KEY,JSON.stringify({version:3,completed,index:state.index}));
  localStorage.setItem(KEY+'-run',JSON.stringify({version:3,index:state.index,moves:history}));
  saveIssue='';return true;
 }catch(_){saveIssue='本次进度未能完整保存。';return false;}
}
function element(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function head(c){const h=element('span','head');h.append(element('span','screw-symbol',symbols[c]));h.style.setProperty('--color',colors[c]);h.setAttribute('aria-hidden','true');return h;}
function render(){const notice=$('save-warning');
const warning=initialReadable?saveIssue:'旧存档暂时无法读取。本页可继续玩，但不会保存；刷新可重试读取，未保存的操作会丢失。';
if(notice.textContent!==warning)notice.textContent=warning;notice.hidden=!warning;
$('undo').disabled=!history.length||busy;
const level=E.levels[state.index];$('level-label').textContent=String(state.index+1).padStart(2,'0')+' / '+level.name;$('removed').textContent=String(state.moves);$('total').textContent=String(level.plates.length*3);$('level').value=String(state.index);$('progress').textContent='已完成 '+completed.length+' / 16';
const board=$('plates');board.replaceChildren();for(let lane=0;lane<3;lane++){
 const wrap=element('div','lane lane-'+lane);const remain=level.plates.filter(p=>p.lane===lane&&!E.plateGone(state,p));
 if(!remain.length){wrap.append(element('div','empty-lane','木板已收好'));board.append(wrap);continue;}
 const top=remain[0];remain.slice().reverse().forEach(p=>{const depth=remain.indexOf(p);const panel=element('div','plate'+(p.id%2?' metal':'')+(depth?' lower':''));panel.dataset.plate=String(p.id);panel.style.setProperty('--tilt',((p.id%3)-1)*1.7+'deg');panel.style.setProperty('--depth',String(depth));const left=E.removed(state,p.id*3),right=E.removed(state,p.id*3+2);panel.style.setProperty('--support-lean',depth?'0deg':left&&!right?'3deg':right&&!left?'-3deg':'0deg');panel.style.zIndex=String(5-depth);if(depth){panel.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)panel.append(element('span','ghost-head'));}else p.colors.forEach((c,i)=>{const id=p.id*3+i;if(E.removed(state,id)){panel.append(element('span','hole'));return;}const b=element('button','screw');b.type='button';b.dataset.screw=String(id);b.setAttribute('aria-label',E.COLORS[c]+symbols[c]+'螺丝，第'+(lane+1)+'排，第'+(i+1)+'枚');b.disabled=busy||state.status!=='playing';b.append(head(c));b.addEventListener('click',()=>pick(id,b));panel.append(b);});wrap.append(panel);});
 if(remain.length>1){const preview=element('div','preview');preview.append(element('span','','下层'));remain.slice(1).forEach((p,n)=>{if(n)preview.append(element('span','','›'));const group=element('span','preview-group');group.append(element('span','sr-only','第'+(lane+1)+'排下方第'+(n+1)+'层：'+p.colors.map(c=>E.COLORS[c]).join('、')));p.colors.forEach(c=>{const d=element('span','preview-dot',symbols[c]);d.style.setProperty('--color',colors[c]);d.setAttribute('aria-hidden','true');group.append(d);});preview.append(group);});wrap.append(preview);}board.append(wrap);
}
$('tray').replaceChildren();for(let i=0;i<5;i++){const slot=element('div','slot');if(state.rack[i]!==undefined)slot.append(head(state.rack[i]));$('tray').append(slot);}
const trayColors=state.rack.map(c=>E.COLORS[c]).join('、')||'空';
$('tray').append(element('span','sr-only','托盘：'+trayColors+'；剩余'+(5-state.rack.length)+'个空格。'));
$('tray-count').textContent=state.rack.length+' / 5';$('tray').classList.toggle('danger',state.rack.length>=4);
$('result').hidden=state.status==='playing';if(state.status!=='playing'){const won=state.status==='won';$('result-icon').textContent=won?'✧':'↶';$('result-title').textContent=won?'木落，心也轻了':'托盘有点挤';$('result-copy').textContent=won?(state.index===15?'最后一件也解开了。可以回去重温喜欢的关卡。':'这一件收好了。继续拆下一件吧。'):'五格已满。先凑齐同色，再为下层留出空位。';$('result-action').textContent=won&&state.index<15?'下一件木作 →':'重新拆这一关';}
}
function pick(id,button){if(busy||state.status!=='playing')return;busy=true;$('undo').disabled=true;const myToken=token;button.classList.add('unscrewing');document.querySelectorAll('.screw').forEach(b=>b.disabled=true);const motion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
timer=setTimeout(()=>{if(myToken!==token)return;const panel=button.closest('.plate'),ghost=panel.cloneNode(true),lane=panel.parentNode.className;ghost.querySelectorAll('button').forEach(b=>b.remove());const result=E.take(state,id);busy=false;if(!result){render();return;}history.push(id);sound.play(state.status==='won'?'win':result.matched?'match':result.fallen?'fall':'take');noteClear();const saved=save();
render();if(result.fallen&&!motion){const holder=element('div',lane);holder.style.pointerEvents='none';holder.setAttribute('aria-hidden','true');ghost.classList.add('falling');holder.append(ghost);$('plates').append(holder);setTimeout(()=>holder.remove(),500);}
if(result.matched){$('tray').classList.remove('match');void $('tray').offsetWidth;$('tray').classList.add('match');}
$('status').textContent=state.status==='won'?(saved?'这一关已完成，进度已保存在此设备。':'这一关已完成，但进度未能完整保存。'):state.status==='lost'?'托盘已满，换个拆解顺序再试一次。':result.matched?'三枚'+E.COLORS[result.color]+'归入工具盒。托盘又空出了一些。':result.fallen?'木板落下了，新的螺丝露出来了。':state.rack.length===4?'还剩最后一格，下一枚最好能凑齐三枚。':'收好一枚'+E.COLORS[result.color]+'。留意下层的颜色。';
const next=document.querySelector('.screw:not(:disabled)');if(state.status!=='playing')$('result-action').focus({preventScroll:true});else if(next)next.focus({preventScroll:true});
},motion?0:230);
}
function start(n){clearTimeout(timer);token++;busy=false;history=[];state=E.create(n);save();$('status').textContent='先看下层：拆哪块板，才能把同色接上？';render();}
$('undo').addEventListener('click',()=>{if(busy||!history.length)return;clearTimeout(timer);token++;history.pop();state=E.create(state.index);history.forEach(id=>E.take(state,id));save();render();$('status').textContent='已撤销一步，先为同色螺丝留出空位。';});
E.levels.forEach((l,i)=>{const o=element('option','',String(i+1).padStart(2,'0')+' · '+l.name);o.value=String(i);$('level').append(o);});const session=window.WorkshopSession&&window.WorkshopSession({rules:'① 点表层螺丝，收进五格托盘。\n② 三枚同色自动收走；拆空木板露出下层。\n③ 先看下层的颜色。失误后可撤销，不必重来。'});
function requestStart(n){if(session&&(history.length||busy)&&state.status==='playing'){$('level').value=String(state.index);session.confirm(()=>start(n));}else start(n);}
$('level').addEventListener('change',()=>requestStart(Number($('level').value)));$('restart').addEventListener('click',()=>requestStart(state.index));$('result-action').addEventListener('click',()=>start(state.status==='won'&&state.index<15?state.index+1:state.index));render();if(history.length&&state.status==='playing')$('status').textContent='已恢复上次拆解进度。';
})();
