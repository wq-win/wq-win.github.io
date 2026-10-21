/* 翻格筑城: deterministic rules, no DOM, timers or storage. */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.TileFrontier = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const SIZE = 5, COSTS = Object.freeze({ mill: 2, barracks: 3, recruit: 2 });
    let levels = [];
    function configure(data) { levels = data; return api; }
    function neighbors(id) {
        if (!Number.isInteger(id) || id < 0 || id >= 25) return [];
        const x = id % SIZE, y = Math.floor(id / SIZE), out = [];
        if (y) out.push(id - SIZE); if (x < SIZE - 1) out.push(id + 1);
        if (y < SIZE - 1) out.push(id + SIZE); if (x) out.push(id - 1);
        return out;
    }
    function create(index) {
        if (!Number.isInteger(index) || !levels[index]) throw new RangeError('Unknown level');
        const level = levels[index];
        const tiles = Array.from({ length: 25 }, (_, id) => ({ id, terrain: 'plain', revealed: false, owned: false, building: null, age: 0, guard: 0, wood: 0 }));
        Object.entries(level.forests || {}).forEach(([id, wood]) => Object.assign(tiles[Number(id)], { terrain: 'forest', wood }));
        Object.entries(level.outposts).forEach(([id, guard]) => Object.assign(tiles[Number(id)], { terrain: 'outpost', guard }));
        Object.assign(tiles[level.camp], { terrain: 'camp', revealed: true, owned: true });
        return { index, history: [], tiles, wood: level.wood, troops: level.troops, actions: 0, budget: level.budget, captured: 0, target: Object.keys(level.outposts).length, status: 'playing', endReason: null };
    }
    function adjacent(state, id) { return neighbors(id).some(n => state.tiles[n].owned); }
    function reason(state, action) {
        if (state.status !== 'playing') return '这一关已结束，请重新开始或前往下一关。';
        if (!action || !Number.isInteger(action.id) || !state.tiles[action.id]) return '请选择地图上的格子。';
        const tile = state.tiles[action.id];
        if (action.type === 'reveal') {
            if (tile.revealed) return '这块地已经翻开了。';
            if (!adjacent(state, tile.id)) return '只能翻开与己方领地上下左右相邻的格子。';
        } else if (action.type === 'build') {
            if (!['mill', 'barracks'].includes(action.building)) return '请选择伐木场或兵营。';
            if (!tile.owned || tile.terrain !== 'plain' || tile.building) return '建筑只能建在己方的空地上。';
            if (state.wood < COSTS[action.building]) return '木材不足，先寻找林地或等待伐木场产出。';
        } else if (action.type === 'recruit') {
            if (!tile.owned || tile.building !== 'barracks') return '请选择己方兵营招兵。';
            if (state.wood < COSTS.recruit) return '招兵需要 2 木材。';
        } else if (action.type === 'attack') {
            if (!tile.revealed || tile.terrain !== 'outpost' || tile.owned) return '请先翻开敌方据点。';
            if (!adjacent(state, tile.id)) return '需要相邻的己方领地才能攻占。';
            if (state.troops < tile.guard) return '兵力不足，攻占需要 ' + tile.guard + ' 兵。';
        } else return '无效操作。';
        return '';
    }
    function act(state, action) {
        const error = reason(state, action);
        if (error) return { ok: false, reason: error };
        const tile = state.tiles[action.id], result = { ok: true, type: action.type, id: tile.id, harvested: 0, produced: 0, producers: [], spentWood: 0, spentTroops: 0 };
        // Snapshot before the action: a new mill never ticks on its construction turn.
        const mills = state.tiles.filter(t => t.building === 'mill');
        if (action.type === 'reveal') {
            tile.revealed = true;
            if (tile.terrain !== 'outpost') tile.owned = true;
            if (tile.terrain === 'forest') { result.harvested = tile.wood; state.wood += tile.wood; }
        } else if (action.type === 'build') {
            tile.building = action.building; tile.age = 0;
            result.spentWood = COSTS[action.building]; state.wood -= result.spentWood;
        } else if (action.type === 'recruit') {
            result.spentWood = COSTS.recruit; state.wood -= result.spentWood; state.troops += 2;
        } else if (action.type === 'attack') {
            result.spentTroops = tile.guard; state.troops -= tile.guard; tile.owned = true; state.captured++;
        }
        state.history.push(action.type === 'build' ? { type: action.type, id: action.id, building: action.building } : { type: action.type, id: action.id });
        state.actions++;
        mills.forEach(mill => { mill.age++; if (mill.age === 3) { mill.age = 0; state.wood++; result.produced++; result.producers.push(mill.id); } });
        // The last available action may win; success takes precedence over the clock.
        if (state.captured === state.target) { state.status = 'won'; state.endReason = 'captured'; }
        else if (state.actions >= state.budget) { state.status = 'lost'; state.endReason = 'budget'; }
        else if (available(state).length === 0) { state.status = 'lost'; state.endReason = 'blocked'; }
        result.status = state.status;
        return result;
    }
    function available(state) {
        const out = [];
        if (state.status !== 'playing') return out;
        state.tiles.forEach(tile => {
            const candidates = !tile.revealed ? [{ type: 'reveal', id: tile.id }] : tile.terrain === 'outpost' && !tile.owned ? [{ type: 'attack', id: tile.id }] : tile.building === 'barracks' ? [{ type: 'recruit', id: tile.id }] : tile.owned && tile.terrain === 'plain' && !tile.building ? ['mill', 'barracks'].map(building => ({ type: 'build', id: tile.id, building })) : [];
            candidates.forEach(action => { if (!reason(state, action)) out.push(action); });
        });
        return out;
    }
    function solution(index) { return levels[index].solution.map(action => ({ ...action })); }
    function replay(index, actions) {
        const state = create(index), results = [];
        for (const action of actions || solution(index)) {
            const result = act(state, action); results.push(result);
            if (!result.ok) return { state, results, valid: false };
        }
        return { state, results, valid: true };
    }
    function save(state) { return { v: 1, index: state.index, history: state.history }; }
    function restore(raw) {
        try {
            const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!value || value.v !== 1 || !Number.isInteger(value.index) || !levels[value.index] || !Array.isArray(value.history) || value.history.length > levels[value.index].budget) return null;
            const replayed = replay(value.index, value.history);
            return replayed.valid ? replayed.state : null;
        } catch (_) { return null; }
    }
    const api = { save, restore, SIZE, COSTS, configure, create, neighbors, adjacent, reason, act, available, solution, replay, get levels() { return levels; } };
    return api;
}));
