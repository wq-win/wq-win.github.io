(function () {
    var SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' };
    var RED = { H: 1, D: 1 };
    var RANK = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

    function rankText(rank) {
        return RANK[rank] || String(rank);
    }

    function buildDeck(suitCount) {
        var suits = ['S', 'H', 'D', 'C'].slice(0, suitCount);
        var copies = 8 / suitCount;
        var deck = [];
        var id = 1;
        var copy;
        var s;
        var rank;
        for (copy = 0; copy < copies; copy += 1) {
            for (s = 0; s < suits.length; s += 1) {
                for (rank = 1; rank <= 13; rank += 1) {
                    deck.push({ id: id, r: rank, s: suits[s], up: false });
                    id += 1;
                }
            }
        }
        return deck;
    }

    function shuffle(list) {
        var i;
        for (i = list.length - 1; i > 0; i -= 1) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = list[i];
            list[i] = list[j];
            list[j] = tmp;
        }
        return list;
    }

    function fresh(suitCount) {
        var deck = shuffle(buildDeck(suitCount));
        var columns = [];
        var c;
        var n = 0;
        for (c = 0; c < 10; c += 1) {
            var count = c < 4 ? 6 : 5;
            var col = [];
            var i;
            for (i = 0; i < count; i += 1) {
                var card = deck[n];
                n += 1;
                card.up = false;
                col.push(card);
            }
            col[col.length - 1].up = true;
            columns.push(col);
        }
        return { columns: columns, stock: deck.slice(n), done: 0, suits: suitCount };
    }

    function cloneState(state) {
        return JSON.parse(JSON.stringify({
            columns: state.columns,
            stock: state.stock,
            done: state.done,
            suits: state.suits
        }));
    }

    function movable(col, index) {
        if (!col || index < 0 || index >= col.length || !col[index].up) return false;
        var i;
        for (i = index; i < col.length; i += 1) {
            if (!col[i].up) return false;
            if (i > index && (col[i].s !== col[i - 1].s || col[i].r !== col[i - 1].r - 1)) return false;
        }
        return true;
    }

    function canPlace(col, run) {
        if (!col.length) return true;
        var top = col[col.length - 1];
        return top.up && top.r === run[0].r + 1;
    }

    function peel(col) {
        if (col.length < 13) return false;
        var end = col.length - 1;
        var suit = col[end].s;
        var i;
        for (i = 0; i < 13; i += 1) {
            var card = col[end - i];
            if (!card || !card.up || card.s !== suit || card.r !== i + 1) return false;
        }
        col.splice(end - 12, 13);
        if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
        return true;
    }

    function flip(col) {
        if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
    }

    var state = null;
    var past = [];
    var selected = null;
    var message = '';

    function winsKey() {
        return 'mylog-spider-wins';
    }

    function readWins() {
        try {
            return JSON.parse(localStorage.getItem(winsKey())) || {};
        } catch (error) {
            return {};
        }
    }

    function suitCount() {
        var stored = localStorage.getItem('mylog-spider-suits');
        var n = Number(stored || 1);
        return n === 2 || n === 4 ? n : 1;
    }

    function setMessage(text) {
        message = text;
    }

    function render() {
        var cols = document.getElementById('spider-cols');
        var stock = document.getElementById('spider-stock');
        var done = document.getElementById('spider-done');
        var status = document.getElementById('spider-status');
        cols.innerHTML = '';
        state.columns.forEach(function (col, index) {
            var pile = document.createElement('div');
            pile.className = 'spider-col' + (col.length ? '' : ' is-empty');
            pile.style.height = (col.length ? (72 + (col.length - 1) * 20) : 96) + 'px';
            pile.addEventListener('click', function () {
                if (selected && selected.col !== index) moveTo(index);
            });
            col.forEach(function (card, cardIndex) {
                var el = document.createElement('button');
                el.type = 'button';
                el.className = 'pcard' + (card.up ? (RED[card.s] ? ' red' : '') : ' back');
                if (selected && selected.col === index && cardIndex >= selected.index) el.classList.add('is-selected');
                el.style.top = (cardIndex * 20) + 'px';
                el.style.zIndex = String(cardIndex + 1);
                if (card.up) {
                    el.innerHTML = '<b>' + rankText(card.r) + '</b><i>' + SUITS[card.s] + '</i>';
                    el.addEventListener('click', function (event) {
                        event.stopPropagation();
                        onCard(index, cardIndex);
                    });
                }
                pile.appendChild(el);
            });
            cols.appendChild(pile);
        });
        var deals = Math.floor(state.stock.length / 10);
        stock.innerHTML = '<button type="button" id="spider-deal" class="pcard back" aria-label="发牌"></button><span>' + deals + ' 次</span>';
        document.getElementById('spider-deal').addEventListener('click', dealRow);
        done.innerHTML = '';
        var d;
        for (d = 0; d < state.done; d += 1) {
            var chip = document.createElement('div');
            chip.className = 'pcard';
            chip.textContent = 'K–A';
            done.appendChild(chip);
        }
        var wins = readWins();
        status.textContent = message || ('已收 ' + state.done + '/8 · 本难度胜 ' + (wins[state.suits] || 0));
        document.querySelectorAll('[data-suits]').forEach(function (button) {
            button.classList.toggle('is-on', Number(button.getAttribute('data-suits')) === state.suits);
        });
    }

    function pushHistory() {
        past.push(cloneState(state));
        if (past.length > 80) past.shift();
    }

    function onCard(col, index) {
        if (!movable(state.columns[col], index)) {
            setMessage('只能移动同花色的连续牌');
            selected = null;
            render();
            return;
        }
        if (selected && selected.col === col && selected.index === index) {
            selected = null;
            setMessage('');
            render();
            return;
        }
        if (selected && selected.col !== col) {
            moveTo(col);
            return;
        }
        selected = { col: col, index: index };
        setMessage('');
        render();
    }

    function moveTo(col) {
        if (!selected) return;
        var from = state.columns[selected.col];
        var run = from.slice(selected.index);
        if (!canPlace(state.columns[col], run)) {
            setMessage(state.columns[col].length ? '要接到大 1 点的牌下面' : '');
            render();
            return;
        }
        pushHistory();
        state.columns[selected.col] = from.slice(0, selected.index);
        flip(state.columns[selected.col]);
        state.columns[col] = state.columns[col].concat(run);
        if (peel(state.columns[col])) state.done += 1;
        selected = null;
        noteWin();
        render();
    }

    function noteWin() {
        if (state.done !== 8 || state.won) return;
        state.won = true;
        var wins = readWins();
        wins[state.suits] = (wins[state.suits] || 0) + 1;
        localStorage.setItem(winsKey(), JSON.stringify(wins));
        setMessage('这局收完了');
    }

    function dealRow() {
        if (state.done === 8) return;
        if (state.stock.length < 10) {
            setMessage('牌已经发完');
            render();
            return;
        }
        if (state.columns.some(function (col) { return col.length === 0; })) {
            setMessage('有空列时不能发牌');
            render();
            return;
        }
        pushHistory();
        var c;
        for (c = 0; c < 10; c += 1) {
            var card = state.stock.pop();
            card.up = true;
            state.columns[c].push(card);
            if (peel(state.columns[c])) state.done += 1;
        }
        selected = null;
        noteWin();
        if (state.done !== 8) setMessage('');
        render();
    }

    function hint() {
        var from;
        var index;
        var to;
        for (from = 0; from < 10; from += 1) {
            var col = state.columns[from];
            for (index = 0; index < col.length; index += 1) {
                if (!movable(col, index)) continue;
                var run = col.slice(index);
                for (to = 0; to < 10; to += 1) {
                    if (to === from) continue;
                    if (!canPlace(state.columns[to], run)) continue;
                    if (index === 0 || col[index - 1].up) continue;
                    selected = { col: from, index: index };
                    setMessage('这一手能翻开下面的牌');
                    render();
                    return;
                }
            }
        }
        for (from = 0; from < 10; from += 1) {
            var source = state.columns[from];
            for (index = 0; index < source.length; index += 1) {
                if (!movable(source, index)) continue;
                var stack = source.slice(index);
                for (to = 0; to < 10; to += 1) {
                    if (to === from || !state.columns[to].length) continue;
                    if (!canPlace(state.columns[to], stack)) continue;
                    selected = { col: from, index: index };
                    setMessage('可以接到这一列');
                    render();
                    return;
                }
            }
        }
        setMessage(state.stock.length ? '先发一轮牌，或把牌移进空列' : '没有能接上的牌');
        render();
    }

    function start(suits) {
        state = fresh(suits);
        past = [];
        selected = null;
        localStorage.setItem('mylog-spider-suits', String(suits));
        setMessage('');
        render();
    }

    function undo() {
        if (!past.length) return;
        state = past.pop();
        selected = null;
        setMessage('');
        render();
    }

    document.getElementById('spider-new').addEventListener('click', function () { start(state.suits); });
    document.getElementById('spider-undo').addEventListener('click', undo);
    document.getElementById('spider-hint').addEventListener('click', hint);
    document.querySelectorAll('[data-suits]').forEach(function (button) {
        button.addEventListener('click', function () {
            start(Number(button.getAttribute('data-suits')));
        });
    });
    start(suitCount());
}());
