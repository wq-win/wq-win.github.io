(function () {
  'use strict';
  const E = window.HanziBattleEngine, levels = window.HanziBattleLevels;
  const $ = id => document.getElementById(id), KEY = 'ink-hanzi-battle-v1';
  const roleClass = { guard: 'wood', fire: 'fire', troop: 'people' };
  const roleName = { guard: '护卫', fire: '火兵', troop: '战兵' }, laneNames = ['左', '中', '右'];
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let state, selected = null, busy = false, generation = 0;
  const timers = new Set();
  try { state = E.restore(localStorage.getItem(KEY)); } catch (_) { state = E.create(); }
  function save() { try { localStorage.setItem(KEY, E.save(state)); } catch (_) {} }
  function later(callback, delay) {
    const current = generation;
    const timer = setTimeout(() => { timers.delete(timer); if (current === generation) callback(); }, delay);
    timers.add(timer); return timer;
  }
  function cancelPending() {
    generation++; timers.forEach(clearTimeout); timers.clear(); busy = false; selected = null;
    document.querySelectorAll('.merge-ghost').forEach(el => el.remove()); $('fx-layer').replaceChildren(); $('gate').classList.remove('hit');
  }
  function element(tag, cls, text) {
    const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el;
  }
  function labelStats(char) {
    const u = E.UNITS[char];
    return roleName[u.role] + '，生命 ' + u.hp + '，攻击 ' + u.attack + (u.armor ? '，减伤 ' + u.armor : '') + (u.splash ? '，相邻溅射 ' + u.splash : '');
  }
  function health(parent, hp, max, attack) {
    const track = element('span', 'hp-track'); track.setAttribute('aria-hidden', 'true');
    const fill = element('i'); fill.style.width = Math.max(0, hp / max * 100) + '%'; track.append(fill); parent.append(track);
    const value = element('span', 'hp-text', hp + '/' + max);
    if (attack !== undefined) value.append(element('small', '', '攻' + attack)); parent.append(value);
  }
  function recipe(a, b) { return E.RECIPES.find(r => (r.inputs[0] === a && r.inputs[1] === b) || (r.inputs[0] === b && r.inputs[1] === a)); }
  function renderBoard() {
    $('character-board').replaceChildren();
    state.board.forEach((char, index) => {
      const button = element('button', 'character' + (char ? ' ' + roleClass[E.UNITS[char].role] : ' blank'));
      button.type = 'button'; button.dataset.slot = index;
      button.disabled = !char || state.phase !== 'prepare' || busy;
      if (char) {
        const unit = E.UNITS[char]; button.append(element('span', 'rank', '·'.repeat(unit.cost)), element('span', 'unit-glyph', char), element('span', 'unit-role', roleName[unit.role]));
        button.setAttribute('aria-label', char + '，' + labelStats(char) + '，字盘第' + (index + 1) + '格'); button.title = char + ' · ' + labelStats(char);
        button.setAttribute('aria-pressed', selected === index ? 'true' : 'false');
        if (selected === index) button.classList.add('selected');
        if (selected !== null && selected !== index && recipe(state.board[selected], char)) { button.classList.add('matchable'); button.setAttribute('aria-label', button.getAttribute('aria-label') + '，可合成' + recipe(state.board[selected], char).output); }
        button.addEventListener('click', () => selectCharacter(index));
      } else { button.textContent = '·'; button.setAttribute('aria-label', '字盘空格'); }
      $('character-board').append(button);
    });
    $('board-count').textContent = state.board.filter(Boolean).length + ' 字';
    $('selection-label').textContent = selected !== null ? '已选「' + state.board[selected] + '」' : state.phase === 'prepare' ? '选字合成 / 部署' : '出征中 · 字盘锁定';
  }
  function renderLanes() {
    $('lanes').replaceChildren();
    for (let i = 0; i < 3; i++) {
      const lane = element('div', 'lane'); lane.dataset.lane = i;
      const enemy = state.enemies[i];
      if (enemy) {
        const holder = element('div', 'enemy'); holder.dataset.enemy = i; holder.setAttribute('role', 'img'); holder.setAttribute('aria-label', laneNames[i] + '路' + enemy.name + '，生命' + enemy.hp + '，攻击' + enemy.attack + (enemy.armor ? '，减伤' + enemy.armor : ''));
        const monster = element('div', 'monster'); const eyes = element('span', 'monster-eyes'); eyes.append(element('i'), element('i')); monster.append(eyes, element('span', 'monster-mark', enemy.glyph || '墨')); holder.append(monster, element('span', 'enemy-name', enemy.name)); health(holder, enemy.hp, enemy.maxHp, enemy.attack); lane.append(holder);
      } else lane.append(element('div', 'enemy-empty', state.round > 0 && levels[state.level].enemies[i] ? '散' : '·'));
      const char = state.phase === 'prepare' ? state.army[i] : state.battleArmy[i] && state.battleArmy[i].char;
      const unit = char && (state.phase === 'prepare' ? E.UNITS[char] : state.battleArmy[i]);
      const slot = element('button', 'army-slot ' + (char ? 'occupied ' + roleClass[unit.role] : 'empty'));
      slot.type = 'button'; slot.dataset.army = i; slot.disabled = state.phase !== 'prepare' || busy;
      if (char) {
        slot.append(element('span', 'unit-glyph', char), element('span', 'unit-role', roleName[unit.role]));
        if (state.phase === 'prepare') slot.append(element('span', 'unit-stats', '命' + unit.hp + ' · 攻' + unit.attack + (unit.armor ? ' · 护' + unit.armor : '')));
        else health(slot, unit.hp, unit.maxHp);
        slot.setAttribute('aria-label', laneNames[i] + '路' + char + '，' + labelStats(char) + (state.phase === 'prepare' ? '，点击撤回字盘' : '，剩余生命' + unit.hp)); slot.title = slot.getAttribute('aria-label');
      } else {
        slot.append(element('span', 'slot-plus', state.phase === 'prepare' ? '+' : '·'), element('span', 'slot-copy', state.phase === 'prepare' ? laneNames[i] + '路出征位' : '无人守卫'));
        slot.setAttribute('aria-label', laneNames[i] + '路空出征位' + (selected !== null ? '，部署' + state.board[selected] : '，请先选择字盘中的字'));
        if (selected !== null && state.phase === 'prepare') slot.classList.add('deploy-target');
      }
      slot.addEventListener('click', () => selectLane(i)); lane.append(slot); $('lanes').append(lane);
    }
  }
  function render() {
    const level = levels[state.level];
    $('chapter').textContent = '第 ' + String(state.level + 1).padStart(2, '0') + ' 阵 · ' + level.subtitle;
    $('level-name').textContent = level.title; $('level-hint').textContent = level.hint;
    $('round-number').textContent = state.phase === 'prepare' ? '准备' : String(state.round).padStart(2, '0') + ' 回合';
    $('phase-label').textContent = { prepare: '整军待发', battle: '交锋之中', won: '破阵成功', lost: '城门失守' }[state.phase];
    $('gate-value').textContent = state.gate.hp + ' / ' + state.gate.maxHp; $('gate-fill').style.width = state.gate.hp / state.gate.maxHp * 100 + '%';
    $('gate').setAttribute('aria-label', '城门生命 ' + state.gate.hp + '，上限 ' + state.gate.maxHp);
    $('level-select').value = String(state.level); $('progress').textContent = state.completed.length + ' / 6 已破';
    renderBoard(); renderLanes();
    $('march').disabled = state.phase !== 'prepare' || !state.army.some(Boolean) || busy;
    $('march').querySelector('span').textContent = state.phase === 'prepare' ? state.army.some(Boolean) ? '出 征' : '先部署，再出征' : state.phase === 'battle' ? '交 锋 中' : '本 阵 已 结';
    const finished = state.phase === 'won' || state.phase === 'lost'; $('result').hidden = !finished;
    if (finished) {
      const won = state.phase === 'won';
      $('result-seal').textContent = won ? '胜' : '再'; $('result-eyebrow').textContent = won ? '墨散，城安。' : '换一阵，再出征。';
      $('result-title').textContent = won ? state.completed.length === 6 ? '六阵已破，字有千军' : state.level === 5 ? '终阵已破' : '守住了这一阵' : '城门失守了';
      $('result-copy').textContent = won ? '第 ' + state.round + ' 回合 · 城门余 ' + state.gate.hp + ' 点生命' : '观察三路敌人，把耐打的护卫放在强敌面前。';
      $('result-action').textContent = won && state.level < 5 ? '下一阵 →' : won ? '再战此阵 ↶' : '调整阵容 ↶';
      $('rearrange').hidden = !won;
    }
  }
  function message(text) { $('feedback').textContent = text; }
  function focusSlot(index) { const button = document.querySelector('[data-slot="' + index + '"]'); if (button && !button.disabled) button.focus({ preventScroll: true }); }
  function selectCharacter(index) {
    if (state.phase !== 'prepare' || busy || !state.board[index]) return;
    if (selected === null || selected === index) {
      selected = selected === index ? null : index; render(); focusSlot(index);
      if (selected === null) message('已取消选字。点两个字合成，或选字部署。');
      else { const char = state.board[index]; message(char + ' · ' + labelStats(char).replace(/，/g, ' · ') + '。点配对字或空阵位。'); }
      return;
    }
    const from = selected, a = state.board[from], b = state.board[index];
    const first = document.querySelector('[data-slot="' + from + '"]'), second = document.querySelector('[data-slot="' + index + '"]');
    const boundsA = first.getBoundingClientRect(), boundsB = second.getBoundingClientRect(); const ghost = second.cloneNode(true);
    const result = E.combine(state, from, index);
    if (!result.ok) { message(result.error); focusSlot(index); return; }
    selected = null; save(); render(); message(a + ' + ' + b + ' → ' + result.char + '。合成成功，可继续合字或部署。');
    const target = document.querySelector('[data-slot="' + from + '"]');
    if (!reduced()) {
      busy = true; render(); ghost.classList.add('merge-ghost'); ghost.classList.remove('selected', 'matchable'); ghost.setAttribute('aria-hidden', 'true'); ghost.tabIndex = -1; ghost.disabled = true;
      Object.assign(ghost.style, { left: boundsB.left + 'px', top: boundsB.top + 'px', width: boundsB.width + 'px', height: boundsB.height + 'px' }); document.body.append(ghost);
      later(() => { ghost.style.transform = 'translate(' + (boundsA.left - boundsB.left) + 'px,' + (boundsA.top - boundsB.top) + 'px) scale(.45)'; ghost.style.opacity = '0'; }, 16);
      later(() => { ghost.remove(); busy = false; render(); const card = document.querySelector('[data-slot="' + from + '"]'); if (card) card.classList.add('merging'); focusSlot(from); }, 330);
    } else { if (target) target.classList.add('merging'); focusSlot(from); }
  }
  function selectLane(lane) {
    if (state.phase !== 'prepare' || busy) return;
    if (state.army[lane]) {
      const result = E.recall(state, lane); if (!result.ok) { message(result.error); return; }
      selected = null; save(); render(); message(result.char + '已撤回字盘，可以继续合字或换一路部署。'); focusSlot(result.slot); return;
    }
    if (selected === null) { message('先点字盘中的一个字，再点' + laneNames[lane] + '路空阵位。'); return; }
    const result = E.deploy(state, selected, lane);
    if (!result.ok) { message(result.error); return; }
    selected = null; save(); render(); message(result.char + '已部署在' + laneNames[lane] + '路。点它可以撤回。');
    document.querySelector('[data-army="' + lane + '"]').focus({ preventScroll: true });
  }
  function center(el, scene) { const r = el.getBoundingClientRect(); return { x: r.left - scene.left + r.width / 2, y: r.top - scene.top + r.height / 2 }; }
  function effects(events) {
    if (reduced()) return;
    const scene = $('ink-scene').getBoundingClientRect();
    events.forEach(event => {
      if (event.type === 'attack' || event.type === 'splash' || event.type === 'gate') {
        const from = document.querySelector(event.side === 'army' ? '[data-army="' + event.lane + '"]' : '[data-enemy="' + event.lane + '"]');
        const to = event.type === 'gate' ? $('gate') : document.querySelector(event.side === 'army' ? '[data-enemy="' + event.targetLane + '"]' : '[data-army="' + event.targetLane + '"]');
        if (from) from.classList.add('attacking');
        if (to) {
          to.classList.add('hit'); const p = center(to, scene), amount = element('span', 'damage', '−' + event.amount);
          amount.style.left = (p.x - 8) + 'px'; amount.style.top = (p.y - 10) + 'px'; $('fx-layer').append(amount);
          if (from) { const q = center(from, scene), beam = element('span', 'strike'); beam.style.left = q.x + 'px'; beam.style.top = q.y + 'px'; beam.style.width = Math.hypot(p.x - q.x, p.y - q.y) + 'px'; beam.style.transform = 'rotate(' + Math.atan2(p.y - q.y, p.x - q.x) + 'rad)'; if (event.type === 'splash') beam.style.background = '#d48f47'; $('fx-layer').append(beam); }
        }
      }
      if (event.type === 'defeat') {
        const target = document.querySelector(event.side === 'army' ? '[data-army="' + event.lane + '"]' : '[data-enemy="' + event.lane + '"]');
        if (target) target.classList.add('fallen');
      }
    });
  }
  function battleTurn() {
    if (state.phase !== 'battle') return;
    const events = E.step(state); effects(events);
    later(() => {
      $('fx-layer').replaceChildren(); $('gate').classList.remove('hit'); render(); save();
      const gateDamage = events.filter(e => e.type === 'gate').reduce((n, e) => n + e.amount, 0), fallen = events.filter(e => e.type === 'defeat' && e.side === 'enemy').length;
      message(state.phase === 'won' ? '敌阵全破，城门守住了。' : state.phase === 'lost' ? '城门归零。保留阵容，换个站位再试试。' : '第 ' + state.round + ' 回合 · ' + (fallen ? fallen + ' 路墨兽退场。' : '双方同步交锋。') + (gateDamage ? '城门受到 ' + gateDamage + ' 点伤害。' : '城门安好。'));
      if (state.phase === 'battle') later(battleTurn, reduced() ? 65 : 470);
      else $('result-action').focus({ preventScroll: true });
    }, reduced() ? 0 : 410);
  }
  function march() {
    if (busy) return; const result = E.start(state); if (!result.ok) { message(result.error); return; }
    selected = null; save(); render(); message('战斗开始。每回合同步攻击，留意各路血量。'); later(battleTurn, reduced() ? 0 : 440);
  }
  function restart(index, keepFormation) {
    cancelPending(); const completed = state.completed.slice();
    state = keepFormation ? E.restore(E.save(state)) : E.create(index);
    state.completed = completed; save(); render(); message(keepFormation ? '阵容已保留。点出征位撤回，调整后再出征。' : '点两个字合成，再点空阵位部署。');
  }
  levels.forEach((level, i) => { const option = element('option', '', String(i + 1).padStart(2, '0') + ' · ' + level.title); option.value = i; $('level-select').append(option); });
  $('march').addEventListener('click', march);
  $('restart').addEventListener('click', () => restart(state.level, false));
  $('level-select').addEventListener('change', () => restart(Number($('level-select').value), false));
  $('result-action').addEventListener('click', () => { if (state.phase === 'won' && state.level < 5) restart(state.level + 1, false); else restart(state.level, true); });
  $('rearrange').addEventListener('click', () => restart(state.level, true));
  $('help-open').addEventListener('click', () => { if (typeof $('help').showModal === 'function') $('help').showModal(); else $('help').setAttribute('open', ''); });
  function closeHelp() { if (typeof $('help').close === 'function') $('help').close(); else $('help').removeAttribute('open'); $('help-open').focus({ preventScroll: true }); }
  $('help-close').addEventListener('click', closeHelp);
  $('help').addEventListener('click', event => { if (event.target === $('help')) { const bounds = $('help').getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeHelp(); } });
  $('character-board').addEventListener('keydown', event => {
    const current = event.target.closest('[data-slot]'); if (!current || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[event.key]; let i = Number(current.dataset.slot);
    for (let step = 0; step < 12; step++) { i = (i + delta + 12) % 12; const next = document.querySelector('[data-slot="' + i + '"]'); if (next && !next.disabled) { next.focus(); break; } }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if ($('help').open) { event.preventDefault(); event.stopImmediatePropagation(); closeHelp(); return; }
    if (selected !== null) { const previous = selected; selected = null; render(); message('已取消选字。'); focusSlot(previous); }
  });
  render();
})();
