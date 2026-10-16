/* Fail audio Bahasa Melayu Malaysia; bacaan tidak bergantung pada suara pelayar. */
(() => {
  'use strict';
  const root = document.getElementById('modalRoot');
  const priorRender = renderModal, priorClose = closeModal;
  let active = null, cheer = null, session = 0, release = null, previousStep = null;
  const inMission = () => modal?.id === 'patrick';
  function status(message) {
    const target = document.getElementById('patVoiceStatus');
    if (target) target.textContent = message;
  }
  function stop() {
    session++;
    if (cheer) { cheer.pause(); cheer.currentTime = 0; cheer = null; }
    if (active) { active.pause(); active.onended = null; active.onerror = null; active = null; }
    if (release) { const resolve = release; release = null; resolve(); }
    if (inMission()) window.speechSynthesis?.cancel();
  }
  function playCheer(token) {
    const effect = new Audio('assets/misi1/audio/kids-cheering.mp3');
    effect.volume = 0.25;
    cheer = effect;
    effect.onended = () => { if (cheer === effect) cheer = null; };
    Promise.resolve(effect.play()).then(() => {
      if (token !== session || !inMission() || document.hidden) effect.pause();
    }).catch(() => {});
  }
  async function say(keys) {
    stop();
    const token = session;
    for (const key of keys) {
      if (token !== session || !inMission() || document.hidden) return;
      const clip = new Audio('assets/misi1/audio/' + key + '.mp3');
      active = clip;
      status('');
      let failed = false;
      await new Promise(resolve => {
        release = resolve;
        const done = () => { if (release === resolve) release = null; resolve(); };
        clip.onended = done;
        clip.onerror = () => { failed = true; status('Audio belum dapat dimainkan. Tekan butang dengar untuk cuba semula.'); done(); };
        Promise.resolve(clip.play()).then(() => {
          if (token !== session || !inMission() || document.hidden) { clip.pause(); done(); }
          else if (key === 'tamat') playCheer(token);
        }).catch(() => { failed = true; if (token === session) status('Tekan butang dengar untuk memainkan audio.'); done(); });
      });
      if (active === clip) active = null;
      if (failed) return;
    }
  }

  let checkedStep = null, stopReading = null;
  const readingCheck = createReadingCheck(() => updateReadingUI());
  const checking = () => ['starting', 'listening', 'checking'].includes(readingCheck.state.phase);
  function resetReading() {
    readingCheck.reset();
    stopReading = null;
    checkedStep = null;
  }
  function updateReadingUI() {
    if (!inMission()) return;
    const state = readingCheck.state, busy = checking();
    const record = document.getElementById('record');
    const next = document.getElementById('next');
    const listen = document.getElementById('listen');
    const instructions = document.getElementById('patHearInstructions');
    const message = document.getElementById('recstatus');
    const heard = document.getElementById('patHeard');
    if (record) {
      record.textContent = state.phase === 'passed' ? '✓ Bacaan disemak' :
        state.phase === 'starting' ? '⏳ Membuka mikrofon…' :
        state.phase === 'listening' ? '⏹️ Henti & semak' :
        state.phase === 'checking' ? '⏳ Menyemak…' :
        state.phase === 'idle' ? '🎙️ Rakam & semak bacaan' : '🎙️ Cuba baca semula';
      record.disabled = ['starting', 'checking', 'passed'].includes(state.phase);
      record.setAttribute('aria-pressed', String(busy));
    }
    if (listen) listen.disabled = busy;
    if (instructions) instructions.disabled = busy;
    if (next) next.disabled = state.phase !== 'passed';
    if (message) {
      message.textContent = state.phase === 'passed' ?
        'Syabas! Perkataan yang dikesan sepadan. Kamu boleh teruskan!' :
        state.message.replace(/frasa/gi, 'perkataan');
      message.dataset.phase = state.phase;
    }
    if (heard) heard.textContent = state.transcript ? 'Yang didengar: “' + state.transcript + '”' : '';
  }
  function mountReadingCheck(board) {
    if (step < 0 || step >= modal.items.length) { resetReading(); return; }
    if (checkedStep !== step) {
      resetReading();
      checkedStep = step;
    }
    const selfcheck = document.getElementById('selfcheck');
    selfcheck?.closest('label')?.remove();
    document.getElementById('play')?.remove();
    const message = document.getElementById('recstatus');
    if (message) {
      message.classList.add('bf-reading-status');
      message.setAttribute('role', 'status');
      message.setAttribute('aria-live', 'polite');
      const heard = document.createElement('p');
      heard.id = 'patHeard'; heard.className = 'bf-heard';
      message.after(heard);
      const help = document.createElement('details');
      help.className = 'bf-voice-help';
      help.innerHTML = '<summary>Panduan guru / mikrofon</summary><p>Buka pautan terus dalam Chrome dan gunakan Internet. Audio dihantar kepada perkhidmatan pengecaman suara pelayar; game ini tidak menyimpan fail rakaman. Semakan memadankan perkataan yang dikesan. Guru masih perlu menilai sebutan dan intonasi.</p>';
      heard.after(help);
    }
    const record = document.getElementById('record');
    if (record) record.onclick = () => {
      if (!inMission() || checkedStep !== step) return;
      if (readingCheck.state.phase === 'listening') { stopReading?.(); return; }
      if (readingCheck.state.phase === 'passed' || checking()) return;
      stop();
      stopReading = readingCheck.start(modal.items[step].text);
    };
    const next = document.getElementById('next');
    if (next) {
      const advance = next.onclick, currentStep = step;
      next.onclick = event => {
        if (!inMission() || step !== currentStep || checkedStep !== step || readingCheck.state.phase !== 'passed') return;
        resetReading();
        advance?.call(next, event);
      };
    }
    updateReadingUI();
  }

  function instructionKey() {
    return step < 0 ? 'intro' : step >= modal.items.length ? 'tamat' : 'arahan-semak';
  }
  function mount() {
    const board = root.querySelector('.pat-board');
    if (!board) return;
    const controls = document.createElement('div');
    controls.id = 'patAudioControls';
    controls.className = 'actions';
    const replay = document.createElement('button');
    replay.type = 'button'; replay.className = 'btn'; replay.id = 'patHearInstructions';
    replay.textContent = step < 0 ? '🔊 Dengar sambutan' : step >= modal.items.length ? '🔊 Dengar ucapan' : '🔊 Dengar arahan';
    replay.onclick = () => say([instructionKey()]);
    controls.append(replay);
    const speech = board.querySelector('.speech');
    if (speech) speech.after(controls); else board.append(controls);
    const message = document.createElement('p');
    message.id = 'patVoiceStatus'; message.className = 'recording'; message.setAttribute('role', 'status');
    controls.after(message);
    const listen = document.getElementById('listen');
    if (listen) listen.onclick = () => {
      const word = modal.items[step]?.text;
      if (['hati', 'tulang', 'tangan', 'kepala', 'kaki'].includes(word)) say([word]);
    };
    mountReadingCheck(board);
    if (step !== previousStep) {
      stop();
      if (step < 0) say(['masuk', 'intro']);
      else if (step === 0) say(['arahan-semak']);
      else if (step >= modal.items.length) say(['tamat']);
      previousStep = step;
    }
  }
  renderModal = function (...args) {
    if (!inMission()) { resetReading(); stop(); previousStep = null; }
    const result = priorRender.apply(this, args);
    if (inMission()) mount();
    return result;
  };
  closeModal = function (...args) {
    if (inMission()) { resetReading(); stop(); previousStep = null; }
    return priorClose.apply(this, args);
  };
  // Stop examples before capturing the child's voice or playing back their recording.
  root.addEventListener('click', event => {
    if (inMission() && event.target.closest('#record, #play, #start, #next, #finish, #close')) stop();
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (checking()) { readingCheck.reset(); stopReading = null; updateReadingUI(); } stop(); } });
  window.addEventListener('pagehide', () => { readingCheck.reset(); stopReading = null; stop(); });
  new MutationObserver(() => {
    if (!inMission() || !root.childElementCount) { resetReading(); stop(); previousStep = null; }
  }).observe(root, {childList: true});
})();
