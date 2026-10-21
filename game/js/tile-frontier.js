(function () {
    'use strict';
    const E = window.TileFrontier, $ = id => document.getElementById(id), KEY = 'tiny-frontier-progress-v1';
    let completed = [], index = 0, selected = 22, epoch = 0, savedOK = true, timers = new Set(), state, resumed = null, best = {}, soundOn = false, audio;
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
        if (raw && typeof raw === 'object') {
            completed = Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(n => Number.isInteger(n) && n >= 0 && n < E.levels.length))] : [];
            resumed = E.restore(raw.run);
            best = raw.best && typeof raw.best === 'object' && !Array.isArray(raw.best) ? raw.best : {};
            soundOn = raw.sound === true;
            index = Number.isInteger(raw.index) && E.levels[raw.index] ? raw.index : 0;
        }
    } catch (_) { savedOK = false; }
    const svg = body => '<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + body + '</svg>';
    const ground = '<ellipse cx="48" cy="73" rx="33" ry="10" fill="#637f4b" opacity=".16"/>';
    function pine(x, y, scale) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"><path d="M-3 1H3V24H-3Z" fill="#806345"/><path d="M0-49 19-17H10L26 6H-26L-10-17H-19Z" fill="#416c50"/><path d="M0-49V6H-26L-10-17H-19Z" fill="#55835c"/><path d="M0-34 11-15H5L15 0" fill="none" stroke="#71966a" stroke-width="2"/></g>'; }
    function flag(color, x = 62, y = 12) { return '<path d="M' + x + ' ' + y + 'V' + (y + 33) + '" stroke="#594d39" stroke-width="3" stroke-linecap="round"/><path d="M' + (x + 1) + ' ' + y + 'Q' + (x + 13) + ' ' + (y - 6) + ' ' + (x + 24) + ' ' + (y + 2) + 'L' + (x + 19) + ' ' + (y + 13) + 'Q' + (x + 11) + ' ' + (y + 7) + ' ' + (x + 1) + ' ' + (y + 13) + 'Z" fill="' + color + '"/>'; }
    function illustration(kind, owned) {
        if (kind === 'fog') return svg('<path d="M8 57Q23 34 46 42T87 22M6 72Q26 48 49 56T90 36M18 86Q35 66 57 70T88 57" fill="none" stroke="#b6c5a0" stroke-width="1.5" opacity=".55"/><path d="m48 26 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#dce7c5"/><circle cx="24" cy="22" r="2" fill="#dce7c5"/>');
        if (kind === 'plain') return svg(ground + '<path d="m23 66 3-8 3 8m33 3 3-7 3 7m-30-20 3-6 3 6" fill="none" stroke="#79945b" stroke-width="2" stroke-linecap="round"/><ellipse cx="60" cy="55" rx="5" ry="3" fill="#b6bd91"/>');
        if (kind === 'forest') return svg(ground + pine(34, 54, .65) + pine(65, 58, .62) + pine(48, 66, .88));
        if (kind === 'wood') return svg('<g transform="rotate(-20 48 48)"><path d="M25 25H71V45H25Z" fill="#a77b44"/><ellipse cx="25" cy="35" rx="10" ry="10" fill="#edcb8b"/><ellipse cx="71" cy="35" rx="10" ry="10" fill="#c79658"/><path d="M25 51H71V71H25Z" fill="#b98c52"/><ellipse cx="25" cy="61" rx="10" ry="10" fill="#f2d296"/><ellipse cx="25" cy="61" rx="5" ry="5" fill="none" stroke="#a87940" stroke-width="2"/><ellipse cx="25" cy="35" rx="5" ry="5" fill="none" stroke="#a87940" stroke-width="2"/><path d="M39 29H62M43 56H67" stroke="#d3ae71" stroke-width="3" stroke-linecap="round"/></g>');
        if (kind === 'troops') return svg('<path d="M28 51Q28 21 48 19 68 21 68 51" fill="#5f7a80"/><path d="M48 18V43M26 46H70" stroke="#c6d2ca" stroke-width="6"/><path d="M22 48H74V62L48 83 22 62Z" fill="#315b48"/><path d="M48 48V75M32 54 48 64 64 54" fill="none" stroke="#d5dfbc" stroke-width="4"/>');
        if (kind === 'action') return svg('<circle cx="48" cy="49" r="29" fill="#e4c582" stroke="#9d7b3a" stroke-width="3"/><path d="M48 28V50L63 59" fill="none" stroke="#654c27" stroke-width="5" stroke-linecap="round"/><path d="M39 12H57M48 12V20" stroke="#9d7b3a" stroke-width="5" stroke-linecap="round"/>');
        if (kind === 'flag') return svg('<ellipse cx="44" cy="80" rx="24" ry="7" fill="#b6c7a6"/>' + flag('#315b48', 32, 20) + '<path d="M32 40V79" stroke="#594d39" stroke-width="4" stroke-linecap="round"/>');
        if (kind === 'camp') return svg(ground + '<path d="M23 44 48 30 73 44V71L48 84 23 71Z" fill="#ead49c"/><path d="M48 52 73 44V71L48 84Z" fill="#cfb982"/><path d="m17 44 30-24 31 23-30 16Z" fill="#ae684c"/><path d="m17 44 30-24 1 39Z" fill="#cf8760"/><path d="M36 62 45 67V81L36 76Z" fill="#795b3e"/><path d="m57 58 8-4v10l-8 4Z" fill="#fff0bd"/>' + flag('#315b48', 68, 17));
        if (kind === 'mill') return svg(ground + '<path d="M23 47 49 32 72 46V70L47 83 23 70Z" fill="#dec591"/><path d="M47 57 72 46V70L47 83Z" fill="#b89864"/><path d="m18 46 30-25 30 24-31 17Z" fill="#b98a51"/><path d="m18 46 30-25-1 41Z" fill="#d8b16d"/><path d="M29 56 42 63V76L29 69Z" fill="#836140"/><circle cx="63" cy="62" r="10" fill="#d1d4bd" stroke="#65746a" stroke-width="3" stroke-dasharray="3 2"/><circle cx="63" cy="62" r="3" fill="#65746a"/><path d="M15 69 33 78M13 75 29 83" stroke="#947047" stroke-width="7" stroke-linecap="round"/><path d="M16 67 33 76" stroke="#e8ca8b" stroke-width="2"/>');
        if (kind === 'barracks') return svg(ground + '<path d="M23 42 48 29 74 42V72L48 84 23 72Z" fill="#d8dac1"/><path d="M48 54 74 42V72L48 84Z" fill="#aab9a6"/><path d="m16 42 32-23 32 23-32 18Z" fill="#466b76"/><path d="m16 42 32-23v41Z" fill="#638b92"/><path d="M32 56 43 62V79L32 73Z" fill="#3e5d59"/><path d="m60 57 8-4v12l-8 4Z" fill="#faf0bd"/><path d="M16 73V29m-4 6 4-9 4 9" stroke="#687b73" stroke-width="3" fill="#c2cbb4"/>' + flag('#e1b35b', 63, 14));
        if (kind === 'outpost') {
            const color = owned ? '#315b48' : '#9c5141';
            return svg(ground + '<path d="M27 34 49 25 70 35V72L49 84 27 73Z" fill="#c3b59b"/><path d="M49 46 70 35V72L49 84Z" fill="#9c947f"/><path d="m27 34 22 12 21-11V26l-8-4v9l-9-5v-9l-9-4v9l-9-4v9l-8-3Z" fill="#ded2b7"/><path d="M34 52 43 57V68L34 63Z" fill="#625d4c"/><path d="m56 54 7-4v10l-7 4Z" fill="#625d4c"/><path d="M31 73V66Q38 62 45 73V82" fill="#685943"/>' + flag(color, 62, 10));
        }
        return illustration('plain');
    }
    function el(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
    function later(callback, delay) { const ownEpoch = epoch; const timer = setTimeout(() => { timers.delete(timer); if (ownEpoch === epoch) callback(); }, delay); timers.add(timer); return timer; }
    function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify({ index: state.index, completed, run: E.save(state), best, sound: soundOn })); savedOK = true; }
        catch (_) { savedOK = false; }
        $('save-status').textContent = savedOK ? '本局与完成进度自动保存在当前浏览器。' : '此浏览器暂时无法保存进度，仍可正常游玩。';
    }
    function tileName(tile) {
        if (!tile.revealed) return '未知土地';
        if (tile.building === 'mill') return '伐木场'; if (tile.building === 'barracks') return '兵营';
        return { camp: '营地', forest: '林地', plain: '己方空地', outpost: tile.owned ? '已占据点' : '敌方据点' }[tile.terrain];
    }
    function artFor(tile) { return tile.revealed ? tile.building || tile.terrain : 'fog'; }
    function buttonContent(button, title, detail) { button.replaceChildren(el('span', '', title), el('small', '', detail)); }
    function configureCommands() {
        const tile = state.tiles[selected], primary = $('primary-action'), secondary = $('secondary-action');
        $('selected-art').innerHTML = illustration(artFor(tile), tile.owned);
        $('selected-name').textContent = tileName(tile);
        primary.dataset.action = ''; secondary.dataset.action = ''; secondary.hidden = false;
        primary.disabled = secondary.disabled = true; secondary.className = 'secondary'; $('commands').classList.remove('single');
        buttonContent(primary, '建伐木场', '2 木材 · 1 行动'); buttonContent(secondary, '建兵营', '3 木材 · 1 行动');
        if (tile.owned && tile.terrain === 'plain' && !tile.building) {
            $('selected-copy').textContent = '伐木场需 6 次后续行动回本；兵营可立即招兵。剩余 ' + (state.budget-state.actions) + ' 行动。';
            primary.dataset.action = 'mill'; secondary.dataset.action = 'barracks';
            primary.disabled = !!E.reason(state, { type: 'build', id: selected, building: 'mill' });
            secondary.disabled = !!E.reason(state, { type: 'build', id: selected, building: 'barracks' });
        } else if (tile.building === 'barracks') {
            $('selected-copy').textContent = '点击兵营或下方按钮招兵'; primary.dataset.action = 'recruit';
            buttonContent(primary, '招募 2 兵', '2 木材 · 1 行动'); primary.disabled = !!E.reason(state, { type: 'recruit', id: selected }); secondary.hidden = true; $('commands').classList.add('single');
        } else if (tile.terrain === 'outpost' && tile.revealed && !tile.owned) {
            $('selected-copy').textContent = '守军 ' + tile.guard + ' · 你的兵力 ' + state.troops; primary.dataset.action = 'attack';
            buttonContent(primary, '攻占据点', '消耗 ' + tile.guard + ' 兵 · 1 行动'); primary.disabled = !!E.reason(state, { type: 'attack', id: selected }); secondary.hidden = true; $('commands').classList.add('single');
        } else {
            $('selected-copy').textContent = !tile.revealed ? '需要与己方领地上下左右相邻' : tile.building === 'mill' ? '再行动 ' + (3 - tile.age) + ' 次产出 1 木，建成当步不计' : tile.terrain === 'camp' ? '点击亮边格翻开；点己方空地可建造' : tile.terrain === 'forest' ? '已收取 ' + tile.wood + ' 木，继续向相邻土地探索' : '旗帜已归你，可以继续向外探索';
        }
    }
    function render() {
        const level = E.levels[state.index], active = document.activeElement, focusId = active && active.dataset ? active.dataset.tile : undefined;
        $('wood-count').textContent = state.wood; $('troop-count').textContent = state.troops; $('action-count').textContent = state.budget - state.actions;
        $('flag-count').replaceChildren(document.createTextNode(String(state.captured)), el('span', '', '/' + state.target));
        $('level-number').textContent = String(state.index + 1).padStart(2, '0'); $('level-name').textContent = level.name;
        $('mission-name').textContent = level.name; $('mission-hint').textContent = level.hint; $('rules-hint').textContent = '本关手记：' + level.hint;
        $('level-select').value = String(state.index); $('progress').textContent = completed.length + ' / 6'; $('progress').title = '已完成 ' + completed.length + ' 关';
        const map = $('frontier-map'); map.replaceChildren();
        state.tiles.forEach(tile => {
            const reachable = !tile.revealed && E.adjacent(state, tile.id);
            const b = el('button', 'tile ' + (tile.revealed ? 'terrain-' + tile.terrain : 'fog') + (reachable ? ' reachable' : '') + (tile.id === selected ? ' selected' : '') + (tile.terrain === 'outpost' && tile.revealed ? tile.owned ? ' owned-outpost' : ' enemy' : ''));
            b.type = 'button'; b.dataset.tile = String(tile.id); b.disabled = state.status !== 'playing';
            b.setAttribute('aria-pressed', tile.id === selected ? 'true' : 'false');
            const location = '第 ' + (Math.floor(tile.id / 5) + 1) + ' 行第 ' + (tile.id % 5 + 1) + ' 列，';
            b.setAttribute('aria-label', location + tileName(tile) + (!tile.revealed ? reachable ? '，可翻开，消耗 1 行动' : '，尚不相邻' : tile.building === 'barracks' ? '，点击花 2 木招 2 兵和 1 行动' : tile.terrain === 'outpost' && !tile.owned ? '，守军 ' + tile.guard + '，选择后可攻占' : tile.building === 'mill' ? '，再行动 ' + (3 - tile.age) + ' 次产 1 木' : '，点击选中'));
            const art = el('span', 'tile-art'); art.innerHTML = illustration(artFor(tile), tile.owned); art.setAttribute('aria-hidden', 'true'); b.append(art);
            if (tile.terrain === 'outpost' && tile.revealed) { const badge = el('span', 'tile-badge', tile.owned ? '⚑' : String(tile.guard)); badge.setAttribute('aria-hidden', 'true'); b.append(badge); }
            if (tile.building === 'mill') { const clock = el('span', 'mill-clock'); clock.setAttribute('aria-hidden', 'true'); for (let i = 0; i < 3; i++) clock.append(el('i', i < tile.age ? 'filled' : '')); b.append(clock); }
            if (tile.terrain === 'camp' || tile.building === 'barracks') { const label = el('span', 'tile-label', tile.terrain === 'camp' ? '营地' : '+2 兵'); label.setAttribute('aria-hidden', 'true'); b.append(label); }
            b.addEventListener('click', () => choose(tile.id)); map.append(b);
        });
        configureCommands();
        const left = state.budget - state.actions, pending = state.tiles.filter(t => t.revealed && t.terrain === 'outpost' && !t.owned).reduce((n, t) => n + t.guard, 0);
        const income = state.tiles.filter(t => t.building === 'mill').reduce((n,t) => n + Math.floor((t.age + left) / 3), 0);
        $('strategy-note').textContent = '规划：已发现据点还需 ' + pending + ' 兵；现有伐木场在剩余行动内最多产 ' + income + ' 木。新伐木场需 6 次后续行动回本' + (left <= 6 ? '，此时投资难回本。' : '；探索找木不必先花建造费。');
        $('sound-toggle').textContent = soundOn ? '♪ 音效开' : '♪ 音效关';
        $('sound-toggle').setAttribute('aria-pressed', String(soundOn));
        $('result').hidden = state.status === 'playing';
        if (state.status !== 'playing') {
            const won = state.status === 'won';
            $('result-stamp').textContent = won ? '⚑' : '↶'; $('result-kicker').textContent = won ? '旗帜升起 · 第 ' + (state.index + 1) + ' 关' : '计划可以重来';
            $('result-title').textContent = won ? state.index === 5 ? '三面旗，都归来了' : '这片土地，点亮了' : state.endReason === 'blocked' ? '暂时无路可走了' : '行动已经用尽';
            $('result-copy').textContent = won ? '用 ' + state.actions + ' 次行动（最佳 ' + best[state.index] + '）拿下 ' + state.target + ' 个据点。' + (state.index === 5 ? completed.length === E.levels.length ? '六关完成，重温你喜欢的布局吧。' : '这一关完成，也可以回头挑战其他关卡。' : '带上这份远见，去下一片土地。') : state.endReason === 'blocked' ? '已没有可执行的行动。重来时，给木材和招兵留些余地。' : '还差 ' + (state.target - state.captured) + ' 个据点。少走一步，或者更早投资，再试一次。';
            $('result-action').textContent = won && state.index < E.levels.length - 1 ? '下一片土地 →' : '重新规划这一关';
        }
        if (focusId !== undefined && state.status === 'playing') { const tile = map.querySelector('[data-tile="' + focusId + '"]'); if (tile) tile.focus({ preventScroll: true }); }
    }
    function announce(result) {
        const tile = state.tiles[result.id];
        if (state.status === 'won') return '全部据点已占领！' + (savedOK ? '完成进度已保存。' : '本次完成进度无法保存，但仍可继续玩。');
        if (state.status === 'lost') return state.endReason === 'blocked' ? '没有可执行的行动了，重新规划试试。' : '行动已用尽，重新规划试试。';
        let text = result.type === 'reveal' ? tile.terrain === 'outpost' ? '发现据点，守军 ' + tile.guard + '。选中后点攻占。' : result.harvested ? '翻开林地，收获 ' + result.harvested + ' 木。' : '空地已归你，可以建造。' : result.type === 'build' ? tile.building === 'mill' ? '伐木场建好了，后续每 3 行动产 1 木。' : '兵营建好了，点击兵营花 2 木招 2 兵。' : result.type === 'recruit' ? '2 名士兵加入了队伍。' : '据点已攻占，消耗 ' + result.spentTroops + ' 兵。';
        if (result.produced) text += ' 伐木场产出 ' + result.produced + ' 木。'; return text;
    }
    function animate(result) {
        if (reduced()) return;
        const tile = document.querySelector('[data-tile="' + result.id + '"]');
        if (tile) { tile.classList.add(result.type === 'reveal' ? 'flip' : result.type === 'build' ? 'grow' : result.type === 'attack' ? 'capture' : 'recruit'); later(() => tile.classList.remove('flip', 'grow', 'capture', 'recruit'), 520); }
        const gains = result.producers.map(id => ({ id, amount: 1 })); if (result.harvested) gains.push({ id: result.id, amount: result.harvested });
        gains.forEach(gain => {
            const source = document.querySelector('[data-tile="' + gain.id + '"]'), target = $('wood-icon'); if (!source) return;
            const from = source.getBoundingClientRect(), to = target.getBoundingClientRect(), shell = $('map-shell').getBoundingClientRect();
            const flying = el('span', 'flying-wood'); flying.innerHTML = illustration('wood'); flying.style.left = from.left + from.width / 2 - 13 + 'px'; flying.style.top = from.top + from.height / 2 - 13 + 'px'; flying.style.setProperty('--dx', to.left + to.width / 2 - from.left - from.width / 2 + 'px'); flying.style.setProperty('--dy', to.top + to.height / 2 - from.top - from.height / 2 + 'px'); $('fx-layer').append(flying);
            const count = el('span', 'float-gain', '+' + gain.amount); count.style.setProperty('--x', from.left + from.width / 2 - shell.left + 'px'); count.style.setProperty('--y', from.top + 8 - shell.top + 'px'); $('fx-layer').append(count);
            later(() => { flying.remove(); count.remove(); }, 850);
        });
        if (gains.length) { $('wood-count').classList.add('pulse'); later(() => $('wood-count').classList.remove('pulse'), 500); }
    }
    function perform(action) {
        const result = E.act(state, action);
        if (!result.ok) { $('feedback').textContent = result.reason; return false; }
        selected = action.id;
        if (state.status === 'won') { if (!completed.includes(state.index)) completed.push(state.index); best[state.index] = Math.min(Number(best[state.index]) || Infinity, state.actions); }
        save(); tone(result.type === 'attack' ? 660 : 440);
        render(); $('feedback').textContent = announce(result); animate(result);
        if (state.status !== 'playing') $('result-action').focus({ preventScroll: true });
        return true;
    }
    function choose(id) {
        if (state.status !== 'playing') return;
        const tile = state.tiles[id]; selected = id;
        if (!tile.revealed) { if (!perform({ type: 'reveal', id })) render(); }
        else if (tile.building === 'barracks') { if (!perform({ type: 'recruit', id })) render(); }
        else { render(); $('feedback').textContent = tile.terrain === 'outpost' && !tile.owned ? '守军 ' + tile.guard + '。' + (state.troops < tile.guard ? '先去兵营补足兵力。' : '可以攻占，兵力会消耗 ' + tile.guard + '。') : tile.terrain === 'plain' && !tile.building ? '已选中空地。建造花木材和 1 行动。' : tile.building === 'mill' ? '伐木场还需 ' + (3 - tile.age) + ' 次有效行动产出。' : '选中土地不消耗行动。继续翻开亮边格子。'; }
    }
    function command(button) {
        const type = button.dataset.action;
        if (!type || button.disabled) return;
        perform(type === 'mill' || type === 'barracks' ? { type: 'build', id: selected, building: type } : { type, id: selected });
    }
    function tone(hz) {
        if (!soundOn) return;
        try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; audio = audio || new AC(); if (audio.state === 'suspended') audio.resume().catch(() => {}); const o = audio.createOscillator(), g = audio.createGain(); o.connect(g); g.connect(audio.destination); o.frequency.value = hz; g.gain.setValueAtTime(.035, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .12); o.start(); o.stop(audio.currentTime + .12); } catch (_) {}
    }
    function start(n) {
        epoch++; timers.forEach(clearTimeout); timers.clear(); $('fx-layer').replaceChildren(); $('wood-count').classList.remove('pulse');
        state = E.create(n); selected = E.levels[n].camp; save(); render();
        $('feedback').textContent = E.levels[n].briefing;
    }
    function openRules() { const dialog = $('rules-dialog'); if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); $('rules-close').focus(); }
    function closeRules() { const dialog = $('rules-dialog'); if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); $('rules-open').focus(); }
    E.levels.forEach((level, i) => { const option = el('option', '', String(i + 1).padStart(2, '0') + ' · ' + level.name); option.value = String(i); $('level-select').append(option); });
    [['wood-icon', 'wood'], ['troop-icon', 'troops'], ['action-icon', 'action'], ['flag-icon', 'flag']].forEach(([id, kind]) => { $(id).innerHTML = illustration(kind); });
    $('landscape-art').innerHTML = '<svg viewBox="0 0 330 75" xmlns="http://www.w3.org/2000/svg"><path d="M0 61Q46 24 97 46T190 43 330 58V75H0Z" fill="#d8e1c8"/><path d="M10 71Q86 42 152 62T325 63" fill="none" stroke="#b7c7a4" stroke-width="2"/>' + pine(34, 54, .65) + pine(62, 56, .45) + pine(275, 48, .65) + '<path d="M154 43 171 32 188 42V62L171 70 154 62Z" fill="#d9bc83"/><path d="m149 42 22-19 23 18-23 12Z" fill="#9e6850"/><path d="M165 55V66L172 70V59Z" fill="#78573a"/>' + flag('#315b48', 211, 27) + '</svg>';
    $('primary-action').addEventListener('click', () => command($('primary-action'))); $('secondary-action').addEventListener('click', () => command($('secondary-action')));
    $('restart').addEventListener('click', () => start(state.index)); $('level-select').addEventListener('change', () => { const n = Number($('level-select').value); if (Number.isInteger(n) && E.levels[n]) start(n); });
    $('result-action').addEventListener('click', () => start(state.status === 'won' && state.index < E.levels.length - 1 ? state.index + 1 : state.index));
    $('rules-open').addEventListener('click', openRules); $('rules-close').addEventListener('click', closeRules); $('rules-done').addEventListener('click', closeRules);
    $('rules-dialog').addEventListener('cancel', event => { event.preventDefault(); closeRules(); });
    $('sound-toggle').addEventListener('click', () => { soundOn = !soundOn; save(); render(); tone(550); });
    if (resumed && resumed.index === index) { state = resumed; selected = E.levels[index].camp; render(); save(); $('feedback').textContent = '已恢复上次的规划，剩余 ' + (state.budget - state.actions) + ' 次行动。'; } else start(index);
}());
