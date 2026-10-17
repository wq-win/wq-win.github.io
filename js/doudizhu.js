(function () {
    'use strict';
    var DD = window.Doudizhu;
    var LEVELS = window.DOUDIZHU_LEVELS || [];
    var SUITS = ['♠', '♥', '♦', '♣'];
    var state = null;
    var selected = {};
    var thinking = false;
    var hinting = false;
    var paused = false;
    var aiTimer = 0;
    var hintTimer = 0;
    var generation = 0;
    var restartTarget = null;
    var restartFocus = null;
    var hintText = '';
    var hintPass = false;
    var savedClears = {};
    var storageUnavailable = false;

    function element(id) { return document.getElementById(id); }
    function storageKey() { return 'mylog-doudizhu-cleared-v2'; }

    function cleared() {
        var done;
        try {
            done = JSON.parse(localStorage.getItem(storageKey()));
            if (!done || typeof done !== 'object' || Array.isArray(done)) done = {};
        } catch (error) {
            done = {};
        }
        Object.keys(savedClears).forEach(function (id) { done[id] = 1; });
        return done;
    }

    function markCleared(id) {
        savedClears[id] = 1;
        try {
            localStorage.setItem(storageKey(), JSON.stringify(cleared()));
            storageUnavailable = false;
        } catch (error) {
            storageUnavailable = true;
        }
    }

    function emptyCounts() { return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; }
    function suitPool() {
        var pool = [];
        for (var rank = 0; rank < 15; rank += 1) pool[rank] = SUITS.slice();
        return pool;
    }

    function expand(counts, prefix, pool) {
        var cards = [];
        for (var rank = 14; rank >= 0; rank -= 1) {
            for (var n = 0; n < counts[rank]; n += 1) {
                cards.push({ r: rank, s: rank >= 13 ? '' : (pool[rank].pop() || SUITS[n % 4]), id: prefix + '-' + rank + '-' + n });
            }
        }
        return cards;
    }

    // Generation checks also reject callbacks already queued when a timer is canceled.
    function invalidateTimers() {
        generation += 1;
        window.clearTimeout(aiTimer);
        window.clearTimeout(hintTimer);
        aiTimer = 0;
        hintTimer = 0;
    }

    function canAct() { return !!state && state.turn === 'you' && !state.over && !thinking && !hinting && !paused; }
    function clearHint() { hintText = ''; hintPass = false; }
    function selectedCounts() {
        var counts = emptyCounts();
        if (!state) return counts;
        state.youView.forEach(function (card) { if (selected[card.id]) counts[card.r] += 1; });
        return counts;
    }

    function matchingMove() {
        if (!state) return null;
        var picked = selectedCounts();
        if (!DD.sum(picked)) return null;
        var moves = DD.legalMoves(state.you, state.lead);
        for (var i = 0; i < moves.length; i += 1) {
            if (!moves[i].pass && DD.sameCards(moves[i], picked)) return moves[i];
        }
        return null;
    }

    // Original double-ended court art and conventional pip layouts, shared with the table theme.
    var PIPS = {
        2: [[50,15],[50,85]], 3: [[50,12],[50,50],[50,88]],
        4: [[23,15],[77,15],[23,85],[77,85]],
        5: [[23,15],[77,15],[50,50],[23,85],[77,85]],
        6: [[23,12],[77,12],[23,50],[77,50],[23,88],[77,88]],
        7: [[23,12],[77,12],[50,31],[23,50],[77,50],[23,88],[77,88]],
        8: [[23,12],[77,12],[50,31],[23,50],[77,50],[50,69],[23,88],[77,88]],
        9: [[23,8],[77,8],[23,36],[77,36],[50,50],[23,64],[77,64],[23,92],[77,92]],
        10: [[50,8],[23,25],[77,25],[23,42],[77,42],[23,58],[77,58],[23,75],[77,75],[50,92]]
    };

    function cardArtwork(card, label) {
        if (card.r >= 13) {
            return '<b class="dd-joker-name" aria-hidden="true">' + label + '</b><svg class="dd-joker-mark" viewBox="0 0 36 36" aria-hidden="true"><path d="M7 24 4 11l9 6 5-12 5 12 9-6-3 13Z"/><path d="M8 29h20M10 33h16"/><circle cx="4" cy="9" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="32" cy="9" r="2"/><path class="dd-joker-gem" d="m18 16 4 5-4 5-4-5Z"/></svg><i class="dd-joker-word" aria-hidden="true">JOKER</i>';
        }
        var corner = '<b>' + label + '</b><i>' + card.s + '</i>';
        var center;
        if (card.r >= 8 && card.r <= 10) {
            center = '<img class="dd-court" src="assets/paodekuai/court-' + ({ J: 'jack', Q: 'queen', K: 'king' }[label]) + '.svg" alt="" draggable="false">';
        } else if (card.r === 11) {
            center = '<span class="dd-ace" aria-hidden="true">' + card.s + '</span>';
        } else {
            center = '<span class="dd-pips" aria-hidden="true">' + PIPS[Number(label)].map(function (point) {
                return '<span class="dd-pip' + (point[1] > 50 ? ' is-flipped' : '') + '" style="left:' + point[0] + '%;top:' + point[1] + '%">' + card.s + '</span>';
            }).join('') + '</span>';
        }
        return '<span class="dd-corner" aria-hidden="true">' + corner + '</span>' + center + '<span class="dd-corner dd-corner-bottom" aria-hidden="true">' + corner + '</span>';
    }

    function cardButton(card, mine) {
        var button = document.createElement('button');
        var joker = card.r >= 13;
        var red = card.s === '♥' || card.s === '♦' || card.r === 14;
        var label = DD.RANK_NAME[card.r];
        button.type = 'button';
        button.className = 'pcard' + (red ? ' red' : '') + (joker ? ' dd-joker' : '') + (card.r === 14 ? ' dd-joker-big' : '') + (mine && selected[card.id] ? ' is-selected' : '');
        button.setAttribute('data-card-id', card.id);
        button.setAttribute('aria-label', (joker ? label : card.s + label));
        button.innerHTML = cardArtwork(card, label);
        button.disabled = !mine || !canAct();
        if (mine) button.setAttribute('aria-pressed', selected[card.id] ? 'true' : 'false');
        if (mine && canAct()) {
            button.addEventListener('click', function () {
                if (!canAct()) return;
                var hadFocus = document.activeElement === button;
                selected[card.id] = !selected[card.id];
                if (!selected[card.id]) delete selected[card.id];
                clearHint();
                render();
                if (hadFocus) {
                    var replacement = element('dd-you').querySelector('[data-card-id="' + card.id + '"]');
                    if (replacement) replacement.focus();
                }
            });
        }
        return button;
    }

    function renderCards(host, cards, mine) {
        host.style.setProperty('--dd-card-gaps', String(Math.max(1, cards.length - 1)));
        host.innerHTML = '';
        cards.forEach(function (card) { host.appendChild(cardButton(card, mine)); });
    }

    function renderResult(done) {
        var over = !!state.over;
        var won = state.over === 'you';
        var hasNext = state.index + 1 < LEVELS.length;
        element('dd-result').hidden = !over;
        element('dd-actions').hidden = over;
        element('dd-next').hidden = !won || !hasNext;
        element('dd-next').disabled = !won || !hasNext || paused;
        element('dd-replay').disabled = !over || paused;
        element('dd-replay').textContent = won ? '再玩本关' : '重试本关';
        element('dd-replay').classList.toggle('dd-primary', !won || !hasNext);
        if (!over) return;
        var allCleared = LEVELS.every(function (level) { return !!done[level.id]; });
        element('dd-result-title').textContent = won ? (allCleared ? '全部通关！' : '第 ' + state.level.id + ' 关过关！') : '差一点，再试一次';
        element('dd-result-sub').textContent = (won ? (hasNext ? '可以先复盘，再点“下一关”继续。' : '可再玩本关，或从上方选择其他关卡。') : '对手先出完了。试试调整出牌顺序，或用“提示”寻找走法。') + (won && storageUnavailable ? ' 过关记录暂仅保留在本次页面中。' : '');
    }

    function renderSeat(who) {
        var seat = element('dd-' + who + '-seat');
        var active = state.turn === who && !state.over && !paused;
        seat.classList.toggle('is-turn', active);
        seat.classList.toggle('is-winner', state.over === who);
        var message = '等待出牌';
        if (paused) message = '牌局已暂停';
        else if (state.over) message = state.over === who ? '已出完 · 获胜' : '本关结束';
        else if (active) message = who === 'opp' ? '思考中…' : hinting ? '推演提示中…' : state.lead ? '轮到你接牌' : '轮到你领出';
        element('dd-' + who + '-state').textContent = message;
    }

    function render() {
        if (!state) return;
        var pool = suitPool();
        state.youView = expand(state.you, 'you', pool);
        state.oppView = expand(state.opp, 'opp', pool);
        renderCards(element('dd-opp'), state.oppView, false);
        renderCards(element('dd-you'), state.youView, true);
        element('dd-you-count').textContent = DD.sum(state.you) + ' 张';
        element('dd-opp-count').textContent = DD.sum(state.opp) + ' 张';
        renderSeat('you');
        renderSeat('opp');
        var trick = element('dd-trick');
        trick.innerHTML = '';
        if (state.last && !state.last.pass) {
            var who = document.createElement('span');
            who.textContent = (state.last.who === 'you' ? '你出 · ' : '对手出 · ') + DD.moveLabel(state.last.move);
            trick.appendChild(who);
            expand(state.last.counts, 'trick', suitPool()).forEach(function (card) { trick.appendChild(cardButton(card, false)); });
        } else if (state.last && state.last.pass) {
            trick.textContent = (state.last.who === 'you' ? '你' : '对手') + '不出';
        } else {
            trick.textContent = '你先出';
        }
        var chapter = '第 ' + state.level.id + ' 关 · ';
        var status;
        if (paused) status = '已暂停，等待重开确认';
        else if (state.over === 'you') status = '过关';
        else if (state.over === 'opp') status = '对手走完了';
        else if (thinking) status = '对手思考中…';
        else if (hinting) status = '正在寻找提示…';
        else status = state.lead ? '轮到你接牌' : '轮到你出牌';
        element('dd-status').textContent = chapter + status;
        var move = matchingMove();
        var picked = DD.sum(selectedCounts());
        element('dd-play').disabled = !canAct() || !move;
        element('dd-pass').disabled = !canAct() || !state.lead;
        element('dd-pass').classList.toggle('is-suggested', hintPass && canAct());
        element('dd-hint').disabled = !canAct();
        element('dd-retry').disabled = paused;
        var help = state.lead ? '可以接牌，也可以主动不出。' : '点选手牌，或用提示选择一手。';
        if (picked) help = move ? '已选 ' + DD.moveLabel(move) + ' · 点“出牌”确认。' : '所选牌型不能这样出，请调整选择或点“提示”。';
        if (thinking || hinting || paused || state.over) help = '';
        element('dd-hint-text').textContent = hintText || help;
        var done = cleared();
        var clearedCount = LEVELS.filter(function (level) { return !!done[level.id]; }).length;
        element('dd-progress').textContent = '第 ' + state.level.id + ' / ' + LEVELS.length + ' 关 · 已过 ' + clearedCount + ' 关';
        renderResult(done);
        document.querySelectorAll('[data-level]').forEach(function (button) {
            var id = button.getAttribute('data-level');
            var current = String(state.level.id) === id;
            button.classList.toggle('is-on', current);
            button.classList.toggle('is-cleared', !!done[id]);
            button.setAttribute('aria-label', '第 ' + id + ' 关' + (done[id] ? '，已过关' : ''));
            if (current) button.setAttribute('aria-current', 'step');
            else button.removeAttribute('aria-current');
            button.disabled = paused;
        });
    }

    function countsOf(move) {
        var counts = emptyCounts();
        move.cards.forEach(function (rank) { counts[rank] += 1; });
        return counts;
    }

    function finishIfNeeded() {
        if (DD.sum(state.you) === 0) {
            state.over = 'you';
            markCleared(state.level.id);
        } else if (DD.sum(state.opp) === 0) {
            state.over = 'opp';
        }
        if (state.over) invalidateTimers();
    }

    function focusResult() {
        if (!state.over) return;
        (state.over === 'you' && state.index + 1 < LEVELS.length ? element('dd-next') : element('dd-replay')).focus();
    }

    function opponentTurn() {
        if (!state || state.over || state.turn !== 'opp' || paused) return;
        thinking = true;
        window.clearTimeout(aiTimer);
        var ticket = generation;
        var game = state;
        render();
        aiTimer = window.setTimeout(function () {
            if (ticket !== generation || state !== game || paused || state.over || state.turn !== 'opp') return;
            aiTimer = 0;
            var move;
            try {
                move = DD.chooseMove(state.opp, state.you, state.lead, { n: 0, limit: 2000000 });
            } catch (error) {
                move = DD.legalMoves(state.opp, state.lead)[0];
            }
            if (!move) { thinking = false; render(); return; }
            if (move.pass) {
                state.last = { who: 'opp', pass: true };
                state.lead = null;
            } else {
                state.opp = DD.apply(state.opp, move);
                state.last = { who: 'opp', move: move, counts: countsOf(move) };
                state.lead = move;
                finishIfNeeded();
            }
            state.moves += 1;
            state.turn = 'you';
            thinking = false;
            selected = {};
            render();
            focusResult();
        }, 520);
    }

    function playMove(move) {
        if (!canAct() || !move || move.pass) return;
        var valid = DD.legalMoves(state.you, state.lead).some(function (legal) {
            return !legal.pass && legal.t === move.t && legal.r === move.r && legal.n === move.n && DD.sameCards(legal, countsOf(move));
        });
        if (!valid) return;
        state.you = DD.apply(state.you, move);
        state.last = { who: 'you', move: move, counts: countsOf(move) };
        state.lead = move;
        state.moves += 1;
        selected = {};
        clearHint();
        finishIfNeeded();
        if (state.over) {
            render();
            focusResult();
            return;
        }
        state.turn = 'opp';
        opponentTurn();
    }

    function playPass() {
        if (!canAct() || !state.lead) return;
        state.last = { who: 'you', pass: true };
        state.lead = null;
        state.moves += 1;
        selected = {};
        clearHint();
        state.turn = 'opp';
        opponentTurn();
    }

    function queueHint() {
        var ticket = generation;
        var game = state;
        hinting = true;
        render();
        hintTimer = window.setTimeout(function () {
            if (ticket !== generation || state !== game || paused || state.over || state.turn !== 'you') return;
            hintTimer = 0;
            var legal = DD.legalMoves(state.you, state.lead);
            var wins;
            var move;
            var complete = true;
            try {
                wins = DD.winningMoves(state.you, state.opp, state.lead, { n: 0, limit: 150000 });
                move = wins[0] || legal[0];
            } catch (error) {
                complete = false;
                move = legal[0];
            }
            hinting = false;
            selected = {};
            if (!move) { hintText = '暂未找到可用提示。'; render(); return; }
            hintPass = !!move.pass;
            if (!move.pass) {
                var need = countsOf(move);
                state.youView.forEach(function (card) {
                    if (need[card.r] > 0) { selected[card.id] = true; need[card.r] -= 1; }
                });
            }
            var advice = move.pass ? '提示：不出，点“不出”确认。' : '已选 ' + DD.moveLabel(move) + '，点“出牌”确认。';
            hintText = advice + (complete && wins.length ? ' 这步可以保留胜机。' : complete ? ' 当前已无必胜着法，这是合法参考。' : ' 推演达到上限，这是合法参考。');
            render();
        }, 30);
    }

    function showHint() {
        if (!canAct()) return;
        clearHint();
        queueHint();
    }

    function resumeGame() {
        render();
        if (thinking) opponentTurn();
        else if (hinting) queueHint();
    }

    function closeRestart(restart) {
        if (restartTarget === null) return;
        var index = restartTarget;
        var focus = restartFocus;
        restartTarget = null;
        restartFocus = null;
        paused = false;
        var dialog = element('dd-restart-dialog');
        if (dialog.open) dialog.close();
        if (restart) load(index);
        else resumeGame();
        if (focus && document.contains(focus) && !focus.disabled) focus.focus();
    }

    function cancelRestart() { closeRestart(false); }

    function requestRestart() {
        if (!state || paused) return;
        if (!state.moves || state.over) { load(state.index); return; }
        restartTarget = state.index;
        restartFocus = document.activeElement;
        paused = true;
        invalidateTimers();
        render();
        var dialog = element('dd-restart-dialog');
        if (typeof dialog.showModal === 'function') {
            dialog.showModal();
            element('dd-restart-cancel').focus();
        } else {
            closeRestart(window.confirm('重新开始本关？当前进度会清空，已过关记录会保留。'));
        }
    }

    function load(index) {
        var level = LEVELS[index];
        if (!level) return;
        invalidateTimers();
        restartTarget = null;
        restartFocus = null;
        paused = false;
        var dialog = element('dd-restart-dialog');
        if (dialog.open) dialog.close();
        state = { index: index, level: level, you: level.you.slice(), opp: level.opp.slice(), lead: null, turn: 'you', last: null, over: null, moves: 0 };
        selected = {};
        thinking = false;
        hinting = false;
        clearHint();
        render();
    }

    element('dd-play').addEventListener('click', function () { if (canAct()) playMove(matchingMove()); });
    element('dd-pass').addEventListener('click', playPass);
    element('dd-hint').addEventListener('click', showHint);
    element('dd-retry').addEventListener('click', requestRestart);
    element('dd-next').addEventListener('click', function () {
        if (state && state.over === 'you' && !paused && state.index + 1 < LEVELS.length) load(state.index + 1);
    });
    element('dd-replay').addEventListener('click', function () { if (state && state.over && !paused) load(state.index); });
    element('dd-restart-confirm').addEventListener('click', function () { closeRestart(true); });
    element('dd-restart-cancel').addEventListener('click', cancelRestart);
    element('dd-restart-dialog').addEventListener('cancel', function (event) { event.preventDefault(); cancelRestart(); });
    element('dd-restart-dialog').addEventListener('close', function () {
        // Native close events are queued; an old one must not cancel a newly opened dialog.
        if (!element('dd-restart-dialog').open) cancelRestart();
    });
    document.querySelectorAll('[data-level]').forEach(function (button) {
        button.addEventListener('click', function () {
            if (paused) return;
            var id = Number(button.getAttribute('data-level'));
            for (var i = 0; i < LEVELS.length; i += 1) {
                if (LEVELS[i].id === id) {
                    if (state && state.index === i) requestRestart();
                    else load(i);
                    break;
                }
            }
        });
    });
    if (LEVELS.length) load(0);
}());
