/* ============================================================
   A LITTLE WORLD FOR GIANG — 20.10
   Petals, light, letters. Vanilla JS, no dependencies.
   ============================================================ */

(function () {
  'use strict';

  const doc = document;
  const root = doc.documentElement;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reduceQuery.matches;
  let dialogOpen = false;

  /* ───────────────────────────  ELEMENTS  ─────────────────────────── */

  const hero = doc.querySelector('.hero');
  const giftButton = doc.getElementById('openGift');
  const heroGlow = doc.getElementById('heroGlow');
  const welcome = doc.getElementById('welcome');
  const welcomeHeading = doc.getElementById('welcomeTitle');
  const progressBar = doc.getElementById('scrollProgress');
  const sections = Array.from(doc.querySelectorAll('main > section[id]'));
  const railLinks = new Map(
    Array.from(doc.querySelectorAll('[data-rail]')).map((link) => [link.dataset.rail, link])
  );
  const parallaxEls = Array.from(doc.querySelectorAll('[data-parallax]'));

  const dialog = doc.getElementById('letterDialog');
  const dialogContent = doc.getElementById('dialogContent');
  const dialogScroll = dialog ? dialog.querySelector('.dialog-sheet__scroll') : null;
  const dialogCloseButton = dialog ? dialog.querySelector('.dialog-close') : null;

  const loveLetter = doc.getElementById('loveLetter');
  const sealButton = doc.getElementById('sealButton');
  const letterBody = doc.getElementById('letterBody');
  const sealStatus = doc.getElementById('sealStatus');

  /* ───────────────────────────  CANVAS  ─────────────────────────── */

  const canvas = doc.getElementById('petalsCanvas');
  let ctx = null;
  let canvasReady = false;
  let canvasW = 0;
  let canvasH = 0;
  let dpr = 1;

  let petalSprites = [];
  let moteSprites = [];
  let petals = [];
  let motes = [];
  let burstParticles = [];
  let rafId = 0;
  let lastFrame = 0;
  let canvasRunning = false;

  function makePetalSprite(colors) {
    const size = 96;
    const sprite = doc.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const g = sprite.getContext('2d');
    if (!g) return sprite;

    g.translate(size / 2, size / 2);

    const shape = new Path2D();
    shape.moveTo(0, -38);
    shape.bezierCurveTo(24, -36, 38, -15, 31, 8);
    shape.bezierCurveTo(27, 24, 13, 38, 0, 32);
    shape.bezierCurveTo(-13, 38, -27, 24, -31, 8);
    shape.bezierCurveTo(-38, -15, -24, -36, 0, -38);
    shape.closePath();

    const fill = g.createLinearGradient(-26, -38, 28, 38);
    fill.addColorStop(0, colors[0]);
    fill.addColorStop(0.52, colors[1]);
    fill.addColorStop(1, colors[2]);
    g.fillStyle = fill;
    g.fill(shape);

    g.save();
    g.clip(shape);

    const sheen = g.createLinearGradient(0, -38, 0, 38);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    sheen.addColorStop(0.48, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(1, 'rgba(108, 35, 58, 0.17)');
    g.fillStyle = sheen;
    g.fillRect(-46, -46, 92, 92);

    g.beginPath();
    g.moveTo(0, -30);
    g.quadraticCurveTo(6, -2, 0, 26);
    g.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    g.lineWidth = 1.1;
    g.stroke();

    g.restore();

    g.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    g.lineWidth = 0.8;
    g.stroke(shape);

    return sprite;
  }

  function makeMoteSprite(inner, mid) {
    const size = 64;
    const sprite = doc.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const g = sprite.getContext('2d');
    if (!g) return sprite;

    const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, inner);
    glow.addColorStop(0.3, mid);
    glow.addColorStop(1, 'rgba(236, 217, 183, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);

    return sprite;
  }

  function initSprites() {
    petalSprites = [
      makePetalSprite([
        'rgba(255, 248, 243, 0.98)',
        'rgba(248, 220, 229, 0.94)',
        'rgba(216, 132, 156, 0.86)',
      ]),
      makePetalSprite([
        'rgba(255, 252, 249, 0.98)',
        'rgba(244, 203, 216, 0.94)',
        'rgba(214, 126, 151, 0.88)',
      ]),
      makePetalSprite([
        'rgba(253, 238, 238, 0.98)',
        'rgba(232, 166, 183, 0.94)',
        'rgba(150, 65, 92, 0.9)',
      ]),
    ];

    moteSprites = [
      makeMoteSprite('rgba(255, 252, 244, 0.95)', 'rgba(236, 217, 183, 0.55)'),
      makeMoteSprite('rgba(255, 247, 244, 0.9)', 'rgba(248, 220, 229, 0.5)'),
    ];
  }

  function pick(list) {
    return list[randInt(0, list.length - 1)];
  }

  function createPetal(initial) {
    const depth = Math.random();
    return {
      x: rand(-50, canvasW + 50),
      y: initial ? rand(-40, canvasH) : rand(-120, -20),
      size: 7 + depth * 15 + rand(0, 4),
      vy: rand(9, 19) + depth * 18,
      sway: rand(7, 19) + depth * 14,
      swayFreq: rand(0.25, 0.65),
      phase: rand(0, Math.PI * 2),
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.45, 0.45) * (0.5 + depth),
      flip: rand(0, Math.PI * 2),
      flipSpeed: rand(0.5, 1.6),
      alpha: 0.18 + depth * 0.34,
      wind: rand(-3.5, 7),
      sprite: pick(petalSprites),
    };
  }

  function createMote(initial) {
    return {
      x: rand(0, canvasW),
      y: initial ? rand(0, canvasH) : rand(canvasH + 10, canvasH + 90),
      size: rand(1.1, 3.4),
      vy: rand(4, 14),
      sway: rand(3, 12),
      phase: rand(0, Math.PI * 2),
      twinkleSpeed: rand(0.5, 1.8),
      alpha: rand(0.24, 0.72),
      sprite: pick(moteSprites),
    };
  }

  function seedParticles() {
    const narrow = canvasW < 760;
    const petalCount = narrow ? 16 : clamp(Math.round(canvasW / 46), 22, 36);
    const moteCount = narrow ? 24 : clamp(Math.round(canvasW / 28), 30, 60);

    petals = Array.from({ length: petalCount }, () => createPetal(true));
    motes = Array.from({ length: moteCount }, () => createMote(true));
    burstParticles = [];
  }

  function sizeCanvas() {
    if (!ctx || !canvas) return;

    const previousWidth = canvasW;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = Math.max(1, root.clientWidth || window.innerWidth);
    canvasH = Math.max(1, window.innerHeight);

    canvas.width = Math.round(canvasW * dpr);
    canvas.height = Math.round(canvasH * dpr);
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!previousWidth || Math.abs(previousWidth - canvasW) > 2) {
      seedParticles();
    }
  }

  function drawPetal(sprite, x, y, size, rotation, flip, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(0.22 + 0.78 * Math.abs(Math.cos(flip)), 1);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size * 1.12);
    ctx.restore();
  }

  function drawMote(sprite, x, y, size, alpha) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  }

  function updateParticles(dt) {
    for (const p of petals) {
      p.phase += p.swayFreq * dt;
      p.x += (Math.sin(p.phase) * p.sway + p.wind) * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      p.flip += p.flipSpeed * dt;

      if (p.y > canvasH + 50) {
        p.y = rand(-140, -30);
        p.x = rand(-40, canvasW + 40);
      }
      if (p.x < -100) p.x = canvasW + 60;
      if (p.x > canvasW + 100) p.x = -60;
    }

    for (const m of motes) {
      m.phase += m.twinkleSpeed * dt;
      m.x += Math.sin(m.phase * 0.7) * m.sway * dt;
      m.y -= m.vy * dt;

      if (m.y < -24) {
        m.y = canvasH + rand(10, 80);
        m.x = rand(0, canvasW);
      }
      if (m.x < -20) m.x = canvasW + 20;
      if (m.x > canvasW + 20) m.x = -20;
    }

    for (let i = burstParticles.length - 1; i >= 0; i -= 1) {
      const b = burstParticles[i];
      b.life -= dt;

      if (b.life <= 0) {
        burstParticles.splice(i, 1);
        continue;
      }

      b.vx *= Math.exp(-1.1 * dt);
      b.vy += 250 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.rotSpeed * dt;
      b.flip += b.flipSpeed * dt;
    }
  }

  function drawParticles() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasW, canvasH);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(m.phase));
      drawMote(m.sprite, m.x, m.y, m.size * 4, m.alpha * twinkle);
    }
    for (const b of burstParticles) {
      if (!b.gold) continue;
      const lifeRatio = clamp(b.life / b.ttl, 0, 1);
      drawMote(b.sprite, b.x, b.y, b.size * 4, lifeRatio * 0.9);
    }
    ctx.restore();

    for (const p of petals) {
      drawPetal(p.sprite, p.x, p.y, p.size, p.rot, p.flip, p.alpha);
    }

    for (const b of burstParticles) {
      if (b.gold) continue;
      const lifeRatio = clamp(b.life / b.ttl, 0, 1);
      drawPetal(
        b.sprite,
        b.x,
        b.y,
        b.size * (0.65 + 0.35 * lifeRatio),
        b.rot,
        b.flip,
        lifeRatio * 0.95
      );
    }
  }

  function frame(now) {
    if (!canvasRunning) return;

    const dt = clamp((now - lastFrame) / 1000, 0.001, 0.05);
    lastFrame = now;

    updateParticles(dt);
    drawParticles();

    rafId = window.requestAnimationFrame(frame);
  }

  function canRunCanvas() {
    return canvasReady && !reducedMotion && !doc.hidden && !dialogOpen;
  }

  function syncCanvas() {
    if (canRunCanvas()) {
      if (!canvasRunning) {
        canvasRunning = true;
        lastFrame = performance.now();
        rafId = window.requestAnimationFrame(frame);
      }
      return;
    }

    canvasRunning = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function burstAt(x, y, kind) {
    if (!canvasReady || reducedMotion) return;

    const goldOnly = kind === 'gold';
    const count = goldOnly ? 30 : 96;

    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const speed = goldOnly ? rand(45, 235) : rand(80, 430);
      const gold = goldOnly || Math.random() < 0.24;
      const ttl = rand(0.75, 1.9);

      burstParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (goldOnly ? 55 : 100),
        size: gold ? rand(1.2, 3.4) : rand(5, 15),
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-5, 5),
        flip: rand(0, Math.PI * 2),
        flipSpeed: rand(2, 7),
        life: ttl,
        ttl,
        gold,
        sprite: gold
          ? pick(moteSprites)
          : pick(petalSprites),
      });
    }

    if (burstParticles.length > 240) {
      burstParticles.splice(0, burstParticles.length - 240);
    }

    syncCanvas();
  }

  function initCanvas() {
    if (!canvas) return;

    try {
      ctx = canvas.getContext('2d');
    } catch (error) {
      ctx = null;
    }

    if (!ctx) {
      canvas.style.display = 'none';
      return;
    }

    canvasReady = true;
    initSprites();
    sizeCanvas();
    syncCanvas();

    let resizeTimer = 0;
    window.addEventListener(
      'resize',
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          sizeCanvas();
          if (loveLetter && loveLetter.classList.contains('is-open') && letterBody) {
            letterBody.style.maxHeight = 'none';
          }
          queueScrollUI();
        }, 140);
      },
      { passive: true }
    );

    doc.addEventListener('visibilitychange', syncCanvas);
  }

  /* ──────────────────────────  HERO GLOW  ────────────────────────── */

  function initHeroGlow() {
    if (!hero || !heroGlow) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let glowRaf = 0;
    let active = false;

    function renderGlow() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      heroGlow.style.left = currentX + 'px';
      heroGlow.style.top = currentY + 'px';

      if (Math.abs(targetX - currentX) > 0.4 || Math.abs(targetY - currentY) > 0.4) {
        glowRaf = window.requestAnimationFrame(renderGlow);
      } else {
        glowRaf = 0;
      }
    }

    hero.addEventListener(
      'pointermove',
      (event) => {
        if (reducedMotion || !finePointer.matches) return;

        const rect = hero.getBoundingClientRect();
        targetX = event.clientX - rect.left;
        targetY = event.clientY - rect.top;

        if (!active) {
          active = true;
          currentX = targetX;
          currentY = targetY;
          heroGlow.classList.add('is-active');
        }

        if (!glowRaf) {
          glowRaf = window.requestAnimationFrame(renderGlow);
        }
      },
      { passive: true }
    );

    hero.addEventListener(
      'pointerleave',
      () => {
        active = false;
        heroGlow.classList.remove('is-active');
        if (glowRaf) {
          window.cancelAnimationFrame(glowRaf);
          glowRaf = 0;
        }
      },
      { passive: true }
    );
  }

  /* ───────────────────────────  SCROLL  ─────────────────────────── */

  let scrollQueued = false;

  function updateScrollUI() {
    scrollQueued = false;

    const scrollTop = window.scrollY || root.scrollTop || 0;
    const maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
    const ratio = clamp(scrollTop / maxScroll, 0, 1);

    if (progressBar) {
      progressBar.style.transform = 'scaleX(' + ratio.toFixed(5) + ')';
    }

    const probe = window.innerHeight * 0.48;
    let activeId = sections.length ? sections[0].id : 'top';

    for (const section of sections) {
      if (section.getBoundingClientRect().top <= probe) {
        activeId = section.id;
      }
    }

    railLinks.forEach((link, id) => {
      const isActive = id === activeId;
      link.classList.toggle('is-active', isActive);

      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    if (!reducedMotion) {
      const viewportHeight = window.innerHeight;

      for (const element of parallaxEls) {
        const rect = element.getBoundingClientRect();

        if (rect.bottom < -viewportHeight * 0.2 || rect.top > viewportHeight * 1.2) {
          continue;
        }

        const strength = parseFloat(element.dataset.parallax) || 0.05;
        const delta = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
        const shift = clamp(delta * strength * 900, -56, 56);

        element.style.transform =
          'translate3d(0, ' + shift.toFixed(2) + 'px, 0) scale(1.09)';
      }
    }
  }

  function queueScrollUI() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateScrollUI);
  }

  function initScrollUI() {
    window.addEventListener('scroll', queueScrollUI, { passive: true });
    window.addEventListener('resize', queueScrollUI, { passive: true });
    window.addEventListener('load', queueScrollUI, { once: true });

    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(queueScrollUI).catch(() => {});
    }

    updateScrollUI();
  }

  /* ───────────────────────────  REVEALS  ─────────────────────────── */

  function initReveals() {
    const targets = Array.from(doc.querySelectorAll('[data-reveal], [data-lines]'));
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    targets.forEach((element) => observer.observe(element));
  }

  /* ────────────────────────────  GIFT  ──────────────────────────── */

  function initGift() {
    if (!giftButton || !hero) return;

    let busy = false;

    giftButton.addEventListener('click', () => {
      if (busy) return;
      busy = true;

      const rect = giftButton.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      const bloom = doc.createElement('span');
      bloom.className = 'bloom';
      bloom.setAttribute('aria-hidden', 'true');
      bloom.style.left = x + 'px';
      bloom.style.top = y + 'px';
      doc.body.appendChild(bloom);

      window.setTimeout(() => bloom.remove(), 1700);

      burstAt(x, y, 'petal');
      hero.classList.add('is-opening');

      window.setTimeout(
        () => {
          if (welcome) {
            welcome.scrollIntoView({
              behavior: reducedMotion ? 'auto' : 'smooth',
              block: 'start',
            });
          }
        },
        reducedMotion ? 80 : 940
      );

      window.setTimeout(
        () => {
          hero.classList.remove('is-opening');
          busy = false;
        },
        reducedMotion ? 350 : 3200
      );

      window.setTimeout(
        () => {
          if (welcomeHeading) {
            welcomeHeading.setAttribute('tabindex', '-1');
            welcomeHeading.focus({ preventScroll: true });
          }
        },
        reducedMotion ? 220 : 1650
      );
    });
  }

  /* ───────────────────────────  DIALOG  ─────────────────────────── */

  function initDialog() {
    if (!dialog) return;

    let lastFocused = null;
    let closing = false;

    if (dialogContent) {
      dialogContent.textContent = '';
    }

    function finalizeClose() {
      dialog.classList.remove('is-closing');
      doc.body.classList.remove('is-locked');
      dialogOpen = false;
      syncCanvas();

      const target = lastFocused;
      lastFocused = null;
      closing = false;

      if (target && target.isConnected) {
        window.requestAnimationFrame(() => {
          target.focus({ preventScroll: true });
        });
      }
    }

    function closeLetter() {
      if (!dialog.open || closing) return;

      closing = true;
      dialog.classList.add('is-closing');

      window.setTimeout(
        () => {
          if (!dialog.open) {
            closing = false;
            return;
          }

          if (typeof dialog.close === 'function') {
            dialog.close();
          } else {
            dialog.removeAttribute('open');
            finalizeClose();
          }
        },
        reducedMotion ? 20 : 330
      );
    }

    function openLetter(trigger) {
      if (dialog.open) return;

      const templateId = trigger.dataset.letter;
      const template = templateId ? doc.getElementById(templateId) : null;

      if (!template || !dialogContent) return;

      lastFocused = trigger;
      dialogContent.replaceChildren(template.content.cloneNode(true));

      if (dialogScroll) {
        dialogScroll.scrollTop = 0;
      }

      try {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      } catch (error) {
        dialog.setAttribute('open', '');
      }

      closing = false;
      dialog.classList.remove('is-closing');
      doc.body.classList.add('is-locked');
      dialogOpen = true;
      syncCanvas();

      if (dialogScroll) {
        dialogScroll.scrollTop = 0;
      }

      window.requestAnimationFrame(() => {
        if (dialogScroll) dialogScroll.scrollTop = 0;

        if (dialogCloseButton) {
          dialogCloseButton.focus({ preventScroll: true });
        }
      });
    }

    doc.querySelectorAll('.envelope[data-letter]').forEach((button) => {
      button.addEventListener('click', () => openLetter(button));
    });

    dialog.addEventListener('click', (event) => {
      const target = event.target;

      if (!(target instanceof Element)) return;

      if (target.closest('[data-dialog-close]')) {
        closeLetter();
        return;
      }

      if (!target.closest('.dialog-sheet')) {
        closeLetter();
      }
    });

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeLetter();
    });

    dialog.addEventListener('close', finalizeClose);
  }

  /* ───────────────────────────  GALLERY  ─────────────────────────── */

  function initGallery() {
    const gallery = doc.getElementById('gallery');
    const main = doc.querySelector('[data-gallery-main]');
    const lightbox = doc.getElementById('galleryDialog');

    if (!gallery || !main || !lightbox) return;

    const mainFigure = main.closest('.gallery-main');
    const mainImg = main.querySelector('[data-gallery-img]');

    const lightboxImg = lightbox.querySelector('[data-gallery-lightbox-img]');
    const lightboxCap = lightbox.querySelector('[data-gallery-lightbox-cap]');
    const lightboxCount = lightbox.querySelector('[data-gallery-lightbox-count]');
    const closeButton = lightbox.querySelector('[data-gallery-close]');
    const prevButton = lightbox.querySelector('[data-gallery-prev]');
    const nextButton = lightbox.querySelector('[data-gallery-next]');

    if (!mainFigure || !mainImg || !lightboxImg) return;

    let lastFocused = null;
    let current = 0;
    let closing = false;
    let started = false;
    let switchTimer = 0;
    let touchX = null;
    let touchY = null;

    const pad = (n) => String(n).padStart(2, '0');

    function collectItems() {
      const items = [];

      if (mainFigure.classList.contains('is-ready') && mainImg.getAttribute('src')) {
        items.push({
          src: mainImg.getAttribute('src'),
          title: main.dataset.galleryTitle || '',
          alt: mainImg.getAttribute('alt') || 'Ảnh của Giang',
          trigger: main.querySelector('[data-gallery-open]') || main,
        });
      }

      return items;
    }

    function setNav(items) {
      if (!prevButton || !nextButton) return;
      const multiple = items.length > 1;
      prevButton.hidden = !multiple;
      nextButton.hidden = !multiple;
    }

    function showItem(index, animate) {
      const items = collectItems();
      if (!items.length) return;

      current = (index + items.length) % items.length;
      const item = items[current];
      const apply = () => {
        lightboxImg.src = item.src;
        lightboxImg.alt = item.alt;
        lightboxImg.classList.remove('is-switching');

        if (lightboxCap) lightboxCap.textContent = item.title;
        if (lightboxCount) {
          lightboxCount.textContent = items.length > 1
            ? pad(current + 1) + ' / ' + pad(items.length)
            : '';
        }

        lightbox.setAttribute('aria-label', 'Xem ảnh của Giang, ảnh ' + (current + 1) + ' trên ' + items.length);
        setNav(items);
      };

      window.clearTimeout(switchTimer);

      if (animate && !reducedMotion) {
        lightboxImg.classList.add('is-switching');
        switchTimer = window.setTimeout(apply, 150);
      } else {
        apply();
      }
    }

    function openLightbox(trigger, index) {
      if (lightbox.open) return;

      const letterDialog = doc.getElementById('letterDialog');
      if (letterDialog && letterDialog.open) return;

      const items = collectItems();
      if (!items.length) return;

      lastFocused = trigger;
      closing = false;
      current = clamp(index, 0, items.length - 1);
      lightbox.classList.remove('is-closing');

      try {
        if (typeof lightbox.showModal === 'function') {
          lightbox.showModal();
        } else {
          lightbox.setAttribute('open', '');
        }
      } catch (error) {
        lightbox.setAttribute('open', '');
      }

      doc.body.classList.add('is-locked');
      dialogOpen = true;
      syncCanvas();

      showItem(current, false);

      window.requestAnimationFrame(() => {
        if (closeButton) closeButton.focus({ preventScroll: true });
      });
    }

    function finalizeClose() {
      lightbox.classList.remove('is-closing');
      closing = false;

      if (!doc.querySelector('dialog[open]')) {
        doc.body.classList.remove('is-locked');
      }

      dialogOpen = Boolean(doc.querySelector('dialog[open]'));
      syncCanvas();

      const target = lastFocused;
      lastFocused = null;

      if (target && target.isConnected) {
        window.requestAnimationFrame(() => {
          target.focus({ preventScroll: true });
        });
      }
    }

    function closeLightbox() {
      if (!lightbox.open || closing) return;

      closing = true;
      lightbox.classList.add('is-closing');

      window.setTimeout(
        () => {
          if (!lightbox.open) {
            closing = false;
            return;
          }

          if (typeof lightbox.close === 'function') {
            lightbox.close();
          } else {
            lightbox.removeAttribute('open');
            finalizeClose();
          }
        },
        reducedMotion ? 20 : 300
      );
    }

    main.addEventListener('click', (event) => {
      if (!mainFigure.classList.contains('is-ready')) return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-gallery-open]')) return;

      const zoom = main.querySelector('[data-gallery-open]');
      openLightbox(zoom || main, 0);
    });

    const zoomButton = main.querySelector('[data-gallery-open]');
    if (zoomButton) {
      zoomButton.addEventListener('click', () => openLightbox(zoomButton, 0));
    }

    if (closeButton) {
      closeButton.addEventListener('click', closeLightbox);
    }

    if (prevButton) {
      prevButton.addEventListener('click', () => showItem(current - 1, true));
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => showItem(current + 1, true));
    }

    lightbox.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest('.gallery-dialog__stage')) closeLightbox();
    });

    lightbox.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeLightbox();
    });

    lightbox.addEventListener('close', finalizeClose);

    lightbox.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showItem(current - 1, true);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        showItem(current + 1, true);
      }
    });

    lightboxImg.addEventListener('load', () => {
      lightboxImg.classList.remove('is-switching');
    });

    const figure = lightbox.querySelector('.gallery-dialog__figure');
    if (figure) {
      figure.addEventListener(
        'touchstart',
        (event) => {
          if (event.touches.length !== 1) return;
          touchX = event.touches[0].clientX;
          touchY = event.touches[0].clientY;
        },
        { passive: true }
      );

      figure.addEventListener(
        'touchend',
        (event) => {
          if (touchX === null || touchY === null || !event.changedTouches.length) return;

          const dx = event.changedTouches[0].clientX - touchX;
          const dy = event.changedTouches[0].clientY - touchY;
          touchX = null;
          touchY = null;

          if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
          if (collectItems().length < 2) return;

          showItem(current + (dx < 0 ? 1 : -1), true);
        },
        { passive: true }
      );
    }

    async function imageExists(src) {
      if (!src) return false;
      if (window.location.protocol === 'file:') return true;

      try {
        const response = await fetch(src, { method: 'HEAD', cache: 'no-store' });
        return response.ok;
      } catch (error) {
        return false;
      }
    }

    async function loadSlot(src, img, frame) {
      if (!src || !img) return false;

      const exists = await imageExists(src);
      if (!exists) return false;

      return new Promise((resolve) => {
        img.addEventListener(
          'load',
          () => {
            frame.classList.add('is-ready');
            resolve(true);
          },
          { once: true }
        );

        img.addEventListener(
          'error',
          () => {
            frame.classList.remove('is-ready');
            resolve(false);
          },
          { once: true }
        );

        // Thẻ ảnh nằm trong khung còn ẩn: bỏ lazy để trình duyệt tải thật sự.
        img.removeAttribute('loading');
        img.src = src;
      });
    }

    async function startLoading() {
      if (started) return;
      started = true;

      const jobs = [
        loadSlot(main.dataset.galleryMain, mainImg, mainFigure).then((ok) => {
          if (ok) mainImg.alt = 'Một khoảnh khắc của Giang';
          return ok;
        }),
      ];

      await Promise.allSettled(jobs);
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          startLoading();
        },
        { rootMargin: '500px 0px', threshold: 0 }
      );

      observer.observe(gallery);
    } else {
      startLoading();
    }
  }

  /* ────────────────────────────  SEAL  ──────────────────────────── */

  function initSeal() {
    if (!loveLetter || !sealButton || !letterBody) return;

    let opened = false;

    sealButton.addEventListener('click', () => {
      if (opened) return;
      opened = true;

      const rect = sealButton.getBoundingClientRect();
      burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 'gold');

      sealButton.setAttribute('aria-expanded', 'true');
      loveLetter.classList.add('is-seal-opening');

      const contentHeight = letterBody.scrollHeight;
      letterBody.style.maxHeight = '0px';

      loveLetter.classList.add('is-open');
      letterBody.setAttribute('aria-hidden', 'false');
      letterBody.setAttribute('tabindex', '-1');

      if (sealStatus) {
        sealStatus.textContent = 'Lá thư đã mở. Giang thân mến,';
      }

      // Force the browser to register max-height: 0 before expanding.
      void letterBody.offsetHeight;

      window.requestAnimationFrame(() => {
        letterBody.style.maxHeight = contentHeight + 'px';
      });

      let expanded = false;
      const finishExpansion = () => {
        if (expanded) return;
        expanded = true;
        letterBody.style.maxHeight = 'none';
      };

      letterBody.addEventListener('transitionend', function onTransitionEnd(event) {
        if (event.propertyName !== 'max-height') return;
        finishExpansion();
        letterBody.removeEventListener('transitionend', onTransitionEnd);
      });

      window.setTimeout(finishExpansion, reducedMotion ? 60 : 1500);

      window.setTimeout(
        () => {
          loveLetter.classList.remove('is-seal-opening');
        },
        reducedMotion ? 60 : 1200
      );

      window.setTimeout(
        () => {
          if (!dialogOpen) {
            letterBody.focus({ preventScroll: true });
          }
        },
        reducedMotion ? 80 : 900
      );
    });
  }

  /* ──────────────────────────  MOTION PREFS  ────────────────────────── */

  function applyMotionPreference() {
    if (reducedMotion) {
      parallaxEls.forEach((element) => {
        element.style.transform = '';
      });

      if (heroGlow) {
        heroGlow.classList.remove('is-active');
      }
    }

    syncCanvas();
    queueScrollUI();
  }

  function initMotionPreference() {
    const onChange = (event) => {
      reducedMotion = event.matches;
      applyMotionPreference();
    };

    if (typeof reduceQuery.addEventListener === 'function') {
      reduceQuery.addEventListener('change', onChange);
    } else if (typeof reduceQuery.addListener === 'function') {
      reduceQuery.addListener(onChange);
    }
  }

  /* ────────────────────────────  BOOT  ──────────────────────────── */

  let booted = false;

  function boot() {
    if (booted) return;
    booted = true;

    initCanvas();
    initHeroGlow();
    initScrollUI();
    initReveals();
    initGift();
    initGallery();
    initDialog();
    initSeal();
    initMotionPreference();
    applyMotionPreference();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
