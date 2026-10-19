(function () {
'use strict';
const E = window.WaterSortEngine;
const COLOURS = [
  {name:'珊瑚',paint:'#e9a08e',symbol:'●'},
  {name:'海蓝',paint:'#87c3cb',symbol:'◆'},
  {name:'麦黄',paint:'#e6cd79',symbol:'✦'},
  {name:'薄荷',paint:'#9bc6a4',symbol:'▲'},
  {name:'丁香',paint:'#bfadd7',symbol:'✚'},
  {name:'蜜橘',paint:'#eeb783',symbol:'■'},
  {name:'蔷薇',paint:'#d9a5c2',symbol:'♥'}
];
const $ = id => document.getElementById(id);
const board = $('water-board'), feedback = $('feedback'), layer = $('pour-layer');
const STORAGE_KEY = 'cozy-water-sort-v1';
let state, selected = null, pending = null, timer = null, effectTimer = null, epoch = 0, storageOK = true;
try { state = E.restore(localStorage.getItem(STORAGE_KEY)); } catch (_) { state = E.create(); storageOK = false; }
const reduced = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const message = (text,type='') => { feedback.textContent = text; feedback.className = 'feedback' + (type ? ' '+type : ''); };
function store() {
  try { localStorage.setItem(STORAGE_KEY,E.save(state)); } catch (_) { storageOK = false; }
  $('saved').textContent = storageOK ? '进度自动保存' : '本次可玩 · 无法保存';
}
function cancelAnimation() {
  epoch++; clearTimeout(timer); clearTimeout(effectTimer); timer = null; pending = null; layer.replaceChildren();
  board.querySelectorAll('.invalid,.completed-now,.pour-origin').forEach(el=>el.classList.remove('invalid','completed-now','pour-origin'));
}
function bottleLabel(bottle,index) {
  return `${index+1} 号瓶，` + (bottle.length ? `从顶到底：${bottle.slice().reverse().map(c=>COLOURS[c].name+COLOURS[c].symbol).join('、')}，${bottle.length}/4 段` : '空瓶，0/4 段') + (E.same(bottle)&&bottle.length===4 ? '，已分好' : '');
}
function makeBottle(bottle,index) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'bottle'; button.dataset.bottle = index;
  button.setAttribute('aria-label',bottleLabel(bottle,index)); button.setAttribute('aria-pressed',String(index===selected));
  if (index===selected) button.classList.add('selected');
  if (selected!==null && E.inspect(state.bottles,selected,index).ok) button.classList.add('target');
  const complete = E.same(bottle)&&bottle.length===4; if (complete) button.classList.add('complete');
  const glass = document.createElement('span'); glass.className = 'bottle-glass'; glass.setAttribute('aria-hidden','true');
  const well = document.createElement('span'); well.className = 'liquid-well';
  bottle.forEach((colour,unit)=>{ const liquid = document.createElement('span');liquid.className='liquid'+(unit===bottle.length-1?' surface':'');liquid.style.setProperty('--unit',unit);liquid.style.setProperty('--paint',COLOURS[colour].paint);const symbol=document.createElement('span');symbol.className='liquid-symbol';symbol.textContent=COLOURS[colour].symbol;liquid.append(symbol);well.append(liquid); });
  glass.append(well); const label = document.createElement('span'); label.className = 'bottle-id'; label.setAttribute('aria-hidden','true'); label.textContent = String(index+1).padStart(2,'0');
  if (complete) {const check=document.createElement('em');check.textContent='✓';label.append(check);}
  button.append(glass,label);button.addEventListener('click',()=>pick(index)); return button;
}
function render(focusIndex) {
  board.replaceChildren();
  const count = state.bottles.length, rowLength = count > 5 ? Math.ceil(count/2) : count;
  for(let i=0;i<count;i+=rowLength){const row=document.createElement('div');row.className='bottle-row';state.bottles.slice(i,i+rowLength).forEach((b,j)=>row.append(makeBottle(b,i+j)));board.append(row);}
  $('level-number').textContent = String(state.level+1).padStart(2,'0'); $('level-name').textContent = E.LEVELS[state.level].name;
  $('level-select').value = state.level; $('sorted-count').textContent = state.bottles.filter(b=>E.same(b)&&b.length===4).length; $('color-count').textContent = ' / '+E.LEVELS[state.level].colors;
  $('palette').replaceChildren();COLOURS.slice(0,E.LEVELS[state.level].colors).forEach(c=>{const chip=document.createElement('span');chip.className='palette-chip';chip.style.setProperty('--paint',c.paint);chip.textContent=c.symbol;chip.setAttribute('aria-label',c.name+' '+c.symbol);$('palette').append(chip);});
  const won = E.won(state.bottles); $('win-card').hidden = !won;
  board.inert = won;
  if (won) {
    const all = state.completed.length===E.LEVELS.length;
    $('win-title').textContent = all ? '八份色彩，都收好啦。' : state.level===E.LEVELS.length-1 ? '最后一份色彩，收好了。' : '这一瓶，刚刚好。';
    $('win-detail').textContent = all ? '8 关已全部完成，随时回来再整理一次。' : `第 ${state.level+1} 关完成 · 已完成 ${state.completed.length} / 8 关`;
    $('next-level').textContent = state.level===E.LEVELS.length-1 ? '回到第一关 ↺' : '下一份色彩 →';
    $('next-level').focus();
  } else if (Number.isInteger(focusIndex)) board.querySelector(`[data-bottle="${focusIndex}"]`)?.focus({preventScroll:true});
  $('saved').textContent = storageOK ? '进度自动保存' : '本次可玩 · 无法保存';
}
function start(level) {
  cancelAnimation(); selected = null; state = E.create(level,state.completed); store(); render();
  message('先选一瓶，再点空瓶或顶色相同的瓶子');
}
function invalid(index,text) {
  message(text,'error'); const button=board.querySelector(`[data-bottle="${index}"]`);
  board.querySelectorAll('.invalid').forEach(el=>el.classList.remove('invalid')); button.classList.add('invalid');
  clearTimeout(effectTimer); effectTimer=setTimeout(()=>button.classList.remove('invalid'),350);
}
function finishPour() {
  if (!pending) return;
  const result=pending;clearTimeout(timer);pending=null;layer.replaceChildren();state=result.state;selected=null;store();render(result.to);
  if(result.won) message('所有颜色都分好了。','success');
  else if(!E.legalMoves(state.bottles).length) message('没有可倒的位置了，点“重新开始”重新规划。','error');
  else message(`${result.from+1} → ${result.to+1} 号瓶，倒入 ${result.amount} 段${COLOURS[result.color].name}。继续选一瓶。`,'success');
  const target=board.querySelector(`[data-bottle="${result.to}"]`);
  if(target?.classList.contains('complete')){target.classList.add('completed-now');clearTimeout(effectTimer);effectTimer=setTimeout(()=>target.classList.remove('completed-now'),650);}
}
function animate(result) {
  pending=result;const token=++epoch;
  if(reduced()){finishPour();return;}
  const source=board.querySelector(`[data-bottle="${result.from}"]`),target=board.querySelector(`[data-bottle="${result.to}"]`),sceneRect=$('scene').getBoundingClientRect();
  const a=source.querySelector('.bottle-glass').getBoundingClientRect(),b=target.querySelector('.bottle-glass').getBoundingClientRect();
  const ghost=document.createElement('div');ghost.className='pour-ghost';ghost.style.cssText=`left:${a.left-sceneRect.left}px;top:${a.top-sceneRect.top}px;width:${a.width}px;height:${a.height}px;`;ghost.append(source.querySelector('.bottle-glass').cloneNode(true));layer.append(ghost);source.classList.add('pour-origin');
  board.querySelectorAll('button').forEach(button=>button.disabled=true);message(`正在倒入 ${result.amount} 段${COLOURS[result.color].name}…`);
  const direction=b.left>=a.left?1:-1, dx=b.left+b.width/2-a.left-a.width/2-direction*5,dy=b.top-a.top-20;
  // Layout is read before the transform so the glass visibly lifts, tilts, then pours.
  void ghost.offsetWidth;ghost.style.transform=`translate(${dx}px,${dy}px) rotate(${direction*62}deg)`;
  timer=setTimeout(()=>{if(token!==epoch||!pending)return;const stream=document.createElement('i');stream.className='pour-stream';stream.style.setProperty('--paint',COLOURS[result.color].paint);stream.style.left=(b.left+b.width/2-sceneRect.left-2)+'px';stream.style.top=(b.top-sceneRect.top-16)+'px';stream.style.height='30px';layer.append(stream);timer=setTimeout(()=>{if(token===epoch)finishPour();},300);},220);
}
function pick(index) {
  if(pending||E.won(state.bottles))return;
  if(selected===index){selected=null;render(index);message('已取消选择。再选一只来源瓶。');return;}
  if(selected===null){if(!state.bottles[index].length){invalid(index,'这是空瓶。请先选一只有颜色的来源瓶。');return;}selected=index;render(index);message(`已选 ${index+1} 号瓶。点空瓶或顶色相同的瓶子；再点来源可取消。`);return;}
  const result=E.act(state,selected,index);
  if(!result.ok){const reasons={full:'这只瓶子已经满了。换个目标，或再点来源取消。',color:'顶部颜色不同，不能倒入。换个目标，或再点来源取消。'};invalid(index,reasons[result.reason]||'这里不能倒入，请换个目标。');return;}
  animate(result);
}
E.LEVELS.forEach((level,index)=>{const option=document.createElement('option');option.value=index;option.textContent=`${String(index+1).padStart(2,'0')} · ${level.name}`;$('level-select').append(option);});
$('restart').addEventListener('click',()=>start(state.level));$('level-select').addEventListener('change',()=>start(Number($('level-select').value)));$('next-level').addEventListener('click',()=>start((state.level+1)%E.LEVELS.length));
board.addEventListener('keydown',event=>{
  const button=event.target.closest('[data-bottle]');if(!button)return;
  if(event.key==='Escape'&&selected!==null){event.preventDefault();event.stopPropagation();selected=null;render(Number(button.dataset.bottle));message('已取消选择。');return;}
  const offsets={ArrowRight:1,ArrowLeft:-1,ArrowDown:state.bottles.length>5?Math.ceil(state.bottles.length/2):1,ArrowUp:state.bottles.length>5?-Math.ceil(state.bottles.length/2):-1};
  if(Object.hasOwn(offsets,event.key)){event.preventDefault();const next=(Number(button.dataset.bottle)+offsets[event.key]+state.bottles.length)%state.bottles.length;board.querySelector(`[data-bottle="${next}"]`).focus();}
});
window.addEventListener('resize',()=>{if(pending)finishPour();});document.querySelector('[data-game-view]').addEventListener('gameviewchange',()=>{if(pending)finishPour();});
render();store();
if(E.won(state.bottles))message('这一关已完成，可以继续下一关。','success');else if(!E.legalMoves(state.bottles).length)message('没有可倒的位置了，点“重新开始”重新规划。','error');
})();
