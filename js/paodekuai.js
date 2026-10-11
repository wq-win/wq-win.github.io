(function () {
    var PK = window.Paodekuai;
    var NAMES = ['你', '下家', '上家'];
    var state = null;
    var selected = {};
    var thinking = false;
    var timer = 0;

    function stats() {
        try {
            return JSON.parse(localStorage.getItem('mylog-paodekuai')) || { wins: 0, games: 0 };
        } catch (error) {
            return { wins: 0, games: 0 };
        }
    }

    function remember() {
        if (state.recorded) return;
        state.recorded = true;
        var saved = stats();
        saved.games += 1;
        if (state.over === 0) saved.wins += 1;
        localStorage.setItem('mylog-paodekuai', JSON.stringify(saved));
    }

    function ctx(seat) {
        return {
            require: state.opening ? { r: 0, s: 0 } : null,
            nextCount: state.hands[(seat + 1) % 3].length
        };
    }

    function selectedCards() {
        return state.hands[0].filter(function (card) { return selected[PK.cardKey(card)]; });
    }

    function playable() {
        var hand = state.hands[0];
        var picked = selectedCards();
        var move = PK.classify(picked, picked.length === hand.length, !!state.lead);
        var rule = ctx(0);
        if (!move) return null;
        if (state.lead && !PK.beats(move, state.lead)) return null;
        if (rule.require && !PK.hasCard(move.cards, rule.require)) return null;
        if (rule.nextCount === 1 && move.t === 'single' && move.r < PK.maxRank(hand)) return null;
        return move;
    }

    function sorted(cards) {
        return cards.slice().sort(function (a, b) { return b.r - a.r || a.s - b.s; });
    }

    function cardFace(card, mine) {
        var button = document.createElement(mine ? 'button' : 'span');
        var red = card.s === 1 || card.s === 2;
        var key = PK.cardKey(card);
        if (mine) button.type = 'button';
        button.className = 'pcard' + (red ? ' red' : '') + (selected[key] ? ' is-selected' : '');
        if (state.opening && card.r === 0 && card.s === 0) button.className += ' is-key';
        button.innerHTML = '<b>' + PK.RANK_NAME[card.r] + '</b><i>' + PK.SUITS[card.s] + '</i>';
        if (mine && state.turn === 0 && state.over === null && !thinking) {
            button.addEventListener('click', function () {
                if (selected[key]) delete selected[key];
                else selected[key] = 1;
                render();
            });
        }
        return button;
    }

    function paintSeat(seat, id) {
        var host = document.getElementById(id);
        var count = state.hands[seat].length;
        var backs = host.querySelector('.pdk-backs');
        var shown = Math.min(count, 3);
        var i;
        host.classList.toggle('is-turn', state.turn === seat && state.over === null);
        host.querySelector('.pdk-meta').textContent = count === 0 ? '出完' : (count === 1 ? '报单' : count + ' 张');
        backs.innerHTML = '';
        for (i = 0; i < shown; i += 1) {
            var back = document.createElement('span');
            back.className = 'pcard back';
            backs.appendChild(back);
        }
    }

    function paintTrick() {
        var trick = document.getElementById('pdk-trick');
        var who = document.createElement('span');
        trick.innerHTML = '';
        if (state.last && state.last.pass) who.textContent = NAMES[state.last.seat] + '要不起';
        else if (state.lead) who.textContent = NAMES[state.leadSeat] + '出';
        else who.textContent = NAMES[state.turn] + (state.opening ? '先出' : '领出');
        trick.appendChild(who);
        if (state.lead) {
            sorted(state.lead.cards).forEach(function (card) {
                trick.appendChild(cardFace(card, false));
            });
        }
    }

    function statusText() {
        if (state.over === 0) return '你赢了';
        if (state.over !== null) return NAMES[state.over] + '先出完了';
        if (thinking) return NAMES[state.turn] + '思考';
        if (state.turn !== 0) return '等待' + NAMES[state.turn];
        if (state.opening) return '请带上黑桃 3';
        if (state.hands[1].length === 1) return '下家报单，单张出最大';
        if (state.lead) return '有牌必压';
        return '轮到你出牌';
    }

    function render() {
        var hand = document.getElementById('pdk-you');
        var result = document.getElementById('pdk-result');
        var saved = stats();
        var move = state.turn === 0 && !thinking && state.over === null ? playable() : null;
        var must = state.turn === 0 && !thinking && state.over === null && state.lead && !PK.answerMoves(state.hands[0], state.lead, ctx(0)).length;
        paintSeat(2, 'pdk-left');
        paintSeat(1, 'pdk-right');
        paintTrick();
        hand.innerHTML = '';
        sorted(state.hands[0]).forEach(function (card, index) {
            var face = cardFace(card, true);
            face.style.zIndex = String(index + 1);
            hand.appendChild(face);
        });
        document.getElementById('pdk-play').disabled = !move;
        document.getElementById('pdk-pass').disabled = !must;
        document.getElementById('pdk-status').textContent = statusText();
        document.getElementById('pdk-score').textContent = '胜 ' + saved.wins + ' / ' + saved.games;
        if (state.over === null) {
            result.hidden = true;
            return;
        }
        result.hidden = false;
        document.getElementById('pdk-result-title').textContent = state.over === 0 ? '你赢了' : (NAMES[state.over] + '赢了');
        document.getElementById('pdk-result-sub').textContent = [0, 1, 2].filter(function (seat) {
            return seat !== state.over;
        }).map(function (seat) {
            var text = NAMES[seat] + '剩 ' + state.hands[seat].length + ' 张';
            if (!state.thrown[seat]) text += '，全关';
            return text;
        }).join(' · ');
    }

    function commit(seat, move) {
        state.last = { seat: seat, pass: !!move.pass, move: move };
        selected = {};
        if (move.pass) {
            state.passes += 1;
            if (state.passes >= 2) {
                state.turn = state.leadSeat;
                state.lead = null;
                state.passes = 0;
            } else state.turn = (seat + 1) % 3;
            return;
        }
        state.hands[seat] = PK.removeCards(state.hands[seat], move.cards);
        state.thrown[seat] += move.cards.length;
        state.lead = move;
        state.leadSeat = seat;
        state.passes = 0;
        state.opening = false;
        selected = {};
        if (!state.hands[seat].length) {
            state.over = seat;
            state.turn = seat;
            remember();
            return;
        }
        state.turn = (seat + 1) % 3;
    }

    function poke() {
        window.clearTimeout(timer);
        if (!state || state.over !== null) return;
        if (state.turn === 0) {
            if (state.lead && !PK.answerMoves(state.hands[0], state.lead, ctx(0)).length) {
                timer = window.setTimeout(function () {
                    if (!state || state.turn !== 0 || state.over !== null) return;
                    commit(0, PK.passMove());
                    render();
                    poke();
                }, 700);
            }
            return;
        }
        thinking = true;
        render();
        timer = window.setTimeout(function () {
            var move = PK.chooseMove(state.hands[state.turn], state.lead, ctx(state.turn));
            thinking = false;
            commit(state.turn, move);
            render();
            poke();
        }, 560);
    }

    function start() {
        var hands = PK.deal(Math.random);
        var starter = 0;
        window.clearTimeout(timer);
        hands.forEach(function (hand, index) {
            if (PK.spadeThree(hand)) starter = index;
        });
        thinking = false;
        selected = {};
        state = {
            hands: hands,
            turn: starter,
            lead: null,
            leadSeat: starter,
            passes: 0,
            opening: true,
            last: null,
            over: null,
            thrown: [0, 0, 0],
            recorded: false
        };
        render();
        poke();
    }

    document.getElementById('pdk-play').addEventListener('click', function () {
        var move = playable();
        if (!move || state.turn !== 0 || thinking || state.over !== null) return;
        commit(0, move);
        render();
        poke();
    });
    document.getElementById('pdk-pass').addEventListener('click', function () {
        if (state.turn !== 0 || thinking || state.over !== null || !state.lead) return;
        if (PK.answerMoves(state.hands[0], state.lead, ctx(0)).length) return;
        window.clearTimeout(timer);
        commit(0, PK.passMove());
        render();
        poke();
    });
    document.getElementById('pdk-again').addEventListener('click', start);
    start();
}());
