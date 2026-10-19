(function (root) {
  'use strict';
  // Every expedition has a fixed supply. Only the six recipes in the engine exist.
  const levels = [
    {
      id: 1, title: '一字成阵', subtitle: '单路合成', lesson: '把同类基础字合成，再派往敌人所在的一路。',
      materials: ['木', '木', '木', '火', '火', '人', '人', '人'], gateHp: 12,
      enemies: [null, { name: '前哨', glyph: '卒', hp: 34, attack: 7, armor: 0 }, null],
      hint: '木＋木＝林，林＋木＝森。中路护卫能保护城门。'
    },
    {
      id: 2, title: '两路来敌', subtitle: '双路分配', lesson: '两路同时来敌，空着的一路会直接攻击城门。',
      materials: ['木', '木', '木', '火', '火', '火', '人', '人'], gateHp: 18,
      enemies: [{ name: '重卒', glyph: '卒', hp: 42, attack: 8, armor: 0 }, null, { name: '游骑', glyph: '骑', hp: 34, attack: 7, armor: 0 }],
      hint: '把合成后的两支主力分到左右两路；中路可以支援。'
    },
    {
      id: 3, title: '三路守望', subtitle: '三路铺开', lesson: '即使是基础字也能出征，先守住每一路。',
      materials: ['木', '木', '木', '火', '火', '火', '人', '人', '人'], gateHp: 10,
      enemies: [{ name: '左卫', glyph: '卒', hp: 31, attack: 6, armor: 0 }, { name: '中卫', glyph: '卒', hp: 40, attack: 7, armor: 0 }, { name: '右卫', glyph: '卒', hp: 31, attack: 6, armor: 0 }],
      hint: '留好三路兵力，木、火、人各有擅长。'
    },
    {
      id: 4, title: '森立如盾', subtitle: '护卫承伤', lesson: '护卫的护甲能减少每次伤害，适合迎接强敌。',
      materials: ['木', '木', '木', '火', '火', '火', '人', '人', '人'], gateHp: 12,
      enemies: [null, { name: '破阵将', glyph: '将', hp: 166, attack: 14, armor: 1 }, null],
      hint: '让森站在强敌所在的中路，两侧输出可支援中路。'
    },
    {
      id: 5, title: '焱火连营', subtitle: '火兵溅射', lesson: '火兵会同时伤及主目标相邻路的敌人。',
      materials: ['火', '火', '火', '木', '木', '木', '人', '人', '人'], gateHp: 8,
      enemies: [{ name: '盾卒', glyph: '盾', hp: 78, attack: 8, armor: 1 }, { name: '密阵', glyph: '阵', hp: 55, attack: 6, armor: 0 }, { name: '盾卒', glyph: '盾', hp: 78, attack: 8, armor: 1 }],
      hint: '把火兵放在中路，可以让溅射同时覆盖左右两路。'
    },
    {
      id: 6, title: '合字出征', subtitle: '综合布阵', lesson: '观察敌人强弱，组合护卫、火兵和战兵的分工。',
      materials: ['木', '木', '木', '木', '火', '火', '火', '火', '人', '人', '人', '人'], gateHp: 14,
      enemies: [{ name: '铁卫', glyph: '卫', hp: 78, attack: 13, armor: 2 }, { name: '弓阵', glyph: '弓', hp: 52, attack: 7, armor: 0 }, { name: '突骑', glyph: '骑', hp: 60, attack: 9, armor: 1 }],
      hint: '左路先稳住铁卫；中路火兵能兼顾两侧，右路需要均衡战力。'
    }
  ];
  levels.forEach(level => {
    level.materials = Object.freeze(level.materials);
    level.enemies.forEach(enemy => { if (enemy) Object.freeze(enemy); });
    Object.freeze(level.enemies);
    Object.freeze(level);
  });
  Object.freeze(levels);
  if (typeof module !== 'undefined' && module.exports) module.exports = levels;
  else root.HanziBattleLevels = levels;
})(typeof window !== 'undefined' ? window : globalThis);
