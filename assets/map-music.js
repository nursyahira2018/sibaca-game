/* Muzik peta sahaja: semua paparan misi dan penamat menghentikan muzik. */
(() => {
  'use strict';
  const tracks = Array.from({length: 4}, (_, i) => 'assets/audio/bikini-bottom-0' + i + '.mp3');
  let track = 0;
  const audio = new Audio(tracks[track]);
  audio.addEventListener('ended', () => {
    track = (track + 1) % tracks.length;
    audio.src = tracks[track];
    sync();
  });
  audio.preload = 'none';
  audio.volume = 0.2;
  const preferenceKey = 'sibaca-map-music-enabled';
  let enabled = true, activated = false, pending = false, blocked = false;
  try { enabled = localStorage.getItem(preferenceKey) !== 'false'; } catch (_) {}
  const button = document.createElement('button');
  button.id = 'mapMusicToggle';
  button.type = 'button';
  const style = document.createElement('style');
  style.textContent = '#mapMusicToggle{position:fixed;right:14px;top:76px;z-index:1100;border:3px solid white;border-radius:18px;background:#125b75;color:white;padding:8px 12px;min-height:44px;font:800 15px "Baloo 2",Arial;box-shadow:0 4px 0 #063849;cursor:pointer}#mapMusicToggle[hidden]{display:none!important}@media(max-width:600px){#mapMusicToggle{right:10px;top:65px;font-size:13px;padding:7px 9px}}';
  document.head.append(style);
  document.body.append(button);
  const root = document.getElementById('modalRoot');
  const inMission = () => !!modal || !!root?.childElementCount || !!document.getElementById('patEntrance');
  const shouldPlay = () => enabled && activated && !inMission() && !document.hidden;
  function updateButton() {
    button.hidden = inMission();
    button.textContent = !enabled ? '🔇 Muzik: tutup' : blocked ? '🎵 Mainkan muzik' : '🎵 Muzik: buka';
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Matikan muzik latar' : 'Hidupkan muzik latar');
    if (blocked) button.setAttribute('aria-label', 'Mainkan muzik latar');
  }
  function sync() {
    updateButton();
    if (!shouldPlay()) { audio.pause(); return; }
    if (!audio.paused || pending) return;
    pending = true;
    Promise.resolve(audio.play()).then(() => {
      blocked = false;
      if (!shouldPlay()) audio.pause();
    }).catch(() => { blocked = true; }).finally(() => { pending = false; updateButton(); });
  }
  button.addEventListener('click', () => {
    activated = true;
    if (blocked && enabled) blocked = false;
    else enabled = !enabled;
    try { localStorage.setItem(preferenceKey, String(enabled)); } catch (_) {}
    sync();
  });
  // A trusted tap/key unlocks audio on mobile; keep the same playback position after missions.
  function activate(event) {
    if (event.target === button) return;
    activated = true;
    queueMicrotask(sync);
  }
  document.addEventListener('pointerdown', activate);
  document.addEventListener('keydown', activate);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => audio.pause());
  window.addEventListener('pageshow', sync);
  // Wrap the final renderers and observe the root for missions with their own render functions.
  const previousRender = renderModal, previousClose = closeModal;
  renderModal = function (...args) { audio.pause(); const result = previousRender.apply(this, args); sync(); return result; };
  closeModal = function (...args) { const result = previousClose.apply(this, args); sync(); return result; };
  if (root) new MutationObserver(sync).observe(root, {childList: true, subtree: true});
  audio.addEventListener('playing', () => { if (!shouldPlay()) audio.pause(); });
  audio.addEventListener('error', () => { blocked = true; updateButton(); });
  updateButton();
})();
