(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const videos = [...document.querySelectorAll('[data-case-video]')];
  // Clips are deliberately opt-in. Keep native playback, seeking and fullscreen.
  videos.forEach(video => {
    video.addEventListener('play', () => videos.forEach(other => { if (other !== video) other.pause(); }));
    video.addEventListener('error', () => {
      const caption = video.closest('figure').querySelector('figcaption');
      if (!caption.querySelector('.video-error')) {
        const notice = document.createElement('span');
        notice.className = 'video-error';
        notice.setAttribute('role', 'status');
        notice.textContent = '视频暂时无法加载，请刷新后重试。';
        caption.append(notice);
      }
    });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) videos.forEach(video => video.pause()); });
  window.addEventListener('pagehide', () => videos.forEach(video => video.pause()));
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); }), { threshold: 0 });
    videos.forEach(video => videoObserver.observe(video));
    if (!reduce.matches) {
      const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
      }), { rootMargin: '0px 0px -24px 0px', threshold: 0 });
      document.documentElement.classList.add('motion-ready');
      document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    }
  }
  reduce.addEventListener('change', () => { if (reduce.matches) document.documentElement.classList.remove('motion-ready'); });

  const dialog = document.getElementById('imageDialog');
  let imageTrigger = null;
  let previousOverflow = '';
  document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
    const source = button.querySelector('img');
    const expanded = document.getElementById('expandedImage');
    expanded.src = button.dataset.image;
    expanded.alt = source.alt;
    document.getElementById('imageDialogCaption').textContent = source.alt;
    imageTrigger = button;
    videos.forEach(video => video.pause());
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  }));
  document.getElementById('closeImage').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  const restorePageAfterDialog = () => {
    document.body.style.overflow = previousOverflow;
    imageTrigger?.focus({ preventScroll: true });
  };
  dialog.addEventListener('cancel', restorePageAfterDialog);
  dialog.addEventListener('close', restorePageAfterDialog);

  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('#chapterNav a')];
  const progress = document.getElementById('readingProgress');
  let queued = false;
  const updateReading = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0})`;
    let current = null;
    for (const chapter of chapters) if (chapter.getBoundingClientRect().top <= innerHeight * .35) current = chapter.id;
    links.forEach(link => { if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    queued = false;
  };
  const requestUpdate = () => { if (!queued) { queued = true; requestAnimationFrame(updateReading); } };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('pageshow', requestUpdate);
  updateReading();
})();
