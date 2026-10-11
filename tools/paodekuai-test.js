var PK = globalThis.Paodekuai;

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

function cards(list) {
    return list.map(function (pair) { return { r: pair[0], s: pair[1] }; });
}

function typeOf(list, whole, lead) {
    var move = PK.classify(cards(list), whole, lead);
    return move ? move.t + ':' + move.r + ':' + move.n : 'none';
}

(function run() {
    var deck = PK.freshDeck();
    assert(deck.length === 48, '48 cards');
    assert(deck.filter(function (card) { return card.r === 12; }).length === 1, 'only one 2');
    assert(deck.filter(function (card) { return card.r === 12 && card.s === 0; }).length === 1, 'the 2 is a spade');
    assert(!deck.some(function (card) { return card.r === 11 && card.s === 0; }), 'no spade ace');
    assert(deck.some(function (card) { return card.r === 0 && card.s === 0; }), 'spade 3 stays');

    assert(typeOf([[0, 0], [1, 1], [2, 2], [3, 3], [4, 0]], true, false) === 'straight:0:5', 'straight from 3');
    assert(typeOf([[10, 1], [11, 1], [12, 0], [0, 1], [1, 1]], true, false) === 'none', 'straight cannot include 2');
    assert(typeOf([[0, 0], [0, 1], [1, 0], [1, 1]], true, false) === 'pairseq:0:2', 'two pairs');
    assert(typeOf([[11, 1], [11, 2], [12, 0], [12, 0]], true, false) === 'none', 'pair sequence cannot include 2');
    assert(typeOf([[4, 0], [4, 1], [4, 2], [4, 3]], true, false) === 'bomb:4:1', 'four of a kind is a bomb');
    assert(typeOf([[5, 0], [5, 1], [5, 2], [1, 0], [2, 1]], true, true) === 'triple2:5:1', 'triple with two wings');
    assert(typeOf([[5, 0], [5, 1], [5, 2]], true, false) === 'triple:5:1', 'last bare triple');
    assert(typeOf([[5, 0], [5, 1], [5, 2]], false, true) === 'none', 'bare triple cannot follow');

    var low = PK.classify(cards([[2, 0], [2, 1], [2, 2], [0, 1], [1, 1]]), true, true);
    var high = PK.classify(cards([[6, 0], [6, 1], [6, 2], [3, 1], [4, 1]]), true, true);
    assert(PK.beats(high, low), 'higher triple-with-two wins');
    var bare = PK.classify(cards([[8, 0], [8, 1], [8, 2]]), true, false);
    assert(!PK.beats(bare, low), 'bare triple does not beat triple-with-two');
    var bomb = PK.classify(cards([[1, 0], [1, 1], [1, 2], [1, 3]]), true, true);
    var straight = PK.classify(cards([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]), true, false);
    assert(PK.beats(bomb, straight), 'bomb beats straight');
    var two = PK.classify(cards([[12, 0]]), true, true);
    var ace = PK.classify(cards([[11, 1]]), true, true);
    assert(PK.beats(two, ace), '2 beats ace');

    var hand = cards([[12, 0], [11, 1], [3, 0]]);
    var king = PK.classify(cards([[10, 1]]), true, true);
    var answers = PK.answerMoves(hand, king, { nextCount: 8 });
    assert(answers.some(function (move) { return move.t === 'single' && move.r === 11; }), 'ace can follow a king');
    assert(answers.some(function (move) { return move.t === 'single' && move.r === 12; }), '2 can follow a king');
    assert(!answers.some(function (move) { return move.pass; }), 'must follow when a card can');
    var mustTwo = PK.answerMoves(hand, ace, { nextCount: 8 });
    assert(mustTwo.length === 1 && mustTwo[0].r === 12, 'only the 2 beats an ace');
    var none = PK.answerMoves(cards([[0, 1], [1, 1]]), two, { nextCount: 8 });
    assert(none.length === 0, 'pass is the only choice when nothing beats');

    var reported = PK.answerMoves(hand, null, { nextCount: 1 });
    assert(!reported.some(function (move) { return move.t === 'single' && move.r !== 12; }), 'a single against a one-card seat must be the highest');
    assert(reported.some(function (move) { return move.t === 'single' && move.r === 12; }), 'the 2 is still a legal single');

    var opening = cards([[0, 0], [0, 1], [4, 2], [8, 1]]);
    var openMoves = PK.answerMoves(opening, null, { require: { r: 0, s: 0 }, nextCount: 16 });
    assert(openMoves.every(function (move) { return PK.hasCard(move.cards, { r: 0, s: 0 }); }), 'opening plays include the spade 3');
    assert(openMoves.some(function (move) { return move.t === 'single'; }), 'spade 3 can lead alone');
    assert(openMoves.some(function (move) { return move.t === 'pair'; }), 'spade 3 can lead in a pair');

    var plane = cards([[2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2], [6, 0], [6, 1], [8, 0], [8, 1]]);
    assert(PK.classify(plane, true, true).t === 'plane', 'full plane');
    var shortPlane = cards([[2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2], [6, 0], [6, 1]]);
    assert(PK.classify(shortPlane, true, false).t === 'plane', 'short plane on the last lead');
    assert(PK.classify(shortPlane, true, true) === null, 'short plane cannot follow');

    var beat = PK.chooseMove(hand, king, { nextCount: 8 });
    assert(beat.t === 'single' && beat.r === 11, 'follow with the smallest card that wins');
    var withBomb = cards([[12, 0], [1, 0], [1, 1], [1, 2], [1, 3], [6, 0]]);
    var saved = PK.chooseMove(withBomb, king, { nextCount: 8 });
    assert(saved.t !== 'bomb', 'save the bomb when another card follows');

    var seed = 1;
    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }
    var games;
    var hands;
    var turn;
    var lead;
    var leadSeat;
    var passes;
    var opening;
    var guard;
    var move;
    var rule;
    for (games = 0; games < 40; games += 1) {
        hands = PK.deal(rnd);
        turn = 0;
        hands.forEach(function (hand, index) { if (PK.spadeThree(hand)) turn = index; });
        lead = null;
        leadSeat = turn;
        passes = 0;
        opening = true;
        guard = 0;
        while (guard < 300) {
            guard += 1;
            rule = { require: opening ? { r: 0, s: 0 } : null, nextCount: hands[(turn + 1) % 3].length };
            move = PK.chooseMove(hands[turn], lead, rule);
            assert(move, 'a seat always has a play');
            if (rule.nextCount === 1 && move.t === 'single') assert(move.r === PK.maxRank(hands[turn]), 'report-single plays the top card');
            if (lead && PK.answerMoves(hands[turn], lead, rule).length) assert(!move.pass, 'must follow');
            if (move.pass) {
                passes += 1;
                if (passes >= 2) {
                    turn = leadSeat;
                    lead = null;
                    passes = 0;
                } else turn = (turn + 1) % 3;
                continue;
            }
            if (opening) assert(PK.hasCard(move.cards, { r: 0, s: 0 }), 'first play keeps the spade 3');
            hands[turn] = PK.removeCards(hands[turn], move.cards);
            opening = false;
            lead = move;
            leadSeat = turn;
            passes = 0;
            if (!hands[turn].length) break;
            turn = (turn + 1) % 3;
        }
        assert(guard < 300, 'a deal finishes');
    }
    var n;
    var game;
    for (n = 0; n < 30; n += 1) {
        game = PK.deal(rnd);
        assert(game[0].length === 16 && game[1].length === 16 && game[2].length === 16, 'sixteen each');
        assert(game.filter(PK.spadeThree).length === 1, 'one seat holds the spade 3');
    }
    print('paodekuai tests ok');
}());
