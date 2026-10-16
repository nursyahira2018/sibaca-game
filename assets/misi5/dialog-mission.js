/* Mission 5 lives in one editable page; the map keeps its player and progress. */
(function(){
 'use strict';
 const previousRender=renderModal,previousClose=closeModal,root=document.getElementById('modalRoot');
 let missionFrame=null;
 const style=document.createElement('style');
 style.textContent='.m5-integrated{position:fixed;inset:0;z-index:10020;background:#053f63;display:flex;flex-direction:column}.m5-integrated-bar{height:48px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 16px;color:#fce6a0;background:#082e54;font:800 15px Nunito,Arial,sans-serif}.m5-integrated-close{border:2px solid #ffffff70;background:#ffffff18;color:white;border-radius:10px;min-height:35px;padding:5px 13px;font:800 14px Nunito,Arial,sans-serif;cursor:pointer}.m5-integrated iframe{border:0;width:100%;flex:1;min-height:0;background:#053f63}.m5-integrated-close:focus-visible{outline:3px solid #ffe080;outline-offset:2px}';
 document.head.append(style);
 renderModal=function(...args){
  if(modal?.id!=='jelly')return previousRender.apply(this,args);
  if(missionFrame?.isConnected)return;
  root.innerHTML='<section class="m5-integrated" role="dialog" aria-modal="true" aria-label="Misi 5 — Padang Obor-obor"><div class="m5-integrated-bar"><span>🪼 Misi 5 · Padang Obor-obor</span><button class="m5-integrated-close" id="m5ReturnMap" type="button">✕ Kembali ke peta</button></div><iframe id="m5DialogFrame" title="Pengembaraan Dialog — Misi 5" allow="microphone; autoplay" src="misi5-percubaan.html?embedded=1&amp;v=ali-audio-51842b3"></iframe></section>';
  missionFrame=document.getElementById('m5DialogFrame');
  missionFrame.src='misi5-percubaan.html?embedded=1&v=ali-audio-51842b3&t='+Date.now();
  document.getElementById('m5ReturnMap').onclick=()=>closeModal();
 };
 closeModal=function(...args){
  if(modal?.id==='jelly')missionFrame=null;
  return previousClose.apply(this,args);
 };
 window.addEventListener('message',event=>{
  if(event.origin!==window.location.origin||!missionFrame||event.source!==missionFrame.contentWindow||modal?.id!=='jelly')return;
  const data=event.data;if(!data||data.app!=='sibaca-misi5')return;
  if(data.type==='close'){closeModal();return}
  if(data.type==='completed'&&['pink','blue','purple','red'].includes(data.mode)){
   if(!completed.includes('jelly')){
    completed.push('jelly');
    try{localStorage.setItem(KEY,JSON.stringify(completed))}catch(_){}
    refresh();
   }
  }
 });
})();
