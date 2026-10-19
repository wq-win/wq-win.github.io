(function(){
'use strict';
const E=window.ScrewPuzzle,$=id=>document.getElementById(id),colors=['var(--red)','var(--blue)','var(--yellow)','var(--green)','var(--purple)'],symbols=['○','△','□','◇','✚'];
const KEY='pine-screw-progress-v1';let completed=[],index=0,busy=false,timer=0,token=0;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');completed=Array.isArray(saved.completed)?[...new Set(saved.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<16))]:[];index=Number.isInteger(saved.index)&&saved.index>=0&&saved.index<16?saved.index:0;}catch(_){}
let state=E.create(index);
function save(){try{localStorage.setItem(KEY,JSON.stringify({completed,index:state.index}));}catch(_){}}
function element(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function head(c){const h=element('span','head');h.append(element('span','screw-symbol',symbols[c]));h.style.setProperty('--color',colors[c]);h.setAttribute('aria-hidden','true');return h;}
function render(){
const level=E.levels[state.index];$('level-label').textContent=String(state.index+1).padStart(2,'0')+' / '+level.name;$('removed').textContent=String(state.moves);$('total').textContent=String(level.plates.length*3);$('level').value=String(state.index);$('progress').textContent='已完成 '+completed.length+' / 16';
const board=$('plates');board.replaceChildren();for(let lane=0;lane<3;lane++){
 const wrap=element('div','lane lane-'+lane);const remain=level.plates.filter(p=>p.lane===lane&&!E.plateGone(state,p));
 if(!remain.length){wrap.append(element('div','empty-lane','木板已收好'));board.append(wrap);continue;}
 const top=remain[0];remain.slice().reverse().forEach(p=>{const depth=remain.indexOf(p);const panel=element('div','plate'+(p.id%2?' metal':'')+(depth?' lower':''));panel.dataset.plate=String(p.id);panel.style.setProperty('--tilt',((p.id%3)-1)*1.7+'deg');panel.style.setProperty('--depth',String(depth));panel.style.zIndex=String(5-depth);if(depth){panel.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)panel.append(element('span','ghost-head'));}else p.colors.forEach((c,i)=>{const id=p.id*3+i;if(E.removed(state,id)){panel.append(element('span','hole'));return;}const b=element('button','screw');b.type='button';b.dataset.screw=String(id);b.setAttribute('aria-label',E.COLORS[c]+symbols[c]+'螺丝，第'+(lane+1)+'排，第'+(i+1)+'枚');b.disabled=busy||state.status!=='playing';b.append(head(c));b.addEventListener('click',()=>pick(id,b));panel.append(b);});wrap.append(panel);});
 if(remain.length>1){const preview=element('div','preview');preview.append(element('span','','下层'));remain.slice(1).forEach((p,n)=>{if(n)preview.append(element('span','','›'));const group=element('span','preview-group');group.setAttribute('aria-label','下方第'+(n+1)+'层：'+p.colors.map(c=>E.COLORS[c]).join('、'));p.colors.forEach(c=>{const d=element('span','preview-dot',symbols[c]);d.style.setProperty('--color',colors[c]);d.setAttribute('aria-hidden','true');group.append(d);});preview.append(group);});wrap.append(preview);}board.append(wrap);
}
$('tray').replaceChildren();for(let i=0;i<5;i++){const slot=element('div','slot');if(state.rack[i]!==undefined){slot.append(head(state.rack[i]));slot.setAttribute('aria-label',E.COLORS[state.rack[i]]+'螺丝');}else slot.setAttribute('aria-label','空格');$('tray').append(slot);}$('tray-count').textContent=state.rack.length+' / 5';$('tray').classList.toggle('danger',state.rack.length>=4);
$('result').hidden=state.status==='playing';if(state.status!=='playing'){const won=state.status==='won';$('result-icon').textContent=won?'✧':'↶';$('result-title').textContent=won?'木落，心也轻了':'托盘有点挤';$('result-copy').textContent=won?(state.index===15?'最后一件也解开了。可以回去重温喜欢的关卡。':'这一件收好了。继续拆下一件吧。'):'五格已满。先凑齐同色，再为下层留出空位。';$('result-action').textContent=won&&state.index<15?'下一件木作 →':'重新拆这一关';}
}
function pick(id,button){if(busy||state.status!=='playing')return;busy=true;const myToken=token;button.classList.add('unscrewing');document.querySelectorAll('.screw').forEach(b=>b.disabled=true);const motion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
timer=setTimeout(()=>{if(myToken!==token)return;const panel=button.closest('.plate'),ghost=panel.cloneNode(true),lane=panel.parentNode.className;ghost.querySelectorAll('button').forEach(b=>b.remove());const result=E.take(state,id);busy=false;if(!result)return;
if(state.status==='won'&&!completed.includes(state.index)){completed.push(state.index);save();}
render();if(result.fallen&&!motion){const holder=element('div',lane);holder.style.pointerEvents='none';holder.setAttribute('aria-hidden','true');ghost.classList.add('falling');holder.append(ghost);$('plates').append(holder);setTimeout(()=>holder.remove(),500);}
if(result.matched){$('tray').classList.remove('match');void $('tray').offsetWidth;$('tray').classList.add('match');}
$('status').textContent=state.status==='won'?'这一关已完成，进度已保存在此设备。':state.status==='lost'?'托盘已满，换个拆解顺序再试一次。':result.matched?'三枚'+E.COLORS[result.color]+'归入工具盒。托盘又空出了一些。':result.fallen?'木板落下了，新的螺丝露出来了。':state.rack.length===4?'还剩最后一格，下一枚最好能凑齐三枚。':'收好一枚'+E.COLORS[result.color]+'。留意下层的颜色。';
const next=document.querySelector('.screw:not(:disabled)');if(state.status!=='playing')$('result-action').focus({preventScroll:true});else if(next)next.focus({preventScroll:true});
},motion?0:230);
}
function start(n){clearTimeout(timer);token++;busy=false;state=E.create(n);save();$('status').textContent='先观察颜色，再拧下一枚螺丝。';render();}
E.levels.forEach((l,i)=>{const o=element('option','',String(i+1).padStart(2,'0')+' · '+l.name);o.value=String(i);$('level').append(o);});$('level').addEventListener('change',()=>start(Number($('level').value)));$('restart').addEventListener('click',()=>start(state.index));$('result-action').addEventListener('click',()=>start(state.status==='won'&&state.index<15?state.index+1:state.index));render();
})();
