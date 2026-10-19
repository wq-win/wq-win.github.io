'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../game/assets/hanzi-battle.css'), 'utf8');
function luminance(hex) { const v = hex.match(/../g).map(s => parseInt(s, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4); return v[0] * .2126 + v[1] * .7152 + v[2] * .0722; }
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
const pairs = [
  ['primary ink / paper', '263d34', 'f2edde'], ['secondary ink / paper', '596553', 'f2edde'],
  ['guard glyph / card', '315b43', 'fffaf0'], ['fire glyph / card', '9f3f28', 'fffaf0'], ['troop glyph / card', '354f68', 'fffaf0'],
  ['march / red', 'fffaf0', 'a53e2d'], ['disabled march / green', 'fffaf0', '53644e'],
  ['enemy health / scene', '3a4f3d', 'd1dcc4'], ['lane labels / scene', '4e6048', 'd1dcc4'],
  ['battle hint / field footer', '495d40', 'e7eadb'], ['focus + selection / card', '8a5b18', 'fffaf0'],
  ['merge badge / gold', 'fffaf0', '8a5b18'], ['damage number / scene', '862f22', 'd1dcc4']
];
for (const [name, fg, bg] of pairs) { const ratio = contrast(fg, bg); assert(ratio >= 4.5, `${name}: ${ratio.toFixed(2)}:1`); assert(css.includes('#' + fg)); assert(css.includes('#' + bg)); console.log(`${name}: ${ratio.toFixed(2)}:1`); }
assert.match(css, /\.character\{[^}]*min-width:44px;min-height:44px/);
assert.match(css, /grid-template-rows:repeat\(3,minmax\(44px,1fr\)\)/);
assert.match(css, /\.controls>button\{min-height:44px/);
assert.match(css, /\.topbar \.icon-button\{[^}]*width:44px;height:44px/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.match(css, /:focus-visible/);
console.log('Hanzi Battle contrast: 13 essential text/color pairs pass 4.5:1; 44px board/control minimums and reduced-motion rules are present.');
