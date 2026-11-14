(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NetSession=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
function encode(board){return JSON.stringify({version:1,level:board.level,seed:board.seed,masks:board.masks,moves:board.moves,hintsLeft:board.hintsLeft});}
function restore(raw,engine){
 try{
  if(typeof raw!=='string'||raw.length>12000)return null;
  const data=JSON.parse(raw);
  if(data.version!==1||!Number.isInteger(data.level)||data.level<1||data.level>engine.LEVELS.length||!Number.isInteger(data.seed)||data.seed<0||data.seed>4294967295||!Number.isInteger(data.moves)||data.moves<0||data.moves>1000000||!Number.isInteger(data.hintsLeft)||data.hintsLeft<0||data.hintsLeft>3)return null;
  const board=engine.generateLevel(data.level,data.seed);
  if(!Array.isArray(data.masks)||data.masks.length!==board.masks.length||data.masks.some((mask,i)=>!Number.isInteger(mask)||![0,1,2,3].some(turn=>engine.rotate(board.initial[i],turn)===mask)))return null;
  board.masks=data.masks.slice();board.moves=data.moves;board.hintsLeft=data.hintsLeft;return board;
 }catch(_){return null;}
}
return {encode,restore};
});
