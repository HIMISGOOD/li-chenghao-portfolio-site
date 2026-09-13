(() => {
  const captions = ['传统预订：用户搜索、比较并自行整合行程。', '基础问答：AI 回答具体问题，规划主要由用户完成。', '规划助手：整合偏好与约束，形成可调整的建议。'];
  const sources = ['image.png','image2.png','image3.png'];
  const dialog = document.querySelector('#imageDialog');
  document.querySelectorAll('.prototype-viewer').forEach(viewer => {
    const image = viewer.querySelector('img');
    viewer.querySelectorAll('[data-prototype]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.prototype);
      viewer.querySelectorAll('[data-prototype]').forEach(b => b.setAttribute('aria-pressed', String(b===button)));
      image.src = 'assets/research/'+sources[index]; image.alt = captions[index];
      viewer.querySelector('.prototype-caption').textContent = captions[index];
    }));
    viewer.querySelector('.image-open').addEventListener('click', () => {
      const target = dialog.querySelector('img'); target.src = image.src; target.alt = image.alt; dialog.showModal();
    });
  });
  const progress = document.querySelector('#readingProgress');
  function update(){if(progress){const max=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${max>0?Math.min(1,scrollY/max):0})`;}}
  addEventListener('scroll',update,{passive:true});addEventListener('resize',update);update();
  const links = [...document.querySelectorAll('.story-rail nav a')];
  const observer = new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){links.forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}}},{rootMargin:'-15% 0px -65% 0px'});
  document.querySelectorAll('.chapter').forEach(s=>observer.observe(s));
})();
