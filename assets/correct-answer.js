/* One shared correct-answer effect for accepted readings and answers. */
(() => {
  'use strict';
  let active = null;
  function stop() { if (active) { active.pause(); active.currentTime = 0; active = null; } }
  function muted() {
    if (document.getElementById('allMissionSound')?.getAttribute('aria-pressed') === 'false') return true;
    const control = document.querySelector('#bfMute, #s3Mute, #g4Mute');
    if (control && (/^Hidupkan/i.test(control.getAttribute('aria-label') || '') || control.textContent.trim() === '🔇')) return true;
    try { if (window.parent !== window && window.parent.document.getElementById('allMissionSound')?.getAttribute('aria-pressed') === 'false') return true; } catch (_) {}
    return false;
  }
  function play() {
    stop();
    if (document.hidden || muted()) return;
    const clip = new Audio('assets/audio/correct-answer.mp3');
    clip.volume = 0.4;
    active = clip;
    clip.onended = () => { if (active === clip) active = null; };
    Promise.resolve(clip.play()).then(() => { if (active !== clip || document.hidden) clip.pause(); }).catch(() => {});
  }
  window.SiBaCaCorrectSound = {play, stop};
  if (typeof kitchenSound === 'function') {
    const previousSound = kitchenSound;
    kitchenSound = function (kind, ...args) {
      if (kind === 'correct') { play(); return; }
      return previousSound.call(this, kind, ...args);
    };
  }
  if (typeof closeModal === 'function') {
    const previousClose = closeModal;
    closeModal = function (...args) { stop(); return previousClose.apply(this, args); };
  }
  // Avoid playing an effect into a microphone or over a requested voice example.
  document.addEventListener('click', event => {
    if (event.target.closest('#record, #bfRecord, #s3Record, #recordDialog, #listen, #bfListen, #s3Listen, #g4Listen, #listenDialog, #patHearInstructions, [data-listen]')) stop();
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
})();
