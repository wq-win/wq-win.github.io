'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../game/assets/tile-frontier.css'), 'utf8');
function luminance(hex) { const values = hex.match(/../g).map(value => parseInt(value, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4); return values[0] * .2126 + values[1] * .7152 + values[2] * .0722; }
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
const textPairs = [
    ['primary text / page', '203d35', 'edf1e4'],
    ['secondary text / page', '526258', 'edf1e4'],
    ['secondary text / deepest page gradient', '526258', 'd7e1c9'],
    ['selected tile caption', '203d35', 'f4f2d9'],
    ['enemy guard number', 'fff8e8', '623b2f'],
    ['owned flag and primary action', 'fff8e8', '315b48'],
    ['disabled action label', '526258', 'e0e5d7'],
    ['selection description', '526258', 'f8f8ec'],
    ['rules and result text', '526258', 'fbfaef'],
    ['rules hint', '203d35', 'e8eddc']
];
for (const [name, foreground, background] of textPairs) { const ratio = contrast(foreground, background); assert.ok(ratio >= 4.5, `${name}: ${ratio.toFixed(2)}:1`); assert.ok(css.includes('#' + foreground)); assert.ok(css.includes('#' + background)); console.log(`${name}: ${ratio.toFixed(2)}:1`); }
const nonTextPairs = [['reachable tile border', '203d35', '91a68a'], ['selected border / reachable fog', '594219', '91a68a'], ['keyboard focus / page', '825512', 'edf1e4'], ['mill progress dots', '315b48', 'f4f2d9']];
for (const [name, foreground, background] of nonTextPairs) { const ratio = contrast(foreground, background); assert.ok(ratio >= 3, `${name}: ${ratio.toFixed(2)}:1`); console.log(`${name}: ${ratio.toFixed(2)}:1`); }
assert.match(css, /\.tile\.reachable::after\{border-color:#203d35/); assert.match(css, /\.tile\.selected::after\{border:3px solid #594219/); assert.match(css, /\.tile-badge\{[^}]*background:#623b2f;color:#fff8e8/);
console.log('tile-frontier contrast: 10 essential text pairs pass WCAG AA 4.5:1; 4 interaction/progress indicators pass 3:1. Decorative illustrations are not treated as text.');
