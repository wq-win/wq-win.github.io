'use strict';
const assert=require('node:assert/strict');
const E=require('../js/snow-camp-engine.js');
function run(s,until=480,policy=()=>{}){while(s.status==='running'&&s.elapsed<until){policy(s,s.elapsed);E.tick(s,1);}return s;}
function command(s,a){assert.equal(E.act(s,a).ok,true,JSON.stringify(a));}
function strategy(s,t){
    if(t===0)command(s,{type:'build',building:'kitchen'});
    if(t===80)command(s,{type:'build',building:'housing'});
    if(t===160)command(s,{type:'build',building:'clinic'});
    if(t===200)command(s,{type:'heat',level:2});
    if(t===300)command(s,{type:'heat',level:1});
    if(t===400)command(s,{type:'heat',level:3});
}
// Clock and lifecycle: never run before start, during pause, or catch up offline.
{
    const s=E.create(),initial=JSON.stringify(s);E.tick(s,1000);assert.equal(JSON.stringify(s),initial);
    command(s,{type:'start'});assert.equal(E.act(s,{type:'start'}).ok,false);
    E.tick(s,.4);assert.equal(s.elapsed,0);E.tick(s,.6);assert.equal(s.elapsed,1);
    E.tick(s,3600);assert.equal(s.elapsed,6,'Large frame gaps bounded to five seconds');
    E.tick(s,NaN);E.tick(s,Infinity);E.tick(s,-1);assert.equal(s.elapsed,6);
    command(s,{type:'pause'});const frozen=JSON.stringify(s);E.tick(s,5);assert.equal(JSON.stringify(s),frozen);
    const resumed=E.restore(E.save(s));assert.deepEqual(resumed,s);
    command(s,{type:'start'});assert.equal(E.restore(E.save(s)).status,'paused');
}
// Reject invalid inputs without mutating state, including prototype property names.
{
    const s=E.create();
    for(const a of [null,{}, {type:'assign',job:'constructor',delta:1},{type:'assign',job:'wood',delta:99},{type:'assign',job:'wood',delta:1},{type:'heat',level:NaN},{type:'heat',level:4},{type:'build',building:'__proto__'},{type:'build',building:'housing'}]){
        const before=JSON.stringify(s);assert.equal(E.act(s,a).ok,false);assert.equal(JSON.stringify(s),before);
    }
    command(s,{type:'assign',job:'medic',delta:-1});assert.equal(E.view(s).freeWorkers,1);
    assert.equal(E.act(s,{type:'assign',job:'medic',delta:-1}).ok,false);
    command(s,{type:'assign',job:'wood',delta:1});assert.equal(E.view(s).workers,8);
}
// Paid queues require actual builders; completion applies bonuses and caps at two levels.
{
    const s=E.create();command(s,{type:'build',building:'kitchen'});assert.equal(s.resources.wood,0);
    assert.equal(E.act(s,{type:'build',building:'kitchen'}).ok,false);
    command(s,{type:'assign',job:'build',delta:-1});command(s,{type:'start'});run(s,25);assert.equal(s.queue[0].progress,0);
    command(s,{type:'assign',job:'build',delta:1});run(s,45);assert.equal(s.buildings.kitchen,1);assert.equal(s.queue.length,0);
    run(s,110);command(s,{type:'build',building:'kitchen'});run(s,145);assert.equal(s.buildings.kitchen,2);assert.equal(E.act(s,{type:'build',building:'kitchen'}).ok,false);
}
// Deterministic, playable eight-minute campaign with a modest realistic policy.
{
    const a=E.create(),b=E.create();command(a,{type:'start'});command(b,{type:'start'});
    run(a,480,strategy);run(b,480,strategy);assert.deepEqual(a,b);
    assert.equal(a.status,'won');assert.equal(a.elapsed,480);assert.equal(E.view(a).population,8);assert.ok(a.resources.coal>0);
    assert.ok(a.log.some(l=>l.text.includes('预警')));assert.ok(a.log.some(l=>l.text.includes('暴风雪抵达')));
    const ended=JSON.stringify(a);E.tick(a,5);assert.equal(JSON.stringify(a),ended);assert.equal(E.act(a,{type:'build',building:'housing'}).ok,false);
    assert.equal(E.restore(E.save(a)).status,'won');
    console.log('Balanced strategy: 8 survivors, coal '+a.resources.coal.toFixed(1)+', food '+a.resources.food.toFixed(1));
}
// Neglect is consequential; jobs remain within the living population after deaths.
{
    const idle=E.create();command(idle,{type:'start'});run(idle);assert.equal(idle.status,'lost');assert.ok(idle.elapsed>300&&idle.elapsed<480);
    const s=E.create();command(s,{type:'heat',level:0});command(s,{type:'assign',job:'cook',delta:-1});command(s,{type:'start'});run(s);assert.equal(s.status,'lost');assert.ok(s.elapsed<300);assert.ok(E.view(s).freeWorkers>=0);assert.equal(E.restore(E.save(s)).status,'lost');
    command(s,{type:'restart'});assert.deepEqual(s,E.create());
}
// Versioned validation rejects corrupt shape, impossible state, NaN-like data and inflated jobs.
{
    for(const text of ['', 'null','{}','[1]','{bad','x'.repeat(16001)])assert.throws(()=>E.restore(text));
    const changes=[s=>s.version=2,s=>s.resources.food=-1,s=>s.resources.coal='20',s=>s.jobs.wood=9,s=>s.furnace.level=4,s=>s.elapsed=481,s=>s.remainder=1,s=>s.residents[0].id=9,s=>s.residents[0].health=0,s=>s.status='won',s=>s.log=[{at:9,text:'future'}],s=>s.queue=[{building:'housing',target:1,progress:0,required:1}],s=>s.unexpected=true];
    for(const mutate of changes){const s=E.create();mutate(s);assert.throws(()=>E.restore(JSON.stringify(s)));}
    const s=E.create();command(s,{type:'start'});run(s,100,strategy);const restored=E.restore(E.save(s));command(restored,{type:'start'});run(s,480,strategy);run(restored,480,strategy);assert.deepEqual(restored,s,'Save roundtrip preserves exact future evolution');
}
console.log('Snow Camp engine tests passed');
