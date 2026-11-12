'use strict';
(async()=>{
 const {Window}=await import('happy-dom'),fs=require('node:fs'),assert=require('node:assert/strict');
 function page(name,files,saved){const w=new Window({url:'http://localhost/game/'+name+'.html'});w.document.write(fs.readFileSync('game/'+name+'.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''));if(saved)w.localStorage.setItem('mylog-meadow-run-v1',saved);for(const file of files){let code=fs.readFileSync('game/js/'+file+'.js','utf8');if(file===name)code=code.replace(/\}\)\(\);\s*$/,'window.__session={get state(){return state;},get paused(){return typeof paused === "undefined"?false:paused;},render};})();');w.eval(code);}return w;}
 const files=['sheep-triple-engine','sheep-triple'];let w=page('sheep-triple',files),s=w.__session.state;
 for(const id of s.certificate.slice(0,12))w.document.querySelector('[data-id="'+id+'"]').click();
 w.document.getElementById('tool-undo').click();w.document.getElementById('tool-shuffle').click();
 const before=JSON.stringify(w.__session.state),saved=w.localStorage.getItem('mylog-meadow-run-v1');
 let resumed=page('sheep-triple',files,saved);assert.equal(JSON.stringify(resumed.__session.state),before);assert.match(resumed.document.getElementById('message').textContent,/已恢复/);
 let bad=page('sheep-triple',files,JSON.stringify({version:1,level:0,seed:1,previousLayout:null,steps:[['take',9999]]}));assert.equal(bad.__session.state.removed.length,0);
 await w.happyDOM.abort();await resumed.happyDOM.abort();await bad.happyDOM.abort();
 w=page('hanzi-battle',['hanzi-battle-levels','hanzi-battle-engine','hanzi-battle']);s=w.__session.state;s.phase='battle';w.__session.render();const pause=w.document.getElementById('pause-battle');assert.equal(pause.hidden,false);pause.click();assert.equal(w.__session.paused,true);assert.equal(pause.getAttribute('aria-pressed'),'true');const round=s.round;await new Promise(r=>setTimeout(r,300));assert.equal(s.round,round);pause.click();assert.equal(w.__session.paused,false);w.document.getElementById('restart').click();assert.equal(pause.hidden,true);await w.happyDOM.abort();
 console.log('PASS persistent meadow replay, invalid-save rejection, battle manual pause/resume/restart');
})();
