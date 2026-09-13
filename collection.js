(() => {
  'use strict';
  const dialog = document.getElementById('imageDialog');
  const dialogImage = document.getElementById('dialogImage');
  const dialogCaption = document.getElementById('dialogCaption');
  const closeImage = document.getElementById('closeImage');
  let previousFocus = null;

  document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
    previousFocus = button;
    dialogImage.src = button.dataset.image;
    dialogImage.alt = button.querySelector('img')?.alt || '物影集真机截图';
    dialogCaption.textContent = button.dataset.caption || '';
    dialog.showModal();
    closeImage.focus();
  }));
  closeImage.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { dialogImage.removeAttribute('src'); previousFocus?.focus(); });

  const videoConfigs = [
    { video: document.getElementById('captureMotion'), toggle: document.getElementById('captureToggle'), label: '播放 7 秒片段' },
    { video: document.getElementById('cardMotion'), toggle: document.getElementById('motionToggle'), label: '播放片段' }
  ];
  videoConfigs.forEach(({ video, toggle, label }) => {
    const sync = () => { toggle.textContent = video.paused ? `${label} ▷` : '暂停片段 Ⅱ'; };
    toggle.addEventListener('click', () => {
      if (video.paused) video.play().catch(sync);
      else video.pause();
    });
    video.addEventListener('play', () => {
      videoConfigs.forEach(item => { if (item.video !== video) item.video.pause(); });
      sync();
    });
    video.addEventListener('pause', sync);
    video.addEventListener('error', () => { toggle.textContent = '片段暂时无法播放'; toggle.disabled = true; });
    sync();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videoConfigs.forEach(({ video }) => video.pause());
  });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reduce.matches) {
    document.documentElement.classList.add('motion-ready');
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  }
  reduce.addEventListener('change', () => {
    if (reduce.matches) { videoConfigs.forEach(({ video }) => video.pause()); document.documentElement.classList.remove('motion-ready'); }
  });

  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('#chapterNav a')];
  const progress = document.getElementById('readingProgress');
  let queued = false;
  function updateReading() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0})`;
    let current = null;
    for (const chapter of chapters) if (chapter.getBoundingClientRect().top <= innerHeight * .35) current = chapter.id;
    links.forEach(link => { if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    queued = false;
  }
  const requestUpdate = () => { if (!queued) { queued = true; requestAnimationFrame(updateReading); } };
  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', requestUpdate);
  addEventListener('pageshow', requestUpdate);
  updateReading();
})();
