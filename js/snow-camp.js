(function () {
    'use strict';
    const E = window.SnowCamp, Scene = window.SnowCampScene;
    const $ = id => document.getElementById(id);
    const STORAGE = 'mylog-snow-camp-v1';
    let state = E.create(), saved = null, speed = 1, selected = 'furnace', last = null, lastPaint = -1, lastSave = 0, intro = true;
    const names = {furnace:'中央暖炉',housing:'保温住所',sawmill:'锯木场',kitchen:'厨房',clinic:'医务站'};
    const icons = {furnace:'♨',housing:'⌂',sawmill:'▰',kitchen:'◒',clinic:'✚'};
    const positions = {furnace:[510,330],housing:[325,405],sawmill:[735,344],kitchen:[650,475],clinic:[370,255]};
    const hints = {wood:'木材 / 建筑升级',hunt:'生食 / 暴雪减产',coal:'煤炭 / 维持供暖',cook:'生食 → 餐食',build:'逐项完成施工',medic:'需先建医务站'};
    const tips = {furnace:'气温加上供暖与住所保温，就是居民的体感温度。低于 0°C 时寒冷会累积。',housing:'房屋升级为所有居民保温，每级增加 6°C。升级须由建造工完成。',sawmill:'锯木场每级让伐木产量增加 50%。木材可用于所有建筑升级。',kitchen:'厨房升级可提高加工速度与食材利用率。没有生食，厨师也无法做饭。',clinic:'医务站建成后，分配医护才能持续恢复居民健康。保暖和充足餐食仍然重要。'};
    let storageHealthy = true;
    try { const raw=localStorage.getItem(STORAGE); if(raw) saved=E.restore(raw); }
    catch(e) { storageHealthy=false; $('save-note').textContent='存档不可用，可开始新营地'; }
    $('resume').hidden=!saved;
    if(saved) $('resume').textContent='继续上次的营地 · 第 '+E.view(saved).day+' 天';
    Object.keys(names).forEach(key=>{
        const button=document.createElement('button'); button.className='building-pin'; button.dataset.building=key;
        button.style.left=positions[key][0]/10+'%'; button.style.top=positions[key][1]/6.4+'%';
        button.setAttribute('aria-label','查看'+names[key]);button.innerHTML=names[key]+'<small id="pin-'+key+'"></small>';
        button.addEventListener('click',()=>select(key));$('building-pins').appendChild(button);
    });
    Object.keys(E.JOBS).forEach(key=>{
        const row=document.createElement('div');row.className='job-row';row.innerHTML='<div class="job-name">'+E.JOBS[key].name+'<small>'+hints[key]+'</small></div><div class="job-controls"><button data-job="'+key+'" data-delta="-1" aria-label="减少一名'+E.JOBS[key].name+'工人">−</button><b id="job-'+key+'">0</b><button data-job="'+key+'" data-delta="1" aria-label="增加一名'+E.JOBS[key].name+'工人">＋</button></div>';$('job-list').appendChild(row);
    });
    [['health','健康'],['food','饱腹'],['warm','温暖']].forEach(([key,label])=>{
        const row=document.createElement('div');row.className='need-row';row.innerHTML='<span>'+label+'</span><div class="need-track" role="meter" aria-label="居民平均'+label+'" aria-valuemin="0" aria-valuemax="100" id="meter-'+key+'"><i id="need-'+key+'"></i></div><em id="value-'+key+'">100%</em>';$('needs-list').appendChild(row);
    });
    $('job-list').addEventListener('click',e=>{const b=e.target.closest('button[data-job]');if(b) action({type:'assign',job:b.dataset.job,delta:Number(b.dataset.delta)});});
    function persist(){if(intro)return;try{localStorage.setItem(STORAGE,E.save(state));storageHealthy=true;$('save-note').textContent='已自动保存 · 本机';}catch(e){storageHealthy=false;$('save-note').textContent='无法存档 · 请勿关闭页面';}}
    function action(a){const result=E.act(state,a);$('action-message').textContent=result.message;sync();persist();return result;}
    function select(key){selected=key;$('action-message').textContent='';renderDetails();sync();}
    function renderDetails(){
        $('building-name').textContent=names[selected];$('building-art').textContent=icons[selected];$('building-description').textContent=selected==='furnace'?'暖炉是营地的心脏。燃烧煤炭，为每一位居民抵御风雪。':E.BUILDINGS[selected].description+'。';$('building-tip').textContent=tips[selected];
        if(selected==='furnace'){
            $('building-details').innerHTML='<div class="detail-label">供暖档位 · 随时调整</div><div class="heat-buttons">'+[0,1,2,3].map(n=>'<button data-heat="'+n+'" aria-label="炉火'+n+'档">'+(n===0?'熄火':n+' 档')+'</button>').join('')+'</div><div class="detail-line"><span>供暖 / 消耗</span><strong id="heat-info"></strong></div><div class="detail-line"><span>居民体感温度</span><strong id="felt-temperature"></strong></div>';
        }else{
            $('building-details').innerHTML='<div class="detail-line"><span>设施等级</span><strong id="facility-level"></strong></div><div class="detail-line"><span>升级所需木材</span><strong id="build-cost"></strong></div><div class="detail-label" id="build-progress"></div><button class="primary build-action" id="build">升级建筑</button>';
        }
    }
    $('building-details').addEventListener('click',e=>{const h=e.target.closest('[data-heat]');if(h) action({type:'heat',level:Number(h.dataset.heat)});if(e.target.closest('#build'))action({type:'build',building:selected});});
    function sync(){
        const v=E.view(state),ended=['won','lost'].includes(state.status);
        ['wood','coal','rawFood','food'].forEach(key=>{$(key).textContent=Math.floor(state.resources[key]);});
        $('population').textContent=v.population+' / 8';$('free-workers').textContent=v.freeWorkers;
        const hour=Math.floor(v.hour),minute=Math.floor((v.hour-hour)*60);
        $('day-time').textContent='第 '+v.day+' 天 · '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
        $('phase').textContent=state.status==='paused'?'已暂停':state.status==='ready'?'准备中':ended?'已结束':v.phase==='day'?'白昼':'夜晚';
        $('temperature').textContent=v.temperature+'°';$('forecast').textContent=v.forecast;$('forecast').style.color=v.storm?'#ffc18e':v.stormSoon?'#edcb91':'';
        $('day-progress').style.width=Math.min(100,v.progress*100)+'%';
        $('pause').textContent=state.status==='running'?'暂停':state.status==='ready'?'开始生存':'继续';$('pause').disabled=ended||intro;$('speed').disabled=ended||intro;$('reset').disabled=intro;
        $('scene-status').textContent=state.status==='paused'?'时间暂停 · 现在可以安心规划':ended?state.reason:v.storm?'暴风雪 · 注意保暖与食物':'至少让 5 名居民撑过第 5 天';
        Object.keys(E.JOBS).forEach(key=>{$('job-'+key).textContent=state.jobs[key];if(key==='medic')$('job-'+key).closest('.job-row').querySelector('small').textContent=state.buildings.clinic?'医护 / 恢复健康':'未启用 · 需医务站';});
        document.querySelectorAll('[data-job]').forEach(b=>{b.disabled=ended||intro||(Number(b.dataset.delta)<0?state.jobs[b.dataset.job]===0:v.freeWorkers===0);});
        document.querySelectorAll('[data-building]').forEach(b=>{b.classList.toggle('selected',b.dataset.building===selected);b.setAttribute('aria-pressed',b.dataset.building===selected?'true':'false');b.disabled=intro;$('pin-'+b.dataset.building).textContent=b.dataset.building==='furnace'?state.furnace.level+'档':'Lv.'+state.buildings[b.dataset.building];});
        $('building-level').textContent=selected==='furnace'?'营地核心':'最高 2 级';
        if(selected==='furnace'){
            document.querySelectorAll('[data-heat]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.heat)===state.furnace.level);b.setAttribute('aria-pressed',Number(b.dataset.heat)===state.furnace.level?'true':'false');b.disabled=ended||intro;});
            $('heat-info').textContent='+'+v.heat+'° / '+(E.FUEL[state.furnace.level]*E.DAY_SECONDS).toFixed(1)+' 煤/天';$('felt-temperature').textContent=v.effectiveTemperature+'°C';
        }else{
            const level=state.buildings[selected],def=E.BUILDINGS[selected],q=state.queue.find(q=>q.building===selected),build=$('build');
            $('facility-level').textContent=level+' / 2';$('build-cost').textContent=level>=2?'—':def.costs[level]+' 木材';
            $('build-progress').textContent=q?'施工 '+Math.floor(q.progress/q.required*100)+'%'+(state.jobs.build?' · '+(state.queue[0]===q?'建造中':'排队中'):' · 请分配建造工'):level>=2?'已达到最高等级':'需要建造工施工；可暂停安排';
            build.textContent=q?'施工队列中':level>=2?'已升至最高级':state.resources.wood<def.costs[level]?'木材不足':'升级至 '+(level+1)+' 级';build.disabled=ended||intro||level>=2||!!q||state.resources.wood<def.costs[level];
        }
        const living=state.residents.filter(r=>r.alive),average=key=>living.length?living.reduce((sum,r)=>sum+r[key],0)/living.length:0;
        [['health',average('health')],['food',living.length?100-average('hunger'):0],['warm',living.length?100-average('cold'):0]].forEach(([key,val])=>{val=Math.max(0,Math.min(100,Math.round(val)));$('need-'+key).style.width=val+'%';$('value-'+key).textContent=val+'%';$('meter-'+key).setAttribute('aria-valuenow',val);});
        $('needs-summary').textContent='存活 '+v.population+' 人 · 目标 ≥5 人';
        $('camp-log').replaceChildren();state.log.slice(-3).reverse().forEach(entry=>{const li=document.createElement('li');const t=document.createElement('span');t.textContent='D'+Math.min(5,Math.floor(entry.at/E.DAY_SECONDS)+1);li.appendChild(t);li.appendChild(document.createTextNode(entry.text));$('camp-log').appendChild(li);});
        const wasHidden=$('result-overlay').hidden;$('result-overlay').hidden=!ended||intro;
        if(ended){$('result-title').textContent=state.status==='won'?'黎明终于到来':'炉火仍值得再点燃';$('result-icon').textContent=state.status==='won'?'☀':'❄';$('result-description').textContent=state.reason+'\n'+(state.status==='won'?'你守住了这片风雪中的家。':'试着提前升级住所、储备食物，并在寒潮前提高炉火。');if(wasHidden&&!intro)$('result-restart').focus();}
    }
    function enter(resume){
        if(!intro)return;
        if(!resume&&saved&&!window.confirm('开始新营地会覆盖本机的旧存档。确定开始吗？'))return;
        state=resume?saved:E.create();saved=null;intro=false;last=null;$('intro-overlay').hidden=true;
        if(state.status==='ready'||state.status==='paused')E.act(state,{type:'start'});
        renderDetails();sync();persist();$('pause').focus();
    }
    $('begin').addEventListener('click',()=>enter(false));$('resume').addEventListener('click',()=>enter(true));
    $('pause').addEventListener('click',()=>{if(!intro){action({type:state.status==='running'?'pause':'start'});last=null;}});
    $('speed').addEventListener('click',()=>{speed=speed===1?2:speed===2?4:1;$('speed').textContent=speed+'× 速度';last=null;});
    function restart(){state=E.create();speed=1;selected='furnace';$('speed').textContent='1× 速度';last=null;intro=false;$('result-overlay').hidden=true;$('intro-overlay').hidden=true;renderDetails();sync();persist();$('pause').focus();}
    $('reset').addEventListener('click',()=>{if(window.confirm('确定重新开始？当前营地进度将被新营地覆盖。'))restart();});
    $('result-restart').addEventListener('click',()=>{if(['won','lost'].includes(state.status))restart();});
    document.addEventListener('visibilitychange',()=>{last=null;if(document.hidden&&state.status==='running'){E.act(state,{type:'pause'});sync();persist();}});
    window.addEventListener('pagehide',persist);
    document.addEventListener('keydown',e=>{
        const modal=!$('intro-overlay').hidden?$('intro-overlay'):!$('result-overlay').hidden?$('result-overlay'):null;
        if(modal&&e.key==='Tab'){const buttons=Array.from(modal.querySelectorAll('button')).filter(b=>!b.hidden&&!b.disabled);if(!buttons.length)return;const first=buttons[0],end=buttons[buttons.length-1];if(e.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){e.preventDefault();end.focus();}else if(!e.shiftKey&&(document.activeElement===end||!modal.contains(document.activeElement))){e.preventDefault();first.focus();}}
    });
    function frame(now){
        const dt=last===null?0:Math.min((now-last)/1000,.25);last=now;
        if(!intro&&state.status==='running')E.tick(state,dt*speed);
        if(now-lastPaint>100||lastPaint<0){Scene.draw($('camp-scene'),state,now/1000);sync();lastPaint=now;}
        if(now-lastSave>5000){persist();lastSave=now;}
        window.requestAnimationFrame(frame);
    }
    renderDetails();sync();Scene.draw($('camp-scene'),state,0);$('begin').focus();window.requestAnimationFrame(frame);
})();
