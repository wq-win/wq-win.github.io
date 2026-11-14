(function () {
    var SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' };
    var RED = { H: 1, D: 1 };
    var RANK = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

    function rankText(rank) {
        return RANK[rank] || String(rank);
    }

    var PIPS = {
        2: [[50, 16], [50, 84]],
        3: [[50, 14], [50, 50], [50, 86]],
        4: [[28, 16], [72, 16], [28, 84], [72, 84]],
        5: [[28, 16], [72, 16], [50, 50], [28, 84], [72, 84]],
        6: [[28, 14], [72, 14], [28, 50], [72, 50], [28, 86], [72, 86]],
        7: [[28, 14], [72, 14], [50, 32], [28, 50], [72, 50], [28, 86], [72, 86]],
        8: [[28, 14], [72, 14], [50, 32], [28, 50], [72, 50], [50, 68], [28, 86], [72, 86]],
        9: [[28, 10], [72, 10], [28, 36], [72, 36], [50, 50], [28, 64], [72, 64], [28, 90], [72, 90]],
        10: [[28, 10], [72, 10], [50, 24], [28, 38], [72, 38], [28, 62], [72, 62], [50, 76], [28, 90], [72, 90]]
    };
    var COURT = { 11: 'jack', 12: 'queen', 13: 'king' };

    function cardArtwork(card) {
        var label = rankText(card.r);
        var suit = SUITS[card.s];
        var corner = '<b>' + label + '</b><i>' + suit + '</i>';
        var center;
        if (card.r >= 11) {
            center = '<img class="spider-court" src="assets/paodekuai/court-' + COURT[card.r] + '.svg" alt="" draggable="false">';
        } else if (card.r === 1) {
            center = '<span class="spider-ace" aria-hidden="true">' + suit + '</span>';
        } else {
            center = '<span class="spider-pips" aria-hidden="true">' + PIPS[card.r].map(function (point) {
                return '<span class="spider-pip' + (point[1] > 50 ? ' is-flipped' : '') + '" style="left:' + point[0] + '%;top:' + point[1] + '%">' + suit + '</span>';
            }).join('') + '</span>';
        }
        return '<span class="spider-corner" aria-hidden="true">' + corner + '</span>' + center + '<span class="spider-corner spider-corner-bottom" aria-hidden="true">' + corner + '</span>';
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
        var stored; try { stored = localStorage.getItem('mylog-spider-suits'); } catch (_) {}
        var n = Number(stored || 1);
        return n === 2 || n === 4 ? n : 1;
    }

    var RUN_KEY = 'mylog-spider-run-v1';
    function validRun(run) {
        if (!run || ![1,2,4].includes(run.suits) || !Number.isInteger(run.done) || run.done<0 || run.done>8 || !Array.isArray(run.columns) || run.columns.length!==10 || !run.columns.every(Array.isArray) || !Array.isArray(run.stock) || run.stock.length>50 || run.stock.length%10) return false;
        var cards = run.columns.flat().concat(run.stock), deck = buildDeck(run.suits), ids = new Set();
        if (cards.length !== 104-run.done*13) return false;
        return cards.every(function(card) {
            if (!card || !Number.isInteger(card.id) || card.id<1 || card.id>104 || ids.has(card.id) || typeof card.up!=='boolean') return false;
            ids.add(card.id); var expected=deck[card.id-1]; return card.r===expected.r && card.s===expected.s;
        }) && run.columns.every(function(col){ return !col.length || col[col.length-1].up; });
    }
    function saveRun() {
        try { localStorage.setItem(RUN_KEY, JSON.stringify({version:1,state:state,past:past})); } catch (_) {}
    }
    function restoreRun() {
        try {
            var raw=localStorage.getItem(RUN_KEY); if (!raw || raw.length>700000) return false;
            var saved=JSON.parse(raw);
            if(saved.version!==1 || !validRun(saved.state) || !Array.isArray(saved.past) || saved.past.length>80 || !saved.past.every(validRun)) return false;
            state=saved.state; past=saved.past; selected=null; setMessage('已恢复上次牌局 · 撤销记录也保留'); render(); return true;
        } catch (_) { return false; }
    }

    function setMessage(text) {
        message = text;
    }

    function render() {
        saveRun();
        var cols = document.getElementById('spider-cols');
        var stock = document.getElementById('spider-stock');
        var done = document.getElementById('spider-done');
        var status = document.getElementById('spider-status');
        cols.innerHTML = '';
        state.columns.forEach(function (col, index) {
            var pile = document.createElement('div');
            pile.className = 'spider-col' + (col.length ? '' : ' is-empty');
            pile.addEventListener('click', function () {
                if (selected && selected.col !== index) moveTo(index);
            });
            col.forEach(function (card, cardIndex) {
                var el = document.createElement('button');
                var picked = selected && selected.col === index && cardIndex >= selected.index;
                el.type = 'button';
                el.className = 'pcard' + (card.up ? (RED[card.s] ? ' red' : '') : ' back') + (picked ? ' is-selected' : '');
                el.style.zIndex = String(picked ? 40 + cardIndex : cardIndex + 1);
                if (card.up) {
                    el.innerHTML = cardArtwork(card);
                    el.setAttribute('aria-label', rankText(card.r) + SUITS[card.s]);
                    el.addEventListener('click', function (event) {
                        event.stopPropagation();
                        onCard(index, cardIndex);
                    });
                } else {
                    el.setAttribute('aria-label', '牌背');
                    el.tabIndex = -1;
                }
                pile.appendChild(el);
            });
            cols.appendChild(pile);
        });
        var deals = Math.floor(state.stock.length / 10);
        stock.innerHTML = '<button type="button" id="spider-deal" class="pcard back' + (deals > 1 ? ' is-thick' : '') + '" aria-label="发牌"' + (deals ? '' : ' disabled') + '></button><span>' + deals + ' 次</span>';
        document.getElementById('spider-deal').addEventListener('click', dealRow);
        done.innerHTML = '';
        var d;
        if (!state.done) {
            var empty = document.createElement('div');
            empty.className = 'spider-foundation';
            empty.textContent = '收齐';
            done.appendChild(empty);
        }
        for (d = 0; d < state.done; d += 1) {
            var chip = document.createElement('div');
            chip.className = 'pcard';
            chip.innerHTML = cardArtwork({ r: 13, s: 'S' });
            chip.setAttribute('aria-label', '已收一组');
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
        try { localStorage.setItem(winsKey(), JSON.stringify(wins)); } catch (_) {}
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
        try { localStorage.setItem('mylog-spider-suits', String(suits)); } catch (_) {}
        setMessage('');
        render();
    }

    function requestStart(suits) {
        // 即使刚载入且没有可撤销步骤，也不能无提示覆盖一局牌。
        if (state && state.done < 8 && !window.confirm('重新开局会替换当前牌局和撤销记录，确定继续吗？')) return;
        start(suits);
    }

    function undo() {
        if (!past.length) return;
        state = past.pop();
        selected = null;
        setMessage('');
        render();
    }

    document.getElementById('spider-new').addEventListener('click', function () { requestStart(state.suits); });
    document.getElementById('spider-undo').addEventListener('click', undo);
    document.getElementById('spider-hint').addEventListener('click', hint);
    document.querySelectorAll('[data-suits]').forEach(function (button) {
        button.addEventListener('click', function () {
            requestStart(Number(button.getAttribute('data-suits')));
        });
    });
    if (!restoreRun()) start(suitCount());
}());
