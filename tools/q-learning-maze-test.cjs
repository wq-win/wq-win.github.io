'use strict';
// Execute the tracked page and DemoKit; model the canvas and timer, not browser rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(process.argv[2] || path.join(root, 'game/rl/q-learning.html'), 'utf8');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
const kit = fs.readFileSync(path.join(root, 'game/js/demo-kit.js'), 'utf8');
function setup() {
    const ctx = new Proxy({}, {get:(o,k)=>o[k] || (()=>{})});
    const c = {style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:540,left:0,top:0})};
    const slider = (value,scale) => ({value,dataset:scale ? {scale} : {}});
    const nodes = {c,status:{textContent:''},run:{},pause:{},reset:{},eps:slider('0','0.01'),alpha:slider('25','0.01'),gamma:slider('97','0.01'),speed:slider('12')};
    const timers = new Map();
    let next = 0;
    const env = vm.createContext({
        document:{readyState:'loading',addEventListener(){},getElementById:id=>nodes[id]},
        SeriesChrome:{mount(){}},
        setTimeout:(fn,delay)=>{timers.set(++next,{fn,delay});return next;},
        clearTimeout:id=>timers.delete(id)
    });
    env.window = env;
    vm.runInContext(kit,env);
    vm.runInContext(inline,env);
    const model = code => vm.runInContext(code,env);
    const click = (x,y,shiftKey=false) => c.onclick({
        clientX:model('ox + cell * '+(x+0.5)), clientY:model('oy + cell * '+(y+0.5)), shiftKey
    });
    const tick = () => {
        const [id,job] = [...timers][0];
        timers.delete(id);
        job.fn();
    };
    const snapshot = () => [model('JSON.stringify({goal:maze.goal,walls:[...maze.walls],Q,episode,steps,agent,path,running})'),nodes.status.textContent,[...timers.keys()]];
    const clean = () => {
        assert.equal(model('running || steps || episode'),0);
        assert.equal(model('JSON.stringify(agent)'),'{"x":1,"y":1}');
        assert.equal(model('path.length'),1);
        assert.equal(model('Object.values(Q).every(values => values.every(q => q === 0))'),true);
        assert.equal(timers.size,0);
        assert.match(nodes.status.textContent,/回合 0 · 步 0/);
    };
    return {nodes,model,click,tick,snapshot,clean};
}
{
    const {nodes,model,click,tick,snapshot,clean} = setup();
    nodes.run.onclick();
    assert.equal(model('key(agent.x,agent.y)'),'2,1');
    assert.equal(model("wall(6,1)"),true);
    const live = snapshot();
    for (const [x,y,shift] of [[6,1,true],[1,1,true],[1,1,false],[0,1,true],[-1,1,false],[model('maze.goal.x'),model('maze.goal.y'),true],[model('maze.goal.x'),model('maze.goal.y'),false]]) {
        click(x,y,shift); assert.deepEqual(snapshot(),live,'invalid edit must not change state or cancel the pending tick');
    }
    tick();
    assert.equal(model('key(agent.x,agent.y)'),'3,1','invalid edit left training active');
    click(3,1);
    assert.equal(model('wall(3,1)'),true);
    assert.match(nodes.status.textContent,/重新训练/);
    clean();
    click(3,1);
    assert.equal(model('wall(3,1)'),false);
    clean();
}
{
    const {nodes,model,click,snapshot,clean} = setup();
    click(2,1,true);
    nodes.run.onclick();
    assert.equal(model('qs(1,1)[0]'),0.25);
    assert.equal(model('episode'),1);
    nodes.gamma.value = '95'; nodes.speed.value = '7';
    click(3,1,true);
    assert.equal(model('key(maze.goal.x,maze.goal.y)'),'3,1');
    clean();
    assert.deepEqual(['eps','alpha','gamma','speed'].map(id=>nodes[id].value),['0','25','95','7']);
    nodes.run.onclick();
    assert.equal(model('qs(1,1)[0]'),-0.005);
    assert.equal(model('episode'),0);
    assert.equal(model('key(agent.x,agent.y)'),'2,1');
    assert.doesNotMatch(nodes.status.textContent,/重新训练/);
    nodes.pause.onclick();
    const paused = snapshot();
    click(6,1,true);
    assert.deepEqual(snapshot(),paused);
    click(4,1); // Genuine paused edit retains the target and resets learned values.
    clean();
    nodes.run.onclick(); nodes.reset.onclick(); clean();
    assert.equal(model('wall(4,1)'),true,'Reset retains edited maze');
    assert.equal(model('key(maze.goal.x,maze.goal.y)'),'3,1');
}
console.log('Q-learning maze: invalid edits, timer cancellation, fresh Q after goal/wall changes, parameter retention, and Reset passed.');
