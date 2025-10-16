/* =====================================
   Word-a-Roo v1.0 Classic
   Sound Manager
   ===================================== */

export const Sound = (() => {
  const files = {
    splash: 'assets/audio/classic.mp3',   // same track reused on splash for now
    classic: 'assets/audio/classic.mp3'
  };

  const splash = new Audio(files.splash);
  const classic = new Audio(files.classic);

  [splash, classic].forEach(a => {
    a.preload = 'auto';
    a.loop = true;
    a.volume = 0;
  });

  let unlocked = false;
  let current = null;

  // Required to satisfy mobile autoplay policies
  async function unlock() {
    if (unlocked) return;
    try {
      await splash.play(); splash.pause(); splash.currentTime = 0;
      await classic.play(); classic.pause(); classic.currentTime = 0;
      unlocked = true;
    } catch { /* wait for gesture */ }
  }

  function fade(el, to = 1, ms = 500) {
    const start = el.volume;
    const t0 = performance.now();
    function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      el.volume = start + (to - start) * k;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function play(which = 'classic') {
    if (!unlocked) return;
    const next = which === 'splash' ? splash : classic;
    if (current && current !== next) {
      current.pause(); current.currentTime = 0;
    }
    current = next;
    current.play();
    fade(current, 0.9, 600);
  }

  function stop() {
    if (current) fade(current, 0, 400);
  }

  return { unlock, play, stop };
})();
