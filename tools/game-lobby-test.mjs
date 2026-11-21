import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const page = readFileSync('game/index.html','utf8');
const source = readFileSync('game/js/game-lobby.js','utf8');
function setup(last) {
 const w = new Window({url:'https://example.test/game/index.html', settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 w.document.write(page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 if(last) w.localStorage.setItem('mylog-last-game',last);
 w.eval(source); return w;
}
let w=setup(); let d=w.document;
assert.equal(d.querySelectorAll('.lobby-game').length,16);
assert.equal(d.querySelectorAll('.lobby-game:not([hidden])').length,16);
d.querySelector('button[data-category="relax"]').click();
assert.equal(d.querySelectorAll('.lobby-game:not([hidden])').length,6);
assert.equal(d.querySelector('button[data-category="relax"]').getAttribute('aria-pressed'),'true');
d.querySelector('button[data-category="strategy"]').click();
assert.equal(d.querySelectorAll('.lobby-game:not([hidden])').length,5);
d.querySelector('button[data-category="all"]').click();
assert.equal(d.querySelectorAll('.lobby-game:not([hidden])').length,16);
assert.equal(d.getElementById('recent-game').hidden,true);
const rooms=d.getElementById('friend-rooms-title').parentElement;
assert.equal(rooms.parentElement,d.getElementById('arcade').parentElement);
assert.equal(rooms.compareDocumentPosition(d.getElementById('lobby-tools')) & 4,4);
assert.deepEqual(Array.from(rooms.querySelectorAll('a'),a=>[a.textContent,a.getAttribute('href')]),[
 ['南昌麻将（单机／2–4 人）','https://mylog-card-rooms.sweetring22.chatgpt.site/game/nanchang-mahjong.html'],
 ['跑得快好友开房（3 人）','https://mylog-card-rooms.sweetring22.chatgpt.site/game/paodekuai-online.html']
]);
assert.equal(d.querySelector('a.lobby-game[href="paodekuai.html"] h3').textContent,'跑得快（单机）');

await w.happyDOM.abort();
w=setup('water-sort.html');assert.equal(w.document.querySelector('#recent-game a').getAttribute('href'),'water-sort.html');await w.happyDOM.abort();
w=setup('paodekuai.html');assert.equal(w.document.querySelector('#recent-game a').getAttribute('href'),'paodekuai.html');await w.happyDOM.abort();
w=setup('https://mylog-card-rooms.sweetring22.chatgpt.site/game/paodekuai-online.html');assert.equal(w.document.getElementById('recent-game').hidden,true);await w.happyDOM.abort();
w=setup('https://evil.example/');assert.equal(w.document.getElementById('recent-game').hidden,true);await w.happyDOM.abort();
assert.ok(page.indexOf('id="arcade"') < page.indexOf('id="function-lab-title"'));
console.log('Game lobby: 16 cards, filters, recent-game allowlist and ordering passed.');
