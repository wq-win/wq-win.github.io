(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.ProMPDemo = api; if (root.document && root.document.getElementById('promp-canvas')) root.prompController = api.mount(root.document); }
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const N = 6, STEPS = 100;
  function dot(a,b) { return a.reduce((s,v,i)=>s+v*b[i],0); }
  function mv(A,b) { return A.map(row=>dot(row,b)); }
  function basis(t) { const a=Array.from({length:N},(_,i)=>Math.exp(-0.5*Math.pow((t-i/(N-1))/.19,2))); const sum=a.reduce((s,v)=>s+v,0);return a.map(v=>v/sum); }
  function prior() { const mean=[0,.55,1.18,1.08,.48,0]; const covariance=Array.from({length:N},(_,i)=>Array.from({length:N},(_,j)=>.055*Math.exp(-Math.pow(i-j,2)/3)+(i===j?.055:0)));return {mean,covariance}; }
  function moments(model,t) { const p=basis(t);return {mean:dot(p,model.mean),variance:Math.max(0,dot(p,mv(model.covariance,p)))}; }
  function condition(model,t,target,noiseSD) {
    if (!(t>=0&&t<=1&&Number.isFinite(target)&&Number.isFinite(noiseSD)&&noiseSD>0)) throw new Error('Invalid via-point');
    const p=basis(t),v=mv(model.covariance,p),den=dot(p,v)+noiseSD*noiseSD;
    return {mean:model.mean.map((m,i)=>m+v[i]*(target-dot(p,model.mean))/den),covariance:model.covariance.map((row,i)=>row.map((s,j)=>s-v[i]*v[j]/den))};
  }
  function rng(seed) { let s=seed>>>0; return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return (s+.5)/4294967296;}; }
  function cholesky(A) { const L=A.map(row=>row.map(()=>0));for(let i=0;i<A.length;i++)for(let j=0;j<=i;j++){let v=A[i][j];for(let k=0;k<j;k++)v-=L[i][k]*L[j][k];L[i][j]=i===j?Math.sqrt(Math.max(v,1e-14)):v/L[j][j];}return L; }
  function sampleWeights(model,count,seed) { const random=rng(seed),L=cholesky(model.covariance);return Array.from({length:count},()=>{const z=Array.from({length:N},()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random()));return model.mean.map((m,i)=>m+dot(L[i],z));}); }
  function mount(doc,options) {
    options=options||{};const win=doc.defaultView,el=id=>doc.getElementById(id),canvas=el('promp-canvas'),ctx=canvas.getContext('2d');
    const raf=options.raf||win.requestAnimationFrame.bind(win),caf=options.caf||win.cancelAnimationFrame.bind(win);
    const W=900,H=430,dpr=Math.max(1,win.devicePixelRatio||1);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    const base=prior();let posterior,cursor=0,playing=false,frame=null,last=0,destroyed=false;let params={t:.65,target:1.25,noise:.08};
    const x=t=>62+t*812,y=v=>360-(v+.5)*128;
    function path(values,color,width,limit) { ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();values.slice(0,limit+1).forEach((v,i)=>i?ctx.lineTo(x(i/STEPS),y(v)):ctx.moveTo(x(0),y(v)));ctx.stroke(); }
    function draw() {
      ctx.clearRect(0,0,W,H);ctx.fillStyle='#0b1424';ctx.fillRect(0,0,W,H);ctx.font='14px sans-serif';ctx.lineWidth=1;
      for(let v=-.5;v<=2;v+=.5){ctx.strokeStyle='#263348';ctx.beginPath();ctx.moveTo(62,y(v));ctx.lineTo(874,y(v));ctx.stroke();ctx.fillStyle='#94a3b8';ctx.fillText(v.toFixed(1),20,y(v)+5);}
      for(let i=0;i<=5;i++){ctx.fillStyle='#94a3b8';ctx.fillText((i/5).toFixed(1),x(i/5)-10,391);}ctx.fillText('时间 t',817,415);ctx.fillText('位置 y',14,24);
      const before=Array.from({length:STEPS+1},(_,i)=>moments(base,i/STEPS));const after=Array.from({length:STEPS+1},(_,i)=>moments(posterior,i/STEPS));
      ctx.beginPath();after.forEach((m,i)=>{const yy=y(m.mean+2*Math.sqrt(m.variance));i?ctx.lineTo(x(i/STEPS),yy):ctx.moveTo(x(0),yy);});for(let i=STEPS;i>=0;i--)ctx.lineTo(x(i/STEPS),y(after[i].mean-2*Math.sqrt(after[i].variance)));ctx.closePath();ctx.fillStyle='rgba(52,211,153,.16)';ctx.fill();
      path(before.map(m=>m.mean),'#94a3b8',2,STEPS);
      sampleWeights(posterior,6,1983).forEach(w=>path(Array.from({length:STEPS+1},(_,i)=>dot(basis(i/STEPS),w)),'rgba(125,211,252,.50)',1.2,cursor));
      path(after.map(m=>m.mean),'#34d399',3,STEPS);
      ctx.setLineDash([5,5]);ctx.strokeStyle='#fbbf24';ctx.beginPath();ctx.moveTo(x(params.t),40);ctx.lineTo(x(params.t),360);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(x(params.t),y(params.target),6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#0b1424';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x(cursor/STEPS),y(after[cursor].mean),5,0,Math.PI*2);ctx.fill();
      const a=moments(base,params.t),b=moments(posterior,params.t);
      el('promp-metrics').textContent='途经点处：条件化前均值 '+a.mean.toFixed(3)+' → 后均值 '+b.mean.toFixed(3)+'；标准差 '+Math.sqrt(a.variance).toFixed(3)+' → '+Math.sqrt(b.variance).toFixed(3)+'。';
      el('promp-status').textContent=(playing?'播放中':cursor===STEPS?'轨迹播放完成':'已暂停')+' · t = '+(cursor/STEPS).toFixed(2);
      el('promp-play').textContent=playing?'暂停':'播放';el('promp-play').setAttribute('aria-pressed',String(playing));
    }
    function pause(){playing=false;if(frame!==null)caf(frame);frame=null;last=0;}
    function update(){pause();params={t:Number(el('promp-time').value)/100,target:Number(el('promp-target').value)/100,noise:Number(el('promp-noise').value)/100};posterior=condition(base,params.t,params.target,params.noise);cursor=0;el('promp-time-value').textContent=params.t.toFixed(2);el('promp-target-value').textContent=params.target.toFixed(2);el('promp-noise-value').textContent=params.noise.toFixed(2);draw();}
    function tick(ts){frame=null;if(!playing||destroyed)return;if(!last)last=ts;const delta=ts-last;if(delta>=35){cursor=Math.min(STEPS,cursor+Math.max(1,Math.floor(delta/35)));last=ts;}if(cursor===STEPS)pause();draw();if(playing)frame=raf(tick);}
    function play(){if(playing)pause();else {if(cursor===STEPS)cursor=0;playing=true;last=0;frame=raf(tick);}draw();}
    function step(){pause();cursor=Math.min(STEPS,cursor+5);draw();}
    function reset(){pause();el('promp-time').value='65';el('promp-target').value='125';el('promp-noise').value='8';update();}
    const listeners=[];function listen(node,event,fn){node.addEventListener(event,fn);listeners.push([node,event,fn]);}
    ['promp-time','promp-target','promp-noise'].forEach(id=>listen(el(id),'input',update));listen(el('promp-play'),'click',play);listen(el('promp-step'),'click',step);listen(el('promp-reset'),'click',reset);listen(doc,'visibilitychange',()=>{if(doc.hidden){pause();draw();}});reset();
    return {step,play,reset,getState:()=>({cursor,playing,params:{...params},posterior}),destroy:()=>{pause();destroyed=true;listeners.forEach(([n,e,f])=>n.removeEventListener(e,f));}};
  }
  return {basis,prior,moments,condition,sampleWeights,cholesky,dot,mount};
});
