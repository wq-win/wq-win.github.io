'use strict';
// VM/DOM model of the actual page handlers; canvas rendering is not browser-tested.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(process.argv[2] || path.join(root, 'game/robot-classic/astar.html'), 'utf8');
const reproduce = process.argv.includes('--reproduce');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
const frame = [];
const ctx = new Proxy({}, {get: (o,k) => o[k] || (() => {})});
const canvas = {style:{}, getContext:()=>ctx, getBoundingClientRect:()=>({width:900,height:540,left:0,top:0})};
const nodes = {c:canvas,status:{textContent:''}, astar:{}, dijkstra:{}, reset:{}, hw:{value:'10',dataset:{scale:'0.1'}},speed:{value:'16',dataset:{}}};
const env = vm.createContext({document:{readyState:'loading',addEventListener(){},getElementById:id=>nodes[id]}, SeriesChrome:{mount(){}}, setTimeout:(fn,delay)=>frame.push({fn,delay})});
env.window=env;
vm.runInContext(fs.readFileSync(path.join(root, 'game/js/demo-kit.js'),'utf8'),env);
vm.runInContext(inline,env);
const model=code=>vm.runInContext(code,env);
function point(x,y,shiftKey=false) {
    canvas.onclick({clientX:model('ox + cell * '+(x+0.5)),clientY:model('oy + cell * '+(y+0.5)),shiftKey});
}
async function tick() {
    assert(frame.length, 'expected a scheduled animation tick');
    frame.shift().fn();
    await Promise.resolve();
}
async function drain() {
    let ticks=0;
    while(frame.length) {
        assert(++ticks<300,'search animation should finish');
        await tick();
    }
}
const goalKey=()=>model('key(maze.goal.x,maze.goal.y)');
const isRunning=()=>model('searching');
function clean() {
    assert.equal(isRunning(),false);
    assert.equal(nodes.status.textContent,'');
    assert.equal(model('Object.keys(paint).length'),0);
}
async function editGoalDuringRun() {
    nodes.reset.onclick();
    nodes.astar.onclick();
    let waited=0;
    while(model("paint[key(maze.start.x+1,maze.start.y)]")!=='closed') {
        assert(++waited<70,'target must already have been visited');
        await tick();
    }
    point(model('maze.start.x+1'),model('maze.start.y'),true);
}
async function editWallDuringRun() {
    nodes.reset.onclick();
    nodes.astar.onclick();
    for(let i=0;i<48;i++)await tick();
    point(12,1);
    assert.equal(model("maze.walls.has('12,1')"),true);
}
async function resultPath(algorithm, expected) {
    nodes[algorithm].onclick();
    await drain();
    assert.match(nodes.status.textContent,expected);
}
(async()=>{
    const start=model('key(maze.start.x,maze.start.y)'), goal=model('key(maze.goal.x,maze.goal.y)');
    const mazeSignature=()=>model('JSON.stringify([...maze.walls].sort())');
    const walls=mazeSignature();
    if(reproduce) {
        await editGoalDuringRun(); await drain();
        assert.equal(nodes.status.textContent,'无路径');
        await resultPath('dijkstra',/^Dijkstra.*路径 1$/);
        point(...goal.split(',').map(Number),true); // Original reset does not restore goal.
        await editWallDuringRun(); await drain();
        assert.match(nodes.status.textContent,/^A\*.*路径 36$/);
        await resultPath('dijkstra',/^无路径$/);
        console.log('Original reproduced: goal edit gives no path versus fresh length 1; wall edit gives length 36 versus fresh no path.');
        return;
    }

    nodes.dijkstra.onclick(); await drain(); assert.match(nodes.status.textContent,/路径 36$/);
    point(6,1);point(6,1,true);nodes.dijkstra.onclick();await drain();assert.match(nodes.status.textContent,/路径 5$/);
    nodes.reset.onclick();assert.equal(model('key(maze.goal.x,maze.goal.y)'),goal,'restores original goal');
    assert.equal(model('key(maze.start.x,maze.start.y)'),start);assert.equal(mazeSignature(),walls);
    assert.equal(nodes.status.textContent,'');assert.equal(model('Object.keys(paint).length'),0);
    nodes.dijkstra.onclick();await drain();assert.match(nodes.status.textContent,/路径 36$/);

    point(6,1);point(6,1,true);nodes.astar.onclick();assert.equal(frame.length,1);
    nodes.reset.onclick();assert.equal(model('searching'),false);
    await drain();assert.equal(nodes.status.textContent,'');assert.equal(model('Object.keys(paint).length'),0);
    assert.equal(mazeSignature(),walls);

    nodes.astar.onclick();nodes.reset.onclick();nodes.dijkstra.onclick();await drain();
    assert.match(nodes.status.textContent,/^Dijkstra.*路径 36$/);
    await editGoalDuringRun(); clean();
    // Start the new run before the invalidated A* callback comes back.
    await resultPath('dijkstra',/^Dijkstra.*路径 1$/);
    await resultPath('astar',/^A\*.*路径 1$/);
    await editWallDuringRun(); clean(); await drain(); clean();
    await resultPath('dijkstra',/^无路径$/);
    await resultPath('astar',/^无路径$/);
    nodes.dijkstra.onclick();
    point(12,1); clean();
    await resultPath('astar',/^A\*.*路径 36$/);

    // Reclicking a goal, start, or boundary is not a graph edit.
    nodes.astar.onclick();
    point(model('maze.goal.x'),model('maze.goal.y'),true);
    point(model('maze.start.x'),model('maze.start.y'));
    point(0,0);
    assert.equal(isRunning(),true); await drain();
    assert.match(nodes.status.textContent,/路径 36$/);
    const prior=goalKey();point(model('maze.start.x+1'),model('maze.start.y'),true);
    assert.notEqual(goalKey(),prior);clean();

    // Heuristic weight is fixed per run; speed stays live.
    nodes.reset.onclick();
    await resultPath('astar',/^A\*.*路径 36$/);
    const baseline=nodes.status.textContent;
    nodes.astar.onclick();const firstDelay=frame[0].delay;
    nodes.hw.value='30';nodes.speed.value='40';await tick();
    assert.ok(frame[0].delay<firstDelay);
    await drain();assert.equal(nodes.status.textContent,baseline);
    console.log('Maze restore: 36 → 5 → 36, endpoints, mid-run edits for both algorithms, stale and overlapping callbacks, no-op clicks, fixed weight/live speed passed (modeled).');
})().catch(e=>{console.error(e);process.exitCode=1;});
