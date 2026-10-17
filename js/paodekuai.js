(function () {
    'use strict';
    var PK = window.Paodekuai;
    var NAMES = ['你', '下家', '上家'];
    var SUIT_NAMES = ['黑桃', '红桃', '方块', '梅花'];
    var TYPES = { single: '单张', pair: '对子', triple: '三张', triple1: '三带一', triple2: '三带二', straight: '顺子', pairseq: '连对', plane: '飞机', bomb: '炸弹' };
    var state = null;
    var selected = {};
    var thinking = false;
    var timer = 0;
    var revision = 0;
    var moveCache = null;
    var hintIndex = -1;
    var hintMessage = '';
    var gesture = null;
    var restartPending = false;
    var hand = document.getElementById('pdk-you');
    var dialog = document.getElementById('pdk-restart-dialog');

    function stats() {
        try {
            var value = JSON.parse(localStorage.getItem('mylog-paodekuai'));
            if (value && Number.isFinite(value.wins) && Number.isFinite(value.games) && value.wins >= 0 && value.games >= value.wins) return value;
        } catch (error) { /* A private browser can disable storage. The game still works. */ }
        return { wins: 0, games: 0 };
    }

    function remember() {
        if (state.recorded) return;
        state.recorded = true;
        var saved = stats();
        saved.games += 1;
        if (state.over === 0) saved.wins += 1;
        try { localStorage.setItem('mylog-paodekuai', JSON.stringify(saved)); } catch (error) { /* Optional persistence. */ }
    }

    function ctx(seat) {
        return { require: state.opening ? { r: 0, s: 0 } : null, nextCount: state.hands[(seat + 1) % 3].length };
    }

    function isMyTurn() { return state && state.turn === 0 && state.over === null && !thinking && !restartPending; }

    function legalMoves() {
        if (!isMyTurn()) return [];
        if (!moveCache) moveCache = PK.answerMoves(state.hands[0], state.lead, ctx(0));
        return moveCache;
    }

    function mustPass() { return isMyTurn() && !!state.lead && legalMoves().length === 0; }

    function selectedCards() { return state.hands[0].filter(function (card) { return selected[PK.cardKey(card)]; }); }

    function playable() {
        var cards = state.hands[0];
        var picked = selectedCards();
        var move = PK.classify(picked, picked.length === cards.length, !!state.lead);
        var rule = ctx(0);
        if (!move || (state.lead && !PK.beats(move, state.lead))) return null;
        if (rule.require && !PK.hasCard(move.cards, rule.require)) return null;
        if (rule.nextCount === 1 && move.t === 'single' && move.r < PK.maxRank(cards)) return null;
        return move;
    }

    function sorted(cards) { return cards.slice().sort(function (a, b) { return b.r - a.r || a.s - b.s; }); }

    // Conventional pip layouts preserve the actual number of suits on each card.
    var PIPS = {
        2: [[50,15],[50,85]], 3: [[50,12],[50,50],[50,88]],
        4: [[23,15],[77,15],[23,85],[77,85]],
        5: [[23,15],[77,15],[50,50],[23,85],[77,85]],
        6: [[23,12],[77,12],[23,50],[77,50],[23,88],[77,88]],
        7: [[23,12],[77,12],[50,31],[23,50],[77,50],[23,88],[77,88]],
        8: [[23,12],[77,12],[50,31],[23,50],[77,50],[50,69],[23,88],[77,88]],
        9: [[23,8],[77,8],[23,36],[77,36],[50,50],[23,64],[77,64],[23,92],[77,92]],
        10: [[23,8],[77,8],[50,22],[23,36],[77,36],[23,64],[77,64],[50,78],[23,92],[77,92]]
    };

    function cardFace(card, mine) {
        var face = document.createElement(mine ? 'button' : 'span');
        var key = PK.cardKey(card);
        var rank = PK.RANK_NAME[card.r];
        var suit = PK.SUITS[card.s];
        var corner = '<b>' + rank + '</b><i>' + suit + '</i>';
        if (mine) face.type = 'button';
        face.className = 'pcard' + (card.s === 1 || card.s === 2 ? ' red' : '') + (mine && selected[key] ? ' is-selected' : '');
        face.dataset.key = key;
        face.dataset.rank = rank;
        face.setAttribute('aria-label', SUIT_NAMES[card.s] + rank);
        if (mine) {
            face.setAttribute('aria-pressed', String(!!selected[key]));
            face.setAttribute('aria-disabled', String(!isMyTurn()));
        }
        if (state.opening && card.r === 0 && card.s === 0) face.classList.add('is-key');
        var center = '';
        if (card.r >= 8 && card.r <= 10) {
            center = '<img class="pdk-court" src="assets/paodekuai/court-' + ({ J: 'jack', Q: 'queen', K: 'king' }[rank]) + '.svg" alt="" draggable="false">';
        } else if (card.r === 11) {
            center = '<span class="pdk-ace" aria-hidden="true">' + suit + '</span>';
        } else {
            center = '<span class="pdk-pips" aria-hidden="true">' + PIPS[Number(rank)].map(function (point) {
                return '<span class="pdk-pip' + (point[1] > 50 ? ' is-flipped' : '') + '" style="left:' + point[0] + '%;top:' + point[1] + '%">' + suit + '</span>';
            }).join('') + '</span>';
        }
        face.innerHTML = '<span class="pdk-corner" aria-hidden="true">' + corner + '</span>' + center + '<span class="pdk-corner pdk-corner-bottom" aria-hidden="true">' + corner + '</span>';
        return face;
    }

    function paintSeat(seat, id) {
        var host = document.getElementById(id);
        var count = state.hands[seat].length;
        var backs = host.querySelector('.pdk-backs');
        var active = state.turn === seat && state.over === null && !restartPending;
        host.classList.toggle('is-turn', active);
        var meta = host.querySelector('.pdk-meta');
        meta.textContent = count === 0 ? '已出完' : (count === 1 ? '报单 · 1 张' : count + ' 张');
        meta.classList.toggle('is-warning', count === 1);
        host.querySelector('.pdk-seat-status').textContent = state.over === seat ? '这局赢啦！' : active ? '正在思考…' : state.last && state.last.seat === seat && state.last.pass ? '要不起' : '等待出牌';
        backs.innerHTML = '';
        for (var i = 0; i < Math.min(count, 3); i += 1) {
            var back = document.createElement('span');
            back.className = 'pcard back';
            backs.appendChild(back);
        }
    }

    function paintTrick() {
        var trick = document.getElementById('pdk-trick');
        var who = document.createElement('span');
        who.className = 'pdk-trick-label';
        trick.innerHTML = '';
        if (state.last && state.last.pass) who.textContent = NAMES[state.last.seat] + '要不起' + (state.lead ? ' · ' + NAMES[state.leadSeat] + '的' + TYPES[state.lead.t] : '');
        else if (state.lead) who.textContent = NAMES[state.leadSeat] + ' · ' + TYPES[state.lead.t];
        else who.textContent = NAMES[state.turn] + (state.opening ? '先出 · 黑桃 3' : '自由出牌');
        trick.appendChild(who);
        if (state.lead) {
            var cards = document.createElement('div');
            cards.className = 'pdk-trick-cards';
            sorted(state.lead.cards).forEach(function (card) { cards.appendChild(cardFace(card, false)); });
            trick.appendChild(cards);
        }
    }

    function paintCounter() {
        // Only our own hand and the public play history are used. No opponent cards.
        var remaining = {};
        PK.freshDeck().forEach(function (card) { remaining[PK.cardKey(card)] = card; });
        state.hands[0].concat(state.played).forEach(function (card) { delete remaining[PK.cardKey(card)]; });
        var counts = new Array(13).fill(0);
        Object.keys(remaining).forEach(function (key) { counts[remaining[key].r] += 1; });
        var host = document.getElementById('pdk-counter-ranks');
        host.innerHTML = '';
        for (var r = 12; r >= 0; r -= 1) {
            var cell = document.createElement('div');
            cell.className = 'pdk-counter-cell' + (counts[r] ? '' : ' is-empty');
            cell.dataset.rank = String(r);
            cell.setAttribute('aria-label', PK.RANK_NAME[r] + '，剩余 ' + counts[r] + ' 张');
            cell.innerHTML = '<span>' + PK.RANK_NAME[r] + '</span><b>' + counts[r] + '</b>';
            host.appendChild(cell);
        }
        document.getElementById('pdk-remaining').textContent = String(Object.keys(remaining).length);
    }

    function statusText() {
        if (state.over === 0) return '漂亮！再来一局吧';
        if (state.over !== null) return '这次差一点，再来一局';
        if (restartPending) return '牌局已暂停';
        if (thinking) return NAMES[state.turn] + '正在思考…';
        if (state.turn !== 0) return '等待' + NAMES[state.turn] + '出牌';
        if (mustPass()) return '没有能压过的牌，即将自动不出…';
        if (hintMessage) return hintMessage;
        if (state.opening) return '你先出，请带上黑桃 3';
        if (state.hands[1].length === 1) return '下家报单，单张必须出最大的';
        if (state.lead) return '轮到你了 · 有牌必压';
        return '轮到你自由出牌';
    }

    function paintControls() {
        var over = state.over !== null;
        document.getElementById('pdk-actions').hidden = over;
        document.getElementById('pdk-again').hidden = !over;
        document.getElementById('pdk-play').disabled = !isMyTurn() || !playable();
        document.getElementById('pdk-pass').disabled = true;
        document.getElementById('pdk-pass').textContent = mustPass() ? '即将不出…' : '自动不出';
        document.getElementById('pdk-hint').disabled = !isMyTurn() || !legalMoves().length;
        document.getElementById('pdk-status').textContent = statusText();
    }

    function paintSelection() {
        Array.prototype.forEach.call(hand.querySelectorAll('.pcard'), function (face) {
            var on = !!selected[face.dataset.key];
            face.classList.toggle('is-selected', on);
            face.setAttribute('aria-pressed', String(on));
        });
        paintControls();
    }

    // Keep a readable corner strip rather than shrinking ranks to fit the hand.
    // Balanced grid rows leave enough room above every row for lifted selections.
    function fitRow(host, faces) {
        if (!host) return;
        if (!faces.length) { host.style.gridTemplateColumns = 'none'; host.dataset.cardColumns = '0'; return; }
        var width = faces[0].getBoundingClientRect().width;
        var available = host.clientWidth - 12;
        if (width <= 0 || available <= 0) return;
        var minimumStep = Math.max(24, width * .40);
        var capacity = Math.max(1, Math.floor((available - width) / minimumStep) + 1);
        var rows = Math.ceil(faces.length / capacity);
        var columns = Math.ceil(faces.length / rows);
        var step = columns > 1 ? Math.min(width * .64, (available - width) / (columns - 1)) : width;
        host.style.gridTemplateColumns = (columns > 1 ? 'repeat(' + (columns - 1) + ', ' + step + 'px) ' : '') + width + 'px';
        host.dataset.cardColumns = String(columns);
    }

    function fitCards() {
        fitRow(hand, hand.querySelectorAll('.pcard'));
        var trick = document.querySelector('.pdk-trick-cards');
        if (trick) fitRow(trick, trick.children);
    }

    function resizeCards() { cancelGesture(); fitCards(); }

    // A horizontal gesture belongs to the row where it started. Locking that
    // row also handles selected cards whose raised top edge is above neighbors.
    function rangeIndex(rects, x, first, last) {
        var index = first;
        for (var i = first; i <= last; i += 1) {
            if (x >= rects[i].left) index = i;
        }
        return index;
    }

    function render() {
        cancelGesture();
        var result = document.getElementById('pdk-result');
        var saved = stats();
        paintSeat(2, 'pdk-left');
        paintSeat(1, 'pdk-right');
        paintTrick();
        paintCounter();
        hand.innerHTML = '';
        sorted(state.hands[0]).forEach(function (card, index) {
            var face = cardFace(card, true);
            face.style.zIndex = String(index + 1);
            hand.appendChild(face);
        });
        paintControls();
        document.getElementById('pdk-score').textContent = '胜 ' + saved.wins + ' / ' + saved.games + ' 局';
        document.getElementById('pdk-you-count').textContent = state.hands[0].length + ' 张手牌';
        result.hidden = state.over === null;
        if (state.over !== null) {
            document.getElementById('pdk-result-title').textContent = state.over === 0 ? '你赢了！' : NAMES[state.over] + '赢了';
            document.getElementById('pdk-result-sub').textContent = [0, 1, 2].filter(function (seat) { return seat !== state.over; }).map(function (seat) {
                return NAMES[seat] + '剩 ' + state.hands[seat].length + ' 张' + (!state.thrown[seat] ? '，全关' : '');
            }).join(' · ');
        }
        fitCards();
    }

    function commit(seat, move) {
        cancelGesture();
        window.clearTimeout(timer);
        revision += 1;
        moveCache = null;
        hintIndex = -1;
        hintMessage = '';
        selected = {};
        state.last = { seat: seat, pass: !!move.pass, move: move };
        if (move.pass) {
            state.passes += 1;
            if (state.passes >= 2) { state.turn = state.leadSeat; state.lead = null; state.passes = 0; }
            else state.turn = (seat + 1) % 3;
            return;
        }
        state.hands[seat] = PK.removeCards(state.hands[seat], move.cards);
        state.played = state.played.concat(move.cards);
        state.thrown[seat] += move.cards.length;
        state.lead = move;
        state.leadSeat = seat;
        state.passes = 0;
        state.opening = false;
        if (!state.hands[seat].length) { state.over = seat; state.turn = seat; remember(); return; }
        state.turn = (seat + 1) % 3;
    }

    function poke() {
        window.clearTimeout(timer);
        if (!state || state.over !== null || restartPending) return;
        var round = state;
        var version = revision;
        var seat = state.turn;
        if (seat === 0) {
            thinking = false;
            if (mustPass()) {
                paintControls();
                timer = window.setTimeout(function () {
                    if (state !== round || revision !== version || !mustPass()) return;
                    commit(0, PK.passMove());
                    render();
                    poke();
                }, 850);
            }
            return;
        }
        thinking = true;
        render();
        timer = window.setTimeout(function () {
            if (state !== round || revision !== version || state.turn !== seat || state.over !== null) return;
            var move = PK.chooseMove(state.hands[seat], state.lead, ctx(seat));
            thinking = false;
            if (!move) return;
            commit(seat, move);
            render();
            poke();
        }, 850);
    }

    function showHint() {
        if (!isMyTurn()) return;
        var moves = legalMoves().slice();
        if (!moves.length) return;
        cancelGesture();
        var best = PK.chooseMove(state.hands[0], state.lead, ctx(0));
        function key(move) { return move.cards.map(PK.cardKey).sort().join(','); }
        var seen = {};
        moves = [best].concat(moves).filter(function (move) {
            var id = key(move);
            if (seen[id]) return false;
            seen[id] = true;
            return true;
        });
        hintIndex = (hintIndex + 1) % moves.length;
        selected = {};
        moves[hintIndex].cards.forEach(function (card) { selected[PK.cardKey(card)] = 1; });
        hintMessage = '提示 ' + (hintIndex + 1) + '/' + moves.length + ' · ' + TYPES[moves[hintIndex].t] + (moves.length > 1 ? ' · 再点可切换' : '');
        paintSelection();
    }

    function start() {
        cancelGesture();
        window.clearTimeout(timer);
        revision += 1;
        var hands = PK.deal(Math.random);
        var starter = 0;
        hands.forEach(function (cards, index) { if (PK.spadeThree(cards)) starter = index; });
        thinking = false;
        restartPending = false;
        selected = {};
        moveCache = null;
        hintIndex = -1;
        hintMessage = '';
        state = { hands: hands, turn: starter, lead: null, leadSeat: starter, passes: 0, opening: true, last: null, over: null, thrown: [0, 0, 0], played: [], recorded: false };
        render();
        poke();
    }

    // Keep the DOM stable during a gesture so pointer capture and overlapping cards work.
    function applyRange(index) {
        if (!gesture) return;
        selected = Object.assign({}, gesture.before);
        var low = Math.min(gesture.index, index);
        var high = Math.max(gesture.index, index);
        gesture.keys.forEach(function (key, i) {
            if (i >= low && i <= high) {
                if (gesture.select) selected[key] = 1;
                else delete selected[key];
            }
        });
        paintSelection();
    }

    function cancelGesture() {
        if (!gesture) return;
        selected = gesture.before;
        var id = gesture.id;
        gesture = null;
        hand.classList.remove('is-dragging');
        if (hand.hasPointerCapture && hand.hasPointerCapture(id)) hand.releasePointerCapture(id);
        paintSelection();
    }

    hand.addEventListener('pointerdown', function (event) {
        if (gesture) { cancelGesture(); return; }
        if (!isMyTurn() || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
        var face = event.target.closest('.pcard');
        if (!face || !hand.contains(face)) return;
        var faces = Array.prototype.slice.call(hand.querySelectorAll('.pcard'));
        var keys = faces.map(function (item) { return item.dataset.key; });
        var index = keys.indexOf(face.dataset.key);
        var columns = Math.max(1, Number(hand.dataset.cardColumns) || faces.length);
        var rowFirst = Math.floor(index / columns) * columns;
        gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, before: Object.assign({}, selected), index: index, rowFirst: rowFirst, rowLast: Math.min(rowFirst + columns, faces.length) - 1, keys: keys, rects: faces.map(function (item) { return item.getBoundingClientRect(); }), select: !selected[face.dataset.key], moved: false };
        hintMessage = '';
        hintIndex = -1;
        hand.setPointerCapture(event.pointerId);
        if (event.pointerType === 'mouse') event.preventDefault();
        applyRange(gesture.index);
    });

    hand.addEventListener('pointermove', function (event) {
        if (!gesture || gesture.id !== event.pointerId) return;
        var dx = event.clientX - gesture.x;
        var dy = event.clientY - gesture.y;
        if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.2) { cancelGesture(); return; }
        if (Math.abs(dx) < 5 && !gesture.moved) return;
        gesture.moved = true;
        hand.classList.add('is-dragging');
        applyRange(rangeIndex(gesture.rects, event.clientX, gesture.rowFirst, gesture.rowLast));
    });

    hand.addEventListener('pointerup', function (event) {
        if (!gesture || gesture.id !== event.pointerId) return;
        var id = gesture.id;
        gesture = null;
        hand.classList.remove('is-dragging');
        if (hand.hasPointerCapture(id)) hand.releasePointerCapture(id);
    });
    hand.addEventListener('pointercancel', cancelGesture);
    hand.addEventListener('lostpointercapture', cancelGesture);
    window.addEventListener('blur', cancelGesture);
    hand.addEventListener('click', function (event) {
        // Pointer taps are already handled above; detail=0 is keyboard/assistive activation.
        if (event.detail !== 0 || !isMyTurn()) return;
        var face = event.target.closest('.pcard');
        if (!face || !hand.contains(face)) return;
        var key = face.dataset.key;
        if (selected[key]) delete selected[key]; else selected[key] = 1;
        hintMessage = '';
        hintIndex = -1;
        paintSelection();
    });
    hand.addEventListener('dragstart', function (event) { event.preventDefault(); });
    window.addEventListener('resize', resizeCards);
    window.addEventListener('orientationchange', function () { window.requestAnimationFrame(resizeCards); });
    document.addEventListener('gameviewchange', function () { window.requestAnimationFrame(resizeCards); });
    if (typeof ResizeObserver !== 'undefined') {
        var measuredWidth = hand.clientWidth;
        new ResizeObserver(function () {
            if (hand.clientWidth === measuredWidth) return;
            measuredWidth = hand.clientWidth;
            resizeCards();
        }).observe(hand);
    }
    document.getElementById('pdk-play').addEventListener('click', function () {
        if (!isMyTurn()) return;
        var move = playable();
        if (!move) return;
        commit(0, move);
        render();
        poke();
    });
    document.getElementById('pdk-hint').addEventListener('click', showHint);
    document.getElementById('pdk-again').addEventListener('click', function () { if (state.over !== null) start(); });
    document.getElementById('pdk-restart').addEventListener('click', function () {
        if (state.over !== null) { start(); return; }
        cancelGesture();
        window.clearTimeout(timer);
        revision += 1;
        restartPending = true;
        thinking = false;
        moveCache = null;
        render();
        dialog.showModal();
    });
    function resumeGame() {
        if (!restartPending || dialog.open) return;
        restartPending = false;
        render();
        poke();
    }
    dialog.addEventListener('close', resumeGame);
    document.getElementById('pdk-restart-cancel').addEventListener('click', function () { dialog.close(); resumeGame(); });
    document.getElementById('pdk-restart-confirm').addEventListener('click', function () { restartPending = false; dialog.close(); start(); });
    start();
}());
