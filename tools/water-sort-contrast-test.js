'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),css=fs.readFileSync(path.join(root,'game/assets/water-sort.css'),'utf8'),ui=fs.readFileSync(path.join(root,'game/js/water-sort.js'),'utf8');
function luminance(hex){return hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const pairs=[['main text','#233d43','#f6f3eb'],['muted copy','#52696c','#f6f3eb'],['stage labels','#52696c','#e7efeb'],['accent title','#9b4b36','#f6f3eb'],['error feedback','#9b3e2a','#f6f3eb'],['successful feedback','#2f6263','#f6f3eb'],['next-level button','#fffdf7','#2f6263']];
const paints=[...ui.matchAll(/paint:'(#[a-f0-9]{6})'/g)].map(m=>m[1]);assert.equal(paints.length,7);
for(const paint of paints)pairs.push(['liquid symbol '+paint,'#233d43',paint]);
for(const [name,ink,bg] of pairs){const ratio=contrast(ink,bg);assert(ratio>=4.5,`${name}: ${ratio.toFixed(2)}:1`);console.log(`${name}: ${ratio.toFixed(2)}:1`);}
assert(css.includes('.liquid-symbol{position:relative;z-index:2;opacity:1}'));assert(css.includes('color:#233d43;font-size:14px'));assert(css.includes('min-width:44px'));assert(css.includes('@media(prefers-reduced-motion:reduce)'));assert(css.includes('.feedback.error{color:#9b3e2a}'));
assert(!css.includes('preserve-3d'));assert(!css.includes('rotateX('));
assert.equal(new Set([...ui.matchAll(/symbol:'([^']+)'/g)].map(m=>m[1])).size,7,'every colour has a unique non-colour symbol');
console.log('water-sort contrast: all essential text and 7 liquid symbols pass 4.5:1; 44px hit target and reduced-motion contracts PASS');
