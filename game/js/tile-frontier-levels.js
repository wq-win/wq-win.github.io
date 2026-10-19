/* Hand-authored maps and executable victory certificates. Id = row * 5 + column. */
(function () {
    'use strict';
    const r = id => ({ type: 'reveal', id }), b = (id, building) => ({ type: 'build', id, building }), n = id => ({ type: 'recruit', id }), a = id => ({ type: 'attack', id });
    const levels = [
        { name: '林间第一旗', theme: '教学', camp: 22, wood: 2, troops: 0, budget: 8, forests: { 17: 3 }, outposts: { 12: 2 }, hint: '营地正北有林地，再向北是据点。先取木，在空地建兵营。', briefing: '翻开林地取木材，建好兵营再招兵。', solution: [r(17), r(12), r(21), b(21, 'barracks'), n(21), a(12)] },
        { name: '让森林生长', theme: '生产投资', camp: 22, wood: 7, troops: 0, budget: 17, forests: {}, outposts: { 2: 6 }, hint: '北端据点有 6 守军。这片平原没有现成林地，尽早建设伐木场。', briefing: '伐木场每 3 次后续有效行动产 1 木。', solution: [r(21), b(21, 'mill'), r(23), b(23, 'barracks'), n(23), r(17), r(12), r(7), n(23), r(2), r(16), r(11), r(6), r(1), n(23), a(2)] },
        { name: '两边的炊烟', theme: '两处分岔', camp: 22, wood: 3, troops: 2, budget: 14, forests: { 17: 2, 16: 2, 18: 2 }, outposts: { 11: 4, 13: 4 }, hint: '北侧三片林地各有 2 木，两个据点各有 4 守军。分兵前先算总兵力。', briefing: '兵力会在攻占时消耗，别忘了另一个据点。', solution: [r(21), b(21, 'barracks'), r(17), r(16), r(18), r(11), r(13), n(21), n(21), n(21), a(11), a(13)] },
        { name: '先过这道关', theme: '据点堵路', camp: 22, wood: 3, troops: 2, budget: 9, forests: { 12: 4 }, outposts: { 17: 2, 7: 4 }, hint: '正北的 2 兵关卡后藏着 4 木林地，再北是 4 兵据点。绕路会多花行动。', briefing: '敌方据点不会成为领地，攻占后才能向前翻格。', solution: [r(17), a(17), r(12), r(7), r(21), b(21, 'barracks'), n(21), n(21), a(7)] },
        { name: '木料的远近', theme: '投资取舍', camp: 22, wood: 6, troops: 0, budget: 14, forests: { 17: 2, 12: 2, 10: 2 }, outposts: { 2: 8 }, hint: '北路两片林地各有 2 木；西端还有 2 木。早建伐木场，或绕路采木？', briefing: '建筑也耗行动。越晚投资，留给产出的时间越少。', solution: [r(21), b(21, 'mill'), r(23), b(23, 'barracks'), r(17), n(23), r(12), n(23), r(7), r(2), n(23), n(23), a(2)] },
        { name: '三面旗归来', theme: '三据点综合', camp: 22, wood: 4, troops: 2, budget: 22, forests: { 17: 3, 16: 2, 18: 2, 7: 2 }, outposts: { 10: 4, 14: 4, 2: 4 }, hint: '西、东、北各有 4 兵据点。营地以北及两侧有林地，北岸还有最后 2 木。', briefing: '留好木材与行动，让三面旗帜都成为自己的颜色。', solution: [r(17), r(21), b(21, 'barracks'), n(21), n(21), r(16), n(21), r(11), r(10), a(10), r(18), n(21), r(13), r(14), a(14), r(12), r(7), n(21), r(2), a(2)] }
    ];
    if (typeof module === 'object' && module.exports) module.exports = levels;
    else window.TileFrontier.configure(levels);
}());
