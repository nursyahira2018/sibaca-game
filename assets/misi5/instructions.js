/* Supplied Malay recording for the Mission 5 introduction. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;
  let audio = null, wasIntro = false;
  const isIntro = () => !!document.getElementById('chooseMode');
  function stop() { if (audio) { audio.pause(); audio = null; } }
  function play() {
    stop();
    if (!isIntro() || document.hidden) return;
    window.SiBaCaCorrectSound?.stop();
    const clip = new Audio('assets/misi5/audio/intro-syahira.mp3');
    audio = clip;
    const status = document.getElementById('m5InstructionStatus');
    if (status) status.textContent = '';
    clip.play().then(() => { if (audio !== clip || !isIntro() || document.hidden) clip.pause(); }).catch(() => {
      if (audio !== clip || !isIntro()) return;
      if (status) status.textContent = 'Tekan Dengar arahan untuk memainkan audio.';
    });
  }
  function sync() {
    const choose = document.getElementById('chooseMode');
    if (!choose) { stop(); wasIntro = false; return; }
    if (!document.getElementById('m5HearInstructions')) {
      const actions = document.createElement('div'); actions.className = 'actions';
      const button = document.createElement('button');
      button.id = 'm5HearInstructions'; button.type = 'button'; button.className = 'btn light';
      button.textContent = '🔊 Dengar arahan'; button.onclick = play;
      actions.append(button); choose.before(actions);
      const status = document.createElement('p');
      status.id = 'm5InstructionStatus'; status.className = 'note'; status.setAttribute('role', 'status');
      actions.after(status);
    }
    if (!wasIntro) { wasIntro = true; play(); }
  }
  app.addEventListener('click', event => { if (event.target.closest('#chooseMode, a')) stop(); }, true);
  new MutationObserver(sync).observe(app, {childList: true, subtree: true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  sync();
})();
