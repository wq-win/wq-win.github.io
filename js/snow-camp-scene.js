/* Original painted-canvas settlement for 雪境营地. No external assets. */
(function () {
  'use strict';
  const W = 1000, H = 640;
  const positions = { furnace: [510, 310], housing: [325, 385], sawmill: [735, 324], kitchen: [650, 455], clinic: [370, 235], coal: [760, 190], hunting: [211, 288], wood: [865, 395] };
  const rnd = n => { const v = Math.sin(n * 127.13 + 53.7) * 43758.5453; return v - Math.floor(v); };
  let c;
  function poly(points, fill, stroke, width) { c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = width || 1; c.stroke(); } }
  function ellipse(x,y,rx,ry,color) { c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fillStyle=color; c.fill(); }
  function line(points, color, width) { c.beginPath(); points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p)); c.lineCap='round'; c.lineJoin='round'; c.strokeStyle=color; c.lineWidth=width; c.stroke(); }
  function glow(x,y,r,color) { const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,color);g.addColorStop(1,'rgba(255,156,60,0)'); c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2); }
  function pine(x,y,s,seed) { c.save();c.translate(x,y);c.scale(s,s);ellipse(9,2,25,7,'rgba(51,90,111,.12)');poly([[-3,0],[3,0],[2,-39],[-2,-39]],'#665c57');for(let j=0;j<3;j++){let yy=-18-j*17, w=26-j*5;poly([[-w,yy+9],[0,yy-34],[w,yy+9],[8,yy+5],[0,yy+11],[-9,yy+6]],j===0?'#376879':'#397486');poly([[-w+3,yy+4],[0,yy-34],[w-8,yy-2],[9,yy-7],[1,yy-2],[-7,yy-8]],'#edf7fa');poly([[0,yy-34],[w-8,yy-2],[9,yy-7],[1,yy-2]],'#ccdee6');}c.restore(); }
  function rock(x,y,s) { poly([[x-15*s,y],[x-12*s,y-11*s],[x-3*s,y-18*s],[x+13*s,y-12*s],[x+18*s,y-1*s],[x+3*s,y+5*s]],'#7a939e');poly([[x-15*s,y-5*s],[x-11*s,y-14*s],[x-3*s,y-19*s],[x+13*s,y-13*s],[x+10*s,y-7*s],[x-1*s,y-5*s],[x-5*s,y-8*s]],'#e9f5f8'); }
  function windowAt(x,y,w,h) { c.fillStyle='#343e43';c.fillRect(x-2,y-2,w+4,h+4);c.fillStyle='#ffc67e';c.fillRect(x,y,w,h);c.fillStyle='#fff0b6';c.fillRect(x+1,y+1,w*.38,h-2);line([[x+w/2,y],[x+w/2,y+h]],'#686154',2); }
  function cabin(x,y,s,type,level,t) {
    c.save();c.translate(x,y);c.scale(s*(level>1?1.12:1),s*(level>1?1.12:1));ellipse(5,5,70,23,'rgba(44,72,91,.19)');
    // Visible timber walls and a deep, snow-laden pitched roof.
    poly([[-55,-48],[18,-39],[18,6],[-55,-6]],type==='clinic'?'#648a91':'#816e5c');poly([[18,-39],[58,-61],[58,-16],[18,6]],type==='clinic'?'#416974':'#5d625b');
    for(let j=0;j<5;j++)line([[-54,-43+j*9],[17,-34+j*9]],'rgba(46,52,50,.3)',1.5);
    poly([[-67,-48],[-25,-91],[69,-71],[20,-32]],'#526876');poly([[-67,-52],[-25,-97],[72,-75],[20,-38]],'#f3fbff');poly([[20,-38],[72,-75],[72,-67],[20,-30],[-67,-44],[-67,-52]],'#c1d7e2');poly([[-25,-97],[72,-75],[20,-38]],'#d8eaf2');
    // Snow lip and hanging icicles.
    line([[-65,-50],[18,-36],[70,-73]],'#fff',3);for(let j=0;j<6;j++)poly([[-54+j*12,-47+j*1.65],[-51+j*12,-46+j*1.65],[-52+j*12,-38+j*1.65]],'#effbff');
    c.fillStyle='#474d49';c.fillRect(-15,-23,18,29);line([[-15,-22],[-15,5],[2,8]],'#bdab81',2);ellipse(-1,-7,1.4,1.4,'#f3d08e');windowAt(-44,-30,17,15);poly([[29,-29],[45,-38],[45,-22],[29,-13]],'#ffd394');line([[37,-34],[37,-18]],'#595c52',2);
    poly([[-21,7],[5,11],[19,5],[-8,1]],'#dce8ec');poly([[-25,12],[6,17],[19,10],[-12,5]],'#b9cdd6');
    // Chimney and wispy winter smoke.
    poly([[30,-75],[39,-73],[39,-100],[30,-102]],'#6d6761');poly([[39,-73],[46,-78],[46,-104],[39,-100]],'#4a555c');poly([[27,-102],[37,-107],[49,-104],[39,-98]],'#eaf6fa');
    for(let k=0;k<4;k++){const p=(t*.22+k/4)%1;c.globalAlpha=(1-p)*.3;ellipse(37+Math.sin(p*5+t*.3)*9,-110-p*46,6+p*10,5+p*9,'#f1f7f6');}c.globalAlpha=1;
    if(type==='clinic'){c.fillStyle='#f4f2df';c.fillRect(-11,-52,23,21);c.fillStyle='#c66f59';c.fillRect(-2,-49,5,15);c.fillRect(-7,-44,15,5);}
    if(type==='kitchen'){line([[-58,-3],[-58,-26]],'#584d43',4);line([[-58,-24],[-39,-21]],'#584d43',3);poly([[-58,-23],[-42,-21],[-42,-10],[-58,-12]],'#c38a4e');ellipse(-50,-17,4,3,'#f5d09a');c.fillStyle='#6f7371';c.fillRect(32,-9,15,13);ellipse(39,-9,9,3,'#454f50');}
    if(type==='sawmill'){for(let j=0;j<5;j++){line([[25+j*5,17-j*2],[62+j*5,-3-j*2]],'#7d6450',8);ellipse(25+j*5,17-j*2,4,4,'#b09a6e');}poly([[-59,9],[-38,12],[-26,5],[-46,2]],'#7c6553');line([[-46,-8],[-46,8]],'#775e47',4);line([[-59,-8],[-35,-5]],'#aebbc0',5);}
    if(level>1){poly([[-52,-4],[-72,-8],[-72,-31],[-52,-27]],'#806f61');poly([[-77,-32],[-64,-46],[-42,-38],[-52,-26]],'#edf7fa');}
    glow(-35,-14,38+level*15,'rgba(255,183,75,'+(.09+level*.06)+')');c.restore();
  }
  function furnace(x,y,level,t,active) {
    const strength=Math.min(3,Math.max(0,level))/3;
    c.save();c.translate(x,y);c.scale(.68+level*.13,.68+level*.13);ellipse(8,20,94,31,'rgba(71,81,88,.18)');if(active)glow(0,4,105+level*25,'rgba(255,145,57,'+(.1+strength*.18)+')');
    // Platform, coal-fired brick cylinder, iron bands, tall flue.
    poly([[-71,9],[-19,-18],[69,0],[17,36]],'#7d8d94');poly([[-71,9],[17,36],[17,44],[-71,18]],'#637d8a');poly([[17,36],[69,0],[69,10],[17,44]],'#405e6b');line([[-68,9],[16,34],[66,1]],'#d7e5e7',5);
    poly([[-42,-59],[7,-72],[47,-48],[47,4],[6,25],[-42,5]],'#a36b49');poly([[7,-72],[47,-48],[47,4],[7,25]],'#715345');
    for(let j=0;j<5;j++){line([[-41,-49+j*13],[7,-36+j*13],[46,-53+j*13]],'rgba(60,45,37,.35)',2);for(let i=0;i<3;i++)line([[-35+i*17+(j%2)*5,-46+j*13+i*4],[-35+i*17+(j%2)*5,-37+j*13+i*4]],'rgba(60,45,37,.3)',1.5);}
    ellipse(2,-57,47,18,'#4b5960');ellipse(2,-61,42,15,'#94a4a6');poly([[-23,-63],[22,-57],[22,-148],[-23,-154]],'#7f7770');poly([[22,-57],[39,-69],[39,-157],[22,-148]],'#4e626b');
    for(let j=0;j<5;j++)line([[-23,-77-j*15],[22,-71-j*15],[38,-82-j*15]],j%2?'#a38e75':'#5b6466',3);poly([[-29,-155],[10,-170],[45,-159],[24,-143]],'#abbabe');poly([[-23,-155],[11,-165],[37,-157],[22,-148]],'#2d424c');line([[-29,-155],[23,-144],[45,-159]],'#e1edf0',5);
    // Open firebox with changing flames.
    c.fillStyle='#39474c';c.beginPath();c.roundRect(-28,-38,35,48,[15,15,1,1]);c.fill();if(active){glow(-10,-9,45+level*12,'rgba(255,125,33,'+(.25+strength*.3)+')');c.save();c.beginPath();c.rect(-27,-36,33,46);c.clip();for(let k=0;k<5;k++){let xx=-25+k*7,hh=8+level*4+Math.sin(t*4+k*2)*6;poly([[xx,10],[xx-3,-4],[xx+3,-hh],[xx+7,-2],[xx+10,10]],k%2?'#ffbc4c':'#f47c32');}c.restore();}line([[-29,11],[9,16]],'#c9a477',4);
    if(active)for(let k=0;k<3+level*2;k++){let p=(t*.13+k/9)%1;c.globalAlpha=(1-p)*.32;ellipse(12+p*49+Math.sin(p*8+t*.2)*11,-171-p*104,9+p*23,8+p*14,'#c2d0d4');}c.globalAlpha=1;
    if(active)for(let k=0;k<level*3;k++){let p=(t*.4+k/7)%1;ellipse(10+Math.sin(k*15+p*5)*16,-170-p*55,1.2,1.2,'rgba(255,189,101,'+(1-p)+')');}
    // Fuel bin and pipes.
    poly([[-66,-6],[-47,-16],[-29,-8],[-47,3]],'#394a50');poly([[-66,-6],[-47,3],[-47,16],[-66,7]],'#697171');for(let k=0;k<7;k++)rock(-58+rnd(k)*24,-5-rnd(k+3)*6,.22);line([[42,-22],[62,-16],[62,7]],'#9aa8a7',7);line([[42,-22],[62,-16]],'#c7d0c8',2);c.restore();
  }
  function buildingLevel(state,key) { const v=state.buildings?.[key];return typeof v==='number'?v:(v?.level??0); }
  function simulationTime(state) { return (Number(state.elapsed)||0)+(Number(state.remainder)||0); }
  // Job counts are authoritative. Each living resident occupies exactly one route.
  function workerRoutes(state) {
    const alive=Array.isArray(state.residents)?state.residents.filter(r=>r.alive):Array.from({length:Math.max(0,Number(state.population?.total??state.population??state.people??0))},(_,i)=>({id:i+1}));
    const jobs=[];for(const job of ['wood','hunt','coal','cook','build','medic'])for(let i=0;i<(state.jobs?.[job]||0)&&jobs.length<alive.length;i++)jobs.push(job);
    const t=simulationTime(state),home=[333,410],hub=[512,345];
    return alive.map((person,i)=>{
      const job=jobs[i]||'idle',target=job==='wood'?(buildingLevel(state,'sawmill')>0?'sawmill':'wood'):job==='hunt'?'hunting':job==='cook'?'kitchen':job==='build'?state.queue?.[0]?.building:job==='medic'?(buildingLevel(state,'clinic')>0?'clinic':null):job==='coal'?'coal':null;
      const active=!!target,seed=person.id??i,phase=((t+seed*3.9)%32)/32;
      if(!active)return {id:seed,job,target:null,stage:'idle',x:home[0]-52+(i%4)*19,y:home[1]+18+Math.floor(i/4)*17,carrying:false};
      const pos=positions[target],end=[pos[0]+(i%3-1)*10,pos[1]+23];
      let stage,points,progress;
      if(phase<.3){stage='outbound';points=[home,hub,end];progress=phase/.3;}
      else if(phase<.65){stage='working';points=[end,end,end];progress=0;}
      else {stage='returning';points=[end,hub,home];progress=(phase-.65)/.35;}
      const segment=progress<.5?0:1,f=(progress-segment*.5)*2,a=points[segment],b=points[segment+1];
      return {id:seed,job,target,stage,x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,carrying:stage==='returning'&&['wood','hunt','coal','cook'].includes(job)};
    });
  }
  function resident(worker,t) {
    const {x,y,id:seed,job,stage,carrying}=worker,moving=stage==='outbound'||stage==='returning',work=stage==='working',swing=Math.sin(t*7+seed),bob=moving?swing*.8:0;
    c.save();c.translate(x,y+bob);ellipse(2,3,5,2,'rgba(61,85,99,.17)');line([[-1,1],[-2+(moving?swing:0),4]],'#425869',2);line([[2,1],[3-(moving?swing:0),4]],'#425869',2);
    c.fillStyle={wood:'#b88454',hunt:'#7c8d75',coal:'#677889',cook:'#ddbb87',build:'#b7784d',medic:'#d0e4df',idle:'#8395a6'}[job];c.beginPath();c.roundRect(-3,-7,7,9,3);c.fill();ellipse(0,-8,3,3,'#e6c8a5');ellipse(0,-10,4,2.2,job==='build'?'#d7ac61':'#596c79');
    if(work){const arm=job==='medic'?swing:Math.sin(t*5+seed)*4;line([[2,-5],[7,-4-arm]],'#d8b590',2);if(['wood','coal','build'].includes(job)){line([[7,-4-arm],[10,-12-arm]],'#76604d',2);line([[6,-12-arm],[13,-11-arm]],'#a9bbc1',3);}else if(job==='cook'){line([[7,-3-arm],[10,2]],'#886747',2);ellipse(9,3,5,2,'#637581');}else if(job==='medic'){c.fillStyle='#f2eee2';c.fillRect(5,-3,6,5);line([[8,-2],[8,1]],'#bd6f5d',1);}}
    if(carrying){if(job==='wood'){line([[3,-3],[11,-6]],'#85664e',4);ellipse(3,-3,2,2,'#c4a278');}else {c.fillStyle=job==='coal'?'#40555f':job==='cook'?'#d5b276':'#a68a70';c.fillRect(3,-4,8,6);line([[3,-4],[11,-4]],'#e0c9a3',1);}}
    c.restore();
  }
  function tent(x,y,s) { c.save();c.translate(x,y);c.scale(s,s);ellipse(3,5,53,15,'rgba(54,83,99,.14)');poly([[-49,3],[-7,-58],[45,0]],'#b69b7c');poly([[-7,-58],[45,0],[63,-12],[18,-59]],'#7f8c89');poly([[-52,-1],[-8,-61],[20,-62],[18,-55],[-6,-52],[-39,2]],'#f4fafb');poly([[-21,3],[-7,-35],[7,5]],'#485e65');line([[-55,5],[-8,-60],[48,4]],'#d6c5a5',2);line([[-43,-2],[-61,14]],'#928977',1);line([[43,-1],[62,13]],'#928977',1);glow(-7,0,24,'rgba(255,178,81,.10)');c.restore(); }
  function plot(x,y) { ellipse(x,y,61,19,'rgba(185,207,216,.35)');poly([[x-49,y-9],[x+6,y-29],[x+53,y-9],[x-1,y+14]],'rgba(234,244,247,.65)','#b5cbd4',2);[[-49,-9],[6,-29],[53,-9],[-1,14]].forEach(([dx,dy])=>{line([[x+dx,y+dy],[x+dx,y+dy-12]],'#a49480',3);ellipse(x+dx,y+dy-12,3,1.5,'#f6fbfc');}); }
  function cookingCamp(x,y,t,staffed) { tent(x+24,y-14,.58);ellipse(x-17,y+5,24,9,'#b5b2a4');for(let i=0;i<7;i++){let a=i*Math.PI*2/7;rock(x-18+Math.cos(a)*20,y+3+Math.sin(a)*7,.22);}line([[x-35,y+2],[x-22,y-33],[x-4,y+2]],'#77634f',3);if(staffed){glow(x-20,y,38,'rgba(255,157,65,.19)');poly([[x-28,y],[x-24,y-9-Math.sin(t*4)*3],[x-20,y-3],[x-16,y-12],[x-11,y]],'#eead55');}c.fillStyle='#4c6067';c.fillRect(x-28,y-18,17,10);ellipse(x-19.5,y-18,8.5,3,'#71848a');line([[x-19,y-22],[x-19,y-29]],'#536771',2); }
  function scaffold(x,y,queue,index) { const progress=Math.max(0,Math.min(1,queue.progress/queue.required));c.save();c.translate(x,y);for(const xx of [-63,56]){line([[xx,12],[xx,-77]],'#a58a65',4);line([[xx+9,11],[xx+9,-67]],'#7e7765',3);}line([[-65,-42],[66,-42]],'#b69b73',5);line([[-62,-76],[58,-76]],'#c0a57c',4);line([[-62,9],[58,-75]],'#9d8868',2);line([[56,9],[-62,-75]],'#9d8868',2);c.fillStyle='#4d6875';c.fillRect(-44,21,90,8);c.fillStyle=index===0?'#e8bb71':'#9cafb7';c.fillRect(-42,23,86*progress,4);c.font='10px sans-serif';c.textAlign='center';c.fillStyle='#425f70';c.fillText(index===0?'施工 '+Math.round(progress*100)+'%':'排队 '+(index+1),0,43);c.restore(); }
  function draw(canvas,state,timeSeconds){
    if(!canvas)return;state=state||{};const t=simulationTime(state);const dpr=Math.min(window.devicePixelRatio||1,2);const r=canvas.getBoundingClientRect();const cw=Math.max(1,r.width||W),ch=Math.max(1,r.height||H);if(canvas.width!==Math.round(cw*dpr)||canvas.height!==Math.round(ch*dpr)){canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);}c=canvas.getContext('2d');c.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);c.clearRect(0,0,W,H);
    const view=window.SnowCamp?.view ? window.SnowCamp.view(state) : {};const weather=String(state.weather?.type||state.weather||state.status||'');const storm=!!view.storm||/blizzard|storm|暴风/i.test(weather)||state.blizzard===true;const night=state.isNight===true||view.phase==='night'||view.hour>=19||view.hour<6||state.phase==='night'||state.dayPhase==='night';
    const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,night?'#537388':'#9dbfce');sky.addColorStop(.43,night?'#90b0c0':'#d9eaf0');sky.addColorStop(1,'#eef6f8');c.fillStyle=sky;c.fillRect(0,0,W,H);
    // Distant high alpine valley, mist-softened peaks.
    poly([[0,155],[83,85],[124,112],[227,28],[311,119],[371,66],[457,145],[548,51],[627,120],[714,42],[809,137],[906,64],[1000,114],[1000,260],[0,260]],'#a2becd');
    poly([[111,130],[227,28],[311,119],[268,91],[243,103],[224,63],[203,91],[180,94]],'#e3f1f5');poly([[474,145],[548,51],[627,120],[571,91],[550,80],[528,110],[505,113]],'#e3f1f5');poly([[633,143],[714,42],[809,137],[748,99],[722,83],[706,111],[678,103]],'#e5f1f4');
    poly([[0,204],[139,141],[259,189],[392,133],[535,188],[669,129],[830,185],[1000,131],[1000,H],[0,H]],'#c3d9e3');
    for(let i=0;i<38;i++)pine(i*29-15,182+Math.sin(i*.64)*17,.37+rnd(i)*.24,i);
    poly([[0,261],[135,218],[253,240],[404,189],[563,222],[744,190],[866,223],[1000,211],[1000,H],[0,H]],'#e3eff4');
    const snow=c.createLinearGradient(0,220,0,640);snow.addColorStop(0,'#d9e8ef');snow.addColorStop(.5,'#eaf4f8');snow.addColorStop(1,'#c7dfe9');c.fillStyle=snow;c.fillRect(0,270,W,370);
    // Blue glacial creek around the lower edge of the settlement.
    line([[-40,472],[93,464],[168,503],[242,538],[405,552],[534,595],[725,581],[850,609],[1050,575]],'#c3dce7',43);line([[-40,472],[93,464],[168,503],[242,538],[405,552],[534,595],[725,581],[850,609],[1050,575]],'#a5cbdc',21);line([[-40,465],[93,456],[168,495],[242,530],[405,544],[534,587],[725,573],[850,601],[1050,567]],'#f7fcff',6);
    for(let i=0;i<65;i++){let x=rnd(i+44)*1000,y=220+rnd(i+73)*410;ellipse(x,y,12+rnd(i)*38,2+rnd(i+9)*3,'rgba(255,255,255,.29)');}
    const furnaceLevel=state.furnace?.level??0;const furnaceActive=typeof view.furnaceActive==='boolean'?view.furnaceActive:furnaceLevel>0&&(state.resources?.coal??0)>0;
    // Active heat melts a progressively larger clearing around the actual furnace.
    if(furnaceActive){const radius=67+furnaceLevel*40;ellipse(510,329,radius,radius*.49,'rgba(155,164,151,.17)');ellipse(510,329,radius*.77,radius*.34,'rgba(177,171,143,.17)');glow(510,329,radius*1.15,'rgba(255,185,91,'+(.08+furnaceLevel*.035)+')');c.save();c.strokeStyle='rgba(224,173,98,.24)';c.lineWidth=1.5;c.beginPath();c.ellipse(510,329,radius,radius*.49,0,0,Math.PI*2);c.stroke();c.restore();}
    // Paths make the village read as a connected working camp.
    const paths=[[[503,329],[401,344],[324,401]],[[510,333],[607,364],[647,468]],[[520,321],[634,325],[737,341]],[[497,306],[432,277],[368,249]],[[733,329],[767,218]],[[402,345],[224,306]],[[744,341],[863,407]]];
    paths.forEach(p=>{if(p.length===2)p.splice(1,0,[(p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2]);line(p,'rgba(176,199,209,.3)',30);line(p,'#d0e0e6',21);line(p,'rgba(237,246,248,.5)',10);for(let i=0;i<16;i++){const v=i/15,a=v<.5?p[0]:p[1],b=v<.5?p[1]:p[2],f=(v%0.5)*2;ellipse(a[0]+(b[0]-a[0])*f+(i%2?2:-2),a[1]+(b[1]-a[1])*f,1.3,2,'rgba(116,151,167,.25)');}});
    // Outer wilderness and resource camps.
    for(let i=0;i<18;i++)pine(31+rnd(i+17)*132,260+rnd(i+7)*184,.65+rnd(i+10)*.55,i);
    for(let i=0;i<15;i++)pine(856+rnd(i+31)*130,220+rnd(i+93)*250,.7+rnd(i+4)*.5,i);
    for(let i=0;i<8;i++)rock(744+rnd(i)*85,205+rnd(i+13)*18,.65+rnd(i+5)*.7);
    poly([[753,219],[753,183],[781,168],[805,182],[805,213]],'#5d747c');poly([[758,214],[758,187],[780,177],[796,187],[796,215]],'#344c58');poly([[746,185],[778,162],[812,182],[803,188],[779,172],[754,191]],'#f5fbfd');line([[768,211],[740,248]],'#687f84',2);line([[790,215],[763,252]],'#687f84',2);for(let i=0;i<5;i++)line([[766-i*5,216+i*6],[785-i*5,220+i*6]],'#7f8d8b',2);
    poly([[183,306],[215,258],[249,300]],'#9c8470');poly([[215,258],[249,300],[257,290],[230,260]],'#6e7976');poly([[180,301],[215,255],[231,259],[215,266],[190,304]],'#eef7f8');poly([[207,302],[216,278],[227,303]],'#425a63');line([[187,306],[249,305]],'#c5d4d7',3);
    function level(k){return buildingLevel(state,k);}
    if(level('clinic'))cabin(370,235,.79,'clinic',level('clinic'),t);else plot(370,235);
    if(level('sawmill'))cabin(735,324,.96,'sawmill',level('sawmill'),t);else plot(735,324);
    // Lanterns are installed as the settlement grows, at stable original positions.
    [['housing',425,369],['kitchen',596,390],['sawmill',641,294],['clinic',295,322]].forEach(([key,x,y])=>{const built=level(key);if(!built)return;ellipse(x+4,y+3,9,3,'rgba(62,92,107,.15)');line([[x,y],[x,y-35]],'#5b737e',3);line([[x,y-35],[x+9,y-35]],'#5b737e',3);c.fillStyle='#ffda8d';c.fillRect(x+5,y-34,7,9);poly([[x+2,y-34],[x+9,y-40],[x+15,y-34]],'#5f7780');glow(x+8,y-29,29+built*12,'rgba(255,192,86,'+(.12+built*.06)+')');});
    furnace(510,310,furnaceLevel,t,furnaceActive);
    if(level('housing')){cabin(325,385,1.08,'housing',level('housing'),t);cabin(235,423,.68,'housing',level('housing'),t+3);}else {tent(325,385,1.08);tent(235,423,.78);}
    if(level('kitchen'))cabin(650,455,1.05,'kitchen',level('kitchen'),t+2);else cookingCamp(650,455,t,(state.jobs?.cook||0)>0);
    (state.queue||[]).forEach((q,index)=>{const pos=positions[q.building];if(pos)scaffold(pos[0],pos[1],q,index);});
    for(let i=0;i<5;i++){line([[837,414-i*6],[880,395-i*6]],'#7a6654',8);ellipse(837,414-i*6,4,4,'#bba47d');}
    // Real assigned workers commute, work, and carry supplies back to camp.
    workerRoutes(state).sort((a,b)=>a.y-b.y).forEach(worker=>resident(worker,t));
    // Snowy foreground pines frame the scene without obscuring the camp.
    [[46,576,1.65],[112,611,1.35],[182,587,1.13],[909,589,1.6],[980,556,1.7],[824,620,1.15]].forEach((a,i)=>pine(...a,i));rock(758,554,1.1);rock(185,524,.65);
    if(night){c.fillStyle='rgba(23,51,80,.25)';c.fillRect(0,0,W,H);if(furnaceActive)glow(505,316,140+furnaceLevel*20,'rgba(255,150,66,'+(.08+furnaceLevel*.04)+')');}
    if(storm){c.fillStyle='rgba(204,224,237,.22)';c.fillRect(0,0,W,H);}
    // Depth-layered snowfall; restrained at normal weather, fast in a whiteout.
    for(let i=0;i<(storm?150:62);i++){let speed=storm?52:14;let x=(rnd(i+530)*W+t*(storm?45:7)*(0.3+rnd(i)))%(W+40)-20;let y=(rnd(i+101)*H+t*speed*(.4+rnd(i+2)))%(H+20)-10;let sz=.7+rnd(i+66)*1.6;c.globalAlpha=.25+rnd(i+78)*.5;if(storm)line([[x,y],[x-7,y-5]],'#fff',sz);else ellipse(x,y,sz,sz,'#fff');}c.globalAlpha=1;
    const vignette=c.createRadialGradient(500,310,200,500,310,680);vignette.addColorStop(0,'rgba(53,86,103,0)');vignette.addColorStop(1,'rgba(40,75,97,.18)');c.fillStyle=vignette;c.fillRect(0,0,W,H);
  }
  window.SnowCampScene={draw,positions,workerRoutes,simulationTime,width:W,height:H};
})();
