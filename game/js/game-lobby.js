(function () {
  'use strict';
  var tools = document.getElementById('lobby-tools');
  if (!tools) return;
  var games = {
    'sheep-triple.html': ['relax','☘','层叠三消'], 'water-sort.html': ['relax','◒','轻点分色'],
    'sum-ten.html': ['relax','10','限时挑战'], 'tile-frontier.html': ['strategy','⚑','回合探索'],
    'hanzi-battle.html': ['strategy','林','合字布阵'], 'screws.html': ['relax','✚','拆解机关'],
    'parking.html': ['relax','↗','规划路线'], 'yarn.html': ['relax','〰','解压整理'],
    'snow-camp.html': ['strategy','❄','五日生存'], 'sudoku.html': ['cards','9','数字推理'],
    'spider.html': ['cards','♠','经典接龙'], 'doudizhu.html': ['cards','♥','残局挑战'],
    'paodekuai.html': ['cards','♣','三人对局'], 'jianghu-slay/': ['strategy','刀','江湖对战'],
    'tower-defense.html': ['strategy','♜','二十关塔防'], 'net.html': ['cards','⌘','连线解谜']
  };
  var section = tools.parentElement;
  var cards = Array.from(section.querySelectorAll('a.article-card'));
  cards.forEach(function (card) {
    var href = card.getAttribute('href'), info = games[href];
    if (!info) return;
    card.classList.add('lobby-game'); card.dataset.category = info[0];
    var art = document.createElement('span'); art.className = 'lobby-art lobby-art-' + info[0]; art.textContent = info[1]; art.setAttribute('aria-hidden','true'); card.prepend(art);
    var tag = document.createElement('span'); tag.className = 'lobby-tag'; tag.textContent = info[2] + ' · 开始玩 ›'; card.appendChild(tag);
    card.addEventListener('click', function () { try { localStorage.setItem('mylog-last-game', href); } catch (_) {} });
  });
  function filter(category) {
    var count = 0;
    cards.forEach(function (card) { card.hidden = category !== 'all' && card.dataset.category !== category; if (!card.hidden) count++; });
    tools.querySelectorAll('[data-category]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.category === category)); });
    document.getElementById('lobby-count').textContent = count + ' 款游戏，点开即玩';
  }
  tools.querySelectorAll('button[data-category]').forEach(function (button) { button.addEventListener('click', function () { filter(button.dataset.category); }); });
  try {
    var last = localStorage.getItem('mylog-last-game');
    var card = cards.find(function (item) { return item.getAttribute('href') === last; });
    if (card && games[last]) {
      var recent = document.getElementById('recent-game'), link = document.createElement('a');
      link.href = last; link.textContent = '再玩一次 · ' + card.querySelector('h3').textContent + ' →';
      recent.appendChild(link); recent.hidden = false;
    }
  } catch (_) {}
  tools.hidden = false; filter('all');
}());
