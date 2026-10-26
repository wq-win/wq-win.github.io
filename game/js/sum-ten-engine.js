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
    // A layout labels the cells removed by successive solver-verified rectangles.
    // Unlike disjoint domino patches, later groups cross holes made by earlier ones.
    // These 32 interleavings came from full-clear solution searches of mixed boards;
    // the numbers are remixed below, not copied from a fixed board catalogue.
    var LAYOUTS = [
        'AAAAFPBBBBFNEPCOFNEPCJMMDDCIHHDDCILLEKKJKMEGGGON',
        'CEFAANCEFAAMBEFAALBDDDDLBNMIIKBJGGGJCHHHIKCNNLKK',
        'BBIIMPBBCCCCELHFFFEDDADDELGAHNMKGAHKPJIAJJOLOAPN',
        'GDDDOOAAAELOAAAELNGFFHJKGGHCBBKIICBBLJJCBBONMCCM',
        'LAAAAIHGFFFIHGGBBPCCHBBMCCLOJMKKLNJOPDDDDOEEEENO',
        'IQNLFEAAAAFEHPKDDDBBBBFEHJJKLEIOGMMNIOGCCNPPGCCQ',
        'JJJMLMJICCCIQAAOKOPAAFKNBBBBHNHHDFGGEEDEEGPQDFLO',
        'ODPNNEIDFFFEIDJJKEGGGHBMMLKHBLCCCCBNOOPHBPAAAAAA',
        'JEEEGPJHGGFOIHAHFNIBAKFNIBAKLCJBAMLCPBMDDCPOODDC',
        'CBBCDOCBACDNHBAHDNONAKDMLIAIELGGAJEJGFAKELGFFKOM',
        'PBBBBCDDDPCCHGGPFFHOEEEANLOKFANJIJQAMLIKMANNOPQA',
        'MFEBABIFEBABIFEMAOCCFLANCCHJANMLGGAGNKHJDDOKHKDD',
        'MAAAAABIMLJMBIFLJCBDDDDCBKFKOCNEEEECHHFLNNHGGGOO',
        'OOKDQPONJDGGEEEDIIQMIAHHFLJALMFNJABPFNKABQCCCBBC',
        'DLLKLODFJEEEDFHIIOMFGGGNAAHJMBAAHKNBQQOCCBPPQCCB',
        'QMLCCCKJKHHDAAAAAAGGEIPDGFBBBBOFEIODQFEMPQNJLMNN',
        'BNGHEEBMFFHCBLGLPCBLGKOCNLGJJCAAAAAAPMIDDIPOKDDJ',
        'DAAAAADDBBHHEEBBEFJJNMFFIJKMCPIKKLCOLLGGCGPPNMCO',
        'AAJEEEAABFGOCBBFGMCBBFHMCCIMHLJJINNLJJJKKNOKDDDD',
        'CCCCDDLFHLDDKFGANOJFGAJBEEEAEBKHGAMBLHHAMBOIIONB',
        'OQPNNCMDLMNCODIGGCEDHHKQEEIFJBOKKFJBQLLFPBAAAAAB',
        'BABBBJHAGGHICACCIDKAOJIDKAMNIDNMENLLQFEFFPQPEOOP',
        'AALEMNAALDFJMCKDFJPCIDFIGCBEGGOOBEJHPPBKNHQQBLNH',
        'MLMMQQNFAIGPHFAHGODBABDDNBABCOKKCCCEKJJIJEQLPIPE',
        'JEDDEPIBCDELIBCDKLJBCJFOONMKFMAANGFOAANGGPAAHHHP',
        'DAAAADDDCBCDMOCBCOLNEBKKJJEBJKJHEHIGLIEFFGMNOFFG',
        'DDDNPQJEAJBQKEAMBMKEAHBOGFAGBGLFFHHILPONIIQPCCCC',
        'EBBBABEPHHAPEFKLAPLFJIAIMFJJAPMGCCCCNGKNOPOGDDDD',
        'NAGBNQMAGBIPLAHBHDKAJBIDFAFFJDKLLNNEMOOCCEMQPCCE',
        'KJEKKLLBBLFFCBBGAGCCCDADNIEDADHHINAOMJJMAMOOOOAO',
        'OLEEEFCGMFAFCGDIAOCKDHAKCLDHAONMDIANBBBBBNNJJIIJ',
        'BFDDDEAAAAEEBFFNHHBOMMHGBILCCGBIJCCGJIJLLNOLKKKO'
    ].map(function (layout) {
        var groups = [];
        for (var id = 0; id < layout.length; id++) { var group = layout.charCodeAt(id) - 65; (groups[group] || (groups[group] = [])).push(id); }
        return groups;
    });
    function neighbors(id) {
        var row = Math.floor(id / COLS), col = id % COLS, result = [];
        if (row) result.push(id - COLS); if (row < ROWS - 1) result.push(id + COLS);
        if (col) result.push(id - 1); if (col < COLS - 1) result.push(id + 1);
        return result;
    }
    function bounds(ids) {
        var rows = ids.map(function (id) { return Math.floor(id / COLS); }), cols = ids.map(function (id) { return id % COLS; });
        return { from: { row: Math.min.apply(null, rows), col: Math.min.apply(null, cols) }, to: { row: Math.max.apply(null, rows), col: Math.max.apply(null, cols) } };
    }
    function certifiedPuzzle(sample) {
        var groups = LAYOUTS[sample(LAYOUTS.length)], pairs = groups.filter(function (group) { return group.length === 2 && !neighbors(group[0]).includes(group[1]); });
        var pair = pairs[sample(pairs.length)], anchor = pair[sample(2)], buffer = neighbors(anchor), board = Array(ROWS * COLS).fill(0);
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            if (group === pair) { group.forEach(function (id) { board[id] = id === anchor ? 9 : 1; }); continue; }
            var total = 0;
            group.forEach(function (id) { board[id] = buffer.includes(id) ? 2 : 1; total += board[id]; });
            if (total > 10) return null;
            while (total++ < 10) board[group[sample(group.length)]]++;
        }
        // A 9 with no adjacent 1 cannot be collected by a dense rectangle. Every
        // complete solution must first make a hole and then span it; this remains
        // true under every number remix, not merely along our stored witness.
        var flipRows = sample(2), flipCols = sample(2);
        function transform(id) { var r = Math.floor(id / COLS), c = id % COLS; return (flipRows ? ROWS - 1 - r : r) * COLS + (flipCols ? COLS - 1 - c : c); }
        var output = Array(ROWS * COLS); board.forEach(function (n, id) { output[transform(id)] = n; });
        var path = groups.map(function (group) { return bounds(group.map(transform)); });
        // Replay the certificate before returning anything playable. This catches
        // corrupt layouts and ensures every random composition is actually clearable.
        var check = output.slice();
        for (var move of path) {
            var box = rectangle(check, move.from, move.to);
            if (!box.valid) return null;
            box.filled.forEach(function (id) { check[id] = 0; });
        }
        return check.every(function (n) { return n === 0; }) ? { board: output, path: path } : null;
    }
    function generatePuzzle(random) {
        random = random || Math.random;
        // Seed a local stream so even a constant injected RNG cannot get stuck in
        // rejection sampling. Generation is bounded and never searches during play.
        var seed = (Math.floor(Math.min(1, Math.max(0, random())) * 4294967295) ^ 0x9e3779b9) >>> 0;
        function sample(n) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n); }
        var puzzle = null, bestPenalty = Infinity;
        for (var attempt = 0; attempt < 64; attempt++) {
            var candidate = certifiedPuzzle(sample); if (!candidate) continue;
            var opening = legalRectangles(candidate.board), pairs = opening.filter(function (move) { return rectangle(candidate.board, move.from, move.to).filled.length === 2; }).length;
            var penalty = Math.max(0, 5 - opening.length) + Math.max(0, opening.length - 18) + 3 * Math.max(0, pairs - 4);
            if (penalty < bestPenalty) { bestPenalty = penalty; puzzle = candidate; }
            if (penalty === 0) return candidate;
        }
        // The bounded fallback is still replay-verified and retains the multi-number
        // and mandatory-gap invariants; only the opening-count preference may relax.
        if (puzzle) return puzzle;
        throw new Error('Could not build a certified sum-ten board');
    }
    function generate(random) { return generatePuzzle(random).board; }
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
    return Object.freeze({ ROWS: ROWS, COLS: COLS, DURATION: DURATION, create: create, generate: generate, generatePuzzle: generatePuzzle, start: start, remaining: remaining, settle: settle, select: select, rectangle: rectangle, legalRectangles: legalRectangles, visual: visual, logical: logical });
}));
