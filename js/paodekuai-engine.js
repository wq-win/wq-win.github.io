(function (root) {
    var RANK_NAME = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    var SUITS = ['♠', '♥', '♦', '♣'];

    function cardKey(card) {
        return card.r + ':' + card.s;
    }

    function hasCard(cards, card) {
        var i;
        for (i = 0; i < cards.length; i += 1) {
            if (cards[i].r === card.r && cards[i].s === card.s) return true;
        }
        return false;
    }

    function countsOf(cards) {
        var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var i;
        for (i = 0; i < cards.length; i += 1) counts[cards[i].r] += 1;
        return counts;
    }

    function make(type, rank, n, cards, wings) {
        return { t: type, r: rank, n: n, wings: wings || 0, cards: cards.slice(), pass: false };
    }

    function passMove() {
        return { t: 'pass', r: -1, n: 0, wings: 0, cards: [], pass: true };
    }

    function freshDeck() {
        var cards = [];
        var rank;
        var suit;
        for (rank = 0; rank <= 12; rank += 1) {
            for (suit = 0; suit <= 3; suit += 1) {
                if (rank === 12 && suit !== 0) continue;
                if (rank === 11 && suit === 0) continue;
                cards.push({ r: rank, s: suit });
            }
        }
        return cards;
    }

    function shuffle(cards, rnd) {
        var list = cards.slice();
        var i;
        var j;
        var tmp;
        for (i = list.length - 1; i > 0; i -= 1) {
            j = Math.floor(rnd() * (i + 1));
            tmp = list[i];
            list[i] = list[j];
            list[j] = tmp;
        }
        return list;
    }

    function deal(rnd) {
        var deck = shuffle(freshDeck(), rnd);
        var hands = [[], [], []];
        var i;
        for (i = 0; i < deck.length; i += 1) hands[i % 3].push(deck[i]);
        return hands;
    }

    function spadeThree(cards) {
        return hasCard(cards, { r: 0, s: 0 });
    }

    function maxRank(cards) {
        var max = -1;
        var i;
        for (i = 0; i < cards.length; i += 1) {
            if (cards[i].r > max) max = cards[i].r;
        }
        return max;
    }

    function findExactRun(counts, need, maxRank) {
        var start = -1;
        var len = 0;
        var rank;
        for (rank = 0; rank <= maxRank; rank += 1) {
            if (counts[rank] === need) {
                if (start < 0) start = rank;
                else if (rank !== start + len) return null;
                len += 1;
            } else if (counts[rank] !== 0) return null;
        }
        if (maxRank < 12 && counts[12]) return null;
        if (!len) return null;
        return { start: start, len: len };
    }

    function asTrips(cards, counts, total, whole, lead) {
        var body = [];
        var rank;
        var n;
        var wings;
        var i;
        for (rank = 0; rank <= 11; rank += 1) {
            if (counts[rank] >= 3) body.push(rank);
        }
        if (!body.length) return null;
        for (i = 1; i < body.length; i += 1) {
            if (body[i] !== body[0] + i) return null;
        }
        n = body.length;
        for (i = 0; i < n; i += 1) {
            if (counts[body[i]] !== 3) return null;
        }
        wings = total - 3 * n;
        if (wings < 0) return null;
        if (n >= 2 && wings === 2 * n) return make('plane', body[0], n, cards, wings);
        if (n >= 2 && wings < 2 * n && whole && !lead) return make('plane', body[0], n, cards, wings);
        if (n === 1 && wings === 2) return make('triple2', body[0], 1, cards, 2);
        if (n === 1 && wings < 2 && whole && !lead) {
            return make(wings === 0 ? 'triple' : 'triple1', body[0], 1, cards, wings);
        }
        return null;
    }

    function classify(cards, whole, lead) {
        var counts;
        var run;
        if (!cards || !cards.length) return null;
        counts = countsOf(cards);
        if (cards.length === 1) return make('single', cards[0].r, 1, cards, 0);
        if (cards.length === 2 && counts[cards[0].r] === 2) return make('pair', cards[0].r, 1, cards, 0);
        if (cards.length === 4 && counts[cards[0].r] === 4) return make('bomb', cards[0].r, 1, cards, 0);
        run = findExactRun(counts, 1, 11);
        if (run && run.len >= 5 && run.len === cards.length) return make('straight', run.start, run.len, cards, 0);
        run = findExactRun(counts, 2, 11);
        if (run && run.len >= 2 && run.len * 2 === cards.length) return make('pairseq', run.start, run.len, cards, 0);
        return asTrips(cards, counts, cards.length, whole, lead);
    }

    function beats(move, lead) {
        if (!lead) return !move.pass;
        if (move.pass) return false;
        if (move.t === 'bomb' && lead.t !== 'bomb') return true;
        if (move.t === 'bomb' && lead.t === 'bomb') return move.r > lead.r;
        if (lead.t === 'bomb') return false;
        if (move.t !== lead.t) return false;
        if ((move.n || 1) !== (lead.n || 1)) return false;
        return move.r > lead.r;
    }

    function grouped(hand) {
        var groups = [[], [], [], [], [], [], [], [], [], [], [], [], []];
        var i;
        for (i = 0; i < hand.length; i += 1) groups[hand[i].r].push(hand[i]);
        return groups;
    }

    function take(list, n, prefer) {
        var pool;
        var out;
        var index;
        if (!list || list.length < n) return null;
        pool = list.slice();
        out = [];
        if (prefer) {
            index = -1;
            pool.some(function (card, i) {
                if (card.r === prefer.r && card.s === prefer.s) {
                    index = i;
                    return true;
                }
                return false;
            });
            if (index >= 0) out.push(pool.splice(index, 1)[0]);
        }
        while (out.length < n) out.push(pool.shift());
        return out;
    }

    function lowest(hand, blocked, n, prefer) {
        var pool = hand.filter(function (card) { return !blocked[card.r]; });
        pool.sort(function (a, b) { return a.r - b.r || a.s - b.s; });
        if (pool.length < n) return null;
        if (prefer && !blocked[prefer.r]) return take(pool, n, prefer);
        return pool.slice(0, n);
    }

    function generate(hand, prefer) {
        var groups = grouped(hand);
        var moves = [];
        var rank;
        var len;
        var start;
        var i;
        var seq;
        var ok;
        var part;
        var blocked;
        var wings;
        var body;
        hand.forEach(function (card) {
            moves.push(make('single', card.r, 1, [card], 0));
        });
        for (rank = 0; rank <= 12; rank += 1) {
            if (groups[rank].length >= 2) {
                moves.push(make('pair', rank, 1, take(groups[rank], 2, prefer), 0));
            }
            if (groups[rank].length >= 4) {
                moves.push(make('bomb', rank, 1, take(groups[rank], 4, prefer), 0));
            }
        }
        for (len = 5; len <= 12; len += 1) {
            for (start = 0; start + len - 1 <= 11; start += 1) {
                seq = [];
                ok = true;
                for (i = 0; i < len; i += 1) {
                    part = take(groups[start + i], 1, prefer && prefer.r === start + i ? prefer : null);
                    if (!part) {
                        ok = false;
                        break;
                    }
                    seq = seq.concat(part);
                }
                if (ok) moves.push(make('straight', start, len, seq, 0));
            }
        }
        for (len = 2; len <= 8; len += 1) {
            for (start = 0; start + len - 1 <= 11; start += 1) {
                seq = [];
                ok = true;
                for (i = 0; i < len; i += 1) {
                    part = take(groups[start + i], 2, prefer && prefer.r === start + i ? prefer : null);
                    if (!part) {
                        ok = false;
                        break;
                    }
                    seq = seq.concat(part);
                }
                if (ok) moves.push(make('pairseq', start, len, seq, 0));
            }
        }
        for (rank = 0; rank <= 11; rank += 1) {
            if (groups[rank].length < 3) continue;
            blocked = {};
            blocked[rank] = 1;
            wings = lowest(hand, blocked, 2, prefer && prefer.r !== rank ? prefer : null);
            if (!wings) continue;
            body = take(groups[rank], 3, prefer && prefer.r === rank ? prefer : null);
            moves.push(make('triple2', rank, 1, body.concat(wings), 2));
        }
        for (len = 2; len <= 4; len += 1) {
            for (start = 0; start + len - 1 <= 11; start += 1) {
                blocked = {};
                seq = [];
                ok = true;
                for (i = 0; i < len; i += 1) {
                    if (groups[start + i].length < 3) {
                        ok = false;
                        break;
                    }
                    blocked[start + i] = 1;
                    part = take(groups[start + i], 3, prefer && prefer.r === start + i ? prefer : null);
                    seq = seq.concat(part);
                }
                if (!ok) continue;
                wings = lowest(hand, blocked, len * 2, prefer && !blocked[prefer.r] ? prefer : null);
                if (!wings) continue;
                moves.push(make('plane', start, len, seq.concat(wings), len * 2));
            }
        }
        return moves;
    }

    function allowed(move, hand, lead, ctx) {
        if (!move) return false;
        if (lead && !beats(move, lead)) return false;
        if (!lead && move.pass) return false;
        if (ctx && ctx.require && !hasCard(move.cards, ctx.require)) return false;
        if (ctx && ctx.nextCount === 1 && move.t === 'single' && move.r < maxRank(hand)) return false;
        return true;
    }

    function answerMoves(hand, lead, ctx) {
        var prefer = ctx && ctx.require;
        var moves = generate(hand, prefer);
        var finish = classify(hand, true, !!lead);
        var seen = {};
        var out = [];
        if (finish) moves.unshift(finish);
        moves.forEach(function (move) {
            var key;
            if (!allowed(move, hand, lead, ctx)) return;
            key = move.t + ':' + move.r + ':' + move.n + ':' + move.wings + ':' + move.cards.map(cardKey).join(',');
            if (seen[key]) return;
            seen[key] = 1;
            out.push(move);
        });
        return out;
    }

    function chooseMove(hand, lead, ctx) {
        var moves = answerMoves(hand, lead, ctx);
        var finish;
        var pool;
        var wider;
        if (!moves.length) return lead ? passMove() : null;
        finish = moves.filter(function (move) { return move.cards.length === hand.length; });
        if (finish.length) return finish[0];
        if (lead) {
            pool = moves.filter(function (move) { return move.t !== 'bomb'; });
            if (!pool.length) pool = moves;
            pool.sort(function (a, b) {
                return a.r - b.r || a.cards.length - b.cards.length;
            });
            return pool[0];
        }
        pool = moves.filter(function (move) { return move.t !== 'bomb'; });
        if (!pool.length) pool = moves;
        if (ctx && ctx.nextCount === 1) {
            wider = pool.filter(function (move) { return move.t !== 'single'; });
            if (wider.length) pool = wider;
        }
        pool.sort(function (a, b) {
            var as = 0;
            var bs = 0;
            a.cards.forEach(function (card) { as += card.r; });
            b.cards.forEach(function (card) { bs += card.r; });
            return (as - a.cards.length * 20) - (bs - b.cards.length * 20);
        });
        return pool[0];
    }

    function removeCards(hand, cards) {
        var next = hand.slice();
        cards.forEach(function (card) {
            var index = -1;
            next.some(function (item, i) {
                if (item.r === card.r && item.s === card.s) {
                    index = i;
                    return true;
                }
                return false;
            });
            if (index >= 0) next.splice(index, 1);
        });
        return next;
    }

    root.Paodekuai = {
        RANK_NAME: RANK_NAME,
        SUITS: SUITS,
        freshDeck: freshDeck,
        deal: deal,
        spadeThree: spadeThree,
        maxRank: maxRank,
        classify: classify,
        beats: beats,
        answerMoves: answerMoves,
        chooseMove: chooseMove,
        removeCards: removeCards,
        hasCard: hasCard,
        passMove: passMove,
        cardKey: cardKey
    };
}(typeof globalThis !== 'undefined' ? globalThis : this));
