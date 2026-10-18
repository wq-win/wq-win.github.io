'use strict';
const assert = require('node:assert/strict');
const E = require('../js/tower-defense-engine.js');
function finishWave(s) {
    let steps = 0;
    while (s.state === 'running' && steps++ < 20000) E.tick(s, .05);
    assert.ok(steps < 20000, 'Every wave resolves in bounded simulated time');
}
// Economy, invalid inputs, upgrade caps, and repeated activation safeguards.
{
    const s = E.create();
    assert.equal(s.gold, 300);
    assert.equal(E.build(s, -1, 'arrow'), false);
    assert.equal(E.build(s, 0, 'unknown'), false);
    assert.equal(E.build(s, 0, 'arrow'), true);
    assert.equal(s.gold, 210);
    assert.equal(E.build(s, 0, 'magic'), false);
    assert.equal(E.upgrade(s, 0), true);
    assert.equal(s.towers[0].level, 2);
    assert.equal(E.upgrade(s, 0), true);
    assert.equal(s.towers[0].level, 3);
    assert.equal(E.upgrade(s, 0), false);
    assert.equal(E.build(s, 1, 'cannon'), false);
    assert.equal(E.startWave(s), true);
    const queue = s.queue.length;
    assert.equal(E.startWave(s), false);
    assert.equal(s.wave, 1);
    assert.equal(s.queue.length, queue);
}
// An undefended forest loses. Terminal state cannot resume or spend gold.
{
    const s = E.create();
    while (s.state !== 'lost') {
        assert.ok(s.wave < E.WAVES_PER_LEVEL);
        E.startWave(s);
        finishWave(s);
    }
    assert.equal(s.health, 0);
    const before = JSON.stringify(s);
    E.tick(s, 1);
    assert.equal(E.startWave(s), false);
    assert.equal(E.build(s, 0, 'arrow'), false);
    assert.equal(JSON.stringify(s), before);
}
// An understandable strategy wins: arrow + magic first, add towers between waves,
// then upgrade around the central bends. No cheats or mid-wave auto-building.
{
    for(let level=1;level<=E.LEVEL_COUNT;level++) {
    const s = E.create(level);
    E.build(s, 1, 'arrow');
    E.build(s, 4, 'magic');
    for (let wave = 1; wave <= E.WAVES_PER_LEVEL; wave++) {
        for (const [i, type] of [[2,'cannon'],[3,'magic'],[5,'arrow'],[0,'arrow'],[6,'cannon'],[7,'magic']]) {
            if (!s.towers[i]) E.build(s, i, type);
        }
        for (const i of [1,4,2,3,5,0,6,7]) E.upgrade(s, i);
        assert.equal(E.startWave(s), true);
        finishWave(s);
        assert.notEqual(s.state, 'lost', `Sensible build loses on wave ${wave}`);
    }
    assert.equal(s.state, level===E.LEVEL_COUNT?'won':'cleared');
    assert.ok(s.health > 0);
    assert.ok(s.kills > 150);
    assert.equal(E.startWave(s), false);
    assert.equal(E.upgrade(s, 1), false);
    console.log(`Level ${level} victory verified: ${s.health}/20 health, ${s.kills} enemies defeated.`);
    }
}
// Ready state freezes simulation; slow, armor and splash behavior are real.
{
    const s = E.create();
    const before = JSON.stringify(s);
    E.tick(s, 10);
    assert.equal(JSON.stringify(s), before);
    E.build(s, 0, 'magic');
    s.state = 'running'; s.wave = 3;
    const e = E.spawn(s, 'brute');
    e.distance = 180; Object.assign(e, E.position(180));
    const hp = e.hp;
    E.tick(s, .01);
    assert.equal(e.hp, hp - E.TYPES.magic.damage);
    assert.ok(e.slow > 0);
}
{
    const s = E.create();
    E.build(s, 0, 'cannon'); s.state = 'running'; s.wave = 1;
    const a = E.spawn(s, 'goblin'), b = E.spawn(s, 'goblin');
    for (const e of [a,b]) { e.distance = 170; Object.assign(e, E.position(170)); }
    E.tick(s, .01);
    assert.ok(a.hp < a.maxHp && b.hp < b.maxHp, 'Cannon hits a cluster');
}
assert.deepEqual(E.position(0), {x:-35,y:175});
assert.deepEqual(E.position(E.total), {x:1035,y:330});
console.log('Tower defense: economy, caps, wave guards, defeat, victory, armor, slow, splash and path tests passed.');

// Every corresponding wave gets strictly stronger; only wave 15 contains a boss.
assert.equal(E.WAVES_PER_LEVEL,15);
assert.equal(E.LEVEL_COUNT,5);
for(let wave=1;wave<=15;wave++) {
    let previous;
    for(let level=1;level<=5;level++) {
        const s=E.create(level); s.wave=wave-1; E.startWave(s);
        assert.equal(s.queue.filter(t=>t==='boss').length,wave===15?1:0);
        const e=E.spawn(s,'goblin');
        if(previous) {
            assert.ok(e.hp>previous.hp); assert.ok(e.speed>previous.speed);
            assert.ok(s.queue.length>previous.count);
        }
        previous={hp:e.hp,speed:e.speed,count:s.queue.length};
    }
}
{
    const s=E.create(); assert.equal(E.nextLevel(s),false);
    s.state='cleared'; s.wave=15;s.gold=999;s.health=3;s.towers[0]={type:'arrow',level:3};
    assert.equal(E.nextLevel(s),true); assert.deepEqual(s,E.create(2));
    assert.equal(E.nextLevel(s),false);
    s.level=5;s.state='won';assert.equal(E.nextLevel(s),false);
    for(const level of [0,6,-1,1.5,NaN])assert.throws(()=>E.create(level),RangeError);
}
console.log('Five-level progression, reset guards, 15-wave boundaries and increasing difficulty passed.');
