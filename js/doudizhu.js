(function () {
    var DD = window.Doudizhu;
    var LEVELS = window.DOUDIZHU_LEVELS || [];
    var SUITS = ['♠', '♥', '♦', '♣'];
    var state = null;
    var selected = {};
    var thinking = false;

    var winTimer = 0;

    function storageKey() {
        return 'mylog-doudizhu-cleared-v2';
    }

    function cleared() {
        try {
            return JSON.parse(localStorage.getItem(storageKey())) || {};
        } catch (error) {
            return {};
        }
    }

    function markCleared(id) {
        var done = cleared();
        done[id] = 1;
        localStorage.setItem(storageKey(), JSON.stringify(done));
    }

    function suitPool() {
        var pool = [];
        var rank;
        for (rank = 0; rank < 15; rank += 1) pool[rank] = SUITS.slice();
        return pool;
    }

    function expand(counts, prefix, pool) {
        var cards = [];
        var rank;
        var n;
        for (rank = 14; rank >= 0; rank -= 1) {
            for (n = 0; n < counts[rank]; n += 1) {
                cards.push({
                    r: rank,
                    s: rank >= 13 ? '' : (pool[rank].pop() || SUITS[n % 4]),
                    id: prefix + '-' + rank + '-' + n
                });
            }
        }
        return cards;
    }

    function hideWin() {
        window.clearTimeout(winTimer);
        winTimer = 0;
        var layer = document.getElementById('dd-win');
        layer.hidden = true;
        layer.querySelectorAll('.dd-spark').forEach(function (node) { node.remove(); });
    }

    function showWin() {
        var layer = document.getElementById('dd-win');
        var last = state.level.id >= LEVELS.length;
        var suits = ['♠', '♥', '♦', '♣', '✦'];
        var copy = layer.querySelector('.dd-win-copy');
        var i;
        var spark;
        var angle;
        var dist;
        document.getElementById('dd-win-title').textContent = last ? '全部通关' : '过关';
        document.getElementById('dd-win-sub').textContent = last ? (LEVELS.length + ' 关都过了') : '下一关';
        layer.querySelectorAll('.dd-spark').forEach(function (node) { node.remove(); });
        for (i = 0; i < 16; i += 1) {
            spark = document.createElement('i');
            spark.className = 'dd-spark' + (i % 2 ? ' red' : '');
            spark.textContent = suits[i % suits.length];
            angle = (Math.PI * 2 * i) / 16;
            dist = 96 + (i % 4) * 26;
            spark.style.setProperty('--x', Math.round(Math.cos(angle) * dist) + 'px');
            spark.style.setProperty('--y', Math.round(Math.sin(angle) * dist) + 'px');
            spark.style.animationDelay = (i * 0.028) + 's';
            layer.appendChild(spark);
        }
        copy.style.animation = 'none';
        void copy.offsetWidth;
        copy.style.animation = '';
        layer.hidden = false;
        if (last) return;
        winTimer = window.setTimeout(function () {
            load(state.level.id);
        }, 1700);
    }

    function selectedCounts() {
        var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        state.youView.forEach(function (card) {
            if (selected[card.id]) counts[card.r] += 1;
        });
        return counts;
    }

    function matchingMove() {
        var picked = selectedCounts();
        if (DD.sum(picked) === 0) return null;
        var moves = DD.legalMoves(state.you, state.lead).filter(function (move) { return !move.pass; });
        var i;
        for (i = 0; i < moves.length; i += 1) {
            if (DD.sameCards(moves[i], picked)) return moves[i];
        }
        return null;
    }

    function cardButton(card, mine) {
        var button = document.createElement('button');
        button.type = 'button';
        var red = card.s === '♥' || card.s === '♦';
        button.className = 'pcard' + (red ? ' red' : '') + (selected[card.id] ? ' is-selected' : '');
        var label = DD.RANK_NAME[card.r];
        button.innerHTML = '<b>' + label + '</b><i>' + (card.s || (card.r === 14 ? '王' : '王')) + '</i>';
        if (mine && state.turn === 'you' && !state.over && !thinking) {
            button.addEventListener('click', function () {
                selected[card.id] = !selected[card.id];
                if (!selected[card.id]) delete selected[card.id];
                render();
            });
        }
        return button;
    }

    function renderCards(host, cards, mine) {
        host.innerHTML = '';
        cards.forEach(function (card) { host.appendChild(cardButton(card, mine)); });
    }

    function render() {
        var pool = suitPool();
        state.youView = expand(state.you, 'you', pool);
        state.oppView = expand(state.opp, 'opp', pool);
        renderCards(document.getElementById('dd-opp'), state.oppView, false);
        renderCards(document.getElementById('dd-you'), state.youView, true);
        var trick = document.getElementById('dd-trick');
        trick.innerHTML = '';
        if (state.last && !state.last.pass) {
            var who = document.createElement('span');
            who.textContent = state.last.who === 'you' ? '你出' : '对手出';
            trick.appendChild(who);
            expand(state.last.counts, 'trick', suitPool()).forEach(function (card) {
                trick.appendChild(cardButton(card, false));
            });
        } else if (state.last && state.last.pass) {
            trick.textContent = (state.last.who === 'you' ? '你' : '对手') + '不出';
        } else {
            trick.textContent = '你先出';
        }
        var status = document.getElementById('dd-status');
        var chapter = '第 ' + state.level.id + ' 关 · ';
        if (state.over === 'you') status.textContent = chapter + '过关';
        else if (state.over === 'opp') status.textContent = chapter + '对手走完了';
        else if (thinking) status.textContent = chapter + '对手思考';
        else if (state.turn === 'you' && state.lead) status.textContent = chapter + '轮到你接牌';
        else status.textContent = chapter + '轮到你出牌';
        document.getElementById('dd-play').disabled = thinking || state.turn !== 'you' || !!state.over || !matchingMove();
        document.getElementById('dd-pass').disabled = thinking || state.turn !== 'you' || !!state.over || !state.lead;
        var done = cleared();
        document.querySelectorAll('[data-level]').forEach(function (button) {
            var id = button.getAttribute('data-level');
            button.classList.toggle('is-on', String(state.level.id) === id);
            button.classList.toggle('is-cleared', !!done[id]);
        });
    }

    function countsOf(move) {
        var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
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
    }

    function opponentTurn() {
        if (state.over) return;
        thinking = true;
        render();
        window.setTimeout(function () {
            var move = null;
            try {
                move = DD.chooseMove(state.opp, state.you, state.lead, { n: 0, limit: 2000000 });
            } catch (error) {
                move = DD.legalMoves(state.opp, state.lead)[0];
            }
            if (!move) return;
            if (move.pass) {
                state.last = { who: 'opp', pass: true };
                state.lead = null;
                state.turn = 'you';
            } else {
                state.opp = DD.apply(state.opp, move);
                state.last = { who: 'opp', move: move, counts: countsOf(move) };
                state.lead = move;
                state.turn = 'you';
                finishIfNeeded();
            }
            thinking = false;
            selected = {};
            render();
        }, 520);
    }

    function playMove(move) {
        state.you = DD.apply(state.you, move);
        state.last = { who: 'you', move: move, counts: countsOf(move) };
        state.lead = move;
        selected = {};
        finishIfNeeded();
        if (state.over) {
            state.turn = 'you';
            render();
            if (state.over === 'you') showWin();
            return;
        }
        state.turn = 'opp';
        render();
        opponentTurn();
    }

    function playPass() {
        state.last = { who: 'you', pass: true };
        state.lead = null;
        selected = {};
        state.turn = 'opp';
        render();
        opponentTurn();
    }

    function load(index) {
        var level = LEVELS[index];
        state = {
            level: level,
            you: level.you.slice(),
            opp: level.opp.slice(),
            lead: null,
            turn: 'you',
            last: null,
            over: null
        };
        selected = {};
        thinking = false;
        hideWin();
        render();
    }

    document.getElementById('dd-play').addEventListener('click', function () {
        var move = matchingMove();
        if (move) playMove(move);
    });
    document.getElementById('dd-pass').addEventListener('click', playPass);
    document.getElementById('dd-retry').addEventListener('click', function () {
        if (state) load(state.level.id - 1);
    });
    document.querySelectorAll('[data-level]').forEach(function (button) {
        button.addEventListener('click', function () {
            load(Number(button.getAttribute('data-level')) - 1);
        });
    });
    if (LEVELS.length) load(0);
}());
