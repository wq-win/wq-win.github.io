import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Window } from 'happy-dom';
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const index = JSON.parse(read('data/search-index.json'));
for (const [path, root] of [['/', './'], ['/rl/27-ppo.html', '../'], ['/game/', '../'], ['/game/index.html', '../']]) {
  const w = new Window({url: 'https://mylog.test' + path});
  const d = w.document;
  d.write('<script src="/js/search.js"></script><button id="site-search-button">Search</button><div id="site-search-modal" class="hidden"><input id="site-search-input"><div id="site-search-results"></div></div><h3 id="friend-rooms-title">好友开房</h3>');
  w.fetch = async () => ({json: async () => index});
  w.eval(read('js/search.js'));
  await w.SiteSearch.init(root);
  w.SiteSearch.bind();
  d.getElementById('site-search-button').click();
  for (const [series, label] of [['rl','强化学习'],['llm','大语言模型'],['robot-learn','机器人学习'],['robot-classic','机器人经典基础']]) {
    const input = d.getElementById('site-search-input');
    input.value = label;
    input.dispatchEvent(new w.Event('input'));
    const hit = d.querySelector('.site-search-hit');
    assert.equal(new URL(hit.href).pathname, `/${series}/index.html`, label + ' first result from ' + path);
    assert.ok(hit.textContent.includes(label + ' 系列目录'));
  }
  const input = d.getElementById('site-search-input');
  input.value = 'PPO'; input.dispatchEvent(new w.Event('input'));
  assert.ok([...d.querySelectorAll('.site-search-hit')].some(a => a.href.endsWith('/rl/27-ppo.html')));
  for (const [name, url] of [
    ['牧场叠叠消', '/game/sheep-triple.html'],
    ['今天吃什么', '/game/life/food.html'],
    ['强化学习演示', '/game/rl/index.html'],
  ]) {
    input.value = name;
    input.dispatchEvent(new w.Event('input'));
    assert.ok([...d.querySelectorAll('.site-search-hit')].some(a => new URL(a.href).pathname === url),
      name + ' discoverable from ' + path);
  }
  const results = query => {
    input.value = query;
    input.dispatchEvent(new w.Event('input'));
    return [...d.querySelectorAll('.site-search-hit')];
  };
  const roomQueries = ['南昌麻将', '好友开房', '好友联机', '开房间', '房间号', '跑得快联机', '在线跑得快', '跑得快房间', '南昌麻将联机',
    '房间码', '六位房间码', '六位房间号', '6位房间号', '６位 房间号', '好友牌桌', '加入房间', '跑得快 联机', '跑得快 开房', '南昌麻将 开房'];
  const roomPath = path.startsWith('/game/') ? path : '/game/index.html';
  for (const query of roomQueries) {
    const hits = results(query);
    assert.equal(new URL(hits[0].href).pathname, roomPath, query + ' first result from ' + path);
    assert.equal(hits[0].hash, '#friend-rooms-title', query);
    assert.equal(hits.filter(a => ['/game/index.html', '/game/'].includes(new URL(a.href).pathname)).length, 1, query);
  }
  for (const query of ['跑得快','跑得快单机','跑得快 单机']) {
    const first = results(query)[0];
    assert.equal(new URL(first.href).pathname, '/game/paodekuai.html', query);
    assert.ok(first.textContent.includes('（单机）'));
  }
  for (const query of ['邀请码','联机学习','123456','演示与游戏','蜘蛛纸牌']) {
    assert.ok(!results(query).some(a=>a.hash==='#friend-rooms-title'), query);
  }
  for (const [ascii,wide] of [['DQN','ＤＱＮ'],['PPO','ＰＰＯ'],['A*','Ａ＊'],['DMP','ＤＭＰ'],['2024','２０２４'],['  PPO  ','　ＰＰＯ　']]) {
    const narrow=results(ascii).map(a=>a.outerHTML);
    assert.ok(narrow.length, ascii);
    assert.deepEqual(results(wide).map(a=>a.outerHTML),narrow,wide);
  }
  if (path.startsWith('/game/')) {
    const modal=d.getElementById('site-search-modal'), heading=d.getElementById('friend-rooms-title');
    const first = results('好友开房')[0];
    const dispatch = (init, blocked=false) => {
      const event=new w.MouseEvent('click',{button:0,bubbles:true,cancelable:true,...init});
      if(blocked) event.preventDefault();
      return first.firstElementChild.dispatchEvent(event);
    };
    // Keep the default from changing this model window's address, after the controller observes the event.
    d.addEventListener('click', event => { if (first.contains(event.target)) event.preventDefault(); });
    for (const init of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}]) {
      dispatch(init);
      assert.ok(!modal.classList.contains('hidden'));
      assert.ok(!heading.hasAttribute('tabindex'));
    }
    dispatch({}, true);
    assert.ok(!modal.classList.contains('hidden'));
    dispatch({});
    assert.ok(modal.classList.contains('hidden'));
    assert.equal(d.activeElement,heading);
    assert.equal(heading.getAttribute('tabindex'),'-1');
    heading.blur();
    assert.ok(!heading.hasAttribute('tabindex'));
  }
  input.value = ''; input.dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelectorAll('.site-search-hit').length, 0);
  d.dispatchEvent(new w.KeyboardEvent('keydown', {key:'Escape'}));
  assert.ok(d.getElementById('site-search-modal').classList.contains('hidden'));
  await w.happyDOM.close();
}
console.log('Series hub search: four top results, root/nested links, repeated queries, article and lobby search, and dismissal passed.');
