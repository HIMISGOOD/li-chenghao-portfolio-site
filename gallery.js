/* One crop, three states: in the painting, lifted, and on the reading wall. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const painting = $('painting');
  const panel = $('projectPanel');
  const crop = $('projectCrop');
  const mount = $('cropMount');
  const closeButton = $('closeButton');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 820px)');
  const order = ['health', 'sanfen', 'travel', 'aoma', 'collection'];
  const indexNames = { health: '健康 Agent', sanfen: '三分熟', travel: '旅行与机票', aoma: 'AOMA', collection: '物影集' };
  const hotspots = [...document.querySelectorAll('.hotspot')];
  const background = [...document.querySelectorAll('.site-header, .desktop-stage, .mobile-gallery')];
  const copyParts = [...panel.querySelectorAll('.panel-kicker, h2, .panel-meta, .travel-entries, .panel-facts, .panel-rule, .panel-description, .panel-proof, .project-story-link')];
  const captions = [...panel.querySelectorAll('.visual-folio, .visual-caption, .detail-nav')];
  const baseTitle = document.title;
  const rects = Object.fromEntries(hotspots.map(el => [el.dataset.project, {
    x: parseFloat(el.style.left), y: parseFloat(el.style.top),
    w: parseFloat(el.style.width), h: parseFloat(el.style.height)
  }]));
  rects.about = { x: 0, y: 0, w: 100, h: 100 };
  const travelBranches = {
    research: {
      meta: '团队毕业论文 · 2026.06—2026.09',
      role: '理论框架 / 原型设计 / 项目协调', status: '研究与论文展示',
      description: '组织五人团队，用同一旅行平台的三版交互原型，研究消费者如何理解不同程度的 AI 集成。我参与理论框架、原型设计与项目协调，让研究问题和交付材料保持一致。',
      proof: '5 人团队 · 3 版交互原型 · 15 位受访者',
      href: 'research.html'
    },
    internship: {
      meta: '天津凌志皓越科技 · 产品经理实习 · 2023.01—2023.04',
      role: '产品原型 / 市场分析 / 订单履约', status: '实习经历',
      description: '参与无人机集群操作界面原型与市场分析；在机票服务中承接领导提供的订单，负责下单出票，并把流程整理成 SOP、知识库和问答机器人，供后续同事学习。',
      proof: '首周 10 笔已出票订单 · 出票 SOP / 知识库 / 问答机器人',
      href: 'internship.html'
    }
  };
  let phase = 'overview';
  let active = null;
  let travelBranch = 'research';
  let returnFocus = null;
  let timeline = null;
  let clone = null;
  let finishTransition = null;
  let pendingRoute = undefined;
  let suppressFocusHover = false;
  let hovered = null;
  let closeRequested = false;

  function paintCrop(el, key) {
    const { x, y, w, h } = rects[key];
    el.style.backgroundSize = `${10000 / w}% ${10000 / h}%`;
    el.style.backgroundPosition = `${w === 100 ? 0 : x / (100 - w) * 100}% ${h === 100 ? 0 : y / (100 - h) * 100}%`;
  }
  const ratio = key => 1584 * rects[key].w / (993 * rects[key].h);
  function sizeCrop() {
    if (!active) return;
    const width = Math.min(mount.clientWidth, mount.clientHeight * ratio(active));
    crop.style.width = `${width}px`;
    crop.style.height = `${width / ratio(active)}px`;
  }
  function sourceFor(key) {
    if (key === 'about') return painting;
    return document.querySelector(`${mobile.matches ? '.mobile-card' : '.hotspot'}[data-project="${key}"]`);
  }
  function sourceRect(key, lifted = false) {
    const source = sourceFor(key);
    if (!source || (key === 'about' && mobile.matches)) return null;
    const lens = lifted && source.classList.contains('is-hovered') ? source.querySelector('.zoom-lens') : null;
    const r = (lens || source).getBoundingClientRect();
    return r.width && r.height && r.bottom > 0 && r.top < innerHeight ? r : null;
  }
  function hover(key) {
    if (phase !== 'overview') return;
    hovered = key;
    painting.classList.toggle('exploring', Boolean(key));
    hotspots.forEach(el => el.classList.toggle('is-hovered', el.dataset.project === key));
    document.querySelectorAll('.scene-index button').forEach(el => el.classList.toggle('active', el.dataset.project === key));
    $('stageNote').textContent = key ? `${projects[key].hoverTitle || projects[key].title} · 点击展开` : '移入预览 · 点击金色编号展开';
    if (!key) return;
    const el = sourceFor(key);
    const note = el?.querySelector('.hover-note');
    if (!note) return;
    const r = el.getBoundingClientRect();
    const gap = 22;
    let left = el.dataset.note === 'left' ? -note.offsetWidth - gap : r.width + gap;
    let top = Math.max(12, (r.height - note.offsetHeight) / 2);
    if (el.dataset.note === 'below') { left = (r.width - note.offsetWidth) / 2; top = r.height + 18; }
    left = Math.min(innerWidth - 16 - r.left - note.offsetWidth, Math.max(16 - r.left, left));
    top = Math.min(innerHeight - 60 - r.top - note.offsetHeight, Math.max(80 - r.top, top));
    note.style.left = `${left}px`;
    note.style.top = `${top}px`;
  }
  hotspots.forEach((el, index) => {
    const key = el.dataset.project;
    const lens = document.createElement('span');
    lens.className = 'zoom-lens';
    lens.setAttribute('aria-hidden', 'true');
    paintCrop(lens, key);
    el.prepend(lens);
    const note = document.createElement('span');
    note.className = 'hover-note';
    note.setAttribute('aria-hidden', 'true');
    for (const [tag, value] of [['small', projects[key].hoverType], ['strong', projects[key].hoverTitle || projects[key].title], ['span', projects[key].hoverSummary]]) {
      const child = document.createElement(tag); child.textContent = value; note.append(child);
    }
    el.append(note);
    const indexButton = document.createElement('button');
    indexButton.type = 'button';
    indexButton.dataset.project = key;
    const indexNumber = document.createElement('span');
    indexNumber.textContent = String(index + 1).padStart(2, '0');
    indexButton.append(indexNumber, document.createTextNode(indexNames[key]));
    indexButton.setAttribute('aria-label', `查看${projects[key].hoverTitle || projects[key].title}`);
    $('sceneIndex').append(indexButton);
  });
  document.querySelectorAll('.mobile-card').forEach(el => {
    paintCrop(el, el.dataset.project);
    el.style.aspectRatio = String(ratio(el.dataset.project));
  });
  document.querySelectorAll('[data-project]').forEach(el => {
    el.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') hover(el.dataset.project); });
    el.addEventListener('pointerleave', () => { if (hovered === el.dataset.project) hover(null); });
    el.addEventListener('focus', () => { if (!suppressFocusHover) hover(el.dataset.project); });
    el.addEventListener('blur', () => { if (hovered === el.dataset.project) hover(null); });
    el.addEventListener('click', () => {
      if (phase !== 'overview') return;
      returnFocus = el;
      history.pushState({ portfolioPanel: true }, '', `#${el.dataset.project}`);
      open(el.dataset.project);
    });
  });

  function lock(value) {
    background.forEach(el => { el.inert = value; });
    document.body.style.overflow = value ? 'hidden' : '';
    panel.inert = !value;
    panel.setAttribute('aria-hidden', String(!value));
  }
  function renderDetails(data) {
    for (const field of ['meta', 'role', 'status', 'description', 'proof']) {
      $(`panel${field[0].toUpperCase()}${field.slice(1)}`).textContent = data[field];
    }
  }
  function selectTravelBranch(key, animate = false) {
    travelBranch = key;
    const data = travelBranches[key];
    renderDetails(data);
    document.querySelectorAll('[data-travel]').forEach(button => {
      const selected = button.dataset.travel === key;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    $('panelMain').setAttribute('aria-labelledby', key === 'research' ? 'researchTab' : 'internshipTab');
    $('projectStoryLink').hidden = false;
    $('projectStoryLink').href = data.href;
    $('projectStoryLink').innerHTML = '查看详情 <span aria-hidden="true">→</span>';
    if (animate && !reducedMotion.matches && window.gsap) {
      gsap.fromTo([$('panelDescription'), $('projectStoryLink'), $('panelProof')], { opacity: .35, y: 5 }, { opacity: 1, y: 0, duration: .22, overwrite: true });
    }
  }
  function render(key) {
    active = key;
    const data = projects[key];
    $('panelKicker').textContent = data.order;
    $('panelTitle').textContent = data.title;
    renderDetails(data);
    $('visualIndex').textContent = key === 'about' ? 'ABOUT' : `${String(order.indexOf(key) + 1).padStart(2, '0')} / 05`;
    $('visualType').textContent = data.hoverType;
    $('visualSummary').textContent = data.hoverSummary;
    $('detailCount').textContent = `${String(order.indexOf(key) + 1).padStart(2, '0')} / 05`;
    $('travelEntries').hidden = key !== 'travel';
    panel.classList.toggle('is-travel', key === 'travel');
    if (key === 'travel') {
      $('panelMain').setAttribute('role', 'tabpanel');
      selectTravelBranch('research');
    } else {
      $('panelMain').removeAttribute('role');
      $('panelMain').removeAttribute('aria-labelledby');
    }
    const storyPages = { health: 'health.html', sanfen: 'sanfen.html', aoma: 'aoma.html', collection: 'collection.html' };
    if (key !== 'travel') {
      $('projectStoryLink').hidden = !storyPages[key];
      $('projectStoryLink').setAttribute('href', storyPages[key] || '#');
      $('projectStoryLink').innerHTML = '阅读完整项目故事 <span aria-hidden="true">→</span>';
    }
    panel.classList.toggle('is-about', key === 'about');
    crop.setAttribute('aria-label', key === 'about' ? '产品作品集群像全景' : `${data.hoverTitle || data.title}的画中场景`);
    paintCrop(crop, key);
    document.title = `${data.title}｜李程浩的作品集`;
    sizeCrop();
  }
  function clearMotion() {
    timeline?.kill();
    if (window.gsap) gsap.killTweensOf([crop, ...copyParts, ...captions, closeButton]);
    timeline = null;
    clone?.remove();
    clone = null;
    finishTransition = null;
    for (const el of [crop, ...copyParts, ...captions, closeButton]) {
      el.style.opacity = ''; el.style.transform = ''; el.style.visibility = '';
    }
  }
  function drainRoute() {
    if (pendingRoute !== undefined) {
      const route = pendingRoute; pendingRoute = undefined; routeTo(route);
    }
  }
  function makeClone(key, rect) {
    const el = document.createElement('div');
    el.className = 'scene-transition';
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    paintCrop(el, key);
    document.body.append(el);
    clone = el;
    return el;
  }
  function open(key, immediate = false) {
    if (phase !== 'overview') return;
    const from = sourceRect(key, true);
    hover(null);
    phase = 'opening';
    panel.classList.add('open');
    panel.scrollTop = 0;
    lock(true);
    render(key);
    const finish = () => {
      clearMotion(); panel.style.opacity = '1'; phase = 'detail';
      closeButton.focus({ preventScroll: true }); drainRoute();
    };
    if (immediate || reducedMotion.matches || !window.gsap) { finish(); return; }
    finishTransition = finish;
    const to = crop.getBoundingClientRect();
    timeline = gsap.timeline({ onComplete: finish });
    timeline.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: .4, ease: 'power2.out' }, 0);
    if (from) {
      const flight = makeClone(key, to);
      gsap.set(crop, { opacity: 0 });
      timeline.fromTo(flight, { x: from.left - to.left, y: from.top - to.top, scaleX: from.width / to.width, scaleY: from.height / to.height }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .76, ease: 'power3.inOut' }, 0);
    } else {
      timeline.fromTo(crop, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .45 }, .1);
    }
    timeline.fromTo(copyParts, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .38, stagger: .035, ease: 'power2.out' }, .28);
    timeline.fromTo([...captions, closeButton], { opacity: 0 }, { opacity: 1, duration: .3 }, .38);
  }
  function close() {
    if (phase !== 'detail') { pendingRoute = null; return; }
    phase = 'closing';
    const to = sourceRect(active);
    const from = crop.getBoundingClientRect();
    const finish = () => {
      clearMotion(); panel.classList.remove('open'); panel.style.opacity = '0';
      lock(false); phase = 'overview'; closeRequested = false; document.title = baseTitle;
      const focusTarget = returnFocus && returnFocus.getClientRects().length ? returnFocus : sourceFor(active);
      active = null;
      suppressFocusHover = true;
      focusTarget?.focus({ preventScroll: true });
      suppressFocusHover = false;
      drainRoute();
    };
    if (reducedMotion.matches || !window.gsap) { finish(); return; }
    finishTransition = finish;
    timeline = gsap.timeline({ onComplete: finish });
    timeline.to([...copyParts, ...captions, closeButton], { opacity: 0, y: 6, duration: .16, ease: 'power1.in' }, 0);
    timeline.to(panel, { opacity: 0, duration: .38, ease: 'power2.inOut' }, .16);
    if (to && from.width && from.bottom > 0 && from.top < innerHeight) {
      const flight = makeClone(active, from);
      gsap.set(crop, { opacity: 0 });
      timeline.to(flight, { x: to.left - from.left, y: to.top - from.top, scaleX: to.width / from.width, scaleY: to.height / from.height, duration: .62, ease: 'power3.inOut' }, .05);
    }
  }
  function switchScene(key) {
    if (key === active || phase !== 'detail') return;
    phase = 'switching';
    const direction = order.indexOf(key) >= order.indexOf(active) ? 1 : -1;
    const parts = [crop, ...copyParts, ...captions];
    const finish = () => { clearMotion(); phase = 'detail'; drainRoute(); };
    returnFocus = sourceFor(key);
    if (reducedMotion.matches || !window.gsap) { render(key); panel.scrollTop = 0; finish(); return; }
    // Resizing settles on the requested scene, never an intermediate frame.
    finishTransition = () => { render(key); finish(); };
    timeline = gsap.timeline({ onComplete: finish });
    timeline.to(parts, { opacity: 0, x: -8 * direction, duration: .16, ease: 'power1.in' });
    timeline.call(() => { render(key); panel.scrollTop = 0; });
    timeline.fromTo(parts, { opacity: 0, x: 10 * direction }, { opacity: 1, x: 0, duration: .3, stagger: .012, ease: 'power2.out' });
  }
  function routeTo(key) {
    if (phase === 'opening' || phase === 'closing' || phase === 'switching') { pendingRoute = key; return; }
    if (!key) { if (phase === 'detail') close(); return; }
    if (phase === 'overview') open(key);
    else switchScene(key);
  }
  function routeFromHash() {
    const key = location.hash.slice(1);
    return Object.hasOwn(projects, key) ? key : null;
  }
  function requestClose() {
    if (phase === 'overview' || phase === 'closing' || closeRequested) return;
    closeRequested = true;
    if (history.state?.portfolioPanel) history.back();
    else { history.replaceState(null, '', `${location.pathname}${location.search}`); routeTo(null); }
  }
  function next(delta) {
    if (phase !== 'detail' || active === 'about') return;
    const key = order[(order.indexOf(active) + delta + order.length) % order.length];
    history.replaceState(history.state, '', `#${key}`);
    switchScene(key);
  }
  $('aboutButton').addEventListener('click', () => {
    if (phase !== 'overview') return;
    returnFocus = $('aboutButton');
    history.pushState({ portfolioPanel: true }, '', '#about'); open('about');
  });
  closeButton.addEventListener('click', requestClose);
  $('prevScene').addEventListener('click', () => next(-1));
  $('nextScene').addEventListener('click', () => next(1));
  document.querySelectorAll('[data-travel]').forEach(button => {
    button.addEventListener('click', () => {
      if (phase === 'detail' && active === 'travel') selectTravelBranch(button.dataset.travel, true);
    });
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const key = event.key === 'Home' ? 'research' : event.key === 'End' ? 'internship'
        : travelBranch === 'research' ? 'internship' : 'research';
      const target = document.querySelector(`[data-travel="${key}"]`);
      target?.focus(); selectTravelBranch(key, true);
    });
  });
  window.addEventListener('popstate', () => routeTo(routeFromHash()));
  window.addEventListener('hashchange', () => routeTo(routeFromHash()));
  document.addEventListener('keydown', event => {
    if (phase === 'overview') return;
    if (event.key === 'Escape') { event.preventDefault(); requestClose(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); next(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); next(1); }
    if (event.key === 'Tab') {
      const focusable = [...panel.querySelectorAll('button, a[href]')].filter(el => !el.disabled && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
  });
  window.addEventListener('resize', () => {
    finishTransition?.(); sizeCrop(); if (hovered) hover(hovered);
  });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishTransition?.(); });
  new ResizeObserver(sizeCrop).observe(mount);
  const initial = routeFromHash();
  if (initial) open(initial, true);
})();
