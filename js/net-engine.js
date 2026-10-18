/* Net: deterministic, dependency-free puzzle model; also available to Node tests. */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.NetEngine = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const DIRS = [{ bit: 1, opposite: 4, dx: 0, dy: -1 }, { bit: 2, opposite: 8, dx: 1, dy: 0 }, { bit: 4, opposite: 1, dx: 0, dy: 1 }, { bit: 8, opposite: 2, dx: -1, dy: 0 }];
    const LEVELS = Object.freeze(Array.from({ length: 20 }, (_, i) => Object.freeze({ level: i + 1, width: 5 + Math.floor(i / 2), height: 5 + Math.ceil(i / 2) })));
    function dimensions(size) { return typeof size === 'number' ? { width: size, height: size } : size; }
    function rng(seed) { let n = seed >>> 0; return function () { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function rotate(mask, turns = 1) { turns = ((turns % 4) + 4) % 4; while (turns--) mask = ((mask << 1) & 15) | (mask >> 3); return mask; }
    function neighbor(index, dir, size) { const { width, height } = dimensions(size); const x = index % width + dir.dx, y = Math.floor(index / width) + dir.dy; return x < 0 || y < 0 || x >= width || y >= height ? -1 : y * width + x; }
    function degree(mask) { return DIRS.reduce((sum, d) => sum + !!(mask & d.bit), 0); }
    function inspect(masks, size, source) {
        const { width, height } = dimensions(size);
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || masks.length !== width * height || source < 0 || source >= masks.length) throw new Error('Invalid board');
        const powered = new Set([source]), queue = [source]; let openEnds = 0;
        for (let head = 0; head < queue.length; head++) {
            const i = queue[head];
            DIRS.forEach(d => { const j = neighbor(i, d, size); if ((masks[i] & d.bit) && j >= 0 && (masks[j] & d.opposite) && !powered.has(j)) { powered.add(j); queue.push(j); } });
        }
        masks.forEach((mask, i) => DIRS.forEach(d => { if (mask & d.bit) { const j = neighbor(i, d, size); if (j < 0 || !(masks[j] & d.opposite)) openEnds++; } }));
        const terminals = masks.map((m, i) => degree(m) === 1 && i !== source ? i : -1).filter(i => i >= 0);
        return { powered, terminals, litTerminals: terminals.filter(i => powered.has(i)).length, openEnds, solved: powered.size === masks.length && openEnds === 0 };
    }
    function generate(size = 5, seed = Date.now()) {
        const { width, height } = dimensions(size);
        const config = LEVELS.find(l => l.width === width && l.height === height);
        if (!config) throw new Error('Unsupported size');
        const random = rng(seed), solution = Array(width * height).fill(0), source = Math.floor(height / 2) * width + Math.floor(width / 2), visited = new Set([source]), frontier = [];
        function extend(i) { DIRS.forEach(d => { const j = neighbor(i, d, size); if (j >= 0 && !visited.has(j)) frontier.push({ i, j, d }); }); }
        extend(source);
        while (frontier.length) { const k = Math.floor(random() * frontier.length), edge = frontier.splice(k, 1)[0]; if (visited.has(edge.j)) continue; solution[edge.i] |= edge.d.bit; solution[edge.j] |= edge.d.opposite; visited.add(edge.j); extend(edge.j); }
        const initial = solution.map(m => rotate(m, Math.floor(random() * 4)));
        if (inspect(initial, size, source).solved) { const i = initial.findIndex(m => rotate(m) !== m); initial[i] = rotate(initial[i]); }
        return { size: width, width, height, level: config.level, seed: seed >>> 0, source, solution, initial, masks: initial.slice(), moves: 0, hintsLeft: 3 };
    }
    function generateLevel(level = 1, seed = Date.now()) {
        if (!Number.isInteger(level) || level < 1 || level > LEVELS.length) throw new Error('Unsupported level');
        return generate(LEVELS[level - 1], seed);
    }
    function nextLevel(board, seed = Date.now()) {
        if (board.level >= LEVELS.length || !inspect(board.masks, board, board.source).solved) return null;
        return generateLevel(board.level + 1, seed);
    }
    function turn(board, index, direction = 1) { if (!Number.isInteger(index) || index < 0 || index >= board.masks.length || inspect(board.masks, board, board.source).solved) return false; board.masks[index] = rotate(board.masks[index], direction); board.moves++; return true; }
    function hint(board) {
        if (board.hintsLeft < 1 || inspect(board.masks, board, board.source).solved) return -1;
        const powered = inspect(board.masks, board, board.source).powered;
        let i = board.masks.findIndex((m, n) => m !== board.solution[n] && powered.has(n));
        if (i < 0) i = board.masks.findIndex((m, n) => m !== board.solution[n]);
        if (i < 0) return -1;
        board.masks[i] = board.solution[i]; board.hintsLeft--; board.moves++; return i;
    }
    function reset(board) { board.masks = board.initial.slice(); board.moves = 0; /* Hints are a per-board budget, including replays. */ }
    return { DIRS, LEVELS, generateLevel, nextLevel, rng, rotate, neighbor, degree, inspect, generate, turn, hint, reset };
}));
