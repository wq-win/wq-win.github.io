'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('../game/js/yarn-engine.js');const css=fs.readFileSync('game/assets/yarn.css','utf8');
function luminance(hex){const c=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function ratio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function check(a,b,label){const r=ratio(a,b);assert(r>=4.5,`${label}: ${r.toFixed(2)}`);console.log(`✓ ${label}: ${r.toFixed(2)}:1`);}
assert(css.includes('.subtitle,.level-picker label,.scene-label,.scene-label b,.cloth-count,.loom-note,.bench-heading>p:last-child,.tray-caption,.progress-label,#status,.rules p,footer{color:#555b47}'));
assert(css.includes('color:#494b3d;background:#fffaf0'));assert(css.includes('.primary{background:#536c4e;color:#fffaf0}'));assert(css.includes('.lost #status{color:#834c38}'));
for(const bg of ['#e7e4d5','#e2e5d3','#ead7c4','#ece9d9','#f4eee2'])check('#555b47',bg,'Secondary text on '+bg);
check('#494b3d','#fffaf0','Color name solid paper tags');check('#fffaf0','#536c4e','Next-level button');check('#834c38','#ead7c4','Loss instructions');
for(const c of E.COLORS){check('#000000',c.hex,c.name+' symbol');const dark='#'+c.hex.slice(1).match(/../g).map(n=>Math.round(parseInt(n,16)*.9).toString(16).padStart(2,'0')).join('');check('#000000',dark,c.name+' symbol on dark weave');}
