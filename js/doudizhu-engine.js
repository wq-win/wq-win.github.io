(function (root) {
    var RANK_NAME = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '小王', '大王'];

    function make(t, r, n, kick, cards) {
        return {
            t: t,
            r: r,
            n: n,
            kick: kick.slice().sort(function (a, b) { return a - b; }),
            cards: cards.slice(),
            pass: false
        };
    }

    function kickerSets(rest, need, blocked) {
        var bag = [];
        var r;
        var i;
        for (r = 0; r < 15; r += 1) {
            if (blocked[r]) continue;
            for (i = 0; i < rest[r]; i += 1) bag.push(r);
        }
        var out = [];
        var seen = {};
        var cur = [];
        function rec(start, left) {
            if (left === 0) {
                var sorted = cur.slice().sort(function (a, b) { return a - b; });
                var key = sorted.join(',');
                if (!seen[key]) {
                    seen[key] = 1;
                    out.push(sorted);
                }
                return;
            }
            for (var j = start; j <= bag.length - left; j += 1) {
                cur.push(bag[j]);
                rec(j + 1, left - 1);
                cur.pop();
            }
        }
        if (bag.length < need) return [];
        rec(0, need);
        return out;
    }

    function pairKickerSets(rest, need, blocked) {
        var opts = [];
        var r;
        for (r = 0; r <= 12; r += 1) {
            if (!blocked[r] && rest[r] >= 2) opts.push(r);
        }
        var out = [];
        var cur = [];
        function rec(start, left) {
            if (left === 0) {
                out.push(cur.slice());
                return;
            }
            for (var j = start; j <= opts.length - left; j += 1) {
                cur.push(opts[j]);
                rec(j + 1, left - 1);
                cur.pop();
            }
        }
        if (opts.length < need) return [];
        rec(0, need);
        return out;
    }

    function generateMoves(counts) {
        var moves = [];
        var r;
        var n;
        var len;
        var start;
        var i;
        for (r = 0; r < 15; r += 1) {
            if (counts[r] >= 1) moves.push(make('single', r, 1, [], [r]));
            if (r <= 12 && counts[r] >= 2) moves.push(make('pair', r, 1, [], [r, r]));
            if (r <= 12 && counts[r] >= 3) moves.push(make('triple', r, 1, [], [r, r, r]));
            if (r <= 12 && counts[r] >= 4) moves.push(make('bomb', r, 1, [], [r, r, r, r]));
        }
        if (counts[13] && counts[14]) moves.push(make('rocket', 14, 1, [], [13, 14]));

        for (len = 5; len <= 12; len += 1) {
            for (start = 0; start + len - 1 <= 11; start += 1) {
                var straight = [];
                var ok = true;
                for (i = 0; i < len; i += 1) {
                    if (counts[start + i] < 1) {
                        ok = false;
                        break;
                    }
                    straight.push(start + i);
                }
                if (ok) moves.push(make('straight', start, len, [], straight));
            }
        }

        for (n = 3; n <= 10; n += 1) {
            for (start = 0; start + n - 1 <= 11; start += 1) {
                var pairs = [];
                var okp = true;
                for (i = 0; i < n; i += 1) {
                    if (counts[start + i] < 2) {
                        okp = false;
                        break;
                    }
                    pairs.push(start + i, start + i);
                }
                if (okp) moves.push(make('pairseq', start, n, [], pairs));
            }
        }

        for (n = 2; n <= 4; n += 1) {
            for (start = 0; start + n - 1 <= 11; start += 1) {
                var body = [];
                var okpl = true;
                for (i = 0; i < n; i += 1) {
                    if (counts[start + i] < 3) {
                        okpl = false;
                        break;
                    }
                    body.push(start + i, start + i, start + i);
                }
                if (!okpl) continue;
                moves.push(make('plane', start, n, [], body.slice()));
                var rest = counts.slice();
                var blocked = {};
                for (i = 0; i < n; i += 1) {
                    rest[start + i] -= 3;
                    blocked[start + i] = 1;
                }
                kickerSets(rest, n, blocked).forEach(function (kick) {
                    moves.push(make('plane1', start, n, kick, body.concat(kick)));
                });
                pairKickerSets(rest, n, blocked).forEach(function (kick) {
                    var extra = [];
                    kick.forEach(function (kr) { extra.push(kr, kr); });
                    moves.push(make('plane2', start, n, kick, body.concat(extra)));
                });
            }
        }

        for (r = 0; r <= 12; r += 1) {
            if (counts[r] < 3) continue;
            var restT = counts.slice();
            restT[r] -= 3;
            var k;
            for (k = 0; k < 15; k += 1) {
                if (k === r || restT[k] < 1) continue;
                moves.push(make('triple1', r, 1, [k], [r, r, r, k]));
            }
            for (k = 0; k <= 12; k += 1) {
                if (k === r || restT[k] < 2) continue;
                moves.push(make('triple2', r, 1, [k], [r, r, r, k, k]));
            }
        }
        return moves;
    }

    function beats(move, lead) {
        if (!lead) return !move.pass;
        if (move.pass) return false;
        if (move.t === 'rocket') return true;
        if (lead.t === 'rocket') return false;
        if (move.t === 'bomb' && lead.t !== 'bomb') return true;
        if (move.t === 'bomb' && lead.t === 'bomb') return move.r > lead.r;
        if (lead.t === 'bomb') return false;
        if (move.t !== lead.t) return false;
        if ((move.n || 1) !== (lead.n || 1)) return false;
        return move.r > lead.r;
    }

    function passMove() {
        return { pass: true, t: 'pass', r: -1, n: 0, kick: [], cards: [] };
    }

    function legalMoves(counts, lead) {
        var all = generateMoves(counts).filter(function (move) { return beats(move, lead); });
        if (lead) all.push(passMove());
        all.sort(function (a, b) {
            var byLen = (b.cards ? b.cards.length : 0) - (a.cards ? a.cards.length : 0);
            if (byLen) return byLen;
            return (b.r || 0) - (a.r || 0);
        });
        return all;
    }

    function apply(counts, move) {
        var next = counts.slice();
        if (!move || move.pass) return next;
        move.cards.forEach(function (rank) { next[rank] -= 1; });
        return next;
    }

    function sum(counts) {
        var total = 0;
        var i;
        for (i = 0; i < 15; i += 1) total += counts[i];
        return total;
    }

    function countKey(counts) {
        return counts.join('');
    }

    function moveKey(move) {
        if (!move) return '-';
        if (move.pass) return 'P';
        return move.t + ':' + move.r + ':' + move.n + ':' + move.kick.join(',');
    }

    function canForce(hand, opp, lead, memo, budget) {
        if (sum(hand) === 0) return true;
        budget.n += 1;
        if (budget.n > budget.limit) {
            var error = new Error('budget');
            error.code = 'budget';
            throw error;
        }
        var key = countKey(hand) + '|' + countKey(opp) + '|' + moveKey(lead);
        if (Object.prototype.hasOwnProperty.call(memo, key)) return memo[key];
        var moves = legalMoves(hand, lead);
        var i;
        for (i = 0; i < moves.length; i += 1) {
            var move = moves[i];
            if (move.pass) {
                if (!canForce(opp, hand, null, memo, budget)) {
                    memo[key] = true;
                    return true;
                }
                continue;
            }
            var next = apply(hand, move);
            if (sum(next) === 0 || !canForce(opp, next, move, memo, budget)) {
                memo[key] = true;
                return true;
            }
        }
        memo[key] = false;
        return false;
    }

    function moveWins(hand, opp, move, memo, budget) {
        if (move.pass) return !canForce(opp, hand, null, memo, budget);
        var next = apply(hand, move);
        return sum(next) === 0 || !canForce(opp, next, move, memo, budget);
    }

    function winningMoves(hand, opp, lead, budget, memo) {
        var memory = memo || {};
        var moves = legalMoves(hand, lead);
        var wins = [];
        var i;
        for (i = 0; i < moves.length; i += 1) {
            if (moveWins(hand, opp, moves[i], memory, budget)) wins.push(moves[i]);
        }
        return wins;
    }

    function uniqueWinningMove(hand, opp, lead, budget, memo) {
        var memory = memo || {};
        var moves = legalMoves(hand, lead);
        var found = null;
        var i;
        for (i = 0; i < moves.length; i += 1) {
            if (!moveWins(hand, opp, moves[i], memory, budget)) continue;
            if (found) return null;
            found = moves[i];
        }
        return found;
    }

    function chooseMove(hand, opp, lead, budget, memo) {
        var memory = memo || {};
        var moves = legalMoves(hand, lead);
        var i;
        for (i = 0; i < moves.length; i += 1) {
            if (moveWins(hand, opp, moves[i], memory, budget)) return moves[i];
        }
        return moves[0] || null;
    }

    function lineIsUnique(hand, opp, lead, budget, memo) {
        var memory = memo || {};
        var move = uniqueWinningMove(hand, opp, lead, budget, memory);
        if (!move) return false;
        if (move.pass) {
            var leadBack = chooseMove(opp, hand, null, budget, memory);
            if (!leadBack || leadBack.pass || sum(apply(opp, leadBack)) === 0) return false;
            return lineIsUnique(hand, apply(opp, leadBack), leadBack, budget, memory);
        }
        var next = apply(hand, move);
        if (sum(next) === 0) return true;
        var reply = chooseMove(opp, next, move, budget, memory);
        if (!reply || (!reply.pass && sum(apply(opp, reply)) === 0)) return false;
        if (reply.pass) return lineIsUnique(next, opp, null, budget, memory);
        return lineIsUnique(next, apply(opp, reply), reply, budget, memory);
    }

    function moveLabel(move) {
        if (!move || move.pass) return '不出';
        var name = RANK_NAME;
        function seq(len) {
            var parts = [];
            var i;
            for (i = 0; i < len; i += 1) parts.push(name[move.r + i]);
            return parts.join('');
        }
        if (move.t === 'single') return name[move.r];
        if (move.t === 'pair') return name[move.r] + name[move.r];
        if (move.t === 'triple') return name[move.r] + '×3';
        if (move.t === 'bomb') return '炸弹' + name[move.r];
        if (move.t === 'rocket') return '王炸';
        if (move.t === 'straight') return seq(move.n);
        if (move.t === 'pairseq') return seq(move.n) + '连对';
        if (move.t === 'plane') return seq(move.n) + '飞机';
        if (move.t === 'triple1') return name[move.r] + '×3带' + name[move.kick[0]];
        if (move.t === 'triple2') return name[move.r] + '×3带对' + name[move.kick[0]];
        if (move.t === 'plane1') return seq(move.n) + '带' + move.kick.map(function (rank) { return name[rank]; }).join('');
        if (move.t === 'plane2') return seq(move.n) + '带对' + move.kick.map(function (rank) { return name[rank]; }).join('');
        return move.t;
    }

    function cardsText(counts) {
        var parts = [];
        var r;
        var i;
        for (r = 14; r >= 0; r -= 1) {
            for (i = 0; i < counts[r]; i += 1) parts.push(RANK_NAME[r]);
        }
        return parts.join(' ');
    }

    function sameCards(move, selectedCounts) {
        if (!move || move.pass) return sum(selectedCounts) === 0;
        if (sum(selectedCounts) !== move.cards.length) return false;
        var need = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var i;
        move.cards.forEach(function (rank) { need[rank] += 1; });
        for (i = 0; i < 15; i += 1) {
            if ((selectedCounts[i] || 0) !== need[i]) return false;
        }
        return true;
    }

    root.Doudizhu = {
        RANK_NAME: RANK_NAME,
        generateMoves: generateMoves,
        legalMoves: legalMoves,
        beats: beats,
        apply: apply,
        sum: sum,
        canForce: canForce,
        winningMoves: winningMoves,
        uniqueWinningMove: uniqueWinningMove,
        chooseMove: chooseMove,
        lineIsUnique: lineIsUnique,
        moveLabel: moveLabel,
        cardsText: cardsText,
        sameCards: sameCards,
        passMove: passMove
    };
}(typeof globalThis !== 'undefined' ? globalThis : this));
