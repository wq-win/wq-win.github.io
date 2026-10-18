(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.SnowCamp=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    const VERSION=1,DAY_SECONDS=96,DURATION=480;
    const JOBS={wood:{name:'伐木',description:'每人每秒采集 0.13 木材'},hunt:{name:'狩猎',description:'每人每秒采集 0.16 生食，暴风雪中减半'},coal:{name:'采煤',description:'每人每秒采集 0.08 煤炭'},cook:{name:'烹饪',description:'每人每秒将 0.20 生食加工成口粮'},build:{name:'建造',description:'每人每秒完成 0.8 建造进度'},medic:{name:'医疗',description:'建成医务站后照顾伤员'}};
    const BUILDINGS={housing:{name:'保温住所',description:'每级为全体居民增加 6°C 保温',costs:[20,32],work:[18,30]},sawmill:{name:'锯木场',description:'每级增加 50% 伐木产量',costs:[18,28],work:[16,26]},kitchen:{name:'厨房',description:'每级提高烹饪速度与食材利用率',costs:[16,26],work:[16,26]},clinic:{name:'医务站',description:'让医护人员持续恢复全体居民健康',costs:[18,28],work:[18,28]}};
    const HEAT=[0,14,26,38],FUEL=[0,.08,.20,.34];
    const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
    function note(s,text){s.log.push({at:s.elapsed,text});if(s.log.length>24)s.log.shift();}
    function create(){return {version:VERSION,status:'ready',elapsed:0,remainder:0,resources:{wood:16,rawFood:8,food:12,coal:20},jobs:{wood:2,hunt:1,coal:2,cook:1,build:1,medic:1},buildings:{housing:0,sawmill:0,kitchen:0,clinic:0},queue:[],residents:Array.from({length:8},(_,i)=>({id:i+1,health:100,hunger:0,cold:0,alive:true})),furnace:{level:1},log:[{at:0,text:'八名居民抵达雪境。维持供暖与口粮，至少让五人撑过五天。'}],reason:''};}
    function view(s){
        const day=Math.min(5,Math.floor(s.elapsed/DAY_SECONDS)+1),hour=(8+s.elapsed/4)%24,phase=hour>=7&&hour<19?'day':'night';
        const storm=(s.elapsed>=216&&s.elapsed<300)||s.elapsed>=408;
        const stormSoon=(s.elapsed>=168&&s.elapsed<216)||(s.elapsed>=360&&s.elapsed<408);
        const temperature=-14-(day-1)*2-(phase==='night'?8:0)-(storm?12:0);
        const furnaceActive=s.furnace.level>0&&s.resources.coal+s.jobs.coal*.08>=FUEL[s.furnace.level];
        const heat=furnaceActive?HEAT[s.furnace.level]:0;
        const population=s.residents.filter(r=>r.alive).length,workers=Object.values(s.jobs).reduce((a,b)=>a+b,0);
        const hunting=s.jobs.hunt*.16*(storm?.5:1);
        const cooking=Math.min(s.jobs.cook*.20*(1+s.buildings.kitchen*.5),(s.resources.rawFood+hunting)*(1+s.buildings.kitchen*.25)),rawNeeded=cooking/(1+s.buildings.kitchen*.25);
        return {day,hour,phase,temperature,stormSoon,storm,workers,freeWorkers:population-workers,population,heat,furnaceActive,effectiveTemperature:temperature+heat+10+s.buildings.housing*6,foodPerDay:population*.02*DAY_SECONDS,progress:s.elapsed/DURATION,forecast:storm?'暴风雪正在肆虐':stormSoon?'暴风雪将在 '+Math.ceil(((s.elapsed<216?216:408)-s.elapsed)/4)+' 小时后抵达':'第 3 天与第 5 天将有暴风雪',rates:{wood:s.jobs.wood*.13*(1+s.buildings.sawmill*.5),rawFood:s.jobs.hunt*.16*(storm?.5:1)-rawNeeded,food:cooking-population*.02,coal:s.jobs.coal*.08-(furnaceActive?FUEL[s.furnace.level]:0)}};
    }
    function act(s,a){
        const fail=message=>({ok:false,message});
        if(!a||typeof a!=='object')return fail('无效操作');
        if(a.type==='restart'){Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,create());return {ok:true,message:'已重新开始'};}
        if(a.type==='start'){
            if(!['ready','paused'].includes(s.status))return fail('当前无法开始');s.status='running';return {ok:true,message:'营地时间开始流动'};
        }
        if(a.type==='pause'){if(s.status!=='running')return fail('当前没有运行');s.status='paused';return {ok:true,message:'已暂停'};}
        if(!['ready','running','paused'].includes(s.status))return fail('本局已经结束');
        if(a.type==='assign'){
            if(!Object.hasOwn(JOBS,a.job)||![-1,1].includes(a.delta))return fail('无效岗位');
            if(a.delta<0&&s.jobs[a.job]===0)return fail('该岗位没有居民');
            if(a.delta>0&&view(s).freeWorkers===0)return fail('请先从其他岗位调出一人');
            s.jobs[a.job]+=a.delta;return {ok:true,message:'岗位已调整'};
        }
        if(a.type==='heat'){
            if(!Number.isInteger(a.level)||a.level<0||a.level>3)return fail('炉火仅支持 0 至 3 级');
            s.furnace.level=a.level;return {ok:true,message:a.level?'炉火已调整':'炉火已关闭'};
        }
        if(a.type==='build'){
            if(!Object.hasOwn(BUILDINGS,a.building))return fail('未知建筑');
            const b=BUILDINGS[a.building],level=s.buildings[a.building];
            if(level>=2)return fail('已达到最高等级');
            if(s.queue.some(q=>q.building===a.building))return fail('该建筑已在施工队列中');
            if(s.resources.wood+1e-8<b.costs[level])return fail('木材不足');
            s.resources.wood-=b.costs[level];s.queue.push({building:a.building,target:level+1,progress:0,required:b.work[level]});note(s,b.name+'已加入施工队列');return {ok:true,message:'已支付木材，等待建造工施工'};
        }
        return fail('未知操作');
    }
    function step(s){
        const before=view(s);s.elapsed++;
        const v=view(s),r=s.resources,j=s.jobs;
        if(v.day!==before.day)note(s,'第 '+v.day+' 天开始');
        if(v.stormSoon&&!before.stormSoon)note(s,'风暴预警：12 小时后暴风雪抵达，请储备煤炭与口粮。');
        if(v.storm&&!before.storm)note(s,'暴风雪抵达：气温骤降，猎人产量减半。');
        if(!v.storm&&before.storm)note(s,'第一场暴风雪已经过去。');
        r.wood+=v.rates.wood;r.rawFood+=j.hunt*.16*(v.storm?.5:1);r.coal+=j.coal*.08;
        const fuel=FUEL[s.furnace.level],active=s.furnace.level>0&&r.coal>=fuel;
        if(active)r.coal-=fuel;
        const warmth=v.temperature+(active?HEAT[s.furnace.level]:0)+10+s.buildings.housing*6;
        const efficiency=1+s.buildings.kitchen*.25,cooked=Math.min(j.cook*.20*(1+s.buildings.kitchen*.5),r.rawFood*efficiency);
        r.rawFood-=cooked/efficiency;r.food+=cooked;
        if(s.queue.length&&j.build){const q=s.queue[0];q.progress+=j.build*.8;if(q.progress+1e-8>=q.required){s.buildings[q.building]=q.target;s.queue.shift();note(s,BUILDINGS[q.building].name+' '+q.target+' 级已建成');}}
        // Rotate ration order each second so shortages do not always hurt the last resident.
        for(let n=0;n<8;n++){
            const resident=s.residents[(n+s.elapsed)%8];if(!resident.alive)continue;
            resident.hunger=clamp(resident.hunger+.4,0,100);
            if(resident.hunger>=20&&r.food>=1){r.food--;resident.hunger-=20;}
            resident.cold=clamp(resident.cold+(warmth<0?-warmth*.065:-.35),0,100);
            const injury=Math.max(0,resident.cold-35)*.035+Math.max(0,resident.hunger-60)*.035;
            const healing=s.buildings.clinic*j.medic*.055+(resident.hunger<40&&resident.cold<25?.025:0);
            resident.health=clamp(resident.health-injury+healing,0,100);
            if(resident.health<=0){resident.alive=false;note(s,'居民 '+resident.id+' 未能挺过寒冬。');}
        }
        let excess=Object.values(j).reduce((a,b)=>a+b,0)-s.residents.filter(p=>p.alive).length;
        for(const job of ['medic','build','wood','hunt','cook','coal'])while(excess>0&&j[job]>0){j[job]--;excess--;}
        if(s.residents.filter(p=>p.alive).length<5){s.status='lost';s.reason='不足五名居民存活，营地无法继续维持。';note(s,s.reason);}
        else if(s.elapsed>=DURATION){s.status='won';s.reason='救援队抵达！你让 '+view(s).population+' 名居民撑过了五天。';note(s,s.reason);}
        for(const key of Object.keys(r))r[key]=clamp(r[key],0,9999);
    }
    function tick(s,seconds=1){
        if(s.status!=='running'||!Number.isFinite(seconds)||seconds<=0)return s;
        s.remainder+=Math.min(seconds,5);
        while(s.remainder>=1&&s.status==='running'){s.remainder-=1;step(s);}
        if(s.status!=='running')s.remainder=0;
        return s;
    }
    function validate(s){
        const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
        const int=(v,min,max)=>Number.isInteger(v)&&num(v,min,max);
        const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
        if(!exact(s,['version','status','elapsed','remainder','resources','jobs','buildings','queue','residents','furnace','log','reason'])||s.version!==VERSION||!['ready','running','paused','won','lost'].includes(s.status)||!int(s.elapsed,0,DURATION)||!num(s.remainder,0,.9999999999999999))throw Error('存档版本或时间无效');
        if(!exact(s.resources,['wood','rawFood','food','coal'])||!Object.values(s.resources).every(v=>num(v,0,9999))||!exact(s.jobs,Object.keys(JOBS))||!Object.values(s.jobs).every(v=>int(v,0,8))||!exact(s.buildings,Object.keys(BUILDINGS))||!Object.values(s.buildings).every(v=>int(v,0,2))||!exact(s.furnace,['level'])||!int(s.furnace.level,0,3))throw Error('存档资源或岗位无效');
        if(!Array.isArray(s.residents)||s.residents.length!==8||!s.residents.every((p,i)=>exact(p,['id','health','hunger','cold','alive'])&&p.id===i+1&&num(p.health,0,100)&&num(p.hunger,0,100)&&num(p.cold,0,100)&&typeof p.alive==='boolean'&&p.alive===(p.health>0)))throw Error('存档居民无效');
        const population=s.residents.filter(p=>p.alive).length;
        if(Object.values(s.jobs).reduce((a,b)=>a+b,0)>population)throw Error('存档岗位人数超额');
        if(!Array.isArray(s.queue)||s.queue.length>4||new Set(s.queue.map(q=>q.building)).size!==s.queue.length||!s.queue.every(q=>exact(q,['building','target','progress','required'])&&Object.hasOwn(BUILDINGS,q.building)&&q.target===s.buildings[q.building]+1&&int(q.target,1,2)&&q.required===BUILDINGS[q.building].work[q.target-1]&&num(q.progress,0,q.required)&&q.progress<q.required))throw Error('存档施工队列无效');
        if(!Array.isArray(s.log)||s.log.length>24||!s.log.every(l=>exact(l,['at','text'])&&int(l.at,0,s.elapsed)&&typeof l.text==='string'&&l.text.length<=180)||typeof s.reason!=='string'||s.reason.length>180)throw Error('存档记录无效');
        if((s.status==='ready'&&s.elapsed!==0)||(s.status==='won'&&(s.elapsed!==DURATION||population<5))||(s.status==='lost'&&population>=5)||(['ready','running','paused'].includes(s.status)&&(population<5||s.elapsed>=DURATION)))throw Error('存档状态无效');
        return s;
    }
    function save(s){validate(s);return JSON.stringify(s);}
    function restore(text){if(typeof text!=='string'||text.length>16000)throw Error('存档无效');let s;try{s=JSON.parse(text);}catch(e){throw Error('无法读取存档');}validate(s);if(s.status==='running')s.status='paused';return s;}
    return {VERSION,DAY_SECONDS,DURATION,JOBS,BUILDINGS,HEAT,FUEL,create,view,act,tick,save,restore};
});
