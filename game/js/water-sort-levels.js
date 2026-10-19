(function (root) {
'use strict';
// Hand-selected fixed puzzles. Each array is bottom → top; empty arrays are spare bottles.
const LEVELS = [
  {name:'初见微光',colors:3,bottles:[[0,0,1,1],[1,1,2,2],[2,2,0,0],[],[]]},
  {name:'莓果气泡',colors:3,bottles:[[1,0,0,2],[0,1,1,2],[2,0,1,2],[],[]]},
  {name:'海盐薄荷',colors:4,bottles:[[0,0,2,1],[0,0,3,2],[1,2,3,2],[3,1,1,3],[],[]]},
  {name:'落日切片',colors:4,bottles:[[1,0,3,1],[0,1,3,2],[2,0,3,3],[1,2,0,2],[],[]]},
  {name:'花园来信',colors:5,bottles:[[0,1,1,4],[1,2,3,2],[0,3,3,3],[0,4,2,1],[4,2,4,0],[],[]]},
  {name:'雨后彩窗',colors:5,bottles:[[3,0,3,2],[2,1,1,3],[0,0,3,4],[4,2,1,4],[0,2,4,1],[],[]]},
  {name:'暮色流转',colors:6,bottles:[[1,5,2,3],[4,4,1,2],[5,0,2,3],[0,3,1,1],[4,2,0,5],[5,0,4,3],[],[]]},
  {name:'收集彩虹',colors:7,bottles:[[0,1,6,5],[1,5,2,2],[0,1,5,3],[3,6,4,1],[2,0,4,6],[2,0,4,3],[3,5,6,4],[],[]]}
];
LEVELS.forEach(level=>{level.bottles.forEach(Object.freeze);Object.freeze(level.bottles);Object.freeze(level);});
Object.freeze(LEVELS);
if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS; else root.WaterSortLevels = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);
