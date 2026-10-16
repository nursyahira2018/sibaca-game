/* Drum celebration on successful mission completion, including replays. */
(() => {
  'use strict';
  const root = document.getElementById('modalRoot');
  const endings = {patrick:'#finish', krusty:'#bfFinish', sandy:'#s3Finish', goo:'#g4Finish'};
  let effect = null, activeMission = null, celebrated = null;
  function stop() {
    if (effect) { effect.pause(); effect.currentTime = 0; effect = null; }
    activeMission = null;
  }
  function play(id) {
    stop();
    if (document.hidden || document.getElementById('allMissionSound')?.getAttribute('aria-pressed') === 'false') return;
    const clip = new Audio('assets/audio/mission-complete-drum.mp3');
    clip.volume = 0.22;
    effect = clip; activeMission = id;
    clip.onended = () => { if (effect === clip) { effect = null; activeMission = null; } };
    Promise.resolve(clip.play()).then(() => {
      if (effect !== clip || modal?.id !== id || document.hidden) clip.pause();
    }).catch(() => {});
  }
  function sync() {
    const id = modal?.id;
    if (id === 'jelly') {
      celebrated = null;
      if (activeMission && activeMission !== id) stop();
      return;
    }
    const finished = id && endings[id] && root.querySelector(endings[id]);
    if (!finished) { celebrated = null; stop(); return; }
    if (celebrated !== id) { celebrated = id; play(id); }
  }
  new MutationObserver(sync).observe(root, {childList:true, subtree:true});
  const previousClose = closeModal;
  closeModal = function (...args) { stop(); celebrated = null; return previousClose.apply(this, args); };
  window.addEventListener('message', event => {
    const frame = document.getElementById('m5DialogFrame');
    if (event.origin !== window.location.origin || !frame || event.source !== frame.contentWindow || modal?.id !== 'jelly') return;
    const data = event.data;
    if (data?.app === 'sibaca-misi5' && data.type === 'completed' && ['pink','blue','purple','red'].includes(data.mode)) play('jelly');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
})();
