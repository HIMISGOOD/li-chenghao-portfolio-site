(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -20px 0px', threshold: 0 });
    document.documentElement.classList.add('motion-ready');
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  reduced.addEventListener('change', () => { if (reduced.matches) document.documentElement.classList.remove('motion-ready'); });

  const chapters = [...document.querySelectorAll('.chapter')];
  const chapterLinks = [...document.querySelectorAll('#chapterNav a')];
  let queued = false;
  function updateReading() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('readingProgress').style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0})`;
    let current = null;
    for (const chapter of chapters) if (chapter.getBoundingClientRect().top <= innerHeight * .35) current = chapter.id;
    chapterLinks.forEach(link => { if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    queued = false;
  }
  function requestReading() { if (!queued) { queued = true; requestAnimationFrame(updateReading); } }
  addEventListener('scroll', requestReading, { passive: true });
  addEventListener('resize', requestReading);
  addEventListener('pageshow', requestReading);
  updateReading();

  const essay = $('essayDialog');
  let oldOverflow = '';
  $('openEssay').addEventListener('click', () => {
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    essay.showModal();
    essay.scrollTop = 0;
  });
  $('closeEssay').addEventListener('click', () => essay.close());
  essay.addEventListener('click', event => {
    if (event.target !== essay) return;
    const rect = essay.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) essay.close();
  });
  essay.addEventListener('close', () => { document.body.style.overflow = oldOverflow; $('openEssay').focus({ preventScroll: true }); });

  const screenshotDialog = $('screenshotDialog');
  let screenshotTrigger = null;
  let screenshotOverflow = '';
  document.querySelectorAll('[data-screenshot]').forEach(button => button.addEventListener('click', () => {
    screenshotTrigger = button;
    const image = button.querySelector('img');
    $('expandedScreenshot').src = button.dataset.screenshot;
    $('expandedScreenshot').alt = image.alt;
    $('screenshotDialogCaption').textContent = image.alt;
    screenshotOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    screenshotDialog.showModal();
    screenshotDialog.querySelector('.screenshot-dialog-body').scrollTo(0, 0);
  }));
  $('closeScreenshot').addEventListener('click', () => screenshotDialog.close());
  screenshotDialog.addEventListener('click', event => {
    if (event.target !== screenshotDialog) return;
    const rect = screenshotDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) screenshotDialog.close();
  });
  screenshotDialog.addEventListener('close', () => {
    document.body.style.overflow = screenshotOverflow;
    screenshotTrigger?.focus({ preventScroll: true });
  });

  // The demonstration is deliberately local: no model, health or reminder APIs.
  // A run token cancels pending animation steps when the reader resets the demo.
  let phase = 'pending';
  let run = 0;
  let writes = 0;
  let recovered = false;
  const steps = [...document.querySelectorAll('[data-step]')];
  const labels = { pending: '等待确认', executing: '已批准 · 正在执行', readback: '已写入 · 核对结果', complete: '已完成', rejected: '已拒绝' };
  function announce(message) { $('demoAnnouncement').textContent = message; }
  function render() {
    $('actionDemo').dataset.phase = phase;
    $('approvalStatus').textContent = labels[phase];
    $('writeCount').textContent = writes;
    $('approveAction').disabled = phase !== 'pending';
    $('rejectAction').disabled = phase !== 'pending';
    $('restartDemo').disabled = phase === 'executing' || phase === 'readback';
    const reached = { pending: 1, executing: 2, readback: 3, complete: 5, rejected: 1 }[phase];
    steps.forEach((step, index) => {
      step.className = '';
      if (phase === 'rejected') step.classList.add(index === 0 ? 'is-complete' : index === 1 ? 'is-rejected' : 'is-skipped');
      else if (index < reached) step.classList.add('is-complete');
      else if (index === reached) step.classList.add('is-current');
    });
    $('approvalTrace').textContent = phase === 'pending' ? (recovered ? '已恢复原请求，继续等待确认' : '暂停，尚未写入系统') : phase === 'rejected' ? '用户拒绝，流程在此结束' : '用户已批准这次动作';
    const finished = phase === 'complete' || phase === 'rejected';
    $('demoResult').hidden = !finished;
    if (finished) {
      $('resultLabel').textContent = phase === 'complete' ? '结果已回读' : '尊重你的决定';
      $('resultCopy').textContent = phase === 'complete' ? '已创建“状态复盘”，时间为明天 09:00。标题与时间已核对。' : '没有创建提醒。这次请求已结束。';
    }
    const notes = { pending:'批准前不执行。可以先模拟重启，观察请求如何保留。', executing:'记录本次执行，避免同一请求重复写入。', readback:'已写入一条提醒，正在核对标题与时间。', complete:'已核对实际结果。再次模拟重启，也不会新增提醒。', rejected:'后续步骤未执行，新增提醒保持为 0。' };
    $('executionNote').textContent = notes[phase];
    requestReading();
  }
  const pause = () => new Promise(resolve => setTimeout(resolve, reduced.matches ? 0 : 750));
  $('approveAction').addEventListener('click', async () => {
    if (phase !== 'pending') return;
    const token = ++run;
    phase = 'executing'; render(); announce('已批准，开始执行。');
    await pause(); if (run !== token) return;
    writes = 1; phase = 'readback'; render(); announce('已写入一条提醒，正在核对结果。');
    await pause(); if (run !== token) return;
    phase = 'complete'; render(); announce('已创建并核对提醒。本次新增一条。');
  });
  $('rejectAction').addEventListener('click', () => {
    if (phase !== 'pending') return;
    ++run; phase = 'rejected'; render(); announce('已拒绝，没有创建提醒。');
  });
  $('restartDemo').addEventListener('click', () => {
    if (phase === 'executing' || phase === 'readback') return;
    recovered = true;
    const message = phase === 'pending' ? '已模拟恢复：原请求仍在等待确认，新增提醒为 0。' : phase === 'complete' ? '已模拟恢复：沿用已完成记录，新增提醒仍为 1。' : '已模拟恢复：保留已拒绝状态，不再请求批准。';
    $('restartStatus').textContent = message;
    render(); announce(message);
  });
  $('resetDemo').addEventListener('click', () => {
    ++run; phase = 'pending'; writes = 0; recovered = false;
    $('restartStatus').textContent = '';
    render(); announce('已重置演示，等待确认。');
  });
  render();
})();
