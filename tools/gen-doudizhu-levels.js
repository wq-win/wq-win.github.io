var DD = globalThis.Doudizhu;

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

function countsFrom(ranks) {
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    ranks.forEach(function (rank) { counts[rank] += 1; });
    return counts;
}

function budget(limit) {
    return { n: 0, limit: limit || 250000 };
}

(function runTests() {
    var pair = countsFrom([11, 11]);
    var singleTwo = countsFrom([12]);
    var wins = DD.winningMoves(pair, singleTwo, null, budget());
    assert(wins.length === 1 && wins[0].t === 'pair', 'pair of A is the only win against a single 2');
    assert(DD.lineIsUnique(pair, singleTwo, null, budget()), 'that line stays unique');

    var you = countsFrom([11, 0]);
    var opp = countsFrom([10]);
    var wins2 = DD.winningMoves(you, opp, null, budget());
    assert(wins2.length === 1 && wins2[0].t === 'single' && wins2[0].r === 11, 'lead the ace');
    assert(DD.lineIsUnique(you, opp, null, budget()), 'ace then three is the only line');

    var rocket = DD.generateMoves(countsFrom([13, 14])).filter(function (move) { return move.t === 'rocket'; })[0];
    var bomb = DD.generateMoves(countsFrom([7, 7, 7, 7])).filter(function (move) { return move.t === 'bomb'; })[0];
    assert(DD.beats(rocket, bomb), 'rocket beats bomb');
    var straight = DD.generateMoves(countsFrom([0, 1, 2, 3, 4])).filter(function (move) { return move.t === 'straight'; })[0];
    assert(DD.beats(bomb, straight), 'bomb beats straight');
    var withTwo = DD.generateMoves(countsFrom([8, 9, 10, 11, 12])).filter(function (move) { return move.t === 'straight'; });
    assert(withTwo.length === 0, 'straight cannot include 2');
    print('engine tests ok');
}());

var seed = 20261011;
function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
}

function randomHand(n, pool) {
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var left = n;
    var guard = 0;
    while (left > 0 && guard < 1000) {
        guard += 1;
        var rank = Math.floor(rnd() * pool);
        var cap = rank >= 13 ? 1 : 4;
        if (counts[rank] >= cap) continue;
        counts[rank] += 1;
        left -= 1;
    }
    return counts;
}

function zeros() {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

function deckList() {
    var deck = [];
    var rank;
    var copy;
    for (rank = 0; rank <= 12; rank += 1) {
        for (copy = 0; copy < 4; copy += 1) deck.push(rank);
    }
    deck.push(13, 14);
    return deck;
}

function shuffle(list) {
    var i;
    var j;
    var tmp;
    for (i = list.length - 1; i > 0; i -= 1) {
        j = Math.floor(rnd() * (i + 1));
        tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
    }
}

function give(deck, counts, rank) {
    var index = deck.indexOf(rank);
    if (index < 0) return false;
    deck.splice(index, 1);
    counts[rank] += 1;
    return true;
}

function biasedDeal(youN, oppN) {
    var deck = deckList();
    var you = zeros();
    var opp = zeros();
    var filledYou = 0;
    var filledOpp = 0;
    var roll = rnd();
    var bombRank;
    var len;
    var start;
    var i;
    var ok;
    shuffle(deck);
    if (roll < 0.42 && oppN >= 4) {
        if (give(deck, opp, 13)) filledOpp += 1;
        if (give(deck, opp, 14)) filledOpp += 1;
    } else if (roll < 0.72 && oppN >= 6) {
        bombRank = Math.floor(rnd() * 9);
        for (i = 0; i < 4; i += 1) {
            if (give(deck, opp, bombRank)) filledOpp += 1;
        }
    } else {
        if (give(deck, opp, 12)) filledOpp += 1;
        if (filledOpp < oppN && give(deck, opp, 11)) filledOpp += 1;
    }
    if (filledYou < youN && give(deck, you, 12)) filledYou += 1;
    if (filledYou < youN && rnd() < 0.65 && give(deck, you, 11)) filledYou += 1;
    if (rnd() < 0.5 && youN - filledYou >= 5) {
        len = 5;
        start = Math.floor(rnd() * (12 - len));
        ok = true;
        for (i = 0; i < len; i += 1) {
            if (deck.indexOf(start + i) < 0) ok = false;
        }
        if (ok) {
            for (i = 0; i < len; i += 1) give(deck, you, start + i);
            filledYou += len;
        }
    }
    while (filledYou < youN) {
        you[deck.pop()] += 1;
        filledYou += 1;
    }
    while (filledOpp < oppN) {
        opp[deck.pop()] += 1;
        filledOpp += 1;
    }
    return { you: you, opp: opp };
}

function oppHasControl(you, opp) {
    var highest = -1;
    var rank;
    for (rank = 0; rank <= 12; rank += 1) {
        if (you[rank]) highest = rank;
    }
    for (rank = highest + 1; rank <= 14; rank += 1) {
        if (opp[rank]) return true;
    }
    for (rank = 0; rank <= 12; rank += 1) {
        if (opp[rank] >= 4) return true;
    }
    return !!(opp[13] && opp[14]);
}

function traceLine(you, opp, spec) {
    var box = budget(700000);
    var memory = {};
    var hand = you.slice();
    var other = opp.slice();
    var lead = null;
    var steps = [];
    var guard = 0;
    var critical = spec.critical || 3;
    var move;
    var reply;
    var wins;
    while (guard < 24) {
        guard += 1;
        if (steps.length < critical) {
            move = DD.uniqueWinningMove(hand, other, lead, box, memory);
            if (!move) return null;
        } else {
            wins = DD.winningMoves(hand, other, lead, box, memory);
            if (!wins.length) return null;
            move = wins[0];
        }
        if (!steps.length && (move.pass || move.cards.length > spec.maxOpen)) return null;
        steps.push(move);
        if (move.pass) {
            reply = DD.chooseMove(other, hand, null, box, memory);
            if (!reply || reply.pass || DD.sum(DD.apply(other, reply)) === 0) return null;
            other = DD.apply(other, reply);
            lead = reply;
            continue;
        }
        hand = DD.apply(hand, move);
        if (DD.sum(hand) === 0) return steps;
        reply = DD.chooseMove(other, hand, move, box, memory);
        if (!reply || (!reply.pass && DD.sum(DD.apply(other, reply)) === 0)) return null;
        if (reply.pass) lead = null;
        else {
            other = DD.apply(other, reply);
            lead = reply;
        }
    }
    return null;
}

function lineOk(steps, spec) {
    var passes = 0;
    var i;
    if (!steps || steps.length < spec.minSteps) return false;
    if (steps[0].pass || steps[0].cards.length > spec.maxOpen) return false;
    for (i = 0; i < steps.length; i += 1) {
        if (steps[i].pass) passes += 1;
    }
    return passes >= spec.minPass;
}

function patternDeal(youN, oppN) {
    var deck = deckList();
    var you = zeros();
    var opp = zeros();
    var pairRanks = [];
    var guard = 0;
    var rank;
    var bait;
    var tail;
    var highs = [];
    var filledYou;
    var filledOpp;
    var tries;
    shuffle(deck);
    while (pairRanks.length < 3 && guard < 40) {
        guard += 1;
        rank = Math.floor(rnd() * 10);
        if (pairRanks.indexOf(rank) >= 0) continue;
        if (deck.filter(function (card) { return card === rank; }).length < 2) continue;
        pairRanks.push(rank);
        give(deck, you, rank);
        give(deck, you, rank);
    }
    if (pairRanks.length < 3) return null;
    bait = Math.floor(rnd() * 10);
    tries = 0;
    while (tries < 24 && (pairRanks.indexOf(bait) >= 0 || deck.indexOf(bait) < 0)) {
        bait = Math.floor(rnd() * 10);
        tries += 1;
    }
    if (!give(deck, you, bait)) return null;
    tail = -1;
    for (rank = 0; rank < 10; rank += 1) {
        if (rank === bait || pairRanks.indexOf(rank) >= 0) continue;
        if (deck.indexOf(rank) >= 0) tail = rank;
    }
    if (tail < 0 || !give(deck, you, tail)) return null;
    filledYou = 8;
    for (rank = bait + 1; rank <= 14; rank += 1) {
        if (deck.indexOf(rank) >= 0) highs.push(rank);
    }
    if (!highs.length || !give(deck, opp, highs[Math.floor(rnd() * highs.length)])) return null;
    filledOpp = 1;
    rank = Math.floor(rnd() * 11);
    if (deck.filter(function (card) { return card === rank; }).length >= 2) {
        give(deck, opp, rank);
        give(deck, opp, rank);
        filledOpp += 2;
    }
    if (filledOpp < oppN && rnd() < 0.55 && give(deck, opp, 13)) filledOpp += 1;
    if (filledOpp < oppN && rnd() < 0.45 && give(deck, opp, 14)) filledOpp += 1;
    while (filledYou < youN && deck.length) {
        you[deck.pop()] += 1;
        filledYou += 1;
    }
    while (filledOpp < oppN && deck.length) {
        opp[deck.pop()] += 1;
        filledOpp += 1;
    }
    if (filledYou !== youN || filledOpp !== oppN) return null;
    return { you: you, opp: opp };
}

var tiers = [
    { you: 8, opp: 5, minSteps: 5, maxOpen: 1, minPass: 1, critical: 3 },
    { you: 8, opp: 6, minSteps: 5, maxOpen: 1, minPass: 1, critical: 3 },
    { you: 8, opp: 7, minSteps: 5, maxOpen: 1, minPass: 1, critical: 3 },
    { you: 9, opp: 6, minSteps: 5, maxOpen: 1, minPass: 1, critical: 3 },
    { you: 9, opp: 7, minSteps: 5, maxOpen: 1, minPass: 1, critical: 3 },
    { you: 9, opp: 8, minSteps: 5, maxOpen: 1, minPass: 1, critical: 3 },
    { you: 10, opp: 7, minSteps: 5, maxOpen: 2, minPass: 1, critical: 3 },
    { you: 10, opp: 8, minSteps: 5, maxOpen: 2, minPass: 1, critical: 3 },
    { you: 10, opp: 9, minSteps: 5, maxOpen: 2, minPass: 1, critical: 3 },
    { you: 11, opp: 8, minSteps: 5, maxOpen: 2, minPass: 1, critical: 3 },
    { you: 11, opp: 9, minSteps: 5, maxOpen: 2, minPass: 1, critical: 3 },
    { you: 12, opp: 10, minSteps: 5, maxOpen: 2, minPass: 1, critical: 3 }
];

function relax(spec) {
    return {
        you: Math.max(8, spec.you - 1),
        opp: Math.max(4, spec.opp - 1),
        minSteps: Math.max(4, spec.minSteps - 1),
        maxOpen: Math.min(2, spec.maxOpen + 1),
        minPass: spec.minPass,
        critical: spec.critical
    };
}

function searchTier(spec) {
    var attempt = 0;
    var started = Date.now();
    while (attempt < 700 && Date.now() - started < 50000) {
        attempt += 1;
        if (attempt % 40 === 0) debug('you ' + spec.you + ' opp ' + spec.opp + ' attempt ' + attempt);
        var deal = patternDeal(spec.you, spec.opp) || biasedDeal(spec.you, spec.opp);
        var key = deal.you.join('') + '|' + deal.opp.join('');
        if (seen[key]) continue;
        if (!oppHasControl(deal.you, deal.opp)) continue;
        if (DD.legalMoves(deal.you, null).length < 3) continue;
        var total = DD.sum(deal.you);
        var moves = DD.legalMoves(deal.you, null);
        if (moves.some(function (move) { return move.cards.length === total; })) continue;
        var promising = true;
        try {
            promising = DD.canForce(deal.you, deal.opp, null, {}, budget(80000));
        } catch (error) {
            if (!error || error.code !== 'budget') throw error;
        }
        if (!promising) continue;
        try {
            var steps = traceLine(deal.you, deal.opp, spec);
            if (!lineOk(steps, spec)) continue;
            seen[key] = 1;
            return {
                you: deal.you,
                opp: deal.opp,
                youText: DD.cardsText(deal.you),
                oppText: DD.cardsText(deal.opp),
                line: steps.map(function (move) { return DD.moveLabel(move); }).join(' - ')
            };
        } catch (error) {
            if (!error || error.code !== 'budget') throw error;
        }
    }
    return null;
}

var found = [];
var seen = {};
var p;
for (p = 0; p < tiers.length; p += 1) {
    var spec = tiers[p];
    var hit = searchTier(spec);
    if (!hit) hit = searchTier(relax(spec));
    if (!hit) hit = searchTier(relax(relax(spec)));
    if (!hit) {
        print('FAILED tier ' + JSON.stringify(spec));
        break;
    }
    hit.id = found.length + 1;
    found.push(hit);
    print('L' + hit.id + ' you ' + hit.youText + ' | opp ' + hit.oppText + ' | ' + hit.line);
}

print('---LEVELS---');
print(JSON.stringify(found));
if (found.length < tiers.length) throw new Error('missing level');
