(function(){
'use strict';
const KEY='cozy-third-audio-v1';let muted=true,context;
try{muted=localStorage.getItem(KEY)!=='on';}catch(_){}
function tone(kind){if(muted)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context=context||new Audio();if(context.state==='suspended')context.resume().catch(()=>{});const start=context.currentTime;[kind==='win'?523:kind==='match'?660:440,kind==='win'?784:kind==='match'?880:550].forEach((hz,i)=>{const osc=context.createOscillator(),gain=context.createGain();osc.frequency.value=hz;gain.gain.setValueAtTime(0,start+i*.065);gain.gain.linearRampToValueAtTime(.045,start+i*.065+.01);gain.gain.exponentialRampToValueAtTime(.001,start+i*.065+.12);osc.connect(gain);gain.connect(context.destination);osc.start(start+i*.065);osc.stop(start+i*.065+.13);});}catch(_){} }
function attach(host){const b=document.createElement('button');b.type='button';b.className='cozy-sound';function render(){b.textContent=muted?'音效：关':'音效：开';b.setAttribute('aria-pressed',String(!muted));}b.addEventListener('click',()=>{muted=!muted;try{localStorage.setItem(KEY,muted?'off':'on');}catch(_){}render();tone('tap');});render();host.append(b);}
window.CozyThirdFeedback={tone,attach};
})();
