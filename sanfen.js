(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const demo = document.getElementById('modeDemo');
  const sample = document.getElementById('sampleSubtitles');
  const hint = document.getElementById('revealInstruction');
  const descriptions = {
    rare: '原文与翻译默认模糊，想先尝试听懂，卡住时再看。',
    medium: '原文清晰、翻译模糊，需要原文帮助时，也能继续跟上内容。',
    full: '原文与翻译都清晰，当下需要更多支持时，可以直接查看双语字幕。'
  };
  const setReveal = value => {
    sample.classList.toggle('is-revealed', value);
    sample.setAttribute('aria-pressed', String(value));
    sample.setAttribute('aria-label', value ? '收回示例字幕，恢复当前熟度' : '临时看清示例字幕');
    hint.textContent = demo.dataset.mode === 'full' ? '原文与翻译都清晰可见' : value ? '再次轻触字幕，恢复当前熟度' : '悬停、聚焦或轻触字幕，临时看清';
  };
  document.querySelectorAll('.mode-controls button').forEach(button => button.addEventListener('click', () => {
    demo.dataset.mode = button.dataset.mode;
    document.querySelectorAll('.mode-controls button').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
    document.getElementById('modeDescription').textContent = descriptions[button.dataset.mode];
    setReveal(false);
  }));
  sample.addEventListener('click', () => setReveal(!sample.classList.contains('is-revealed')));
  sample.addEventListener('keydown', event => { if (event.key === 'Escape') { setReveal(false); document.querySelector('.mode-controls [aria-pressed="true"]').focus(); } });

  const videos = [...document.querySelectorAll('[data-managed-video]')];
  const manuallyPaused = new WeakSet();
  const visibleVideos = new Set();
  videos.forEach(video => {
    const button = document.querySelector(`[data-video="${video.id}"]`);
    button.hidden = false;
    const sync = () => { button.textContent = video.paused ? '播放演示 ▷' : '暂停演示 Ⅱ'; button.setAttribute('aria-label', `${video.paused ? '播放' : '暂停'}${video.getAttribute('aria-label')}`); };
    button.addEventListener('click', () => {
      if (video.paused) { manuallyPaused.delete(video); video.play().catch(sync); }
      else { manuallyPaused.add(video); video.pause(); }
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('error', () => { button.textContent = '演示暂时无法播放'; button.disabled = true; });
    // Once the visible custom control is wired, avoid competing pause controls.
    video.controls = false;
    sync();
  });
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        visibleVideos.add(video);
        if (!reduce.matches && !document.hidden && !manuallyPaused.has(video)) video.play().catch(() => {});
      } else { visibleVideos.delete(video); video.pause(); }
    }), { threshold: .45 });
    videos.forEach(video => videoObserver.observe(video));
    const reveals = [...document.querySelectorAll('.reveal')];
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -35px 0px', threshold: 0 });
    if (!reduce.matches) { document.documentElement.classList.add('motion-ready'); reveals.forEach(el => revealObserver.observe(el)); }
  }
  document.addEventListener('visibilitychange', () => {
    videos.forEach(video => { if (document.hidden) video.pause(); else if (visibleVideos.has(video) && !reduce.matches && !manuallyPaused.has(video)) video.play().catch(() => {}); });
  });
  reduce.addEventListener('change', () => {
    if (reduce.matches) { videos.forEach(video => video.pause()); document.documentElement.classList.remove('motion-ready'); }
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
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('pageshow', requestUpdate);
  updateReading();
})();
