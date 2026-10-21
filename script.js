(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- starfield + constellations ---------- */
  const sky = $('#sky');
  const g = sky.getContext('2d');
  let W = 0, H = 0, dpr = 1, stars = [];
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = sky.clientWidth; H = sky.clientHeight;
    sky.width = W * dpr; sky.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(220, (W * H) / 6500));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.3 + 0.3,
      vx: (Math.random() - 0.5) * 0.08, vy: (Math.random() - 0.5) * 0.08,
      tw: Math.random() * Math.PI * 2,
    }));
  }

  function drawSky(t) {
    g.clearRect(0, 0, W, H);
    const link = 120, near = 170;
    for (const s of stars) {
      if (!reduced) { s.x += s.vx; s.y += s.vy; }
      if (s.x < -10) s.x = W + 10; if (s.x > W + 10) s.x = -10;
      if (s.y < -10) s.y = H + 10; if (s.y > H + 10) s.y = -10;
    }
    // constellation lines appear around the pointer
    g.lineWidth = 1;
    for (let i = 0; i < stars.length; i++) {
      const a = stars[i];
      const da = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (da > near) continue;
      for (let j = i + 1; j < stars.length; j++) {
        const b = stars[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < link) {
          g.strokeStyle = `rgba(138,180,255,${(1 - d / link) * (1 - da / near) * 0.7})`;
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
      }
    }
    for (const s of stars) {
      const tw = reduced ? 0.8 : 0.55 + Math.sin(t / 900 + s.tw) * 0.45;
      const close = Math.max(0, 1 - Math.hypot(s.x - mouse.x, s.y - mouse.y) / near);
      g.fillStyle = `rgba(${210 + close * 45},${220 + close * 35},255,${Math.min(1, tw * 0.8 + close)})`;
      g.beginPath(); g.arc(s.x, s.y, s.r + close * 1.2, 0, Math.PI * 2); g.fill();
    }
  }

  let skyVisible = true;
  function loop(t) {
    if (skyVisible) drawSky(t);
    requestAnimationFrame(loop);
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => {
    const r = sky.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  new IntersectionObserver(([e]) => { skyVisible = e.isIntersecting; }).observe(sky);
  requestAnimationFrame(loop);

  /* ---------- typed roles ---------- */
  const roles = ['local AI apps', 'data products', 'interactive visualisations', 'machine learning models', 'things people enjoy using'];
  const typed = $('#typed');
  if (!reduced) {
    let ri = 0, ci = roles[0].length, deleting = true;
    const tick = () => {
      if (deleting) {
        ci--;
        if (ci <= 0) { deleting = false; ri = (ri + 1) % roles.length; }
      } else {
        ci++;
        if (ci >= roles[ri].length) { deleting = true; typed.textContent = roles[ri]; return setTimeout(tick, 2200); }
      }
      typed.textContent = roles[ri].slice(0, Math.max(0, ci)) || '​';
      setTimeout(tick, deleting ? 35 : 70);
    };
    setTimeout(tick, 2600);
  }

  /* ---------- reveal on scroll (staggered per group) ---------- */
  const groups = new Map();
  for (const el of $$('.reveal')) {
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    groups.set(parent, i + 1);
    el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
  }
  const revealer = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => revealer.observe(el));

  /* ---------- nav state + progress bar ---------- */
  const nav = $('.nav'), bar = $('.progress');
  const sections = $$('main section[id]');
  const navLinks = $$('.nav nav a');
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('scrolled', y > 20);
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    let current = '';
    for (const s of sections) if (s.offsetTop - 120 <= y) current = s.id;
    for (const a of navLinks) a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- count-up stats ---------- */
  const counter = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      counter.unobserve(e.target);
      const el = e.target, end = +el.dataset.count, suffix = el.dataset.suffix || '';
      if (reduced) continue;
      const start = performance.now(), dur = 1600;
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = v.toLocaleString('en-GB') + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => counter.observe(el));

  /* ---------- videos play only while on screen ---------- */
  const videos = $$('.frame video:not(.slide)');
  const player = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting && !v.dataset.paused) v.play().catch(() => {});
      else v.pause();
    }
  }, { threshold: 0.35 });
  for (const v of videos) {
    v.preload = 'metadata';
    player.observe(v);
    v.addEventListener('click', () => {
      if (v.paused) { delete v.dataset.paused; v.play(); } else { v.dataset.paused = '1'; v.pause(); }
    });
  }

  /* ---------- Vega gallery: the recording, then each screen ---------- */
  for (const gal of $$('[data-gallery]')) {
    const slides = $$('.slide', gal), dots = $('.dots', gal);
    let i = 0, timer = 0, onScreen = false;
    const buttons = slides.map((s, n) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `Screen ${n + 1}`);
      b.addEventListener('click', () => show(n, true));
      dots.append(b);
      return b;
    });
    function show(n, user) {
      clearTimeout(timer);
      slides[i].classList.remove('active');
      if (slides[i].tagName === 'VIDEO') slides[i].pause();
      i = n;
      slides.forEach((s, k) => buttons[k].setAttribute('aria-selected', String(k === i)));
      const s = slides[i];
      s.classList.add('active');
      if (!onScreen) return;
      if (s.tagName === 'VIDEO') {
        s.currentTime = 0;
        s.play().catch(() => {});
        s.onended = () => show((i + 1) % slides.length);
        if (user) return;
      } else {
        timer = setTimeout(() => show((i + 1) % slides.length), 4200);
      }
    }
    new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) show(i); else { clearTimeout(timer); slides.forEach((s) => s.tagName === 'VIDEO' && s.pause()); }
    }, { threshold: 0.35 }).observe(gal);
    show(0);
  }

  /* ---------- gentle 3D tilt on project screens ---------- */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    for (const f of $$('.frame')) {
      f.addEventListener('pointermove', (e) => {
        const r = f.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        f.style.setProperty('--ry', `${x * 6}deg`);
        f.style.setProperty('--rx', `${-y * 5}deg`);
      });
      f.addEventListener('pointerleave', () => { f.style.setProperty('--ry', '0deg'); f.style.setProperty('--rx', '0deg'); });
    }
  }

  /* ---------- spotlight on data science cards ---------- */
  for (const c of $$('.ds-card')) {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - r.left}px`);
      c.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  /* ---------- figure lightbox ---------- */
  const lb = $('#lightbox');
  for (const f of $$('.fig')) {
    f.addEventListener('click', () => {
      const img = $('img', lb), thumb = $('img', f);
      img.src = f.dataset.full;
      img.alt = thumb.alt;
      // The report's charts are small, so cap how far they are enlarged to keep them sharp.
      img.style.width = `${Math.min(thumb.naturalWidth * 1.8, innerWidth * 0.94, 1000)}px`;
      $('.lb-caption', lb).textContent = f.dataset.caption;
      lb.showModal();
    });
  }
  $('.lb-close', lb).addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });

  /* ---------- email (assembled here to keep it away from simple scrapers) ---------- */
  const emailLink = $('#email');
  const address = `${emailLink.dataset.u}@${emailLink.dataset.d}`;
  emailLink.href = `mailto:${address}`;
  $('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(address); $('#copied').textContent = `Copied: ${address}`; }
    catch { $('#copied').textContent = address; }
  });

  $('#year').textContent = new Date().getFullYear();
})();
