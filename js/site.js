(function () {
  var section = document.getElementById('deps');
  if (!section) return;

  var viewport = section.querySelector('.deps-viewport');
  var track = section.querySelector('.deps-track');
  if (!viewport || !track) return;

  var motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrowMq = window.matchMedia('(max-width: 899px)');

  var current = 0;
  var target = 0;
  var maxShift = 0;
  var raf = 0;
  var enabled = false;
  var LERP = 0.14;

  function canAnimate() {
    return !motionMq.matches && !narrowMq.matches;
  }

  function measure() {
    var prev = track.style.transform;
    track.style.transform = 'none';
    maxShift = Math.max(0, track.scrollWidth - viewport.clientWidth);
    track.style.transform = prev;
  }

  function progress() {
    var rect = viewport.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var start = vh;
    var end = Math.min(96, vh * 0.1);
    var p = (start - rect.top) / (start - end);
    if (p < 0) return 0;
    if (p > 1) return 1;
    return p;
  }

  function tick() {
    current += (target - current) * LERP;
    if (Math.abs(target - current) < 0.3) current = target;
    track.style.transform = 'translate3d(' + current + 'px,0,0)';
    if (current !== target) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  }

  function updateTarget() {
    if (!enabled) return;
    target = -maxShift * progress();
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function enable() {
    enabled = true;
    section.classList.add('deps-linked');
    viewport.scrollLeft = 0;
    measure();
    current = -maxShift * progress();
    target = current;
    track.style.transform = 'translate3d(' + current + 'px,0,0)';
  }

  function disable() {
    enabled = false;
    section.classList.remove('deps-linked');
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    current = 0;
    target = 0;
    track.style.transform = '';
  }

  function syncMode() {
    if (canAnimate()) enable();
    else disable();
  }

  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      syncMode();
      if (enabled) {
        measure();
        updateTarget();
      }
    }, 80);
  }

  window.addEventListener('scroll', updateTarget, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  if (motionMq.addEventListener) {
    motionMq.addEventListener('change', syncMode);
    narrowMq.addEventListener('change', syncMode);
  } else {
    motionMq.addListener(syncMode);
    narrowMq.addListener(syncMode);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (enabled) {
        measure();
        updateTarget();
      }
    });
  }

  syncMode();
})();

/* ---------- Мобильное меню (бургер) ---------- */
(function () {
  var header = document.querySelector('header.top .wrap');
  if (!header) return;
  var right = header.querySelector('.h-side.r') || header;

  var burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'burger';
  burger.setAttribute('aria-label', 'Открыть меню');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-controls', 'mnav');
  burger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  right.appendChild(burger);

  var links = Array.prototype.slice.call(header.querySelectorAll('nav.main a'));
  var logo = header.querySelector('.logo');
  var eye = header.querySelector('.eye-btn');
  var cta = header.querySelector('.h-side.r .btn');
  var util = document.querySelector('.util .wrap');
  var phone = util && util.querySelector('.ph-top');
  var utilLinks = util ? Array.prototype.slice.call(util.querySelectorAll('a:not(.ph-top)')) : [];
  var addr = util && util.querySelector('span');

  var panel = document.createElement('div');
  panel.className = 'mnav';
  panel.id = 'mnav';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Меню сайта');

  var top = document.createElement('div');
  top.className = 'mnav-top';
  if (logo) {
    var l = document.createElement('a');
    l.href = logo.getAttribute('href');
    var img = logo.querySelector('img');
    if (img) l.appendChild(img.cloneNode(true));
    top.appendChild(l);
  }
  var close = document.createElement('button');
  close.type = 'button';
  close.className = 'mnav-close';
  close.setAttribute('aria-label', 'Закрыть меню');
  close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  top.appendChild(close);
  panel.appendChild(top);

  var body = document.createElement('div');
  body.className = 'mnav-body';
  var nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Основное меню');
  links.forEach(function (a) { nav.appendChild(a.cloneNode(true)); });
  body.appendChild(nav);

  if (eye) {
    var e = document.createElement('a');
    e.className = 'm-eye';
    e.href = eye.getAttribute('href');
    var svg = eye.querySelector('svg');
    if (svg) e.appendChild(svg.cloneNode(true));
    e.appendChild(document.createTextNode('Для слабовидящих'));
    body.appendChild(e);
  }

  var c = document.createElement('div');
  c.className = 'm-contacts';
  if (phone) { var p = phone.cloneNode(true); p.className = 'm-ph'; c.appendChild(p); }
  utilLinks.slice().reverse().forEach(function (a) { c.appendChild(a.cloneNode(true)); });
  if (addr) { var s = document.createElement('span'); s.textContent = addr.textContent; c.appendChild(s); }
  body.appendChild(c);

  if (cta) {
    var w = document.createElement('div');
    w.className = 'm-cta';
    w.appendChild(cta.cloneNode(true));
    body.appendChild(w);
  }
  panel.appendChild(body);
  document.body.appendChild(panel);

  function setOpen(open) {
    panel.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.classList.toggle('menu-open', open);
    if (open) close.focus(); else burger.focus();
  }
  burger.addEventListener('click', function () { setOpen(!panel.classList.contains('open')); });
  close.addEventListener('click', function () { setOpen(false); });
  panel.addEventListener('click', function (ev) { if (ev.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && panel.classList.contains('open')) setOpen(false);
  });
  window.matchMedia('(min-width: 75em)').addEventListener('change', function (m) {
    if (m.matches && panel.classList.contains('open')) setOpen(false);
  });
})();

/* ---------- Расписание на узких экранах: показать сегодняшний день ---------- */
(function () {
  var week = document.querySelector('.week');
  var today = week && week.querySelector('.dh.today');
  if (!today) return;
  function go() {
    if (week.scrollWidth <= week.clientWidth + 1) return;
    var axis = week.querySelector('.axis');
    week.scrollLeft += today.getBoundingClientRect().left - week.getBoundingClientRect().left - (axis ? axis.offsetWidth : 0);
  }
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();
