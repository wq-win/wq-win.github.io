#!/usr/bin/env node
'use strict';

// Exercise the real controller with Happy DOM and a no-op canvas. State access is
// injected into the test copy only; production scripts expose no debugging API.
// This verifies DOM and events, not browser geometry or visual rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const E = require('../js/tower-defense-engine.js');
const page = fs.readFileSync(path.join(root, 'game/tower-defense.html'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'js/tower-defense.js'), 'utf8');
const instrumented = controller.replace(/\}\)\(\);\s*$/, '\nwindow.__tdTest = { get state() { return state; }, sync, restoreCheckpoint };\n})();');
assert.notEqual(instrumented, controller, 'Test-only state instrumentation installed');
const clone = value => JSON.parse(JSON.stringify(value));

async function testSharedStorage(Window) {
    const SAVE='mylog-forest-defense-checkpoint-v2', STARS='mylog-forest-tactics-stars-v1';
    const items=new Map(), writes=[], tabs=[];
    function open() {
        const w=new Window({url:'https://example.test/game/tower-defense.html',
            settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
        tabs.push(w);
        w.document.write(page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
        const ctx=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'||key==='createRadialGradient'?
            ()=>({addColorStop(){}}):()=>{}});
        w.HTMLCanvasElement.prototype.getContext=()=>ctx;
        Object.defineProperty(w,'localStorage',{value:{
            getItem:key=>items.get(key)??null,
            setItem:(key,value)=>{writes.push(key);items.set(key,value);}
        }});
        let frame, now=1000;
        w.requestAnimationFrame=fn=>{frame=fn;return 1;};
        w.ForestDefense=E; w.eval(instrumented);
        return {
            slots:w.document.querySelectorAll('.td-slot'), get:id=>w.document.getElementById(id),
            type:type=>w.document.querySelector('[data-tower="'+type+'"]').click(), w,
            finish(level,health) {
                const state=w.__tdTest.state;
                // Enter a valid end-of-final-wave fixture; the real loop and engine detect the transition.
                Object.assign(state,E.create(level),{state:'running',wave:E.WAVES_PER_LEVEL,health});
                frame(now+=50); frame(now+=50);
                assert.equal(state.state,'cleared');
                assert.equal(E.rating(state),health>=18?3:1);
            }
        };
    }
    try {
        const a=open();
        a.slots[0].click();
        assert.equal(JSON.parse(items.get(SAVE)).gold,210);
        const inspection=open();
        a.type('magic'); a.slots[1].click();
        let latest=items.get(SAVE);
        assert.equal(JSON.parse(latest).gold,80);
        writes.length=0; inspection.slots[0].click();
        assert.equal(inspection.get('upgrade').hidden,false,'inspection still opens upgrade controls');
        assert.equal(items.get(SAVE),latest,'inspection must not overwrite the newer checkpoint');
        assert.deepEqual(writes,[]);
        const failed=open();
        a.slots[0].click(); a.get('upgrade').click(); latest=items.get(SAVE);
        assert.equal(JSON.parse(latest).gold,8);
        assert.equal(JSON.parse(latest).towers[0].level,2);
        writes.length=0; failed.type('cannon'); failed.slots[2].click();
        assert.match(failed.get('announcement').textContent,/金币不足/);
        assert.equal(items.get(SAVE),latest,'rejected purchase must not overwrite the newer checkpoint');
        assert.deepEqual(writes,[]);
        const reload=open();
        assert.equal(reload.w.__tdTest.state.gold,8);
        assert.equal(reload.w.__tdTest.state.towers[1].type,'magic');

        const first=open(), second=open(), lower=open(), equal=open();
        first.finish(1,20); second.finish(2,20);
        assert.deepEqual(JSON.parse(items.get(STARS)),{'1':3,'2':3});
        writes.length=0; lower.finish(1,3); equal.finish(1,20);
        assert.deepEqual(JSON.parse(items.get(STARS)),{'1':3,'2':3});
        assert.equal(writes.includes(STARS),false,'lower or equal result must not write the star map');
        assert.match(lower.get('mission-goal').textContent,/最佳 ★★★/);
        items.set(STARS,JSON.stringify({'1':3,'3':4,'4':'2','5':1,'999':3}));
        open().finish(3,20);
        assert.deepEqual(JSON.parse(items.get(STARS)),{'1':3,'3':3,'5':1});
        for(const raw of ['{bad','null','[]']) {
            items.set(STARS,raw); open().finish(3,20);
            assert.deepEqual(JSON.parse(items.get(STARS)),{'3':3});
        }
        const blocked=open();
        blocked.w.localStorage.getItem=key=>{ if(key===STARS)throw Error('read unavailable'); return items.get(key)??null; };
        writes.length=0; blocked.finish(4,20);
        assert.equal(writes.includes(STARS),false,'unavailable read must not overwrite the star map');
        assert.match(blocked.get('mission-goal').textContent,/最佳 ★★★/,'local result remains visible without storage');
        assert.deepEqual(JSON.parse(items.get(STARS)),{'3':3});
        console.log('Tower defense shared storage: stale inspection/rejected build, committed checkpoints, star maxima, and invalid storage passed.');
    } finally {
        for (const w of tabs) await w.happyDOM.close();
    }
}

async function main() {
    let dependency = process.env.HAPPY_DOM_PATH || require.resolve('happy-dom');
    if (fs.statSync(dependency).isDirectory()) dependency = path.join(dependency, 'lib/index.js');
    const { Window } = await import(pathToFileURL(path.resolve(dependency)).href);
    await testSharedStorage(Window);
    const window = new Window({ url: 'https://example.test/game/tower-defense.html',
        settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
    try {
        // Happy DOM 21 drops numeric zero instead of applying the browser's
        // DOMString conversion. Normalize this setter to native DOM semantics.
        const textContent = Object.getOwnPropertyDescriptor(window.Element.prototype, 'textContent');
        Object.defineProperty(window.Element.prototype, 'textContent', {
            ...textContent,
            set(value) { textContent.set.call(this, value == null ? '' : String(value)); }
        });
        window.document.write(page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
        const context = new Proxy({}, {
            get(target, key) {
                if (key in target) return target[key];
                if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
                return () => {};
            },
            set(target, key, value) { target[key] = value; return true; }
        });
        window.HTMLCanvasElement.prototype.getContext = () => context;
        let frameCallback;
        let now = 1000;
        window.requestAnimationFrame = callback => { frameCallback = callback; return 1; };
        window.confirm = () => true;
        let motionReduced=false,animations=0;const feedbackCalls=[];
        window.matchMedia=()=>({get matches(){return motionReduced;}});
        window.Element.prototype.animate=()=>{animations++;return {finished:Promise.resolve()};};
        window.Element.prototype.getAnimations=()=>[];
        window.GameFeedback={create:({host})=>{assert.equal(host.id,'td-feedback');return {play:type=>feedbackCalls.push(type)};}};
        window.ForestDefense = E;
        window.eval(instrumented);
        const api = window.__tdTest;
        const find = id => window.document.getElementById(id);
        const frame = () => { now += 50; frameCallback(now); };
        const seed = (level, state, wave) => {
            Object.assign(api.state, E.create(level), { state, wave });
            api.sync();
        };
        const assertReset = level => {
            assert.deepEqual(clone(api.state), clone(E.create(level)));
            assert.equal(find('level').textContent, String(level));
            assert.equal(find('wave').textContent, '0');
            assert.equal(find('gold').textContent, '300');
            assert.equal(find('health').textContent, '20');
            assert.equal(find('overlay').hidden, true);
            assert.equal(find('next-wave').disabled, false);
            assert.equal(find('upgrade').hidden, true);
            assert.equal(window.document.querySelectorAll('.td-slot.built').length, 0);
        };
        const css=fs.readFileSync(path.join(root,'css/tower-defense.css'),'utf8');
        assert.match(css,/grid-template-areas:\s*"top" "brief" "battle" "bottom" "note" "help"/);
        assert.match(css,/grid-template-rows:auto auto minmax\(0,1fr\) auto auto auto/);
        assert.match(css,/grid-template-areas:\s*"top top" "battle brief" "battle bottom" "note note" "help help"/);
        for(const [selector,area] of [['td-top','top'],['td-mission','brief'],['td-battle-scroll','battle'],['td-bottom','bottom']])assert.ok(css.includes(`.${selector}{grid-area:${area}}`));
        assertReset(1);
        const steps=()=>Array.from(window.document.querySelectorAll('[data-wave-step]'));
        seed(1,'running',1);assert.equal(steps().filter(b=>b.classList.contains('done')).length,0);assert.equal(steps()[0].classList.contains('current'),true);
        seed(1,'ready',1);assert.equal(steps().filter(b=>b.classList.contains('done')).length,1);assert.equal(steps()[1].classList.contains('current'),true);
        seed(1,'running',6);assert.equal(steps().filter(b=>b.classList.contains('done')).length,5);assert.equal(steps()[5].classList.contains('current'),true);
        seed(1,'lost',6);assert.equal(steps().filter(b=>b.classList.contains('done')).length,5);assert.equal(steps()[5].classList.contains('failed'),true);
        seed(1,'cleared',6);assert.equal(steps().filter(b=>b.classList.contains('done')).length,6);assert.equal(steps().filter(b=>b.classList.contains('current')).length,0);
        seed(1,'ready',0);
        motionReduced=true;const animationsBefore=animations;
        window.document.querySelector('.td-slot').click();
        assert.equal(animations,animationsBefore,'Reduced motion suppresses feedback movement');
        assert.equal(feedbackCalls.at(-1),'success');motionReduced=false;
        const checkpoint=api.restoreCheckpoint(window.localStorage.getItem('mylog-forest-defense-checkpoint-v2'));
        assert.equal(checkpoint.gold,210);assert.equal(checkpoint.towers[0].type,'arrow');assert.equal(checkpoint.state,'ready');
        const badCheckpoint=JSON.parse(window.localStorage.getItem('mylog-forest-defense-checkpoint-v2'));
        badCheckpoint.towers[0].type='__proto__';assert.equal(api.restoreCheckpoint(JSON.stringify(badCheckpoint)),null);
        badCheckpoint.towers[0].type='arrow';badCheckpoint.health=-1;assert.equal(api.restoreCheckpoint(JSON.stringify(badCheckpoint)),null);
        assert.equal(api.restoreCheckpoint('{bad'),null);
        const legacy=api.restoreCheckpoint(JSON.stringify({version:1,level:9,wave:14}));assert.equal(legacy.level,9);assert.equal(legacy.wave,0);
        api.state.gold=1000;find('upgrade').click();assert.equal(find('specialize').hidden,false);find('specialize').click();assert.equal(api.state.towers[0].branch,'reach');
        const specialized=api.restoreCheckpoint(window.localStorage.getItem('mylog-forest-defense-checkpoint-v2'));assert.equal(specialized.towers[0].branch,'reach');
        const beforeCancel=clone(api.state);window.confirm=()=>false;find('restart').click();assert.deepEqual(clone(api.state),beforeCancel);window.confirm=()=>true;
        find('sell').click();assert.equal(api.state.towers[0],null);assert.equal(api.state.built,1);
        find('restart').click();assertReset(1);
        // Every branch previews the same actual stats that its purchase announces.
        const number=value=>String(Number(value.toFixed(2)));
        for(const type of ['arrow','magic','cannon'])for(const branch of ['power','reach']) {
            seed(2,'ready',0);api.state.gold=1000;
            window.document.querySelector(`[data-tower="${type}"]`).click();
            window.document.querySelectorAll('.td-slot')[2].click();
            const tower=api.state.towers[2],levelOne=E.stats(tower);
            assert.equal(find('branch-hint').hidden,false);
            const ordinaryPreview=find('branch-hint').textContent.replace('升级：','');
            window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'u'}));
            assert.equal(tower.level,2);
            assert.equal(find('announcement').textContent,'升级成功：'+ordinaryPreview+'。');
            assert.equal(E.stats(tower).range,levelOne.range+15);
            const previews=find('branch-hint').textContent.split('\n');
            const label=branch==='power'?'强攻':'控场';
            const preview=previews.find(p=>p.startsWith(label+'：')).slice(label.length+1);
            const before=E.stats(tower),beforeGold=api.state.gold,cost=E.upgradeCost(tower);
            const control=find(branch==='power'?'upgrade':'specialize');
            find('pause').click();const pausedCopy=clone(api.state);control.click();assert.deepEqual(clone(api.state),pausedCopy);find('pause').click();
            api.state.gold=0;api.sync();assert.equal(control.disabled,true);control.click();assert.equal(tower.level,2);api.state.gold=beforeGold;api.sync();
            control.click();const after=E.stats(tower);
            assert.equal(tower.level,3);assert.equal(tower.branch,branch);assert.equal(api.state.gold,beforeGold-cost);
            assert.equal(after.range-before.range,branch==='power'?-5:70);
            assert.ok(after.damage>before.damage,'Both level-three choices increase damage over level two');
            assert.ok(preview.includes(`伤害 ${number(before.damage)}→${number(after.damage)}`));
            assert.ok(preview.includes(`射程 ${number(before.range)}→${number(after.range)}`));
            if(type==='magic'&&branch==='reach')assert.ok(preview.includes(`减速 ${number(before.slow)}→${number(after.slow)}秒`));
            if(type==='cannon'&&branch==='reach')assert.ok(preview.includes(`爆炸半径 ${before.splash}→${after.splash}`));
            assert.equal(find('announcement').textContent,label+'专精：'+preview+'。');
            assert.equal(find('branch-hint').hidden,true);
            const capped=clone(api.state);control.click();assert.deepEqual(clone(api.state),capped);
            const restored=api.restoreCheckpoint(window.localStorage.getItem('mylog-forest-defense-checkpoint-v2'));assert.equal(restored.towers[2].branch,branch);assert.equal(restored.gold,api.state.gold);
            find('restart').click();
        }
        seed(1,'ready',0);
        for (let level = 1; level < E.LEVEL_COUNT; level++) {
            seed(level, 'running', E.WAVES_PER_LEVEL);
            Object.assign(api.state, { gold: 999, health: 3, kills: 200 });
            E.build(api.state, 0, 'arrow');
            // Let the engine and animation loop discover the real clear boundary.
            frame(); frame();
            assert.equal(api.state.state, 'cleared');
            assert.equal(find('overlay').hidden, false);
            assert.equal(feedbackCalls.at(-1),'win');
            assert.equal(find('overlay').dataset.outcome,'cleared');
            assert.match(find('result-title').textContent, new RegExp(`第 ${level} 关`));
            assert.match(find('result-action').textContent, new RegExp(`第 ${level + 1} 关`));
            assert.equal(find('next-wave').disabled, true);
            assert.equal(find('pause').disabled, true);
            find('result-action').click();
            assertReset(level + 1);
            assert.equal(find('mission-title').textContent,E.mission(level+1).mapName+' · '+E.mission(level+1).name);
            assert.equal(window.document.querySelector('.td-slot').style.left,E.mission(level+1).slots[0][0]/10+'%');
            // A queued second click must not skip another level or reset again.
            const stateAfterFirstClick = api.state;
            find('result-action').click();
            assert.equal(api.state, stateAfterFirstClick);
            assertReset(level + 1);
            assert.equal(find('mission-title').textContent,E.mission(level+1).mapName+' · '+E.mission(level+1).name);
            assert.equal(window.document.querySelector('.td-slot').style.left,E.mission(level+1).slots[0][0]/10+'%');
        }
        seed(20, 'lost', 6);
        api.state.health = 0;
        api.sync();
        assert.equal(find('result-action').textContent, '重试本关');
        find('result-action').click();
        assertReset(20);
        const retried = api.state;
        find('result-action').click();
        assert.equal(api.state, retried);

        seed(20, 'running', 6);
        frame();
        assert.equal(api.state.state, 'won');
        assert.equal(find('result-title').textContent, '全部关卡通关！');
        assert.equal(find('result-action').textContent, '从第 1 关再挑战');
        find('result-action').click();
        assertReset(1);
        const restarted = api.state;
        find('result-action').click();
        assert.equal(api.state, restarted);

        seed(2, 'ready', 4);
        assert.doesNotMatch(find('wave-hint').textContent, /首领/);
        seed(2, 'ready', 5);
        assert.match(find('wave-hint').textContent, /最终波.*首领/);
        assert.match(find('next-wave').textContent, /第 6 波/);
        find('next-wave').click();
        assert.equal(api.state.wave, 6);
        assert.equal(api.state.queue.filter(type => type === 'boss').length, 1);
        const queueLength = api.state.queue.length;
        find('next-wave').click();
        assert.equal(api.state.wave, 6);
        assert.equal(api.state.queue.length, queueLength);

        find('pause').click();
        assert.equal(find('pause').getAttribute('aria-pressed'), 'true');
        assert.equal(find('overlay').hidden, false);
        assert.equal(find('result-action').textContent, '继续守卫');
        const pausedState = clone(api.state);
        frame(); frame();
        assert.deepEqual(clone(api.state), pausedState, 'Paused game does not simulate');
        find('result-action').click();
        assert.equal(find('pause').getAttribute('aria-pressed'), 'false');
        assert.equal(find('overlay').hidden, true);
        frame();
        assert.ok(api.state.time > pausedState.time, 'Resume continues the current wave');
        assert.equal(api.state.level, 2);
        assert.equal(api.state.wave, 6);
        console.log('Tower defense UI: level clears/reset, retry, final victory, double-click guards, pause/resume and wave-6 hint passed.');
    } finally {
        await window.happyDOM.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
