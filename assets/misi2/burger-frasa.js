const BURGER_INTRO="assets/misi2/audio/intro-syahira.mp3";
// Speech recognition checks words; it is not a pronunciation or intonation score.
function createReadingCheck(onChange) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const normalize = text => String(text).normalize('NFKC').toLocaleLowerCase('ms-MY')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  let recognizer = null, timer = null, endingTimer = null, session = 0;
  let state = {phase:'idle', transcript:'', message:'Dengar contoh, kemudian tekan mikrofon dan baca frasa.'};
  const publish = patch => { state = {...state, ...patch}; onChange({...state}); };
  function dispose() {
    session++;
    clearTimeout(timer); clearTimeout(endingTimer);
    const old = recognizer; recognizer = null;
    if (old) { old.onstart = old.onresult = old.onerror = old.onend = null; try { old.abort(); } catch (_) {} }
  }
  function reset() {
    dispose();
    state = {phase:'idle', transcript:'', message:'Dengar contoh, kemudian tekan mikrofon dan baca frasa.'};
  }
  function start(target) {
    dispose();
    const expected = normalize(target), token = session;
    if (!Recognition) {
      publish({phase:'error',transcript:'',message:'Semakan suara tidak disokong di sini. Buka pautan game terus dalam Google Chrome dan cuba lagi.'});
      return;
    }
    if (!expected) { publish({phase:'error',transcript:'',message:'Frasa belum tersedia. Buka semula misi.'}); return; }
    let finalText = '', failed = false, ending = false;
    const active = () => token === session;
    const fail = message => {
      if (!active()) return;
      failed = true; clearTimeout(timer); clearTimeout(endingTimer);
      publish({phase:'error',message});
    };
    const finish = () => {
      if (!active() || failed) return;
      clearTimeout(timer); clearTimeout(endingTimer); recognizer = null;
      const matched = normalize(finalText) === expected;
      publish({phase:matched?'passed':'retry',transcript:finalText,
        message:matched?'Syabas! Perkataan yang dikesan sepadan dengan frasa. Kamu boleh hantar pesanan!':
          finalText?'Bacaan belum sepadan. Dengar contoh dan cuba baca sekali lagi.':'Suara belum dapat dikesan. Dekatkan mikrofon dan cuba lagi.'});
    };
    const end = () => {
      if (!active() || ending || failed) return;
      ending = true; clearTimeout(timer);
      publish({phase:'checking',message:'Sedang menyemak bacaan…'});
      try { recognizer.stop(); } catch (_) { fail('Mikrofon terhenti. Tekan mikrofon untuk mencuba semula.'); }
      endingTimer = setTimeout(() => {
        if (!active() || failed || !recognizer) return;
        dispose();
        publish({phase:'error',message:'Semakan mengambil masa terlalu lama. Semak Internet dan cuba lagi.'});
      }, 6000);
    };
    try {
      recognizer = new Recognition();
      recognizer.lang = 'ms-MY'; recognizer.continuous = false;
      recognizer.interimResults = false; recognizer.maxAlternatives = 1;
      recognizer.onstart = () => {
        if (!active()) return;
        publish({phase:'listening',message:'Saya sedang mendengar. Baca frasa pada skrin.'});
      };
      recognizer.onresult = event => {
        if (!active() || failed) return;
        const finals = [], interim = [];
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          (result.isFinal ? finals : interim).push(result[0].transcript);
        }
        // A short, single utterance uses the latest complete hypothesis.
        // Some mobile engines return 'baik', then 'baik hati' as cumulative results.
        // Joining those hypotheses would incorrectly produce 'baik baik hati'.
        if (finals.length) finalText = finals[finals.length - 1].trim();
        publish({transcript:finals.length ? finalText : (interim[interim.length - 1] || finalText)});
        // Only final results can unlock the activity. Interim guesses never pass.
        if (normalize(finalText).split(' ').length >= expected.split(' ').length && finalText) end();
      };
      recognizer.onerror = event => {
        if (!active()) return;
        const messages = {
          'not-allowed':'Mikrofon belum dibenarkan. Benarkan mikrofon pada tetapan pelayar, kemudian cuba lagi.',
          'service-not-allowed':'Perkhidmatan suara tidak dibenarkan. Cuba buka pautan terus dalam Chrome.',
          'audio-capture':'Mikrofon tidak ditemui. Semak sambungan mikrofon dan cuba lagi.',
          'network':'Sambungan semakan suara terganggu. Semak Internet dan cuba lagi.',
          'no-speech':'Suara belum dapat dikesan. Dekatkan mikrofon dan cuba lagi.',
          'language-not-supported':'Pelayar ini belum menyokong semakan Bahasa Melayu. Cuba Google Chrome.',
          'aborted':'Semakan terhenti. Tekan mikrofon untuk mencuba semula.'
        };
        fail(messages[event.error] || 'Bacaan belum dapat disemak. Cuba sekali lagi.');
      };
      recognizer.onend = finish;
      publish({phase:'starting',transcript:'',message:'Benarkan mikrofon jika diminta. Bersedia untuk membaca…'});
      recognizer.start();
      timer = setTimeout(end, 18000);
    } catch (_) { fail('Mikrofon tidak dapat dimulakan. Tutup aplikasi yang menggunakan mikrofon dan cuba lagi.'); }
    return end;
  }
  return {start,reset,dispose,get state(){return {...state};},get supported(){return !!Recognition;}};
}

(function(){
const priorRender=renderModal,priorClose=closeModal;let order=-1,filled=false,hasRead=false,paused=false,muted=false,busy=false,feedback='',voice=null,drag=null,introStarted=false;
const intro='Selamat datang ke Dapur Burger Frasa! Saya Encik Krabs. Bantu saya menyiapkan lima pesanan. Cari bahan yang melengkapkan frasa, kemudian seret bahan itu ke atas roti. Baca frasa dengan kuat. Selepas itu, hantar burger kepada pelanggan!';
function stop(){voice?.pause();voice=null;window.speechSynthesis?.cancel()}
function say(key){stop();if(muted)return;const clip=new Audio(key==='intro'?BURGER_INTRO:'assets/misi2/audio/'+key+'.mp3');voice=clip;clip.play().then(()=>{if(voice!==clip||modal?.id!=='krusty'||muted)clip.pause()}).catch(()=>{if(voice!==clip||modal?.id!=='krusty')return;const e=document.getElementById('bfVoiceStatus');if(e)e.textContent='Tekan Dengar sekali lagi untuk memainkan suara.'})}
function fx(kind){if(!muted)kitchenSound(kind)}
const readingCheck=createReadingCheck(state=>{
  hasRead=state.phase==='passed';
  if(modal?.id!=='krusty')return;
  if(hasRead)draw();else updateReadingUI();
});
let stopReading=null;
function updateReadingUI(){
 const state=readingCheck.state,btn=document.getElementById('bfRecord'),status=document.getElementById('bfReadingStatus'),heard=document.getElementById('bfHeard'),listen=document.getElementById('bfListen');
 const active=['starting','listening','checking'].includes(state.phase);
 if(btn){btn.textContent=state.phase==='passed'?'✓ Bacaan disemak':state.phase==='starting'?'⏳ Membuka mikrofon…':state.phase==='listening'?'⏹️ Henti & semak':state.phase==='checking'?'⏳ Menyemak…':state.phase==='idle'?'🎙️ Rakam & semak bacaan':'🎙️ Cuba baca semula';btn.disabled=['starting','checking','passed'].includes(state.phase);btn.setAttribute('aria-pressed',String(active));}
 if(listen)listen.disabled=active;
 if(status){status.textContent=state.message;status.dataset.phase=state.phase;}
 if(heard)heard.textContent=state.transcript?'Yang didengar: “'+state.transcript+'”':'';
}
function reset(){readingCheck.reset();stopReading=null;filled=false;hasRead=false;busy=false;feedback=''}

function ingredient(word,i){const icons=['🥬','🧀','🍅'];return `<button class="bf-ingredient" draggable="true" data-bf-word="${safe(word)}" aria-label="Tambah bahan ${safe(word)} ke burger"><span class="bf-food">${icons[i%3]}</span><strong>${safe(word)}</strong></button>`}
function scene(){return `<div class="bf-scene"><div class="bf-sign">KRUSTY KRAB <small>DAPUR BURGER FRASA</small></div><div class="bf-chef"><img src="assets/misi2/encik-krabs.webp" alt="Encik Krabs menyambut chef kecil"><span>Encik Krabs</span></div><div class="bf-orders">${Array.from({length:5},(_,i)=>`<span class="${i<Math.max(0,order)?'bf-done':''}">${i<Math.max(0,order)?'🍔':'◯'}</span>`).join('')}</div><div class="bf-steam" aria-hidden="true">♨</div></div>`}
function draw(newPage=false){if(modal?.id!=='krusty')return;if(newPage)document.getElementById('modalRoot').dataset.resetScroll='true';const item=modal.items[order];let body='';
if(order<0)body=`<div class="bf-talk"><strong>🦀 Encik Krabs</strong><p>${intro}</p></div><div class="bf-actions"><button id="bfIntro">🔊 Dengar arahan</button><button class="bf-gold" id="bfStart">👨‍🍳 JOM MASAK!</button></div><p class="bf-note">Tiada had masa. Kamu boleh hentikan tali sawat bila-bila masa.</p>`;
else if(order>=modal.items.length)body='<div class="bf-talk"><div class="bf-trophy">🏆 🍔 ⭐</div><h2>Lima pesanan siap!</h2><p>Syabas, chef kecil! Kamu berjaya membina dan membaca lima frasa.</p></div><div class="bf-actions"><button class="bf-gold" id="bfFinish">KEMBALI KE PETA</button><button id="bfReplay">MAIN SEMULA</button></div>';
else body=`<div class="bf-ticket"><span>🧾 PESANAN ${order+1} / ${modal.items.length}</span><strong>${safe(item.first)} + ${filled?safe(item.answer):'?'}</strong><small>${filled?'Padanan lengkap!':'Cari bahan yang melengkapkan frasa.'}</small></div><div class="bf-workspace"><section class="bf-belt-side"><h3>1. Cari bahan pesanan</h3><div class="bf-conveyor ${paused||filled?'bf-paused':''}" id="bfConveyor"><div class="bf-belt-items">${item.options.map(ingredient).join('')}</div><div class="bf-rollers" aria-hidden="true"></div></div><button class="bf-pause" id="bfPause">${paused?'▶ Gerakkan tali sawat':'⏸ Hentikan tali sawat'}</button><p class="bf-note">Seret bahan ke roti. Kamu juga boleh tekan bahan untuk menambahnya.</p></section><section class="bf-grill-side"><h3>2. Siapkan burger</h3><div class="bf-drop ${filled?'bf-filled':''}" id="bfDrop" role="region" aria-label="Letakkan bahan pada burger"><div class="bf-burger"><div class="bf-bun bf-top">${filled?'':'?'}</div>${filled?'<div class="bf-lettuce"></div><div class="bf-cheese"></div><div class="bf-patty"></div>':''}<div class="bf-bun bf-bottom"></div></div><div class="bf-plate"></div><strong>${filled?safe(item.text):safe(item.first)+' + ?'}</strong><span>${filled?'🍔 Burger siap!':'Letakkan bahan di sini'}</span></div></section></div><p class="bf-feedback" role="status">${safe(feedback||'Cari perkataan yang sesuai pada bahan burger.')}</p>${filled?`<div class="bf-read-card"><h3>3. Baca frasa dengan kuat</h3><div class="bf-big-phrase">${safe(item.text)}</div><div class="bf-actions"><button id="bfListen">🔊 Dengar frasa</button><button class="bf-pink" id="bfRecord" aria-pressed="false">🎙️ Rakam & semak bacaan</button></div><p id="bfReadingStatus" class="bf-reading-status" role="status" aria-live="polite"></p><p id="bfHeard" class="bf-heard"></p><p class="bf-note">Benarkan mikrofon apabila diminta. Baca frasa selepas mikrofon dibuka.</p><details class="bf-voice-help"><summary>Panduan guru / mikrofon</summary><p>Buka pautan terus dalam Chrome dan gunakan Internet. Audio dihantar kepada perkhidmatan pengecaman suara pelayar; game ini tidak menyimpan fail rakaman. Semakan memadankan perkataan yang dikesan. Guru masih perlu menilai sebutan dan intonasi.</p></details>${hasRead?`<div class="bf-meaning"><strong>💡 Maksud</strong><p>${safe(item.meaning)}</p><button id="bfMeaning">🔊 Dengar maksud</button></div><div class="bf-actions"><button class="bf-gold" id="bfServe">🍔 HANTAR PESANAN</button></div>`:''}</div>`:''}`;
document.getElementById('modalRoot').innerHTML=`<div class="bf-overlay"><section class="bf-modal" role="dialog" aria-modal="true" aria-labelledby="bfTitle"><div class="bf-heading"><div><small>MISI 2 · KRUSTY KRAB</small><h2 id="bfTitle">Dapur Burger Frasa!</h2></div><div><button id="bfMute" aria-label="${muted?'Hidupkan':'Matikan'} bunyi">${muted?'🔇':'🔊'}</button><button id="bfClose" aria-label="Tutup misi">✕</button></div></div>${scene()}<main class="bf-content">${body}<p class="bf-note" id="bfVoiceStatus" role="status"></p></main></section></div>`;
const by=id=>document.getElementById(id);by('bfClose').onclick=closeModal;by('bfMute').onclick=()=>{muted=!muted;stop();draw()};if(by('bfIntro'))by('bfIntro').onclick=()=>say('intro');const start=()=>{stop();order=0;reset();fx('tap');draw(true)};if(by('bfStart'))by('bfStart').onclick=start;if(by('bfReplay'))by('bfReplay').onclick=start;if(by('bfFinish'))by('bfFinish').onclick=closeModal;if(by('bfPause'))by('bfPause').onclick=()=>{paused=!paused;fx('tap');by('bfConveyor').classList.toggle('bf-paused',paused);by('bfPause').textContent=paused?'▶ Gerakkan tali sawat':'⏸ Hentikan tali sawat'};
function add(word){if(filled||busy)return;if(word===item.answer){filled=true;feedback='Betul! Burger kamu sudah siap. Sekarang baca frasa!';fx('correct');draw();say('betul')}else{feedback='Bahan ini belum sesuai. Cuba bahan lain!';fx('retry');by('bfDrop').classList.remove('bf-shake');void by('bfDrop').offsetWidth;by('bfDrop').classList.add('bf-shake');document.querySelector('.bf-feedback').textContent=feedback;say('cuba-lagi')}}
document.querySelectorAll('[data-bf-word]').forEach(b=>{b.onclick=()=>add(b.dataset.bfWord);b.ondragstart=e=>{e.dataTransfer.setData('text/plain',b.dataset.bfWord);e.dataTransfer.effectAllowed='copy';by('bfConveyor').classList.add('bf-paused')};b.ondragend=()=>{if(by('bfConveyor')&&!paused&&!filled)by('bfConveyor').classList.remove('bf-paused')};b.onpointerdown=e=>{if(e.pointerType==='mouse'||filled)return;b.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,word:b.dataset.bfWord,moved:false,ghost:null};};b.onpointermove=e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){drag.moved=true;if(!drag.ghost){drag.ghost=b.cloneNode(true);drag.ghost.className='bf-drag-ghost';drag.ghost.removeAttribute('id');drag.ghost.setAttribute('aria-hidden','true');document.body.append(drag.ghost);by('bfConveyor').classList.add('bf-paused')}drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px'}};b.onpointerup=e=>{if(!drag)return;const d=drag;drag=null;d.ghost?.remove();if(d.moved){const r=by('bfDrop').getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)add(d.word);if(by('bfConveyor')&&!paused&&!filled)by('bfConveyor').classList.remove('bf-paused')}};b.onpointercancel=()=>{drag?.ghost?.remove();drag=null}});
if(by('bfDrop')){by('bfDrop').ondragover=e=>{e.preventDefault();by('bfDrop').classList.add('bf-hover')};by('bfDrop').ondragleave=()=>by('bfDrop').classList.remove('bf-hover');by('bfDrop').ondrop=e=>{e.preventDefault();add(e.dataTransfer.getData('text/plain'))}}if(by('bfListen'))by('bfListen').onclick=()=>say('frasa-'+(order+1));if(by('bfRecord'))by('bfRecord').onclick=()=>{if(readingCheck.state.phase==='listening'){stopReading?.();return}if(hasRead)return;stop();fx('tap');stopReading=readingCheck.start(item.text)};updateReadingUI();if(by('bfMeaning'))by('bfMeaning').onclick=()=>say('maksud-'+(order+1));if(by('bfServe'))by('bfServe').onclick=()=>{if(busy||!hasRead||readingCheck.state.phase!=='passed')return;busy=true;stop();by('bfServe').disabled=true;by('bfServe').textContent='🍔 Pesanan sedang dihantar…';document.querySelector('.bf-drop').classList.add('bf-serving');fx('correct');const servingOrder=order;setTimeout(()=>{if(modal?.id!=='krusty'||order!==servingOrder)return;order++;reset();if(order>=modal.items.length){if(!completed.includes('krusty')){completed.push('krusty');localStorage.setItem(KEY,JSON.stringify(completed));refresh()}fx('win');say('tamat')}draw(true)},750)};
}
renderModal=function(){if(modal?.id==='krusty'){draw();if(order<0&&!introStarted){introStarted=true;say('intro')}}else{introStarted=false;priorRender()}};closeModal=function(){if(modal?.id==='krusty'){introStarted=false;readingCheck.reset();stopReading=null;stop();drag?.ghost?.remove();drag=null;order=-1;reset()}priorClose()};
})();


// Keep each mission's viewport steady when its controls rebuild the dialog.
(function preserveMissionScroll() {
  const root = document.getElementById('modalRoot');
  const html = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (!root || !html || root.dataset.stableScroll) return;
  root.dataset.stableScroll = 'true';
  let revision = 0;
  const pageKey = () => {
    const progress = root.querySelector('.bf-ticket > span, .s3-progress, .g4-step, .maze-pill, .progress, .order-ticket');
    if (progress) return 'activity:' + (progress.textContent.match(/\d+/)?.[0] || progress.textContent.trim());
    if (root.querySelector('#bfStart, #s3Start, #g4Start, #mazeStart, #kstart, #start')) return 'intro';
    if (root.querySelector('#bfFinish, #s3Finish, #g4Finish, #mazeFinish, #kfinish, #finish')) return 'finish';
    return 'other';
  };
  Object.defineProperty(root, 'innerHTML', {
    configurable: true,
    get() { return html.get.call(this); },
    set(markup) {
      const version = ++revision;
      const mission = typeof modal !== 'undefined' && modal ? modal.id : null;
      const previousPage = pageKey();
      const resetScroll = this.dataset.resetScroll === 'true';
      delete this.dataset.resetScroll;
      const oldRootTop = this.scrollTop, oldRootLeft = this.scrollLeft;
      const nodes = Array.from(this.querySelectorAll('*'));
      const saved = nodes.filter(el => el.scrollTop || el.scrollLeft).map(el => ({
        id: el.id, classes: el.className, tag: el.tagName,
        index: nodes.filter(n => n.tagName === el.tagName && n.className === el.className).indexOf(el),
        top: el.scrollTop, left: el.scrollLeft
      }));
      const focusId = this.contains(document.activeElement) ? document.activeElement.id : '';
      html.set.call(this, markup);
      const samePage = !resetScroll && previousPage === pageKey();
      const restore = () => {
        if (version !== revision || !this.firstElementChild ||
            (typeof modal !== 'undefined' && modal ? modal.id : null) !== mission) return;
        const fresh = Array.from(this.querySelectorAll('*'));
        if (!samePage) {
          this.scrollTop = 0; this.scrollLeft = 0;
          fresh.forEach(el => { el.scrollTop = 0; el.scrollLeft = 0; });
          window.scrollTo({top:0,left:0,behavior:'instant'});
          return;
        }
        this.scrollTop = oldRootTop; this.scrollLeft = oldRootLeft;
        saved.forEach(state => {
          const el = state.id ? document.getElementById(state.id) :
            fresh.filter(n => n.tagName === state.tag && n.className === state.classes)[state.index];
          if (el && this.contains(el)) {
            el.scrollTop = state.top;
            el.scrollLeft = state.left;
          }
        });
      };
      if (samePage && focusId) {
        const control = document.getElementById(focusId);
        if (control && this.contains(control) && !control.disabled) control.focus({preventScroll: true});
      }
      restore();
      // Later mission wrappers may finish arranging their content in this frame.
      requestAnimationFrame(() => { restore(); if (!samePage) requestAnimationFrame(restore); });
    }
  });
})();

(function(){const style=document.createElement('style');style.textContent=`
.bf-reading-status{padding:16px;border-radius:18px;background:#e9f9fb;color:#16596a;font-weight:800;line-height:1.6}
.bf-reading-status[data-phase="passed"]{background:#e1f5d6;color:#285d20}
.bf-reading-status[data-phase="retry"],.bf-reading-status[data-phase="error"]{background:#fff0d6;color:#775016}
.bf-reading-status[data-phase="listening"]{background:#fff0f7;border:2px solid #e77caa}
.bf-heard{font-size:clamp(18px,2vw,25px);font-weight:800;overflow-wrap:anywhere}
.bf-voice-help{font-size:15px;line-height:1.6;text-align:left;margin:14px auto;max-width:720px}
.bf-voice-help summary{cursor:pointer;font-weight:800}#bfRecord:disabled,#bfListen:disabled{opacity:.65;cursor:default}
`;document.head.append(style)})();

