'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../game/assets/sum-ten.css'), 'utf8');
function luminance(hex) { const v = hex.match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; }
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
const textPairs = [
    ['primary text / paper', '343f32', 'f2eddf'], ['muted text / paper', '59624f', 'f2eddf'], ['muted text / darkest page gradient', '59624f', 'e5e9d6'], ['fruit number / apricot', '49351f', 'f5b66a'], ['fruit number / yellow pear', '49351f', 'e8cb7d'], ['fruit number / green pear', '49351f', 'd3dca3'], ['primary button', 'fff9ed', '365c39'], ['selection sum bubble', 'fff9ed', '734c22'], ['valid selection bubble', 'fff9ed', '234f32'], ['valid sum on page', '234f32', 'f2eddf'], ['last ten seconds', '8c3527', 'f2eddf'], ['rules and result secondary copy', '59624f', 'fff9ed'], ['result mark', '365c39', 'e5e9d6']
];
for (const [name, a, b] of textPairs) { const ratio = contrast(a, b); assert.ok(ratio >= 4.5, `${name}: ${ratio.toFixed(2)}:1`); assert.ok(css.includes('#' + a) && css.includes('#' + b)); console.log(`${name}: ${ratio.toFixed(2)}:1`); }
for (const [name, a, b] of [['selection border / board', '734c22', 'd8dec7'], ['valid border / board', '234f32', 'd8dec7'], ['focus / palest fruit', '734c22', 'd3dca3'], ['time fill / track', '365c39', 'cbd2bc']]) { const ratio = contrast(a, b); assert.ok(ratio >= 3, `${name}: ${ratio.toFixed(2)}:1`); console.log(`${name}: ${ratio.toFixed(2)}:1`); }
assert.match(css, /\.fruit\{[^}]*color:#49351f/); assert.match(css, /\.selection-box\{[^}]*border:3px solid #734c22/); assert.match(css, /\.selection-box\.valid\{border-color:#234f32/); assert.match(css, /button:focus-visible,a:focus-visible\{outline:3px solid #734c22/);
console.log('sum-ten contrast: 13 essential text pairs pass WCAG AA 4.5:1; 4 interaction/progress indicators pass 3:1. Decorative shadows and fruit leaves do not convey game state.');
