(function(root){'use strict';
root.WorkshopFeedback=function(button){let enabled=false,ctx;const key='workshop-sound-v1';try{enabled=localStorage.getItem(key)==='on';}catch(_){}
function label(){button.textContent=enabled?'音效：开':'音效：关';button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'关闭游戏音效':'开启游戏音效');}
function play(kind){if(!enabled)return;try{const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return;ctx=ctx||new Audio();if(ctx.state==='suspended')ctx.resume().catch(()=>{});const now=ctx.currentTime,notes=kind==='win'?[523,659,784]:kind==='match'?[440,660]:kind==='fall'?[180,120]:[320];notes.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=now+i*.075;o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.14);});}catch(_) {}}
button.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem(key,enabled?'on':'off');}catch(_){}label();if(enabled)play('match');});label();return{play};};
})(window);
