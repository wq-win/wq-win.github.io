(function(root,factory) {
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.ForestDefense=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function() {
    'use strict';
    const WAVES_PER_LEVEL=15,LEVEL_COUNT=5;
    const PATH=[[ -35,175],[175,175],[310,290],[510,290],[655,447],[815,447],[925,330],[1035,330]];
    const SLOTS=[[145,265],[300,190],[435,385],[525,190],[655,325],[785,350],[870,520],[915,230]];
    const TYPES= {
        arrow: {
            name:'箭塔',cost:90,range:175,damage:22,rate:.65,color:'#b7df65',description:'射速快 · 应对游骑兵'
        },magic: {
            name:'魔法塔',cost:130,range:155,damage:40,rate:1.08,color:'#66ddff',description:'无视护甲 · 命中减速'
        },cannon: {
            name:'炮塔',cost:155,range:165,damage:48,rate:1.65,color:'#ffbd61',description:'范围轰击 · 克制集群'
        }
    };
    const lengths=PATH.slice(1).map((p,i)=>Math.hypot(p[0]-PATH[i][0],p[1]-PATH[i][1]));
    const total=lengths.reduce((a,b)=>a+b,0);
    function position(distance) {
        for(let i=0; i<lengths.length; i++) {
            if(distance<=lengths[i]) {
                let t=Math.max(0,distance)/lengths[i];
                return {
                    x:PATH[i][0]+(PATH[i+1][0]-PATH[i][0])*t,y:PATH[i][1]+(PATH[i+1][1]-PATH[i][1])*t
                };
            }
            distance-=lengths[i];
        }
        return {
            x:1035,y:330
        };
    }
    function create(level=1) {
        if(!Number.isInteger(level)||level<1||level>LEVEL_COUNT)throw new RangeError('Invalid level');
        return {
            level,gold:300,health:20,wave:0,state:'ready',towers:SLOTS.map(()=>null),enemies:[],effects:[],queue:[],spawn:0,kills:0,id:0,time:0
        };
    }
    function stats(t) {
        const b=TYPES[t.type];
        return {
            ...b,damage:b.damage*(1+.65*(t.level-1)),range:b.range+15*(t.level-1),rate:b.rate/(1+.12*(t.level-1))
        };
    }
    function build(s,index,type) {
        if(!Number.isInteger(index)||index<0||index>=SLOTS.length||!TYPES[type]||s.towers[index]||s.gold<TYPES[type].cost||['cleared','won','lost'].includes(s.state))return false;
        s.gold-=TYPES[type].cost;
        s.towers[index]= {
            type,level:1,cooldown:0,angle:-Math.PI/2
        };
        return true;
    }
    function upgradeCost(t) {
        return Math.round(TYPES[t.type].cost*(t.level===1?.8:1.25));
    }
    function upgrade(s,index) {
        const t=s.towers[index];
        if(!t||t.level>=3||s.gold<upgradeCost(t)||['cleared','won','lost'].includes(s.state))return false;
        s.gold-=upgradeCost(t);
        t.level++;
        return true;
    }
    function startWave(s) {
        if(s.state!=='ready'||s.wave>=WAVES_PER_LEVEL)return false;
        s.wave++;
        s.state='running';
        s.spawn=.4;
        s.queue=Array.from( {
            length:7+s.wave*2+(s.level-1)*2
        },(_,i)=>s.wave>=3&&i%5===4?'brute':s.wave>=2&&i%3===2?'runner':'goblin');
        if(s.wave===WAVES_PER_LEVEL)s.queue.push('boss');
        return true;
    }
    function spawn(s,type) {
        const data= {
            goblin:[54,43,12,0],runner:[38,77,13,0],brute:[160,29,24,.42],boss:[1300,22,100,.3]
        }
        [type],scale=(1+(s.wave-1)*.19)*(1+(s.level-1)*.12);
        const e= {
            id:++s.id,type,hp:data[0]*scale,maxHp:data[0]*scale,speed:data[1]*(1+(s.level-1)*.03),reward:data[2],armor:data[3],distance:0,slow:0,...position(0)
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
            s.spawn=(.76-Math.min(.22,s.wave*.02))/(1+(s.level-1)*.04);
        }
        for(const e of s.enemies) {
            e.slow=Math.max(0,e.slow-dt);
            e.distance+=e.speed*dt*(e.slow>0?.58:1);
            Object.assign(e,position(e.distance));
            if(e.distance>=total) {
                s.health-=e.type==='boss'?5:e.type==='brute'?2:1;
                e.hp=0;
                e.escaped=true;
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
            const st=stats(t),p=SLOTS[i];
            const candidates=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p[0],e.y-p[1])<=st.range).sort((a,b)=>b.distance-a.distance);
            if(!candidates.length)return;
            const target=candidates[0];
            t.angle=Math.atan2(target.y-(p[1]-25),target.x-p[0]);
            t.cooldown=st.rate;
            const hits=t.type==='cannon'?s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-target.x,e.y-target.y)<58):[target];
            hits.forEach(e=> {
                e.hp-=st.damage*(t.type==='magic'?1:1-e.armor);
                if(t.type==='magic')e.slow=1.6;
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
            }
            return false;
        });
        if(!s.enemies.length&&!s.queue.length) {
            s.effects=[];
            if(s.wave===WAVES_PER_LEVEL)s.state=s.level===LEVEL_COUNT?'won':'cleared';
            else {
                s.state='ready';
                s.gold+=35+s.wave*4;
            }
        }
    }
    function nextLevel(s) {
        if(s.state!=='cleared'||s.level>=LEVEL_COUNT)return false;
        Object.assign(s,create(s.level+1));
        return true;
    }
    return {
        WAVES_PER_LEVEL,LEVEL_COUNT,nextLevel,PATH,SLOTS,TYPES,total,position,create,stats,build,upgrade,upgradeCost,startWave,spawn,tick
    };
});
