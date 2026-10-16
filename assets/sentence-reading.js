/* Shared Malay sentence reading check for Missions 3 and 4. No recordings are saved. */
(function(){
'use strict';
const normalize=t=>String(t).normalize('NFKC').toLocaleLowerCase('ms-MY').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
window.createSentenceReadingCheck=function(options){
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 let state={phase:'idle',transcript:'',message:'Dengar contoh, kemudian tekan mikrofon dan baca ayat.'},recognizer=null,deadline=null,restart=null,token=0,prefix='',target='',expected='',committed='',runText='',ending=false;
 const active=()=>['starting','listening','checking'].includes(state.phase);
 function detach(){clearTimeout(deadline);clearTimeout(restart);const old=recognizer;recognizer=null;if(old){old.onstart=old.onresult=old.onerror=old.onend=null;try{old.abort()}catch(_){}}}
 function reset(){token++;detach();ending=false;committed=runText='';state={phase:'idle',transcript:'',message:'Dengar contoh, kemudian tekan mikrofon dan baca ayat.'};update()}
 function publish(patch){state={...state,...patch};update()}
 function merge(a,b){if(!a)return b;if(!b)return a;const x=normalize(a),y=normalize(b);if(y===x||y.startsWith(x+' '))return b;return a+' '+b}
 function update(){
  const b=document.getElementById(prefix+'Record'),s=document.getElementById(prefix+'ReadingStatus'),h=document.getElementById(prefix+'Heard'),listen=document.getElementById(options.listenId);
  if(b){b.textContent=state.phase==='passed'?'✓ Bacaan disemak':state.phase==='starting'?'⏳ Membuka mikrofon…':state.phase==='listening'?'⏹️ Henti & semak':state.phase==='checking'?'⏳ Menyemak…':state.phase==='idle'?'🎙️ Rakam & semak bacaan':'🎙️ Cuba baca semula';b.disabled=['starting','checking','passed'].includes(state.phase);b.setAttribute('aria-pressed',String(active()))}
  if(listen)listen.disabled=active();for(const id of options.blockControls||[]){const el=document.getElementById(id);if(el)el.disabled=active()}if(s){s.textContent=state.message;s.dataset.phase=state.phase}if(h)h.textContent=state.transcript?'Yang didengar: “'+state.transcript+'”':'';
 }
 function finish(){
  const heard=merge(committed,runText),matched=normalize(heard)===expected;token++;detach();ending=false;
  publish({phase:matched?'passed':'retry',transcript:heard,message:matched?'Syabas! Bacaan sepadan dengan ayat. Kamu boleh teruskan aktiviti!':heard?'Bacaan belum sepadan. Dengar contoh dan cuba baca sekali lagi.':'Suara belum dapat dikesan. Dekatkan mikrofon dan cuba lagi.'});
  if(matched){if(!options.isMuted?.())window.SiBaCaCorrectSound?.play();options.onPassed()}
 }
 function fail(message){token++;detach();ending=false;publish({phase:'error',message})}
 function launch(id){
  if(id!==token)return;runText='';
  try{
   const r=new Recognition();recognizer=r;r.lang='ms-MY';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
   r.onstart=()=>{if(id===token)publish({phase:'listening',message:'Saya sedang mendengar. Baca semua ayat. Kamu boleh berhenti seketika pada tanda noktah.'})};
   r.onresult=e=>{
    if(id!==token)return;let finals='',interim='';
    for(let i=0;i<e.results.length;i++){const v=e.results[i];if(v.isFinal)finals=merge(finals,v[0].transcript.trim());else interim=merge(interim,v[0].transcript.trim())}
    runText=finals;const heard=merge(committed,runText);publish({transcript:merge(heard,interim)});
    // Only final words can pass; interim hypotheses never unlock an activity.
    if(normalize(heard)===expected)finish();
   };
   r.onerror=e=>{
    if(id!==token)return;
    if(e.error==='no-speech'){publish({message:'Mikrofon masih menunggu. Sambung bacaan apabila bersedia.'});return}
    const messages={'not-allowed':'Mikrofon belum dibenarkan. Benarkan mikrofon pada tetapan pelayar dan cuba lagi.','service-not-allowed':'Semakan suara tidak dibenarkan. Buka pautan terus dalam Google Chrome.','audio-capture':'Mikrofon tidak ditemui. Semak mikrofon dan cuba lagi.','network':'Sambungan semakan suara terganggu. Semak Internet dan cuba lagi.','language-not-supported':'Semakan Bahasa Melayu belum disokong di sini. Cuba Google Chrome.'};
    fail(messages[e.error]||'Semakan suara terhenti. Tekan mikrofon untuk mencuba semula.');
   };
   r.onend=()=>{
    if(id!==token)return;recognizer=null;
    if(ending){finish();return}
    // A browser may stop after a pause. Keep final words and resume listening.
    committed=merge(committed,runText);runText='';publish({phase:'listening',message:'Sambung bacaan ayat seterusnya. Tekan Henti & semak apabila selesai.'});restart=setTimeout(()=>launch(id),250);
   };
   r.start();
  }catch(_){fail('Mikrofon tidak dapat dimulakan. Tutup aplikasi yang menggunakan mikrofon dan cuba lagi.')}
 }
 function start(){
  reset();options.stopAudio();window.SiBaCaCorrectSound?.stop();expected=normalize(target);
  if(!Recognition){fail('Semakan suara tidak disokong di sini. Buka pautan game terus dalam Google Chrome dan cuba lagi.');return}
  if(!expected){fail('Ayat belum tersedia. Buka semula misi.');return}
  const id=token;publish({phase:'starting',transcript:'',message:'Benarkan mikrofon jika diminta. Bersedia untuk membaca…'});deadline=setTimeout(stop,90000);launch(id);
 }
 function stop(){if(!active())return;ending=true;clearTimeout(restart);clearTimeout(deadline);deadline=setTimeout(finish,6000);publish({phase:'checking',message:'Sedang menyemak bacaan…'});if(recognizer){try{recognizer.stop()}catch(_){finish()}}else finish()}
 function markup(id){return `<button class="sentence-record" id="${id}Record" type="button">🎙️ Rakam & semak bacaan</button>`}
 function feedback(id){return `<div class="sentence-check"><p id="${id}ReadingStatus" role="status" aria-live="polite"></p><p id="${id}Heard" class="sentence-heard"></p><small>Benarkan mikrofon apabila diminta. Baca semua ayat selepas mikrofon dibuka.</small><details><summary>Panduan guru / mikrofon</summary><p>Semakan membandingkan perkataan yang dikesan dengan ayat pada skrin. Guru menilai sebutan dan intonasi. Jika tidak disokong, buka pautan terus dalam Chrome. Suara tidak disimpan dalam game.</p></details></div>`}
 function mount(id,text){prefix=id;target=text;const b=document.getElementById(id+'Record');if(b)b.onclick=()=>{if(state.phase==='listening')stop();else if(!active()&&state.phase!=='passed')start()};update()}
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active())reset()});window.addEventListener('pagehide',()=>{if(active())reset()});
 return {reset,mount,markup,feedback,get state(){return {...state}}};
};
})();
