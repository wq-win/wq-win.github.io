const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async()=>{
 const {Window}=await import('happy-dom');
 const root=path.resolve(__dirname,'../game/life');
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
 let passed=0;
 function setup(app,Model) {
  const w=new Window({url:'https://site.test/game/life/'+app+'.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  w.document.write(fs.readFileSync(path.join(root,app+'.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''));
  w.LifeLocalModel=Model||class { async generate(){throw new Error('当前设备没有可用的 WebGPU 适配器，无法运行本地 AI。没有下载模型，也没有发送你的输入。');} stop(){} };w.eval(source);return {w,$:id=>w.document.getElementById(id),submit(id){w.document.getElementById(id).dispatchEvent(new w.Event('submit',{cancelable:true}));}};
 }
 function test(name,fn){fn();passed++;console.log('✓ '+name);}
 const food=setup('food');
 test('Takeaway gives meals and avoids consecutive repeat',()=>{let prev;for(let i=0;i<50;i++){food.$('pick-meal').click();const x=food.$('result').textContent;assert.match(x,/今天试试/);assert.notEqual(x,prev);prev=x;}});
 test('Mode switching retains inputs and clears irrelevant result',()=>{food.$('cook-mode').click();assert.equal(food.$('cook-form').hidden,false);food.$('ingredients').value='西红柿、鸡蛋';food.$('takeaway-mode').click();assert.equal(food.$('cook-form').hidden,true);food.$('cook-mode').click();assert.equal(food.$('ingredients').value,'西红柿、鸡蛋');});
 test('Recipe matching normalizes aliases and discloses missing ingredients',()=>{food.submit('cook-form');assert.match(food.$('result').textContent,/番茄炒蛋/);assert.match(food.$('result').textContent,/现有食材可做/);assert.match(food.$('result').textContent,/还需准备/);});
 test('Unknown ingredients and invalid dish counts are honest errors',()=>{food.$('ingredients').value='未知食材';food.submit('cook-form');assert.match(food.$('result').textContent,/暂未找到/);food.$('dish-count').value='2.5';food.submit('cook-form');assert.match(food.$('result').textContent,/整数/);});
 test('Empty ingredients reject and scarce matches never invent requested dishes',()=>{food.$('dish-count').value='6';food.$('ingredients').value=' , 、 ';food.submit('cook-form');assert.match(food.$('result').textContent,/请填写食材/);food.$('ingredients').value='菠菜';food.submit('cook-form');assert.match(food.$('result').textContent,/找到 1 道相关菜，没有凑足 6 道/);});
 test('Allergy guidance is visible and free text is not treated as a guarantee',()=>{assert.match(food.w.document.body.textContent,/自行核对过敏原/);food.$('ingredients').value='花生过敏';food.submit('cook-form');assert.match(food.$('result').textContent,/暂未找到/);});
 const dream=setup('dream');
 test('Download disclosure and optional profile are honest',()=>{assert.equal(dream.$('consent').checked,false);assert.match(dream.w.document.body.textContent,/约 300 MB/);assert.match(dream.w.document.body.textContent,/WebGPU/);assert.match(dream.w.document.body.textContent,/不发送到模型 API/);});
 dream.$('dream').value='梦见走进陌生的车站';dream.$('consent').checked=true;dream.submit('dream-form');await new Promise(r=>setTimeout(r,10));
 test('Unsupported browser gives a real error, not invented AI output',()=>assert.match(dream.$('result').textContent,/没有可用的 WebGPU/));
 let calls=0,payload,resolveGeneration,rejectGeneration;
 class MockModel {
  constructor(progress){this.progress=progress;}
  generate(body){calls++;payload=body;this.progress('仅测试：下载进度 25%');return new Promise((resolve,reject)=>{resolveGeneration=resolve;rejectGeneration=reject;});}
  stop(){rejectGeneration?.(new Error('已停止本次任务。'));}
 }
 const live=setup('dream',MockModel);live.$('dream').value='梦见走进陌生的车站';
 test('No model download on page load or without consent',()=>{assert.equal(calls,0);live.submit('dream-form');assert.equal(calls,0);});
 live.$('consent').checked=true;live.submit('dream-form');live.submit('dream-form');
 test('Repeated submit locked and progress/stop visible',()=>{assert.equal(calls,1);assert.match(live.$('service-status').textContent,/25%/);assert.equal(live.$('stop-model').hidden,false);assert.equal(payload.type,'dream');});
 resolveGeneration('<img src=x onerror=alert(1)>仅测试模型响应');await new Promise(r=>setTimeout(r,10));
 test('Synthetic output is text-only and never stored',()=>{assert.equal(live.$('result').querySelector('img'),null);assert.match(live.$('result').textContent,/仅测试模型响应/);assert.equal(live.w.localStorage.length,0);assert.equal(live.$('stop-model').hidden,true);});
 live.submit('dream-form');live.$('stop-model').click();await new Promise(r=>setTimeout(r,10));
 test('Stop unlocks retry',()=>{assert.match(live.$('result').textContent,/已停止/);assert.equal(live.$('dream-form').querySelector('button').disabled,false);});
 live.submit('dream-form');resolveGeneration('');await new Promise(r=>setTimeout(r,10));
 test('Empty output rejects without a fallback',()=>assert.match(live.$('result').textContent,/没有生成有效内容/));
 const fortune=setup('fortune',MockModel);fortune.$('consent').checked=true;fortune.submit('fortune-form');
 test('Fortune uses real model interface with local date and optional fields',()=>{assert.equal(payload.type,'fortune');assert.match(payload.date,/^\d{4}-\d{2}-\d{2}$/);assert.equal(payload.ageRange,null);assert.equal(payload.gender,null);});
 resolveGeneration('仅测试：幸运数字 3；颜色 绿；方向 东');await new Promise(r=>setTimeout(r,10));
 for(const x of[food,dream,live,fortune])await x.w.happyDOM.close();console.log(`${passed} lifestyle UI checks passed. AI replies in tests are synthetic, not quality or speed validation.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
