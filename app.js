(function () {
  'use strict';

  var track = document.getElementById('track');
  var viewport = document.getElementById('viewport');
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var total = pages.length;
  var index = 0;

  var curEl = document.getElementById('cur');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var dotsBox = document.getElementById('dots');

  /* ---------- 进度条 ---------- */
  var bar = document.createElement('div');
  bar.className = 'progress';
  document.getElementById('navbar').appendChild(bar);

  /* ---------- 圆点导航 ---------- */
  pages.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', '第 ' + (i + 1) + ' 页');
    b.addEventListener('click', function () { go(i); });
    dotsBox.appendChild(b);
  });
  var dots = Array.prototype.slice.call(dotsBox.children);

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function go(i, silent) {
    index = Math.max(0, Math.min(total - 1, i));
    track.style.transform = '';
    track.style.setProperty('--i', index);
    pages.forEach(function (p, k) { p.classList.toggle('active', k === index); });
    dots.forEach(function (d, k) { d.classList.toggle('on', k === index); });
    curEl.textContent = pad(index + 1);
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === total - 1;
    bar.style.width = ((index + 1) / total * 100) + '%';
    /* 页9场景在滑动进入时同步昼夜状态 */
    if (pages[index].classList.contains('page--p9')) {
      document.getElementById('p9scene').classList.toggle('dusk', document.getElementById('duskToggle').checked);
      document.querySelector('.page--p9').classList.toggle('dusk', document.getElementById('duskToggle').checked);
    }
    syncFilm(index);
  }

  function next() { if (index < total - 1) go(index + 1); }
  function prev() { if (index > 0) go(index - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  document.querySelectorAll('[data-next]').forEach(function (el) {
    el.addEventListener('click', next);
  });

  /* ---------- 手势滑动 ---------- */
  var startX = 0, startY = 0, dx = 0, dragging = false, axis = null, moved = false;
  var suppressClick = false;

  viewport.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('.stage-scroll')) return;
    dragging = true;
    moved = false;
    axis = null;
    dx = 0;
    startX = e.clientX;
    startY = e.clientY;
    track.classList.add('dragging');
  });

  viewport.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    dx = e.clientX - startX;
    var dy = e.clientY - startY;

    if (!axis) {
      if (Math.abs(dx) > 9 || Math.abs(dy) > 9) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      } else {
        return;
      }
    }
    if (axis !== 'x') return;

    moved = true;
    var w = viewport.clientWidth;
    var edge = (index === 0 && dx > 0) || (index === total - 1 && dx < 0);
    var dist = edge ? dx * 0.28 : dx;
    if (Math.abs(dist) > w * 0.34) dist = (dist > 0 ? 1 : -1) * (w * 0.34 + (Math.abs(dist) - w * 0.34) * 0.3);
    track.style.transform = 'translate3d(calc(' + (-index * 100) + '% + ' + dist + 'px), 0, 0)';
    if (Math.abs(dx) > 12) e.preventDefault();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    var w = viewport.clientWidth;
    if (moved && Math.abs(dx) > w * 0.15) {
      if (dx < 0) next(); else prev();
    } else {
      track.style.transform = '';
    }
    if (moved) {
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 60);
    }
    dx = 0;
    axis = null;
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  document.addEventListener('click', function (e) {
    if (suppressClick) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  /* ---------- 滚轮 / 键盘 ---------- */
  var wheelLock = 0;
  viewport.addEventListener('wheel', function (e) {
    var t = Date.now();
    if (t - wheelLock < 700) return;
    if (Math.abs(e.deltaY) < 12 && Math.abs(e.deltaX) < 12) return;
    wheelLock = t;
    var forward = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX > 0 : e.deltaY > 0;
    if (forward) next(); else prev();
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { prev(); }
    if (e.key === 'Home') { go(0); }
  });

  /* ---------- 04 长按拉坯 ---------- */
  var wheel = document.getElementById('wheel');
  var wheelNote = wheel.querySelector('.wheel-note');
  var pressStart = 0, rafId = null, pressing = false, thrown = false, justCompleted = false;

  function setP(v) { wheel.style.setProperty('--p', Math.min(1, v).toFixed(3)); }

  function tick() {
    var elapsed = performance.now() - pressStart;
    var p = elapsed / 1800;
    setP(p);
    if (p >= 1) {
      finishThrow();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function startPress(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (thrown) return;
    pressing = true;
    wheel.classList.add('pressing');
    pressStart = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function finishThrow() {
    cancelAnimationFrame(rafId);
    rafId = null;
    pressing = false;
    thrown = true;
    justCompleted = true;
    setP(1);
    wheel.classList.remove('pressing');
    wheel.classList.add('done');
    wheelNote.textContent = '坯成了 · 圆润端正';
    if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
  }

  function cancelPress() {
    if (!pressing) return;
    pressing = false;
    cancelAnimationFrame(rafId);
    rafId = null;
    wheel.classList.remove('pressing');
    if (!thrown) {
      var cur = parseFloat(getComputedStyle(wheel).getPropertyValue('--p')) || 0;
      setP(cur);
      setTimeout(function () { if (!pressing && !thrown) setP(0); }, 60);
    }
  }

  wheel.addEventListener('pointerdown', startPress);
  wheel.addEventListener('pointerup', cancelPress);
  wheel.addEventListener('pointerleave', cancelPress);
  wheel.addEventListener('pointercancel', cancelPress);
  wheel.addEventListener('click', function (e) {
    if (justCompleted) {
      e.preventDefault();
      justCompleted = false;
      return;
    }
    if (thrown) {
      e.preventDefault();
      thrown = false;
      setP(0);
      wheel.classList.remove('done');
      wheelNote.textContent = '长按，让泥立起来';
    }
  });

  /* ---------- 05 青花点染 ---------- */
  var vase = document.getElementById('paintVase');
  var inkStrokes = Array.prototype.slice.call(document.querySelectorAll('.ink-stroke'));
  var paintBtn = document.getElementById('paintBtn');
  var brush = document.getElementById('brush');
  var painted = 0;

  var brushMoves = [
    { x: 190, y: 128, r: -18 },
    { x: 196, y: 112, r: -8 },
    { x: 182, y: 190, r: -32 },
    { x: 168, y: 168, r: -20 },
    { x: 160, y: 176, r: -14 },
    { x: 196, y: 176, r: -26 },
    { x: 178, y: 200, r: -34 },
    { x: 188, y: 110, r: -6 }
  ];

  function paint() {
    if (painted >= inkStrokes.length) {
      inkStrokes.forEach(function (s) { s.classList.remove('on'); });
      painted = 0;
      paintBtn.textContent = '点一笔青花';
      return;
    }
    inkStrokes[painted].classList.add('on');
    var m = brushMoves[painted % brushMoves.length];
    brush.style.transform = 'translate(' + m.x + 'px,' + m.y + 'px) rotate(' + m.r + 'deg)';
    painted++;
    if (painted >= inkStrokes.length) paintBtn.textContent = '重新落笔';
    if (navigator.vibrate) navigator.vibrate(8);
  }

  paintBtn.addEventListener('click', paint);
  vase.addEventListener('click', paint);

  /* ---------- 06 窑变 ---------- */
  var fireBtn = document.getElementById('fireBtn');
  var page6 = document.querySelector('.page--p6');
  var chip = document.getElementById('chip');
  var chipName = document.getElementById('chipName');
  var jarWrap = document.getElementById('jarWrap');

  var glazes = [
    { name: '祭红', c: ['#c2543f', '#8c1f1c', '#5b1214'] },
    { name: '天青', c: ['#d3e6de', '#9fbdb6', '#6f8f95'] },
    { name: '窑变紫', c: ['#8d5a8c', '#5b3a6e', '#33224a'] },
    { name: '茶叶末', c: ['#b3a36c', '#8a7b4a', '#4f472c'] },
    { name: '郎窑红', c: ['#d97a4e', '#a8341f', '#6d1a12'] }
  ];
  var gi = 0;

  function applyGlaze(i) {
    var g = glazes[i];
    page6.style.setProperty('--g1', g.c[0]);
    page6.style.setProperty('--g2', g.c[1]);
    page6.style.setProperty('--g3', g.c[2]);
    chip.style.setProperty('--chip', g.c[1]);
    chipName.textContent = g.name;
  }

  fireBtn.addEventListener('click', function () {
    gi = (gi + 1) % glazes.length;
    jarWrap.classList.remove('firing');
    void jarWrap.offsetWidth;
    jarWrap.classList.add('firing');
    applyGlaze(gi);
    if (navigator.vibrate) navigator.vibrate(12);
  });
  applyGlaze(0);

  /* ---------- 07 四大名瓷 ---------- */
  var tabData = [
    { k: '青花', d: '青花：钴料绘坯，罩釉一次烧成，蓝白相生。' },
    { k: '玲珑', d: '玲珑：坯体镂空填釉，透光见影，如窗含月。' },
    { k: '粉彩', d: '粉彩：玻璃白打底，柔润粉调，一器一画。' },
    { k: '颜色釉', d: '颜色釉：入窑一色，出窑万彩，全凭火候。' }
  ];
  var tabs = document.getElementById('tabs');
  var p7desc = document.getElementById('p7desc');
  var vases = Array.prototype.slice.call(document.querySelectorAll('.vase-item'));

  tabs.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    var i = parseInt(btn.getAttribute('data-tab'), 10);
    tabs.querySelectorAll('button').forEach(function (b, k) { b.classList.toggle('on', k === i); });
    vases.forEach(function (v, k) {
      v.classList.toggle('on', k === i);
      v.classList.toggle('dim', k !== i);
    });
    p7desc.classList.add('fade');
    setTimeout(function () {
      p7desc.textContent = tabData[i].d;
      p7desc.classList.remove('fade');
    }, 170);
  });

  /* ---------- 08 工序 ---------- */
  var stageData = [
    { n: 5, label: '采石 · 取高岭土' },
    { n: 7, label: '制泥 · 淘洗陈腐' },
    { n: 12, label: '拉坯 · 定器之形' },
    { n: 9, label: '利坯 · 修足削壁' },
    { n: 6, label: '施釉 · 蘸吹荡釉' },
    { n: 15, label: '绘瓷 · 勾染分水' },
    { n: 8, label: '装匣 · 匣钵护烧' },
    { n: 10, label: '烧成 · 火候定色' }
  ];
  var stageScroll = document.getElementById('stageScroll');
  var stageCards = Array.prototype.slice.call(stageScroll.querySelectorAll('.stage-card'));
  var stageNum = document.getElementById('stageNum');
  var stageName = document.getElementById('stageName');
  var stageTotal = 0;

  function animateNum(to) {
    var from = stageTotal;
    stageTotal = to;
    var t0 = performance.now();
    (function step(t) {
      var k = Math.min(1, (t - t0) / 320);
      var v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      stageNum.textContent = v;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  stageTotal = 5;

  stageScroll.addEventListener('click', function (e) {
    var card = e.target.closest('.stage-card');
    if (!card) return;
    var i = parseInt(card.getAttribute('data-stage'), 10);
    stageCards.forEach(function (c, k) { c.classList.toggle('on', k === i); });
    animateNum(stageData[i].n);
    stageName.textContent = stageData[i].label;
  });

  /* 工序卡横向拖动（触屏原生滚动之外，鼠标也可拖） */
  var scrollDrag = false, sx = 0, sl = 0;
  stageScroll.addEventListener('pointerdown', function (e) {
    scrollDrag = true; sx = e.clientX; sl = stageScroll.scrollLeft;
  });
  stageScroll.addEventListener('pointermove', function (e) {
    if (!scrollDrag) return;
    var d = e.clientX - sx;
    if (Math.abs(d) > 4) {
      stageScroll.scrollLeft = sl - d;
      if (e.cancelable) e.preventDefault();
    }
  });
  stageScroll.addEventListener('pointerup', function () { scrollDrag = false; });
  stageScroll.addEventListener('pointerleave', function () { scrollDrag = false; });

  /* ---------- 09 窑火 ---------- */
  var duskToggle = document.getElementById('duskToggle');
  var page9 = document.querySelector('.page--p9');
  var p9scene = document.getElementById('p9scene');
  var switchLabel = document.getElementById('switchLabel');
  var glow = p9scene.querySelector('.glow');

  duskToggle.addEventListener('change', function () {
    var on = duskToggle.checked;
    page9.classList.toggle('dusk', on);
    p9scene.classList.toggle('dusk', on);
    glow.style.transition = 'opacity .8s ease';
    glow.setAttribute('opacity', on ? '1' : '0');
    switchLabel.textContent = on ? '天亮了，窑火未熄' : '入夜，把窑火点亮';
    if (navigator.vibrate) navigator.vibrate(10);
  });

  /* ---------- 10 尾页 ---------- */
  document.getElementById('homeBtn').addEventListener('click', function () { go(0); });
  document.getElementById('againBtn').addEventListener('click', function () {
    /* 重置互动 */
    thrown = false;
    wheel.classList.remove('done');
    wheelNote.textContent = '长按，让泥立起来';
    setP(0);
    inkStrokes.forEach(function (s) { s.classList.remove('on'); });
    painted = 0;
    paintBtn.textContent = '点一笔青花';
    go(0);
  });

  /* ---------- 02 影片 ---------- */
  var film = document.getElementById('filmVideo');
  var filmFrame = document.getElementById('filmFrame');
  var filmPlay = document.getElementById('filmPlay');
  var filmMute = document.getElementById('filmMute');
  var filmFill = document.getElementById('filmFill');
  var filmTrack = document.getElementById('filmTrack');
  var filmTime = document.getElementById('filmTime');

  function fPad(n) { return (n < 10 ? '0' : '') + n; }
  function fFmt(t) {
    if (!isFinite(t)) t = 0;
    return fPad(Math.floor(t / 60)) + ':' + fPad(Math.floor(t % 60));
  }

  function filmUI() {
    if (!film) return;
    filmFrame.classList.toggle('playing', !film.paused && !film.ended);
    if (film.duration) {
      filmFill.style.width = (film.currentTime / film.duration * 100) + '%';
    }
    filmTime.textContent = fFmt(film.currentTime) + ' / ' + fFmt(film.duration || 0);
  }

  function filmToggle() {
    if (!film) return;
    if (film.paused || film.ended) {
      var pr = film.play();
      if (pr && pr.catch) pr.catch(function () {});
    } else {
      film.pause();
    }
  }

  function syncFilm(pageIndex) {
    if (!film) return;
    var onFilm = pages[pageIndex] && pages[pageIndex].classList.contains('page--film');
    if (onFilm) {
      if (film.paused) {
        var pr = film.play();
        if (pr && pr.catch) pr.catch(function () {});
      }
    } else if (!film.paused) {
      film.pause();
    }
  }

  if (film) {
    film.addEventListener('loadedmetadata', filmUI);
    film.addEventListener('timeupdate', filmUI);
    film.addEventListener('play', filmUI);
    film.addEventListener('pause', filmUI);
    film.addEventListener('ended', filmUI);
    filmPlay.addEventListener('click', function (e) {
      e.stopPropagation();
      filmToggle();
    });
    filmFrame.addEventListener('click', filmToggle);
    filmMute.addEventListener('click', function (e) {
      e.stopPropagation();
      film.muted = !film.muted;
      filmMute.classList.toggle('on', !film.muted);
      filmMute.textContent = film.muted ? '开启声音' : '关闭声音';
      if (!film.muted && film.paused) filmToggle();
    });
    filmTrack.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!film.duration) return;
      var r = filmTrack.getBoundingClientRect();
      film.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * film.duration;
      filmUI();
    });
    filmUI();
  }

  /* ---------- 初始化 ---------- */
  go(0, true);

  /* 调试直达：?p=页码 */
  var pm = new URLSearchParams(location.search).get('p');
  if (pm) go(Math.max(0, Math.min(total - 1, parseInt(pm, 10) - 1)), true);

  if (window.innerWidth > 900) {
    document.querySelector('#app').setAttribute('data-desktop', '1');
  }
})();
