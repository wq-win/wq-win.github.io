(function () {
'use strict';
const $ = id => document.getElementById(id);
const result = $('result');
function show(text, error = false) { result.textContent = text; result.classList.toggle('error', error); }
function date() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
if ($('today')) $('today').textContent = `今天 · ${date()}（你的本地日期）`;
const localModel = $('service-status') ? new window.LifeLocalModel(text => { $('service-status').textContent = text; }) : null;
if ($('service-status')) $('service-status').textContent = '本地 AI 尚未加载。确认后才会检查设备并下载模型。';
let busy = false;
async function generate(form, payload) {
 if (busy) return;
 if (!$('consent').checked) { show('请先阅读并同意本次模型下载与本地运行。', true); return; }
 busy = true;
 const button = form.querySelector('button[type=submit]');
 button.disabled = true;
 $('stop-model').hidden = false;
 show('正在准备本地 AI。输入只在当前设备上处理，不会发送给模型服务。');
 try {
  const text = await localModel.generate(payload);
  if (typeof text !== 'string' || !text.trim() || text.length > 12000) throw new Error('模型没有生成有效内容，请重试。');
  show(text.trim());
  $('service-status').textContent = '本地生成完成。小模型可能遗漏要求或产生错误，请仅作娱乐参考。';
 } catch (e) {
  show(e.message || '本地 AI 运行失败，请重试。', true);
  $('service-status').textContent = '本次未完成生成。不会用预设文字替代模型输出。';
 } finally {
  busy = false;
  button.disabled = false;
  $('stop-model').hidden = true;
  result.setAttribute('tabindex', '-1');
  result.focus();
 }
}
if ($('stop-model')) $('stop-model').addEventListener('click', () => localModel.stop());
window.addEventListener('pagehide', () => localModel?.stop());
if ($('dream-form')) $('dream-form').addEventListener('submit', e => {
 e.preventDefault(); const dream = $('dream').value.trim();
 if (dream.length < 5 || dream.length > 2000) return show('请填写 5–2000 字的梦境描述。', true);
 generate(e.currentTarget, { type:'dream', dream });
});
if ($('fortune-form')) $('fortune-form').addEventListener('submit', e => {
 e.preventDefault(); generate(e.currentTarget, { type:'fortune', date:date(), ageRange:$('age').value || null, gender:$('gender').value || null });
});
const meals = ['番茄鸡蛋盖饭','香菇鸡肉饭','牛肉面','鲜蔬拌饭','饺子','鸡肉卷','豆腐盖饭','虾仁炒饭','蔬菜汤面','烧鸭饭','三明治套餐','土豆炖牛肉饭'];
const recipes = [
 ['番茄炒蛋',['番茄','鸡蛋'],'番茄切块，鸡蛋打散炒熟盛出；炒软番茄，倒回鸡蛋翻匀并充分加热。'],
 ['酸辣土豆丝',['土豆'],'土豆切丝泡水后沥干，下锅炒熟，按口味加醋和辣椒。'],
 ['香煎豆腐',['豆腐'],'豆腐擦干切片，少油两面煎至金黄，调味后充分加热。'],
 ['清炒西兰花',['西兰花'],'西兰花切小朵洗净，焯水后下锅翻炒至熟。'],
 ['蒜蓉生菜',['生菜'],'生菜洗净沥干，与蒜末快速翻炒至熟后调味。'],
 ['黄瓜炒蛋',['黄瓜','鸡蛋'],'鸡蛋炒熟盛出，黄瓜切片稍炒，再倒回鸡蛋翻匀。'],
 ['青椒炒肉',['青椒','猪肉'],'猪肉切片，先炒至熟，再加入青椒炒熟调味。'],
 ['香菇鸡肉',['香菇','鸡肉'],'鸡肉切块，与香菇翻炒后加少量水焖至鸡肉全熟。'],
 ['洋葱牛肉',['洋葱','牛肉'],'牛肉切片，洋葱切丝，分次下锅炒至全熟并调味。'],
 ['虾仁炒蛋',['虾仁','鸡蛋'],'虾仁处理干净炒熟，再倒入蛋液炒至完全凝固。'],
 ['番茄豆腐汤',['番茄','豆腐'],'番茄炒软，加水煮开，放入豆腐煮透后调味。'],
 ['白菜炖豆腐',['白菜','豆腐'],'白菜洗净切段，和豆腐一起加水炖至熟软。'],
 ['胡萝卜炒蛋',['胡萝卜','鸡蛋'],'胡萝卜切细丝炒软，加入炒熟的鸡蛋翻匀。'],
 ['土豆炖鸡',['土豆','鸡肉'],'鸡肉与土豆切块，加水炖至鸡肉全熟、土豆软烂。'],
 ['鸡蛋炒饭',['鸡蛋','米饭'],'鸡蛋炒熟，加米饭炒散，持续翻炒至均匀热透。'],
 ['清炒菠菜',['菠菜'],'菠菜洗净焯水后沥干，下锅翻炒至熟并调味。']
];
const aliases = {'西红柿':'番茄','蛋':'鸡蛋','鸡胸肉':'鸡肉','鸡腿肉':'鸡肉','瘦肉':'猪肉','大米饭':'米饭','剩米饭':'米饭','鲜虾':'虾仁','虾':'虾仁','圆白菜':'卷心菜'};
function parseIngredients(text) { return [...new Set(text.split(/[,，、;；\n]+/).map(x=>x.trim()).filter(Boolean).map(x=>aliases[x]||x))]; }
function menu(text, count) {
 const ingredients = parseIngredients(text);
 if (!ingredients.length || text.length > 300) throw new Error('请填写食材，最多 300 字。');
 if (!Number.isInteger(count) || count < 1 || count > 6) throw new Error('菜品数量请填写 1–6 的整数。');
 const ranked = recipes.map((r,i)=>({r,i,match:r[1].filter(x=>ingredients.includes(x)).length,missing:r[1].filter(x=>!ingredients.includes(x))})).filter(x=>x.match>0).sort((a,b)=>a.missing.length-b.missing.length || b.match-a.match || a.i-b.i).slice(0,count);
 if (!ranked.length) return '菜库暂未找到这些食材的搭配。试试鸡蛋、番茄、土豆或豆腐；不会假装已有匹配菜谱。';
 return (ranked.length < count ? `找到 ${ranked.length} 道相关菜，没有凑足 ${count} 道。\n\n` : '')+ranked.map((x,i)=>`${i+1}. ${x.r[0]}\n食材：${x.r[1].join('、')}\n${x.missing.length ? '还需准备：'+x.missing.join('、') : '现有食材可做'}\n做法：${x.r[2]}`).join('\n\n');
}
if ($('pick-meal')) {
 let previous = -1;
 $('pick-meal').addEventListener('click', () => { let index = Math.floor(Math.random()*(previous < 0 ? meals.length : meals.length-1)); if(index>=previous && previous>=0) index++; previous=index; show(`今天试试：${meals[index]}\n\n可在你常用的外卖平台搜索这道菜。这是餐食灵感，不代表附近商家或实时供应。`); });
 function mode(cook) { $('cook-form').hidden=!cook; $('takeaway').hidden=cook; $('takeaway-mode').setAttribute('aria-pressed',String(!cook)); $('cook-mode').setAttribute('aria-pressed',String(cook)); show(cook?'填入食材与菜品数量，生成一份厨房菜单。':'点一下按钮，选出今天的一份外卖。'); }
 $('takeaway-mode').addEventListener('click',()=>mode(false)); $('cook-mode').addEventListener('click',()=>mode(true));
 $('cook-form').addEventListener('submit', e=>{e.preventDefault();try {show(menu($('ingredients').value,Number($('dish-count').value)));}catch(e){show(e.message,true);}});
}
})();
