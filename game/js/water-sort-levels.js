(function (root) {
'use strict';
// Bottom → top. Two spare bottles remain available on every board.
// Revision 2: no pair-layer tutorial boards. Mixed 5–7-colour puzzles were
// selected by exhaustive state-graph checks, not by a long random shuffle.
// Minimum pours: 16, 17, 19, 20, 21, 22, 23, 24. Each board also has reachable
// losing branches, so consuming spare capacity without planning can matter.
// tools/water-sort-test.js independently verifies these properties.
const LEVELS = [
  {name:'先留余地',colors:5,bottles:[[1,0,4,2],[2,4,3,0],[1,1,4,3],[2,0,0,3],[2,1,3,4],[],[]]},
  {name:'莓果交错',colors:5,bottles:[[4,3,1,3],[4,0,2,0],[4,2,0,3],[4,2,1,1],[1,0,2,3],[],[]]},
  {name:'海盐回旋',colors:6,bottles:[[5,4,2,0],[2,4,2,5],[3,3,0,1],[3,1,5,0],[3,1,2,4],[1,4,5,0],[],[]]},
  {name:'落日折返',colors:6,bottles:[[0,5,4,1],[5,2,5,3],[0,4,4,2],[3,0,4,3],[2,1,3,1],[0,1,5,2],[],[]]},
  {name:'花园迷径',colors:6,bottles:[[1,5,1,3],[3,2,5,1],[0,4,1,0],[2,4,5,4],[2,3,5,4],[0,3,2,0],[],[]]},
  {name:'雨后彩窗',colors:6,bottles:[[4,0,0,5],[4,1,0,5],[2,3,1,2],[2,0,4,2],[5,1,3,5],[4,3,1,3],[],[]]},
  {name:'暮色流转',colors:7,bottles:[[4,1,1,2],[5,6,3,0],[0,3,5,2],[0,3,6,6],[5,4,3,1],[5,1,4,2],[2,4,0,6],[],[]]},
  {name:'收集彩虹',colors:7,bottles:[[5,0,6,3],[0,2,5,0],[0,4,3,5],[1,3,6,1],[3,6,2,4],[1,6,5,2],[1,4,2,4],[],[]]}
];
LEVELS.forEach(level=>{level.bottles.forEach(Object.freeze);Object.freeze(level.bottles);Object.freeze(level);});
Object.freeze(LEVELS);
if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS; else root.WaterSortLevels = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);
