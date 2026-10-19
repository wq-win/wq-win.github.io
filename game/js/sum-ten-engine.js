(function (root, factory) {
    'use strict';
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SumTen = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    var ROWS = 8, COLS = 6, DURATION = 90000;
    function point(value) { return value && Number.isInteger(value.row) && Number.isInteger(value.col) && value.row >= 0 && value.row < ROWS && value.col >= 0 && value.col < COLS; }
    function validate(board) { return Array.isArray(board) && board.length === ROWS * COLS && board.every(function (n) { return Number.isInteger(n) && n >= 0 && n <= 9; }); }
    function rectangle(board, from, to) {
        if (!validate(board) || !point(from) || !point(to)) return null;
        var top = Math.min(from.row, to.row), bottom = Math.max(from.row, to.row), left = Math.min(from.col, to.col), right = Math.max(from.col, to.col), sum = 0, cells = [], filled = [];
        for (var r = top; r <= bottom; r++) for (var c = left; c <= right; c++) { var id = r * COLS + c; sum += board[id]; cells.push(id); if (board[id]) filled.push(id); }
        return { top: top, bottom: bottom, left: left, right: right, sum: sum, cells: cells, filled: filled, valid: sum === 10 };
    }
    function legalRectangles(board, limit) {
        if (!validate(board)) throw new TypeError('Expected 48 integers from 0 to 9');
        var prefix = Array.from({ length: ROWS + 1 }, function () { return Array(COLS + 1).fill(0); }), found = [];
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) prefix[r + 1][c + 1] = board[r * COLS + c] + prefix[r][c + 1] + prefix[r + 1][c] - prefix[r][c];
        for (var top = 0; top < ROWS; top++) for (var bottom = top; bottom < ROWS; bottom++) for (var left = 0; left < COLS; left++) for (var right = left; right < COLS; right++) {
            var sum = prefix[bottom + 1][right + 1] - prefix[top][right + 1] - prefix[bottom + 1][left] + prefix[top][left];
            if (sum === 10) { found.push({ from: { row: top, col: left }, to: { row: bottom, col: right } }); if (limit && found.length >= limit) return found; }
        }
        return found;
    }
    function generate(random) {
        random = random || Math.random;
        function sample(n) { return Math.min(n - 1, Math.max(0, Math.floor(random() * n))); }
        var board = Array(ROWS * COLS).fill(0);
        // Random horizontal/vertical dominoes in each 2×2 patch guarantee 24 opening moves.
        for (var r = 0; r < ROWS; r += 2) for (var c = 0; c < COLS; c += 2) {
            var a = 1 + sample(9), b = 1 + sample(9), i = r * COLS + c;
            if (sample(2)) { board[i] = a; board[i + 1] = 10 - a; board[i + COLS] = b; board[i + COLS + 1] = 10 - b; }
            else { board[i] = a; board[i + COLS] = 10 - a; board[i + 1] = b; board[i + COLS + 1] = 10 - b; }
        }
        return board;
    }
    function create(board) {
        board = board === undefined ? generate() : board;
        if (!validate(board)) throw new TypeError('Expected 48 integers from 0 to 9');
        return { board: board.slice(), score: 0, status: 'ready', startedAt: null, deadline: null, reason: null, endedAt: null };
    }
    function remaining(state, now) { return state.status === 'ready' ? DURATION : state.status === 'finished' ? Math.max(0, state.deadline - state.endedAt) : Math.max(0, state.deadline - now); }
    function settle(state, now) {
        if (state.status !== 'playing') return state;
        if (now >= state.deadline) return Object.assign({}, state, { status: 'finished', reason: 'time', endedAt: state.deadline });
        if (!legalRectangles(state.board, 1).length) return Object.assign({}, state, { status: 'finished', endedAt: now, reason: state.board.every(function (n) { return n === 0; }) ? 'cleared' : 'no-moves' });
        return state;
    }
    function start(state, now) {
        if (!Number.isFinite(now)) throw new TypeError('A finite timestamp is required');
        if (state.status !== 'ready') return state;
        return settle(Object.assign({}, state, { status: 'playing', startedAt: now, deadline: now + DURATION }), now);
    }
    function select(state, from, to, now) {
        state = settle(state, now);
        if (state.status !== 'playing') return { state: state, accepted: false, removed: [], rectangle: null };
        var box = rectangle(state.board, from, to);
        if (!box || !box.valid) return { state: state, accepted: false, removed: [], rectangle: box };
        var board = state.board.slice(); box.filled.forEach(function (id) { board[id] = 0; });
        state = settle(Object.assign({}, state, { board: board, score: state.score + box.filled.length }), now);
        return { state: state, accepted: true, removed: box.filled.slice(), rectangle: box };
    }
    function visual(pointValue, landscape) { return landscape ? { row: pointValue.col, col: pointValue.row } : { row: pointValue.row, col: pointValue.col }; }
    function logical(pointValue, landscape) { return landscape ? { row: pointValue.col, col: pointValue.row } : { row: pointValue.row, col: pointValue.col }; }
    return Object.freeze({ ROWS: ROWS, COLS: COLS, DURATION: DURATION, create: create, generate: generate, start: start, remaining: remaining, settle: settle, select: select, rectangle: rectangle, legalRectangles: legalRectangles, visual: visual, logical: logical });
}));
