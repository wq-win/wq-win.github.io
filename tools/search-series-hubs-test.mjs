import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Window } from 'happy-dom';
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const index = JSON.parse(read('data/search-index.json'));
for (const [path, root] of [['/', './'], ['/rl/27-ppo.html', '../']]) {
  const w = new Window({url: 'https://mylog.test' + path});
  const d = w.document;
  d.write('<script src="/js/search.js"></script><button id="site-search-button">Search</button><div id="site-search-modal" class="hidden"><input id="site-search-input"><div id="site-search-results"></div></div>');
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
  input.value = ''; input.dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelectorAll('.site-search-hit').length, 0);
  d.dispatchEvent(new w.KeyboardEvent('keydown', {key:'Escape'}));
  assert.ok(d.getElementById('site-search-modal').classList.contains('hidden'));
  await w.happyDOM.close();
}
console.log('Series hub search: four top results, root/nested links, repeated queries, article search and dismissal passed.');
