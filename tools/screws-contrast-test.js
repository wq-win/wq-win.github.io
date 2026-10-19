'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync(require('node:path').join(__dirname,'../game/assets/screws.css'),'utf8');
function luminance(hex){const v=hex.match(/../g).map(s=>parseInt(s,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const pairs=[['secondary ink','6d5c48','eee5d6'],['board labels','634d34','e7c69a'],['symbols','fff8e4','493c2e'],['result button','fff8e9','466a57'],['tray title','68513b','eee5d6']];
for(const [name,fg,bg] of pairs){const ratio=contrast(fg,bg);assert.ok(ratio>=4.5,`${name}: ${ratio}`);console.log(`${name}: ${ratio.toFixed(2)}:1`);assert.ok(css.includes('#'+fg));assert.ok(css.includes('#'+bg));}
assert.match(css,/\.screw-symbol\{[^}]*background:#493c2e;color:#fff8e4/);
assert.match(css,/\.preview-dot\{background:#493c2e;color:#fff8e4/);
console.log('screws contrast: essential text, colored screw symbols, preview symbols and action labels pass WCAG AA normal text');
