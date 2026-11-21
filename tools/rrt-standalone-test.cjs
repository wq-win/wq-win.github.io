'use strict';
// Model timer delivery while exercising the shipped RRT page and geometry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'game/robot-classic/rrt.html'), 'utf8');
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
const kit = fs.readFileSync(path.join(root, 'game/js/demo-kit.js'), 'utf8');

function setup() {
    const timers = [], ctx = new Proxy({}, { get: (o, k) => o[k] || (() => {}) });
    const canvas = {style:{}, getContext:()=>ctx, getBoundingClientRect:()=>({width:900,height:520,left:0,top:0})};
    const nodes = {c:canvas, status:{textContent:''}, run:{}, reset:{}, speed:{value:'36',dataset:{}},
        bias:{value:'12',dataset:{scale:'0.01'}}, stepLen:{value:'16',dataset:{}}};
    let samples=0;
    const env=vm.createContext({document:{readyState:'loading',addEventListener(){},getElementById:id=>nodes[id]},
        Math:Object.assign(Object.create(Math), {random() { samples++; return 0; }}),
        SeriesChrome:{mount(){}},setTimeout:fn=>timers.push(fn)});
    env.window=env;
    vm.runInContext(kit,env);vm.runInContext(source,env);
    const read=code=>vm.runInContext(code,env);
    return {nodes,timers,read, get samples(){return samples;}, point(x,y){canvas.onclick({clientX:x,clientY:y});},
        snapshot(){return JSON.stringify([nodes.status.textContent,read('JSON.stringify({goal,nodes,path,sample,growing})')]);},
        async tick(){assert(timers.length,'pending timer');timers.shift()();await Promise.resolve();},
        async drain(){for(let i=0;timers.length;i++){assert(i<1400,'bounded animation');await this.tick();}}};
}

(async()=>{
    // Speed 36 renders every third attempt, including attempt index 3999.
    const moved=setup();
    moved.nodes.run.onclick();
    while(moved.samples<4000) await moved.tick();
    assert.equal(moved.samples,4000);
    assert.equal(moved.timers.length,1);
    moved.point(175,260);
    moved.nodes.run.onclick();
    assert.equal(moved.samples,4001);
    const stateBeforeOldTimer=moved.snapshot();
    await moved.tick();
    assert.equal(moved.snapshot(),stateBeforeOldTimer,'old final callback cannot end the restarted goal run');
    assert.equal(moved.samples,4001);
    await moved.drain();
    assert.equal(moved.samples,4006);
    assert.match(moved.nodes.status.textContent,/^到达，节点 /);
    assert.equal(moved.read('path[0].x'),175);
    assert.equal(moved.read('path.at(-1).x'),70);
    assert.equal(moved.read('path.slice(1).every((p,i)=>!blocked(p.x,p.y,path[i].x,path[i].y))'),true);
    for(const point of [[233,100],[340,270],[15,260],[885,260],[-1,260]]){
        const before=moved.snapshot();moved.point(...point);assert.equal(moved.snapshot(),before,'blocked goal must not clear success');
    }

    moved.nodes.reset.onclick();
    assert.equal(moved.read('goal.x'),175,'Reset keeps the selected goal');
    assert.equal(moved.read('nodes.length'),1);
    assert.equal(moved.read('path.length'),0);
    assert.equal(moved.nodes.status.textContent,'');
    moved.nodes.run.onclick();await moved.drain();
    assert.match(moved.nodes.status.textContent,/^到达，节点 /);

    const reset=setup();
    reset.nodes.run.onclick();
    reset.nodes.reset.onclick();
    assert.equal(reset.read('nodes.length'),1);
    assert.equal(reset.nodes.status.textContent,'');
    reset.nodes.run.onclick();
    const restarted=reset.snapshot();
    assert.equal(reset.samples,2);
    await reset.tick();
    assert.equal(reset.samples,2,'old intermediate callback cannot add nodes after Reset');
    assert.equal(reset.snapshot(),restarted);
    for(const point of [[233,100],[340,270],[885,260]]){
        reset.point(...point);assert.equal(reset.snapshot(),restarted,'blocked goal must not cancel an active search');
    }
    await reset.drain();
    assert.equal(reset.samples,4001);
    assert.equal(reset.read('growing'),false);
    assert.equal(reset.read('path.length'),0);
    assert.match(reset.nodes.status.textContent,/4000.*未找到/);
    assert.doesNotMatch(reset.nodes.status.textContent,/不可达|生长中/);
    reset.point(175,260);reset.nodes.run.onclick();await reset.drain();
    assert.match(reset.nodes.status.textContent,/^到达，节点 /);
    console.log('Standalone RRT: canceled final/intermediate callbacks, blocked goals, sample cap, and collision-checked success passed (modeled).');
})().catch(error=>{console.error(error);process.exitCode=1;});
