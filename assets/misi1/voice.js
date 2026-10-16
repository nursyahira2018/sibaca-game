/* Fail audio Bahasa Melayu Malaysia; bacaan tidak bergantung pada suara pelayar. */
(() => {
  'use strict';
  const root = document.getElementById('modalRoot');
  const priorRender = renderModal, priorClose = closeModal;
  let active = null, session = 0, release = null, previousStep = null;
  const inMission = () => modal?.id === 'patrick';
  function status(message) {
    const target = document.getElementById('patVoiceStatus');
    if (target) target.textContent = message;
  }
  function stop() {
    session++;
    if (active) { active.pause(); active.onended = null; active.onerror = null; active = null; }
    if (release) { const resolve = release; release = null; resolve(); }
    if (inMission()) window.speechSynthesis?.cancel();
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
        }).catch(() => { failed = true; if (token === session) status('Tekan butang dengar untuk memainkan audio.'); done(); });
      });
      if (active === clip) active = null;
      if (failed) return;
    }
  }
  function instructionKey() {
    return step < 0 ? 'intro' : step >= modal.items.length ? 'tamat' : 'arahan';
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
    if (step !== previousStep) {
      stop();
      if (step < 0) say(['masuk', 'intro']);
      else if (step === 0) say(['arahan']);
      else if (step >= modal.items.length) say(['tamat']);
      previousStep = step;
    }
  }
  renderModal = function (...args) {
    if (!inMission()) { stop(); previousStep = null; }
    const result = priorRender.apply(this, args);
    if (inMission()) mount();
    return result;
  };
  closeModal = function (...args) {
    if (inMission()) { stop(); previousStep = null; }
    return priorClose.apply(this, args);
  };
  // Stop examples before capturing the child's voice or playing back their recording.
  root.addEventListener('click', event => {
    if (inMission() && event.target.closest('#record, #play, #start, #next, #finish, #close')) stop();
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  new MutationObserver(() => {
    if (!inMission() || !root.childElementCount) { stop(); previousStep = null; }
  }).observe(root, {childList: true});
})();
