(function(){
 'use strict';
 const query=document.getElementById('glossary-filter'),series=document.getElementById('reference-series'),view=document.getElementById('reference-view');if(!query||!series||!view)return;
 const cards=[...document.querySelectorAll('[data-reference]')],count=document.getElementById('reference-count'),empty=document.getElementById('reference-empty');
 const valid=(select,value)=>[...select.options].some(o=>o.value===value);
 function restore(){const params=new URLSearchParams(location.search);query.value=params.get('q')||'';series.value=valid(series,params.get('series'))?params.get('series'):'all';view.value=valid(view,params.get('view'))?params.get('view'):'terms';}
 function apply(update){const q=query.value.trim().toLocaleLowerCase();let found=0;for(const card of cards){const show=(series.value==='all'||card.dataset.series.split(' ').includes(series.value))&&(view.value==='all'||card.dataset.reference===view.value)&&(!q||card.textContent.toLocaleLowerCase().includes(q));card.hidden=!show;if(show)found++;}count.textContent=`找到 ${found} 项`;empty.hidden=found>0;
  if(update){const url=new URL(location.href);url.search='';if(series.value!=='all')url.searchParams.set('series',series.value);if(view.value!=='terms')url.searchParams.set('view',view.value);if(q)url.searchParams.set('q',query.value.trim());history.replaceState(null,'',url);}}
 function revealHash(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch(e){return;}const target=document.getElementById(id);if(!target||!target.dataset.reference)return;if(target.hidden){query.value='';view.value=target.dataset.reference;const scopes=target.dataset.series.split(' ');if(series.value!=='all'&&!scopes.includes(series.value))series.value='all';apply(true);}target.scrollIntoView({block:'start'});}
 restore();apply(false);revealHash();query.addEventListener('input',()=>apply(true));series.addEventListener('change',()=>apply(true));view.addEventListener('change',()=>apply(true));window.addEventListener('hashchange',revealHash);window.addEventListener('popstate',()=>{restore();apply(false);revealHash();});
})();
