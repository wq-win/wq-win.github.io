(function(root,factory) {
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.ForestDefense=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function() {
    'use strict';
    const WAVES_PER_LEVEL=6,LEVEL_COUNT=20;
    const PATH=[[ -35,175],[175,175],[310,290],[510,290],[655,447],[815,447],[925,330],[1035,330]];
    const SLOTS=[[145,265],[300,190],[435,385],[525,190],[655,325],[785,350],[870,520],[915,230]];
    const MAPS=[
        {name:'翡翠弯道',path:PATH,slots:SLOTS,brief:'连续弯道适合减速与范围火力。'},
        {name:'双湾哨站',path:[[-35,175],[220,175],[220,420],[530,420],[530,170],[810,170],[810,330],[1035,330]],slots:[[140,265],[320,250],[365,505],[440,320],[620,265],[700,90],[900,230],[900,430]],brief:'两段回折，决定把火力放在入口还是出口。'},
        {name:'石桥急行',path:[[-35,175],[250,175],[450,330],[730,330],[860,180],[950,180],[950,330],[1035,330]],slots:[[150,265],[320,100],[365,300],[510,225],[630,420],[760,240],[850,390],[880,100]],brief:'路线较短，远程箭塔与截击火力更重要。'}
    ];
    const ENEMY_NAMES={goblin:'散兵',runner:'快骑',brute:'重甲',boss:'首领'};
    const PROFILES=[
        {name:'林道初战',order:['goblin','runner','goblin','brute','runner','boss'],tip:'观察下一波，再决定补塔还是升级。'},
        {name:'快骑突袭',order:['runner','goblin','runner','brute','runner','boss'],tip:'快骑血薄但移动快，覆盖出口并搭配减速。'},
        {name:'铁甲先锋',order:['goblin','brute','runner','brute','brute','boss'],tip:'重甲抵抗物理攻击，魔法塔能直接穿透。'},
        {name:'兽潮围城',order:['goblin','goblin','runner','goblin','brute','boss'],tip:'密集兽潮适合炮塔；保留单体火力应对首领。'}
    ];
    function mission(level) {const map=MAPS[(level-1)%MAPS.length],profile=PROFILES[(level-1)%PROFILES.length];return {...map,...profile,mapName:map.name,goal:level%4===0?'三星挑战：生命至少 18，建塔不超过 5 座':'三星挑战：以至少 18 点生命守住六波',limited:level%4===0};}
    const TYPES= {
        arrow: {
            name:'箭塔',cost:90,range:175,damage:22,rate:.65,color:'#b7df65',description:'射速快 · 应对游骑兵'
        },magic: {
            name:'魔法塔',cost:130,range:155,damage:40,rate:1.08,color:'#66ddff',description:'无视护甲 · 命中减速'
        },cannon: {
            name:'炮塔',cost:155,range:165,damage:48,rate:1.65,color:'#ffbd61',description:'范围轰击 · 克制集群'
        }
    };
    function route(path=PATH) {const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));return {lengths,total:lengths.reduce((a,b)=>a+b,0)};}
    const total=route().total;
    function position(distance,path=PATH) {
        const {lengths}=route(path);
        for(let i=0;i<lengths.length;i++) {if(distance<=lengths[i]) {const t=Math.max(0,distance)/lengths[i];return {x:path[i][0]+(path[i+1][0]-path[i][0])*t,y:path[i][1]+(path[i+1][1]-path[i][1])*t};}distance-=lengths[i];}
        return {x:path[path.length-1][0],y:path[path.length-1][1]};
    }
    function create(level=1) {
        if(!Number.isInteger(level)||level<1||level>LEVEL_COUNT)throw new RangeError('Invalid level');
        return {
            level,gold:300,health:20,wave:0,built:0,leaks:0,state:'ready',towers:SLOTS.map(()=>null),enemies:[],effects:[],queue:[],spawn:0,kills:0,id:0,time:0
        };
    }
    function stats(t) {
        const b=TYPES[t.type];
        return {
            ...b,damage:b.damage*(1+.65*(t.level-1))*(t.branch==='power'?1.4:t.branch==='reach'?.85:1),range:b.range+15*(t.level-1)+(t.branch==='reach'?55:t.branch==='power'?-20:0),rate:b.rate/(1+.12*(t.level-1)),splash:t.branch==='reach'?90:58,slow:t.branch==='reach'?2.8:1.6
        };
    }
    function build(s,index,type) {
        if(!Number.isInteger(index)||index<0||index>=SLOTS.length||!Object.hasOwn(TYPES,type)||s.towers[index]||s.gold<TYPES[type].cost||['cleared','won','lost'].includes(s.state))return false;
        s.gold-=TYPES[type].cost;
        s.built++;
        s.towers[index]= {
            type,level:1,cooldown:0,angle:-Math.PI/2
        };
        return true;
    }
    function upgradeCost(t) {
        return Math.round(TYPES[t.type].cost*(t.level===1?.8:1.25));
    }
    function upgrade(s,index,branch='power') {
        const t=s.towers[index];
        if(!['power','reach'].includes(branch)||!t||t.level>=3||s.gold<upgradeCost(t)||['cleared','won','lost'].includes(s.state))return false;
        s.gold-=upgradeCost(t);
        t.level++;
        if(t.level===3)t.branch=branch;
        return true;
    }
    function sell(s,index) {const t=s.towers[index];if(s.state!=='ready'||!t)return false;const base=TYPES[t.type].cost; s.gold+=Math.floor((base+(t.level>=2?Math.round(base*.8):0)+(t.level>=3?Math.round(base*1.25):0))*.7);s.towers[index]=null;return true;}
    const difficulty = level => (level-1)/(LEVEL_COUNT-1);
    function wavePlan(level,wave) {
        const m=mission(level),focus=m.order[wave-1];
        if(!focus)return null;
        const count=8+wave*2+Math.floor(difficulty(level)*4)+(m.name==='兽潮围城'?4:0);
        const queue=Array.from({length:count},(_,i)=> focus==='boss'?(i%3===0?'brute':i%3===1?'runner':'goblin'):focus==='brute'?(i%3===0?'goblin':'brute'):focus==='runner'?(i%4===0?'goblin':'runner'):'goblin');
        if(focus==='boss')queue.push('boss');
        return {focus,queue,label:focus==='boss'?'首领决战':ENEMY_NAMES[focus]+'来袭',tip:focus==='brute'?'重甲减伤：魔法破甲':focus==='runner'?'快速突围：出口补防 / 减速':focus==='boss'?'首领扣 5 生命：集中单体火力':'集群推进：炮塔范围攻击',gap:focus==='goblin'?.38:focus==='brute'?.9:.62};
    }
    function startWave(s) {
        if(s.state!=='ready'||s.wave>=WAVES_PER_LEVEL)return false;
        s.wave++;s.state='running';s.spawn=.4;
        s.queue=wavePlan(s.level,s.wave).queue.slice();return true;
    }
    function rating(s) {if(!['cleared','won'].includes(s.state))return 0;return 1+(s.health>=12?1:0)+(s.health>=18&&(!mission(s.level).limited||s.built<=5)?1:0);}
    function spawn(s,type) {
        const data= {
            goblin:[55,50,11,0],runner:[38,78,12,0],brute:[135,34,18,.5],boss:[950,27,45,.3]
        }
        [type],scale=(1+(s.wave-1)*.25)*(1+difficulty(s.level)*.30);
        const e= {
            id:++s.id,type,hp:data[0]*scale,maxHp:data[0]*scale,speed:data[1]*(1+difficulty(s.level)*.12),reward:data[2],armor:data[3],distance:0,slow:0,...position(0,mission(s.level).path)
        };
        s.enemies.push(e);
        return e;
    }
    function tick(s,dt) {
        if(s.state!=='running')return;
        dt=Math.max(0,Math.min(dt,.1));
        s.time+=dt;
        s.effects=s.effects.filter(e=>(e.life-=dt)>0);
        s.spawn-=dt;
        if(s.queue.length&&s.spawn<=0) {
            spawn(s,s.queue.shift());
            s.spawn=wavePlan(s.level,s.wave).gap/(1+difficulty(s.level)*.1);
        }
        for(const e of s.enemies) {
            e.slow=Math.max(0,e.slow-dt);
            e.flash=Math.max(0,(e.flash||0)-dt);
            e.distance+=e.speed*dt*(e.slow>0?.58:1);
            Object.assign(e,position(e.distance,mission(s.level).path));
            if(e.distance>=route(mission(s.level).path).total) {
                s.health-=e.type==='boss'?5:e.type==='brute'?2:1;
                e.hp=0;
                e.escaped=true;s.leaks++;
                s.effects.push({type:'breach',x:975,y:330,life:.8,max:.8});
            }
        }
        if(s.health<=0) {
            s.health=0;
            s.effects=[];
            s.state='lost';
            return;
        }
        s.towers.forEach((t,i)=> {
            if(!t)return;
            t.cooldown-=dt;
            if(t.cooldown>0)return;
            const st=stats(t),p=mission(s.level).slots[i];
            const candidates=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p[0],e.y-p[1])<=st.range).sort((a,b)=>b.distance-a.distance);
            if(!candidates.length)return;
            const target=candidates[0];
            t.angle=Math.atan2(target.y-(p[1]-25),target.x-p[0]);
            t.cooldown=st.rate;
            const hits=t.type==='cannon'?s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-target.x,e.y-target.y)<st.splash):[target];
            hits.forEach(e=> {
                e.flash=.12;
                e.hp-=st.damage*(t.type==='magic'?1:1-e.armor);
                if(t.type==='magic')e.slow=st.slow;
            });
            s.effects.push( {
                type:t.type,x:p[0],y:p[1]-35,tx:target.x,ty:target.y,life:.23,max:.23
            });
        });
        s.enemies=s.enemies.filter(e=> {
            if(e.hp>0)return true;
            if(!e.escaped) {
                s.gold+=e.reward;
                s.kills++;
                s.effects.push({type:'defeat',x:e.x,y:e.y,life:.4,max:.4});
            }
            return false;
        });
        if(!s.enemies.length&&!s.queue.length) {
            s.effects=[];
            if(s.wave===WAVES_PER_LEVEL)s.state=s.level===LEVEL_COUNT?'won':'cleared';
            else {
                s.state='ready';
                s.gold+=45;
            }
        }
    }
    function nextLevel(s) {
        if(s.state!=='cleared'||s.level>=LEVEL_COUNT)return false;
        Object.assign(s,create(s.level+1));
        return true;
    }
    return {
        MAPS,PROFILES,mission,wavePlan,rating,sell,WAVES_PER_LEVEL,LEVEL_COUNT,nextLevel,PATH,SLOTS,TYPES,total,position,create,stats,build,upgrade,upgradeCost,startWave,spawn,tick
    };
});
