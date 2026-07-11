/* =============================================================
   whishess — LUXURY INTERACTION ENGINE (vanilla JS, no libs)
   Injects atmosphere + particles (no HTML edits required),
   drives scroll reveal, magnetic buttons, 3D tilt, counters,
   cursor light, parallax, and the page-load sequence.
   All animation work is transform/opacity based for 60fps.
   ============================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  root.classList.add('wf-anim');

  /* ---------- helpers ---------- */
  function make(cls, parent) {
    var el = document.createElement('div');
    if (cls) el.className = cls;
    (parent || document.body).appendChild(el);
    return el;
  }
  var lerp = function (a, b, n) { return (1 - n) * a + n * b; };

  /* ---------- 1. Atmosphere layers (no HTML changes) ---------- */
  make('wf-bg-atmos');
  make('wf-bg-blob b1');
  make('wf-bg-blob b2');
  make('wf-bg-blob b3');
  make('wf-bg-noise');
  var progress = make('wf-progress');
  var cursorGlow = (fine && !reduceMotion) ? make('wf-cursor-glow') : null;

  /* ---------- 2. Hero particles ---------- */
  if (!reduceMotion) {
    var hero = document.querySelector('.wf-hero');
    if (hero) {
      if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
      var pWrap = document.createElement('div');
      pWrap.className = 'wf-particles';
      var count = window.innerWidth < 640 ? 14 : 26;
      for (var i = 0; i < count; i++) {
        var p = document.createElement('span');
        p.className = 'wf-particle';
        var size = (Math.random() * 5 + 2).toFixed(1);
        p.style.left = (Math.random() * 100).toFixed(2) + '%';
        p.style.setProperty('--s', size + 'px');
        p.style.setProperty('--d', (Math.random() * 10 + 10).toFixed(1) + 's');
        p.style.setProperty('--delay', (-Math.random() * 14).toFixed(1) + 's');
        p.style.setProperty('--x', (Math.random() * 80 - 40).toFixed(0) + 'px');
        pWrap.appendChild(p);
      }
      hero.appendChild(pWrap);
    }
  }

  /* ---------- 3. Scroll reveal (tag elements, then observe) ---------- */
  var revealMap = [
    ['.wf-hero > div', ''], ['.wf-hero-visual', 'zoom'],
    ['.wf-stat', ''],
    ['.wf-video-copy', 'left'], ['.wf-video-card', 'right'], ['.wf-video-points span', ''],
    ['.wf-section > .wf-section-eyebrow', ''], ['.wf-section > h2', ''],
    ['.wf-service-card', ''],
    ['.wf-about-story', 'left'], ['.wf-about-card', 'right'],
    ['.wf-about-card .wf-about-value', ''],
    ['.wf-process > .wf-section-eyebrow', ''], ['.wf-process > h2', ''],
    ['.wf-process .wf-step', ''],
    ['.wf-faq > .wf-section-eyebrow', ''], ['.wf-faq > h2', ''], ['.wf-faq-item', ''],
    ['.wf-contact-info', 'left'], ['.wf-contact-form', 'right'],
    ['.wf-footer > div', ''],
    ['.wf-shell > h1', ''], ['.wf-shell > .wf-lead', ''],
    ['.wf-grid > *', ''], ['.wf-steps > .wf-step', ''], ['.wf-shell > section', '']
  ];
  var revealEls = [];
  if (!reduceMotion) {
    revealMap.forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        if (el.hasAttribute('data-wf-reveal')) return;
        el.setAttribute('data-wf-reveal', pair[1]);
        revealEls.push(el);
      });
    });
    // staggered delay among revealing siblings
    revealEls.forEach(function (el) {
      var p = el.parentElement; if (!p) return;
      var sibs = Array.prototype.filter.call(p.children, function (c) {
        return c.hasAttribute && c.hasAttribute('data-wf-reveal');
      });
      var idx = sibs.indexOf(el);
      if (idx > 0) el.style.setProperty('--wf-delay', Math.min(idx, 6) * 85 + 'ms');
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('wf-in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('wf-in'); });
    }
  }

  /* ---------- 4. Counter animation for stats ---------- */
  function animateCount(el) {
    var raw = el.textContent.trim();
    var m = raw.match(/^(\d+)([%+]?)$/);
    if (!m) return;
    var target = parseInt(m[1], 10), suffix = m[2], dur = 1500, start = null;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var statNums = document.querySelectorAll('.wf-stat-number');
  if (statNums.length && !reduceMotion && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    statNums.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- 5. Magnetic buttons ---------- */
  if (fine && !reduceMotion) {
    document.querySelectorAll('.wf-cta-btn, .wf-nav-cta').forEach(function (btn) {
      var strength = 0.35;
      btn.addEventListener('mousemove', function (ev) {
        var r = btn.getBoundingClientRect();
        var x = ev.clientX - r.left - r.width / 2;
        var y = ev.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + (x * strength) + 'px,' + (y * strength) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* ---------- 6. 3D tilt + spotlight on cards ---------- */
  if (fine && !reduceMotion) {
    var tiltSel = '.wf-service-card, .wf-card, .wf-shot, .wf-about-card, .wf-video-card';
    document.querySelectorAll(tiltSel).forEach(function (card) {
      var max = 7;
      card.addEventListener('mouseenter', function () {
        card.style.transition = 'transform 0.12s ease-out, box-shadow 0.4s ease, border-color 0.4s ease';
      });
      card.addEventListener('mousemove', function (ev) {
        var r = card.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width;
        var py = (ev.clientY - r.top) / r.height;
        var rx = (0.5 - py) * max;
        var ry = (px - 0.5) * max;
        card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-6px)';
        card.style.setProperty('--cx', (px * 100) + '%');
        card.style.setProperty('--cy', (py * 100) + '%');
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform 0.55s cubic-bezier(0.22,0.61,0.36,1), box-shadow 0.4s ease, border-color 0.4s ease';
        card.style.transform = '';
      });
    });
  }

  /* ---------- 7. Cursor light + nav state + progress + parallax (one rAF) ---------- */
  var mx = window.innerWidth / 2, my = window.innerHeight * 0.3;
  var cgx = mx, cgy = my;
  var nav = document.querySelector('.wf-nav');
  var blobs = document.querySelectorAll('.wf-bg-blob');
  var lastScroll = -1, ticking = false;

  if (fine && !reduceMotion) {
    window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  }

  function frame() {
    // cursor glow follows with easing
    if (cursorGlow) {
      cgx = lerp(cgx, mx, 0.12);
      cgy = lerp(cgy, my, 0.12);
      root.style.setProperty('--wf-mx', cgx + 'px');
      root.style.setProperty('--wf-my', cgy + 'px');
    }
    requestAnimationFrame(frame);
  }
  if (cursorGlow) requestAnimationFrame(frame);

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      if (nav) nav.classList.toggle('wf-scrolled', y > 24);
      if (!reduceMotion) {
        for (var i = 0; i < blobs.length; i++) {
          blobs[i].style.transform = 'translateY(' + (y * (0.04 + i * 0.03)) + 'px)';
        }
      }
      lastScroll = y;
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 7b. Custom select (luxury dropdown) ---------- */
  function initCustomSelects() {
    document.querySelectorAll('select.wf-select').forEach(function (sel) {
      if (sel.dataset.wfCustomized) return;
      sel.dataset.wfCustomized = '1';
      sel.classList.add('wf-select-native');

      var wrap = document.createElement('div');
      wrap.className = 'wf-custom-select';
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);

      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'wf-custom-select-trigger wf-input';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');

      var menu = document.createElement('ul');
      menu.className = 'wf-custom-select-menu';
      menu.setAttribute('role', 'listbox');

      var placeholder = 'Select an option';
      var optionEls = [];

      Array.prototype.forEach.call(sel.options, function (opt) {
        if (opt.disabled && !opt.value) placeholder = opt.textContent.trim();
        var li = document.createElement('li');
        li.className = 'wf-custom-select-option';
        li.setAttribute('role', 'option');
        li.textContent = opt.textContent.trim();
        li.dataset.value = opt.value !== undefined && opt.value !== '' ? opt.value : opt.textContent.trim();
        if (opt.disabled && !opt.value) {
          li.classList.add('is-placeholder');
          return;
        }
        li.addEventListener('click', function () {
          sel.value = opt.value !== undefined && opt.value !== '' ? opt.value : opt.textContent.trim();
          syncSelect();
          closeMenu();
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        });
        menu.appendChild(li);
        optionEls.push(li);
      });

      function syncSelect() {
        var opt = sel.options[sel.selectedIndex];
        var empty = !sel.value || (opt && opt.disabled);
        trigger.textContent = empty ? placeholder : opt.textContent.trim();
        trigger.classList.toggle('is-placeholder', empty);
        optionEls.forEach(function (li) {
          li.classList.toggle('is-selected', li.dataset.value === sel.value && sel.value !== '');
          li.classList.remove('is-focused');
        });
      }

      function openMenu() {
        wrap.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }

      function closeMenu() {
        wrap.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        optionEls.forEach(function (li) { li.classList.remove('is-focused'); });
      }

      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        if (wrap.classList.contains('is-open')) closeMenu();
        else openMenu();
      });

      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        }
        if (e.key === 'Escape') closeMenu();
      });

      document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) closeMenu();
      });

      sel.addEventListener('change', syncSelect);
      wrap.appendChild(trigger);
      wrap.appendChild(menu);
      syncSelect();
    });
  }
  initCustomSelects();

  /* ---------- 7c. Back to top (above AI assistant) ---------- */
  function initBackToTop() {
    var existing = document.querySelector('.wf-back-to-top');
    var anchor = document.querySelector('.wf-ai-btn');

    if (existing) {
      if (anchor && anchor.parentNode && existing !== anchor) {
        anchor.parentNode.insertBefore(existing, anchor);
      }
      return;
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wf-back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M12 19V5"/><path d="m7 10 5-5 5 5"/></svg>';

    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor);
    else document.body.appendChild(btn);

    function toggle() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      btn.classList.toggle('is-visible', y > 420);
    }

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
  }
  initBackToTop();
  document.addEventListener('whishess:ai-ready', initBackToTop);

  /* ---------- 8. Page-load sequence (script is deferred, DOM is ready) ---------- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('wf-loaded'); });
  });
})();
