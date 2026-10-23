/* LoRA teaching model: outer-product accumulation, not a model-training simulation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.LoRADemo = api; if (root.document && root.document.getElementById('lora-demo')) api.mount(root.document); }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const SIZE = 8;
  function matrix(rows, cols, fn) { return Array.from({length: rows}, (_, i) => Array.from({length: cols}, (_, j) => fn(i, j))); }
  function multiply(B, A) { return matrix(B.length, A[0].length, (i,j) => B[i].reduce((s,v,k) => s+v*A[k][j],0)); }
  function createState(options) {
    options = options || {};
    const rank = Math.max(1,Math.min(4,Math.round(Number(options.rank)||2)));
    const alpha = Math.max(0,Math.min(8,Number.isFinite(Number(options.alpha)) ? Number(options.alpha) : 2));
    return { rank, alpha, zeroB: !!options.zeroB, step: 0,
      W0: matrix(SIZE,SIZE,(i,j) => Math.sin((i+1)*1.3+(j+1)*.7)*.55),
      A: matrix(rank,SIZE,(k,j) => Math.sin((k+1)*(j+1)*.71)*.65),
      B: matrix(SIZE,rank,(i,k) => options.zeroB ? 0 : Math.cos((i+1)*(k+1)*.49)*.65) };
  }
  function advance(state) { state.step = Math.min(state.rank, state.step+1); return state; }
  function delta(state, steps) {
    const end = Math.max(0,Math.min(state.rank,steps == null ? state.step : steps));
    return matrix(SIZE,SIZE,(i,j) => { let v=0; for(let k=0;k<end;k++) v+=state.B[i][k]*state.A[k][j]; return v*state.alpha/state.rank; });
  }
  function adapted(state, steps) { const d=delta(state,steps); return matrix(SIZE,SIZE,(i,j)=>state.W0[i][j]+d[i][j]); }
  function parameterCounts(rank) { return { frozen:SIZE*SIZE, trainable:2*SIZE*rank, fullFineTune:SIZE*SIZE }; }
  function numericalRank(input, tolerance) {
    const a=input.map(row=>row.slice()); let row=0; tolerance=tolerance || 1e-9;
    for(let col=0;col<a[0].length && row<a.length;col++) {
      let pivot=row; for(let i=row+1;i<a.length;i++) if(Math.abs(a[i][col])>Math.abs(a[pivot][col])) pivot=i;
      if(Math.abs(a[pivot][col])<tolerance) continue;
      [a[row],a[pivot]]=[a[pivot],a[row]];
      const v=a[row][col]; for(let j=col;j<a[0].length;j++) a[row][j]/=v;
      for(let i=row+1;i<a.length;i++) { const q=a[i][col]; for(let j=col;j<a[0].length;j++) a[i][j]-=q*a[row][j]; }
      row++;
    }
    return row;
  }
  function mount(doc) {
    const win=doc.defaultView; const el=id=>doc.getElementById(id); let state, timer=null, destroyed=false;
    function pause() { if(timer!==null) win.clearInterval(timer); timer=null; el('lora-play').textContent='播放'; el('lora-play').setAttribute('aria-pressed','false'); }
    function drawMatrix(id, values, activeRow, activeCol) {
      const box=el(id); box.replaceChildren(); box.style.setProperty('--cols',values[0].length);
      values.forEach((row,i)=>row.forEach((v,j)=>{ const cell=doc.createElement('span'); cell.className='matrix-cell';
        const strength=Math.min(1,Math.abs(v)/1.4); cell.style.background=v>=0?`rgba(59,130,246,${.08+strength*.7})`:`rgba(239,126,74,${.08+strength*.7})`;
        cell.textContent=v.toFixed(1); cell.title=`第 ${i+1} 行，第 ${j+1} 列：${v.toFixed(4)}`;
        if(i===activeRow || j===activeCol) cell.classList.add('matrix-active'); box.appendChild(cell);
      }));
    }
    function render() {
      const k=state.step-1, d=delta(state), count=parameterCounts(state.rank);
      drawMatrix('lora-b',state.B,-1,k); drawMatrix('lora-a',state.A,k,-1);
      drawMatrix('lora-delta',d); drawMatrix('lora-base',state.W0); drawMatrix('lora-adapted',adapted(state));
      el('lora-rank-value').textContent=state.rank; el('lora-alpha-value').textContent=state.alpha;
      el('lora-b-shape').textContent=`8 × ${state.rank}`; el('lora-a-shape').textContent=`${state.rank} × 8`;
      el('lora-status').textContent=state.step===0?'尚未累加：点击“单步”，加入第 1 个外积。':`已累加 ${state.step} / ${state.rank} 个外积；当前 ΔW 的数值秩为 ${numericalRank(d)}。`;
      el('lora-formula').textContent=`ΔW = (${state.alpha} / ${state.rank}) × Σ B[:, k] A[k, :]；当前 k = 1…${state.step}`;
      el('lora-counts').textContent=`冻结 W₀：${count.frozen} 个参数；训练 A、B：${count.trainable} 个参数；全量微调这一个矩阵：${count.fullFineTune} 个参数。`;
      el('lora-budget').textContent=state.rank===4?'此微型例子 r = 4 时，A、B 参数量与全量微调相同，已没有参数节省。':'此微型例子的可训练参数减少 '+Math.round((1-count.trainable/count.fullFineTune)*100)+'%；真实节省比例取决于矩阵尺寸、秩和插入位置。';
      el('lora-mode-note').textContent=state.zeroB?'初始化示例：B = 0，所以所有外积和 ΔW 都是 0，W₀ + ΔW 与 W₀ 相同。A 使用固定示例数值，未模拟原文随机初始化。':'这里展示一组人为设定的非零 A、B，帮助看清更新如何组成；没有执行梯度下降，也不代表训练后的真实模型。';
      el('lora-step').disabled=state.step>=state.rank; el('lora-play').disabled=state.step>=state.rank;
      el('lora-progress').value=state.step; el('lora-progress').max=state.rank;
    }
    function reset() { pause(); state=createState({rank:el('lora-rank').value,alpha:el('lora-alpha').value,zeroB:el('lora-zero').checked}); render(); }
    function step() { if(destroyed) return; advance(state); if(state.step>=state.rank) pause(); render(); }
    function toggle() { if(timer!==null) {pause();return;} if(state.step>=state.rank) return; el('lora-play').textContent='暂停';el('lora-play').setAttribute('aria-pressed','true'); timer=win.setInterval(step,850); }
    function hidden() { if(doc.hidden) pause(); }
    const handlers=[['lora-step','click',step],['lora-play','click',toggle],['lora-reset','click',reset],['lora-rank','input',reset],['lora-alpha','input',reset],['lora-zero','change',reset]];
    handlers.forEach(([id,event,fn])=>el(id).addEventListener(event,fn)); doc.addEventListener('visibilitychange',hidden);
    win.addEventListener('pagehide',pause); reset();
    const controller={ get state(){return state;},get playing(){return timer!==null;},step,reset,pause,destroy(){pause();destroyed=true;handlers.forEach(([id,event,fn])=>el(id).removeEventListener(event,fn));doc.removeEventListener('visibilitychange',hidden);win.removeEventListener('pagehide',pause);} };
    win.loraDemoController=controller; return controller;
  }
  return {SIZE,createState,advance,delta,adapted,multiply,parameterCounts,numericalRank,mount};
});
