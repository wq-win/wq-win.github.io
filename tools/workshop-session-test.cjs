'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {Window}=await import('happy-dom');const w=new Window();w.document.write('<main><nav></nav><button id="restart">重来</button></main>');
 w.eval(fs.readFileSync('game/js/workshop-session.js','utf8'));
 const session=w.WorkshopSession({rules:'一\n二\n三'}),d=w.document.querySelector('dialog'),buttons=d.querySelectorAll('button');
 w.document.querySelector('.workshop-help').click();assert(d.open);assert.equal(d.querySelector('p').textContent,'一\n二\n三');buttons[1].click();assert(!d.open);
 let n=0;w.document.getElementById('restart').focus();session.confirm(()=>n++);assert.equal(w.document.activeElement,buttons[0]);buttons[0].click();assert.equal(n,0);assert.equal(w.document.activeElement.id,'restart');
 session.confirm(()=>n++);d.dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(n,0);assert(!d.open);
 session.confirm(()=>n++);session.confirm(()=>n+=10);buttons[1].click();assert.equal(n,1);buttons[1].click();assert.equal(n,1);
 for(const name of ['yarn','parking','screws']){const html=fs.readFileSync(`game/${name}.html`,'utf8');assert(html.includes('assets/workshop-session.css'));assert(html.indexOf('js/workshop-session.js')<html.indexOf(`js/${name}.js`));}
 await w.happyDOM.close();
 for(const name of ['yarn','parking','screws']){
  const g=new Window({url:'https://example.test/game/'+name+'.html',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  g.document.write(fs.readFileSync('game/'+name+'.html','utf8'));g.matchMedia=()=>({matches:true});
  for(const file of [name+'-engine',...(name==='screws'?['screws-levels']:[]),'workshop-session',name])g.eval(fs.readFileSync('game/js/'+file+'.js','utf8'));
  const doc=g.document;
  if(name==='yarn')doc.querySelector('.pull').click();
  if(name==='screws'){doc.querySelector('.screw').click();await new Promise(r=>setTimeout(r,8));}
  if(name==='parking'){
   const id=g.ParkingEngine.solve(g.ParkingEngine.LEVELS[0])[0],car=doc.querySelector('[data-car="'+id+'"]'),v=doc.getElementById('board-viewport');
   v.dispatchEvent(new g.PointerEvent('pointerdown',{clientX:0,clientY:0}));v.dispatchEvent(new g.PointerEvent('pointermove',{clientX:30,clientY:0}));v.dispatchEvent(new g.PointerEvent('pointerup'));
   car.dispatchEvent(new g.MouseEvent('click',{detail:1}));assert.equal(doc.getElementById('remaining').textContent,'50','drag is not a car tap');
   car.click();await new Promise(r=>setTimeout(r,8));assert.equal(doc.getElementById('remaining').textContent,'49');
  }
  const saved=JSON.stringify(g.localStorage);doc.getElementById('restart').click();assert(doc.querySelector('dialog').open,name+' restart protects progress');
  doc.querySelector('.workshop-sheet-actions button').click();assert.equal(JSON.stringify(g.localStorage),saved,'cancel must not mutate save');
  doc.getElementById('restart').click();doc.querySelector('.workshop-sheet-actions button:last-child').click();assert(!doc.querySelector('dialog').open);
  assert.equal(doc.getElementById(name==='parking'?'remaining':name==='yarn'?'slot-count':'removed').textContent,name==='parking'?'50':'0');
  await g.happyDOM.close();
 }
 console.log('Workshop help / cancel / confirm / duplicate click / focus restoration: passed');
})();
