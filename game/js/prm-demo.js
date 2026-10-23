/* Educational PRM: a point robot in a static 2-D configuration space. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.PRMDemo = api; if (root.document) api.mount(root.document); }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const DEFAULT_OBSTACLES = [{x:25,y:0,w:8,h:39},{x:49,y:22,w:8,h:38},{x:73,y:0,w:8,h:39}];
  const QUERIES = [[{x:8,y:10},{x:92,y:50}],[{x:8,y:50},{x:92,y:10}],[{x:10,y:30},{x:66,y:10}]];
  function rng(seed) { let s = seed >>> 0; return function () { s += 0x6D2B79F5; let t=s; t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296; }; }
  function pointFree(p, obstacles) { return Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>0&&p.x<100&&p.y>0&&p.y<60&&!obstacles.some(r=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h); }
  // Closed slab intersection: touching an obstacle is treated as collision.
  function segmentHitsRect(a,b,r) {
    let lo=0,hi=1;
    for(const [axis,min,max] of [['x',r.x,r.x+r.w],['y',r.y,r.y+r.h]]) {
      const d=b[axis]-a[axis];
      if(Math.abs(d)<1e-12) { if(a[axis]<min||a[axis]>max) return false; }
      else { let t0=(min-a[axis])/d,t1=(max-a[axis])/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return false; }
    }
    return true;
  }
  function visible(a,b,obstacles) { return pointFree(a,obstacles)&&pointFree(b,obstacles)&&!obstacles.some(r=>segmentHitsRect(a,b,r)); }
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function beginSearch(nodes,edges,start,goal) {
    const adj=nodes.map(()=>[]); edges.forEach(e=>{adj[e.a].push([e.b,e.w]);adj[e.b].push([e.a,e.w]);});
    const dist=nodes.map(()=>Infinity),prev=nodes.map(()=>-1);dist[start]=0;
    return {adj,dist,prev,visited:new Set(),start,goal,done:false,path:[],current:-1};
  }
  function searchStep(s) {
    if(s.done)return false;
    let u=-1; for(let i=0;i<s.dist.length;i++)if(!s.visited.has(i)&&(u<0||s.dist[i]<s.dist[u]))u=i;
    if(u<0||!Number.isFinite(s.dist[u])) {s.done=true;return false;}
    s.current=u;s.visited.add(u);
    if(u===s.goal) {s.done=true;let v=u;while(v!==-1){s.path.unshift(v);v=s.prev[v];}return true;}
    for(const [v,w] of s.adj[u])if(!s.visited.has(v)&&s.dist[u]+w<s.dist[v]){s.dist[v]=s.dist[u]+w;s.prev[v]=u;}
    return true;
  }
  function create(options) {
    const o=options||{}, seed=(o.seed===undefined?1996:o.seed)>>>0;
    const state={seed,target:Math.max(10,Math.min(300,Math.floor(Number(o.count)||160))),radius:Math.max(3,Math.min(45,Number(o.radius)||23)),obstacles:(o.obstacles||DEFAULT_OBSTACLES).map(r=>({...r})),nodes:[],edges:[],candidates:[],cursor:0,phase:'sample',attempts:0,last:null,query:0,search:null,queryNodes:[],queryEdges:[]};
    state.random=rng(seed);return state;
  }
  function prepareConnections(s) {s.phase='connect';s.candidates=[];for(let a=0;a<s.nodes.length;a++)for(let b=a+1;b<s.nodes.length;b++){const w=distance(s.nodes[a],s.nodes[b]);if(w<=s.radius)s.candidates.push({a,b,w});}s.cursor=0;}
  function query(s,index) {
    if(s.phase==='sample'||s.phase==='connect')return false;
    s.query=((Number(index)||0)%QUERIES.length+QUERIES.length)%QUERIES.length;
    const n=s.nodes.length,[a,b]=QUERIES[s.query];
    s.queryNodes=s.nodes.concat([{...a},{...b}]);s.queryEdges=s.edges.map(e=>({...e}));
    for(let i=n;i<n+2;i++)for(let j=0;j<i;j++){const w=distance(s.queryNodes[i],s.queryNodes[j]);if(w<=s.radius&&visible(s.queryNodes[i],s.queryNodes[j],s.obstacles))s.queryEdges.push({a:j,b:i,w});}
    s.search=beginSearch(s.queryNodes,s.queryEdges,n,n+1);s.phase='query';s.last=null;return true;
  }
  function step(s) {
    if(s.phase==='done')return false;
    if(s.phase==='sample') {
      const p={x:1+s.random()*98,y:1+s.random()*58};s.attempts++;const free=pointFree(p,s.obstacles);s.last={kind:'sample',p,free};if(free)s.nodes.push(p);
      if(s.nodes.length>=s.target)prepareConnections(s);return true;
    }
    if(s.phase==='connect') {
      if(s.cursor<s.candidates.length){const e=s.candidates[s.cursor++],free=visible(s.nodes[e.a],s.nodes[e.b],s.obstacles);s.last={kind:'edge',e,free};if(free)s.edges.push(e);return true;}
      s.phase='ready';query(s,s.query);return true;
    }
    if(s.phase==='query'){searchStep(s.search);if(s.search.done)s.phase='done';return true;}
    return false;
  }
  function finish(s) {let guard=100000;while(s.phase!=='done'&&guard-->0)step(s);if(guard<=0)throw Error('PRM step limit');return s;}
  function mount(doc) {
    const canvas=doc.getElementById('prm-canvas');if(!canvas)return null;
    const view=window.DemoKit.setupCanvas(canvas,900,540),ctx=view.ctx;
    const $=id=>doc.getElementById(id);let state,timer=null,running=false;
    const run=$('prm-run'),status=$('prm-status');
    function stop(){running=false;if(timer!==null)window.clearInterval(timer);timer=null;run.textContent='播放';run.setAttribute('aria-pressed','false');}
    function reset(){stop();state=create({count:$('prm-count').value,radius:$('prm-radius').value});$('prm-count-value').textContent=state.target;$('prm-radius-value').textContent=state.radius;$('prm-query').value='0';draw();}
    function line(a,b,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x*9,a.y*9);ctx.lineTo(b.x*9,b.y*9);ctx.stroke();}
    function dot(p,color,r){ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x*9,p.y*9,r,0,Math.PI*2);ctx.fill();}
    function draw(){
      ctx.fillStyle='#07111f';ctx.fillRect(0,0,900,540);ctx.fillStyle='#334155';state.obstacles.forEach(r=>ctx.fillRect(r.x*9,r.y*9,r.w*9,r.h*9));
      state.edges.forEach(e=>line(state.nodes[e.a],state.nodes[e.b],'#245269',1));
      state.nodes.forEach((p,i)=>dot(p,state.search&&state.search.visited.has(i)?'#c4b5fd':'#38bdf8',3));
      if(state.search){state.queryEdges.filter(e=>e.b>=state.nodes.length).forEach(e=>line(state.queryNodes[e.a],state.queryNodes[e.b],'#eab308',1.5));if(state.search.path.length)for(let i=1;i<state.search.path.length;i++)line(state.queryNodes[state.search.path[i-1]],state.queryNodes[state.search.path[i]],'#4ade80',5);if(state.search.current>=0)dot(state.queryNodes[state.search.current],'#fbbf24',7);}
      const [start,goal]=QUERIES[state.query];dot(start,'#22c55e',9);dot(goal,'#fb7185',9);ctx.font='bold 15px sans-serif';ctx.fillStyle='#d1fae5';ctx.fillText('S',start.x*9+13,start.y*9+5);ctx.fillStyle='#fecdd3';ctx.fillText('G',goal.x*9+13,goal.y*9+5);
      if(state.last&&state.phase!=='done'){if(state.last.kind==='sample')dot(state.last.p,state.last.free?'#fbbf24':'#f87171',6);else line(state.nodes[state.last.e.a],state.nodes[state.last.e.b],state.last.free?'#e2e8f0':'#ef4444',2);}
      const labels={sample:'① 采样自由空间',connect:'② 检查局部连线',query:'③ Dijkstra 搜索',done:'③ 查询完成'};
      $('prm-phase').textContent=labels[state.phase];$('prm-stats').textContent=`节点 ${state.nodes.length}/${state.target} · 合法边 ${state.edges.length} · 采样尝试 ${state.attempts}`;
      let detail=state.phase==='sample'?'黄色为本次合法样本，红色样本因碰撞被拒绝。':state.phase==='connect'?`已检查 ${state.cursor}/${state.candidates.length} 条候选边；整段不碰障碍才保留。`:'紫色节点已被 Dijkstra 确定最短距离。';
      if(state.phase==='done')detail=state.search.path.length?`找到路网内最短路，长度 ${state.search.dist[state.search.goal].toFixed(1)}；换一组起终点可复用蓝色路网。`:'本次路网未连接起终点。这不证明空间中无路；可增大采样数或连接半径再重建。';
      status.textContent=detail;$('prm-query').disabled=state.phase==='sample'||state.phase==='connect';$('prm-step').disabled=state.phase==='done';run.disabled=state.phase==='done';
    }
    function tick(){for(let i=0;i<4&&state.phase!=='done';i++)step(state);if(state.phase==='done')stop();draw();}
    run.addEventListener('click',()=>{if(running){stop();return;}if(state.phase==='done')return;running=true;run.textContent='暂停';run.setAttribute('aria-pressed','true');timer=window.setInterval(tick,70);});
    $('prm-step').addEventListener('click',()=>{stop();step(state);draw();});$('prm-reset').addEventListener('click',reset);
    ['prm-count','prm-radius'].forEach(id=>$(id).addEventListener('input',reset));
    $('prm-query').addEventListener('change',()=>{stop();query(state,$('prm-query').value);draw();});
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden)stop();});window.addEventListener('pagehide',stop);reset();
    return {getState:()=>state,stop,reset,tick};
  }
  return {create,step,finish,query,pointFree,segmentHitsRect,visible,beginSearch,searchStep,DEFAULT_OBSTACLES,QUERIES,mount};
});
