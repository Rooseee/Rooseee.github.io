/* ===== Jeux ===== */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var games = $('games'), gbody = $('gbody'), gtitle = $('gtitle'), gback = $('gback'), cur = null;

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem('rose.' + k); localStorage.setItem('rose.' + k, String(v)); } catch (_) {}
    return null;
  }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var PINK = '#ff5c96';

  /* texte centré sur canvas */
  function overlay(ctx, W, H, big, small) {
    ctx.fillStyle = 'rgba(11,10,10,.8)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = PINK;
    ctx.font = '700 20px ui-monospace, Menlo, Consolas, monospace'; ctx.fillText(big, W / 2, H / 2 - 6);
    ctx.fillStyle = '#9a9092'; ctx.font = '13px ui-monospace, Menlo, Consolas, monospace'; ctx.fillText(small, W / 2, H / 2 + 20);
  }

  /* ---------- 1. Il m'aime… ---------- */
  function gPetals(root) {
    var PH = ['Il m’aime', 'Un peu', 'Beaucoup', 'Passionnément', 'À la folie', 'Pas du tout'];
    var w = el('<div class="g-col"><div class="g-msg" aria-live="polite"></div><svg class="pf" viewBox="-210 -210 420 420" aria-label="Rose à effeuiller"></svg><button class="gbtn" type="button">Une autre rose</button></div>');
    root.appendChild(w);
    var svg = w.querySelector('svg'), msg = w.querySelector('.g-msg'), timers = [], n, left, k;
    function build() {
      timers.forEach(clearTimeout); timers = [];
      n = 9 + ((Math.random() * 6) | 0); left = n; k = 0;
      msg.className = 'g-msg'; msg.textContent = '';
      var h = '<defs><radialGradient id="pg" cx="50%" cy="85%" r="85%"><stop offset="0" stop-color="#ffa6c9"/><stop offset="1" stop-color="#e8408a"/></radialGradient></defs>';
      for (var i = 0; i < n; i++) {
        h += '<g class="fall"><g transform="rotate(' + (i * 360 / n).toFixed(2) + ')"><ellipse cx="0" cy="-92" rx="39" ry="72" fill="url(#pg)" stroke="#a31d5c" stroke-width="2"/></g></g>';
      }
      h += '<circle r="42" fill="#ffc83d" stroke="#d99a00" stroke-width="3" pointer-events="none"/><circle r="26" fill="#ffd86b" pointer-events="none"/>';
      svg.innerHTML = h;
    }
    svg.addEventListener('click', function (e) {
      var g = e.target.closest && e.target.closest('.fall');
      if (!g || g.dataset.done) return;
      g.dataset.done = '1'; left--;
      msg.className = 'g-msg'; msg.textContent = PH[k % 6]; k++;
      g.style.transform = 'translate(' + rnd(-110, 110).toFixed(0) + 'px,340px) rotate(' + rnd(-220, 220).toFixed(0) + 'deg)';
      g.style.opacity = '0'; g.style.pointerEvents = 'none';
      if (left === 0) timers.push(setTimeout(function () {
        var last = (n - 1) % 6;
        msg.className = 'g-msg big';
        msg.textContent = '« ' + PH[last] + ' »';
      }, 450));
    });
    w.querySelector('button').addEventListener('click', build);
    build();
    return function () { timers.forEach(clearTimeout); };
  }

  /* ---------- 2. Mémoire ---------- */
  function roseIcon(c) {
    var pts = [], a;
    for (a = 0.4; a < 12.2; a += 0.25) pts.push((32 + a * 2.15 * Math.cos(a)).toFixed(1) + ' ' + (32 + a * 2.15 * Math.sin(a)).toFixed(1));
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="' + c + '"/><polyline points="' + pts.join(' ') +
      '" fill="none" stroke="rgba(0,0,0,.32)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2"/></svg>';
  }
  function thornIcon() {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 58C24 42 29 26 34 6c8 20 14 38 18 52z" fill="#3aa65a"/><path d="M34 6c1 14 2 28 1 40-5-6-9-4-14 4 6-12 10-26 13-44z" fill="#7fdc98" opacity=".55"/></svg>';
  }
  function gMemory(root) {
    var COLS = ['#ff5c96', '#cd1230', '#ffba32', '#f4eee4', '#4a86ff', '#a860ff'];
    var w = el('<div class="g-col"><div class="g-stats"><span class="mm">Coups : 0</span><span class="mt">Temps : 0 s</span><span class="mb"></span></div><div class="mgrid"></div><div class="g-msg"></div><button class="gbtn" type="button">Rejouer</button></div>');
    root.appendChild(w);
    var grid = w.querySelector('.mgrid'), mm = w.querySelector('.mm'), mt = w.querySelector('.mt'), mb = w.querySelector('.mb'), msg = w.querySelector('.g-msg');
    var first, lock, moves, pairs, t0, tmr, timers = [];
    function best() { var b = store('memory'); mb.textContent = 'Record : ' + (b ? b + ' coups' : '–'); }
    function stopTimer() { if (tmr) { clearInterval(tmr); tmr = null; } }
    function reset() {
      stopTimer(); timers.forEach(clearTimeout); timers = [];
      first = null; lock = false; moves = 0; pairs = 0; t0 = 0; msg.textContent = ''; msg.className = 'g-msg';
      mm.textContent = 'Coups : 0'; mt.textContent = 'Temps : 0 s'; best();
      grid.innerHTML = '';
      shuffle(COLS.concat(COLS)).forEach(function (c) {
        var b = el('<button class="mc" type="button" aria-label="Carte face cachée"><span class="mi"><span class="mf">' + roseIcon(c) + '</span><span class="mk"></span></span></button>');
        b.dataset.c = c; grid.appendChild(b);
      });
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.mc');
      if (!b || lock || b.classList.contains('flip') || b.classList.contains('ok')) return;
      if (!tmr && !t0) { t0 = Date.now(); tmr = setInterval(function () { mt.textContent = 'Temps : ' + Math.round((Date.now() - t0) / 1000) + ' s'; }, 500); }
      b.classList.add('flip');
      if (!first) { first = b; return; }
      moves++; mm.textContent = 'Coups : ' + moves;
      var a = first; first = null;
      if (a.dataset.c === b.dataset.c) {
        a.classList.add('ok'); b.classList.add('ok'); pairs++;
        if (pairs === COLS.length) {
          stopTimer();
          var sec = Math.round((Date.now() - t0) / 1000), bs = +store('memory');
          var rec = !bs || moves < bs; if (rec) store('memory', moves);
          msg.className = 'g-msg big';
          msg.textContent = moves + ' coups, ' + sec + ' s' + (rec ? ' — nouveau record' : '');
          best();
        }
      } else {
        lock = true;
        timers.push(setTimeout(function () { a.classList.remove('flip'); b.classList.remove('flip'); lock = false; }, 800));
      }
    });
    w.querySelector('.gbtn').addEventListener('click', reset);
    reset();
    return function () { stopTimer(); timers.forEach(clearTimeout); };
  }

  /* ---------- 3. Pluie de pétales ---------- */
  function gCatch(root) {
    var W = 360, H = 520;
    var w = el('<div class="g-col"><div class="g-stats"><span class="sc">Score : 0</span><span class="lv"></span><span class="bs"></span></div><canvas class="gc" width="720" height="1040" aria-label="Jeu : rattrape les pétales"></canvas></div>');
    root.appendChild(w);
    var cv = w.querySelector('canvas'), ctx = cv.getContext('2d'), sc = w.querySelector('.sc'), lv = w.querySelector('.lv'), bs = w.querySelector('.bs');
    ctx.scale(2, 2);
    var s, raf, last = 0, keys = {};
    function best() { var b = store('catch'); bs.textContent = 'Record : ' + (b || '–'); }
    function reset(state) { s = { state: state, x: W / 2, items: [], pops: [], score: 0, lives: 3, t: 0, sp: 0 }; sc.textContent = 'Score : 0'; hearts(); best(); }
    function hearts() { lv.textContent = 'Vies : ' + Math.max(0, s.lives); }
    function setX(cx) { var r = cv.getBoundingClientRect(); s.x = Math.max(42, Math.min(W - 42, (cx - r.left) / r.width * W)); }
    function start() { if (s.state !== 'play') { reset('play'); } }
    function onDown(e) { if (s.state !== 'play') start(); setX(e.clientX); }
    function onMove(e) { setX(e.clientX); }
    function onKey(e) {
      var k = e.key.toLowerCase(), ok = ['arrowleft', 'arrowright', 'a', 'd', 'q'].indexOf(k) >= 0;
      if (e.type === 'keydown') {
        if (ok) { e.preventDefault(); keys[k] = true; if (s.state !== 'play') start(); }
        else if ((k === ' ' || k === 'enter') && s.state !== 'play') { e.preventDefault(); start(); }
      } else delete keys[k];
    }
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);

    function spawn() {
      var r = Math.random(), type = r < 0.2 ? 'thorn' : (r < 0.27 ? 'gold' : 'petal');
      s.items.push({ type: type, x: rnd(24, W - 24), y: -24, vy: rnd(90, 140) + Math.min(210, s.t * 4.5), rot: rnd(0, 6.28), vr: rnd(-2.5, 2.5) });
    }
    function update(dt) {
      s.t += dt;
      var mv = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a || keys.q ? 1 : 0);
      if (mv) s.x = Math.max(42, Math.min(W - 42, s.x + mv * 380 * dt));
      s.sp -= dt; if (s.sp <= 0) { spawn(); s.sp = Math.max(0.26, 0.8 - s.t * 0.012); }
      var by = H - 52;
      for (var i = s.items.length - 1; i >= 0; i--) {
        var it = s.items[i]; it.y += it.vy * dt; it.rot += it.vr * dt;
        if (it.y > by - 6 && it.y < by + 18 && Math.abs(it.x - s.x) < 44) {
          s.items.splice(i, 1);
          if (it.type === 'thorn') { s.lives--; hearts(); s.pops.push({ x: it.x, y: by - 10, t: 0, txt: 'Aïe !', c: '#ff7a7a' }); if (s.lives <= 0) { over(); return; } }
          else { var p = it.type === 'gold' ? 3 : 1; s.score += p; sc.textContent = 'Score : ' + s.score; s.pops.push({ x: it.x, y: by - 10, t: 0, txt: '+' + p, c: it.type === 'gold' ? '#ffc83d' : PINK }); }
        } else if (it.y > H + 30) s.items.splice(i, 1);
      }
      for (var j = s.pops.length - 1; j >= 0; j--) { s.pops[j].t += dt; if (s.pops[j].t > 0.7) s.pops.splice(j, 1); }
    }
    function over() {
      s.state = 'over';
      var b = +store('catch'); if (s.score > (b || 0)) store('catch', s.score);
      best();
    }
    function draw() {
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0a12'); g.addColorStop(1, '#0b0709');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      s.items.forEach(function (it) {
        ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
        if (it.type === 'thorn') {
          ctx.fillStyle = '#3aa65a'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(10, 12); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#7fdc98'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(3, 2); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
        } else {
          var gold = it.type === 'gold';
          ctx.fillStyle = gold ? '#ffc83d' : '#ff7fb0'; ctx.beginPath(); ctx.ellipse(0, 0, gold ? 10 : 8, gold ? 15 : 12, 0, 0, 6.3); ctx.fill();
          ctx.fillStyle = gold ? '#fff0a8' : '#ffc2da'; ctx.beginPath(); ctx.ellipse(-2, -3, 3, 6, 0, 0, 6.3); ctx.fill();
        }
        ctx.restore();
      });
      /* panier */
      var bx = s.x, by = H - 52;
      ctx.fillStyle = '#d63a7f'; ctx.beginPath(); ctx.moveTo(bx - 44, by); ctx.lineTo(bx + 44, by); ctx.lineTo(bx + 32, by + 30); ctx.quadraticCurveTo(bx, by + 38, bx - 32, by + 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff5c96'; ctx.fillRect(bx - 47, by - 5, 94, 8);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(bx - 30, by + 6, 6, 18);
      ctx.textAlign = 'center'; ctx.font = '600 16px ui-monospace, Menlo, Consolas, monospace';
      s.pops.forEach(function (p) { ctx.globalAlpha = 1 - p.t / 0.7; ctx.fillStyle = p.c; ctx.fillText(p.txt, p.x, p.y - p.t * 50); ctx.globalAlpha = 1; });
      if (s.state === 'ready') overlay(ctx, W, H, 'Prêt ?', 'Touche pour jouer');
      if (s.state === 'over') overlay(ctx, W, H, 'Perdu — ' + s.score + ' pts', 'Touche pour rejouer');
    }
    function loop(t) {
      var dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (s.state === 'play') update(dt);
      draw(); raf = requestAnimationFrame(loop);
    }
    reset('ready'); raf = requestAnimationFrame(function (t) { last = t; loop(t); });
    return function () { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }

  /* ---------- 4. Serpent fleuri ---------- */
  function gSnake(root) {
    var N = 18, CELL = 20, W = N * CELL;
    var w = el('<div class="g-col"><div class="g-stats"><span class="sc">Roses : 0</span><span class="bs"></span></div><canvas class="gc sq" width="720" height="720" aria-label="Jeu du serpent"></canvas></div>');
    root.appendChild(w);
    var cv = w.querySelector('canvas'), ctx = cv.getContext('2d'), sc = w.querySelector('.sc'), bs = w.querySelector('.bs');
    ctx.scale(2, 2);
    var s, raf, last = 0, acc = 0;
    function best() { var b = store('snake'); bs.textContent = 'Record : ' + (b || '–'); }
    function place() {
      var x, y, ok;
      do { x = (Math.random() * N) | 0; y = (Math.random() * N) | 0; ok = !s.body.some(function (b) { return b.x === x && b.y === y; }); } while (!ok);
      s.rose = { x: x, y: y };
    }
    function reset(state) {
      s = { state: state, body: [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }], dir: { x: 1, y: 0 }, q: [], score: 0, rose: null, grow: 0 };
      place(); sc.textContent = 'Roses : 0'; best();
    }
    function turn(dx, dy) {
      if (s.state === 'over') return;
      if (s.state === 'ready') s.state = 'play';
      var ref = s.q.length ? s.q[s.q.length - 1] : s.dir;
      if ((dx === -ref.x && dy === -ref.y) || (dx === ref.x && dy === ref.y)) return;
      if (s.q.length < 3) s.q.push({ x: dx, y: dy });
    }
    var MAP = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0], w: [0, -1], z: [0, -1], s: [0, 1], a: [-1, 0], q: [-1, 0], d: [1, 0] };
    function onKey(e) {
      var k = e.key.toLowerCase();
      if (MAP[k]) { e.preventDefault(); turn(MAP[k][0], MAP[k][1]); }
      else if ((k === ' ' || k === 'enter') && s.state === 'over') { e.preventDefault(); reset('ready'); }
    }
    var sx, sy;
    function pdown(e) { if (s.state === 'over') { reset('ready'); return; } sx = e.clientX; sy = e.clientY; }
    function pup(e) {
      if (sx == null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) { if (s.state === 'ready') s.state = 'play'; return; }
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
    }
    cv.addEventListener('pointerdown', pdown); cv.addEventListener('pointerup', pup);
    window.addEventListener('keydown', onKey);

    function step() {
      if (s.q.length) s.dir = s.q.shift();
      var h = s.body[0], nx = h.x + s.dir.x, ny = h.y + s.dir.y;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N || s.body.some(function (b, i) { return i < s.body.length - 1 && b.x === nx && b.y === ny; })) {
        s.state = 'over'; var b = +store('snake'); if (s.score > (b || 0)) store('snake', s.score); best(); return;
      }
      s.body.unshift({ x: nx, y: ny });
      if (nx === s.rose.x && ny === s.rose.y) { s.score++; sc.textContent = 'Roses : ' + s.score; place(); } else s.body.pop();
    }
    function draw() {
      var x, y;
      for (y = 0; y < N; y++) for (x = 0; x < N; x++) { ctx.fillStyle = (x + y) % 2 ? '#150a10' : '#120810'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
      /* rose à manger */
      var rx = s.rose.x * CELL + CELL / 2, ry = s.rose.y * CELL + CELL / 2, i;
      ctx.fillStyle = '#ff5c96';
      for (i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(rx + Math.cos(i * 1.047) * 5, ry + Math.sin(i * 1.047) * 5, 5, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = '#c42368'; ctx.beginPath(); ctx.arc(rx, ry, 4, 0, 6.3); ctx.fill();
      /* serpent */
      for (i = s.body.length - 1; i >= 0; i--) {
        var b = s.body[i], cx = b.x * CELL + CELL / 2, cy = b.y * CELL + CELL / 2;
        if (i === 0) {
          ctx.fillStyle = '#ff5c96'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#c42368'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + s.dir.x * 4 - s.dir.y * 4, cy + s.dir.y * 4 + s.dir.x * 4, 1.8, 0, 6.3); ctx.arc(cx + s.dir.x * 4 + s.dir.y * 4, cy + s.dir.y * 4 - s.dir.x * 4, 1.8, 0, 6.3); ctx.fill();
        } else {
          ctx.fillStyle = i % 2 ? '#2f9a4f' : '#3aae5c'; ctx.beginPath(); ctx.arc(cx, cy, 8.5, 0, 6.3); ctx.fill();
        }
      }
      if (s.state === 'ready') overlay(ctx, W, W, 'Prêt ?', 'Flèches pour partir');
      if (s.state === 'over') overlay(ctx, W, W, 'Perdu — ' + s.score + ' rose' + (s.score > 1 ? 's' : ''), 'Touche pour rejouer');
    }
    function loop(t) {
      var dt = Math.min(0.1, (t - last) / 1000); last = t;
      if (s.state === 'play') { acc += dt; var stp = Math.max(0.065, 0.14 - s.score * 0.003); while (acc >= stp) { acc -= stp; step(); if (s.state !== 'play') break; } }
      draw(); raf = requestAnimationFrame(loop);
    }
    reset('ready'); raf = requestAnimationFrame(function (t) { last = t; loop(t); });
    return function () { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }

  /* ---------- Morpion ---------- */
  function gTicTac(root) {
    var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    var w = el('<div class="g-col"><div class="seg"><button type="button" data-m="ai" aria-pressed="true">Contre l’ordi</button><button type="button" data-m="two" aria-pressed="false">À deux</button></div><div class="g-stats"></div><div class="ttg"></div><div class="g-msg"></div><button class="gbtn" type="button">Rejouer</button></div>');
    root.appendChild(w);
    var grid = w.querySelector('.ttg'), stats = w.querySelector('.g-stats'), msg = w.querySelector('.g-msg'), seg = w.querySelector('.seg');
    var b, turn, over, busy, mode = 'ai', sc = { x: 0, o: 0, d: 0 }, timers = [];
    function winner(bd) { for (var i = 0; i < 8; i++) { var l = LINES[i]; if (bd[l[0]] && bd[l[0]] === bd[l[1]] && bd[l[0]] === bd[l[2]]) return { p: bd[l[0]], l: l }; } return null; }
    function mm(bd, p) {
      var wn = winner(bd); if (wn) return wn.p === 'o' ? 1 : -1;
      if (bd.every(Boolean)) return 0;
      var best = p === 'o' ? -2 : 2;
      for (var i = 0; i < 9; i++) if (!bd[i]) { bd[i] = p; var v = mm(bd, p === 'o' ? 'x' : 'o'); bd[i] = ''; best = p === 'o' ? Math.max(best, v) : Math.min(best, v); }
      return best;
    }
    function aiMove() {
      var emp = [], i; for (i = 0; i < 9; i++) if (!b[i]) emp.push(i);
      if (Math.random() < 0.2) return emp[(Math.random() * emp.length) | 0];
      var best = -2, pick = [];
      emp.forEach(function (j) { b[j] = 'o'; var v = mm(b, 'x'); b[j] = ''; if (v > best) { best = v; pick = [j]; } else if (v === best) pick.push(j); });
      return pick[(Math.random() * pick.length) | 0];
    }
    function render() {
      var wn = winner(b);
      grid.innerHTML = '';
      b.forEach(function (v, i) {
        var c = el('<button type="button" class="tc' + (wn && wn.l.indexOf(i) >= 0 ? ' win' : '') + '" data-i="' + i + '" aria-label="Case ' + (i + 1) + '">' + (v === 'x' ? roseIcon(PINK) : (v === 'o' ? thornIcon() : '')) + '</button>');
        grid.appendChild(c);
      });
      stats.textContent = mode === 'ai' ? 'Gagné ' + sc.x + '  ·  Nul ' + sc.d + '  ·  Perdu ' + sc.o : 'Roses ' + sc.x + '  ·  Nul ' + sc.d + '  ·  Épines ' + sc.o;
    }
    function end() {
      var wn = winner(b); over = true;
      if (wn) { sc[wn.p]++; msg.textContent = mode === 'ai' ? (wn.p === 'x' ? 'Gagné' : 'Perdu') : (wn.p === 'x' ? 'Les roses gagnent' : 'Les épines gagnent'); msg.className = 'g-msg big'; }
      else { sc.d++; msg.textContent = 'Égalité'; msg.className = 'g-msg'; }
      render();
    }
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      b = ['', '', '', '', '', '', '', '', '']; turn = 'x'; over = false; busy = false;
      msg.className = 'g-msg'; msg.textContent = mode === 'ai' ? 'À toi' : 'Tour des roses'; render();
    }
    function place(i) {
      b[i] = turn;
      if (winner(b) || b.every(Boolean)) { end(); return; }
      turn = turn === 'x' ? 'o' : 'x';
      msg.textContent = mode === 'ai' ? 'À toi' : 'Tour des ' + (turn === 'x' ? 'roses' : 'épines');
      render();
    }
    grid.addEventListener('click', function (e) {
      var c = e.target.closest('.tc'); if (!c || over || busy) return;
      var i = +c.dataset.i; if (b[i]) return;
      place(i);
      if (!over && mode === 'ai') {
        busy = true; msg.textContent = '…';
        timers.push(setTimeout(function () { busy = false; if (!over) place(aiMove()); }, 380));
      }
    });
    seg.addEventListener('click', function (e) {
      var m = e.target.dataset && e.target.dataset.m; if (!m || m === mode) return;
      mode = m; sc = { x: 0, o: 0, d: 0 };
      Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute('aria-pressed', x.dataset.m === m ? 'true' : 'false'); });
      reset();
    });
    w.querySelector('.gbtn').addEventListener('click', reset);
    reset();
    return function () { timers.forEach(clearTimeout); };
  }

  /* ---------- Puissance 4 ---------- */
  function gConnect(root) {
    var COLS = 7, ROWS = 6, ORDER = [3, 2, 4, 1, 5, 0, 6];
    var w = el('<div class="g-col"><div class="seg"><button type="button" data-m="ai" aria-pressed="true">Contre l’ordi</button><button type="button" data-m="two" aria-pressed="false">À deux</button></div><div class="g-stats"></div><div class="c4"></div><div class="g-msg"></div><button class="gbtn" type="button">Rejouer</button></div>');
    root.appendChild(w);
    var grid = w.querySelector('.c4'), stats = w.querySelector('.g-stats'), msg = w.querySelector('.g-msg'), seg = w.querySelector('.seg');
    var bd, turn, over, busy, mode = 'ai', sc = [0, 0, 0], timers = [], winCells = [];
    var DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
    function lineWin(b) {
      for (var c = 0; c < COLS; c++) for (var r = 0; r < ROWS; r++) {
        var p = b[c][r]; if (!p) continue;
        for (var d = 0; d < 4; d++) {
          var dx = DIRS[d][0], dy = DIRS[d][1], k, cells = [[c, r]];
          for (k = 1; k < 4; k++) { var x = c + dx * k, y = r + dy * k; if (x < 0 || x >= COLS || y < 0 || y >= ROWS || b[x][y] !== p) break; cells.push([x, y]); }
          if (k === 4) return { p: p, cells: cells };
        }
      }
      return null;
    }
    function full(b) { for (var c = 0; c < COLS; c++) if (b[c].length < ROWS) return false; return true; }
    function evalB(b, p) {
      var s = 0, o = 3 - p, c, r, d, k;
      for (r = 0; r < ROWS; r++) if (b[3][r] === p) s += 3;
      for (c = 0; c < COLS; c++) for (r = 0; r < ROWS; r++) for (d = 0; d < 4; d++) {
        var dx = DIRS[d][0], dy = DIRS[d][1], ex = c + dx * 3, ey = r + dy * 3;
        if (ex < 0 || ex >= COLS || ey < 0 || ey >= ROWS) continue;
        var np = 0, no = 0;
        for (k = 0; k < 4; k++) { var v = b[c + dx * k][r + dy * k]; if (v === p) np++; else if (v === o) no++; }
        if (no === 0) s += [0, 1, 5, 40, 0][np]; else if (np === 0) s -= [0, 1, 5, 40, 0][no];
      }
      return s;
    }
    function nega(b, depth, alpha, beta, p) {
      var wn = lineWin(b); if (wn) return -100000 - depth;
      if (full(b)) return 0;
      if (depth === 0) return evalB(b, p);
      var best = -1e9;
      for (var i = 0; i < 7; i++) {
        var c = ORDER[i]; if (b[c].length >= ROWS) continue;
        b[c].push(p); var v = -nega(b, depth - 1, -beta, -alpha, 3 - p); b[c].pop();
        if (v > best) best = v; if (best > alpha) alpha = best; if (alpha >= beta) break;
      }
      return best;
    }
    function aiMove() {
      var best = -1e9, pick = [];
      ORDER.forEach(function (c) {
        if (bd[c].length >= ROWS) return;
        bd[c].push(2); var v = -nega(bd, 4, -1e9, 1e9, 1); bd[c].pop();
        if (v > best) { best = v; pick = [c]; } else if (v === best) pick.push(c);
      });
      return pick[(Math.random() * pick.length) | 0];
    }
    function render() {
      grid.innerHTML = '';
      for (var r = ROWS - 1; r >= 0; r--) for (var c = 0; c < COLS; c++) {
        var v = bd[c][r], win = winCells.some(function (q) { return q[0] === c && q[1] === r; });
        grid.appendChild(el('<button type="button" class="cc' + (v ? ' p' + v : '') + (win ? ' win' : '') + '" data-c="' + c + '" aria-label="Colonne ' + (c + 1) + '">' + (v ? roseIcon(v === 1 ? '#cd1230' : '#f4eee4') : '') + '</button>'));
      }
      stats.textContent = mode === 'ai' ? 'Gagné ' + sc[1] + '  ·  Nul ' + sc[0] + '  ·  Perdu ' + sc[2] : 'Rouges ' + sc[1] + '  ·  Nul ' + sc[0] + '  ·  Blanches ' + sc[2];
    }
    function status() { return mode === 'ai' ? 'À toi' : 'Tour des ' + (turn === 1 ? 'rouges' : 'blanches'); }
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      bd = []; for (var c = 0; c < COLS; c++) bd.push([]);
      turn = 1; over = false; busy = false; winCells = []; msg.className = 'g-msg'; msg.textContent = status(); render();
    }
    function play(c) {
      bd[c].push(turn);
      var wn = lineWin(bd);
      if (wn || full(bd)) {
        over = true;
        if (wn) { winCells = wn.cells; sc[wn.p]++; msg.className = 'g-msg big'; msg.textContent = mode === 'ai' ? (wn.p === 1 ? 'Gagné' : 'Perdu') : (wn.p === 1 ? 'Les rouges gagnent' : 'Les blanches gagnent'); }
        else { sc[0]++; msg.textContent = 'Égalité'; }
        render(); return;
      }
      turn = 3 - turn; msg.textContent = status(); render();
    }
    grid.addEventListener('click', function (e) {
      var cell = e.target.closest('.cc'); if (!cell || over || busy) return;
      var c = +cell.dataset.c; if (bd[c].length >= ROWS) return;
      play(c);
      if (!over && mode === 'ai') {
        busy = true; msg.textContent = '…';
        timers.push(setTimeout(function () { busy = false; if (!over) play(aiMove()); }, 350));
      }
    });
    seg.addEventListener('click', function (e) {
      var m = e.target.dataset && e.target.dataset.m; if (!m || m === mode) return;
      mode = m; sc = [0, 0, 0];
      Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute('aria-pressed', x.dataset.m === m ? 'true' : 'false'); });
      reset();
    });
    w.querySelector('.gbtn').addEventListener('click', reset);
    reset();
    return function () { timers.forEach(clearTimeout); };
  }

  /* ---------- Simon des roses ---------- */
  function gSimon(root) {
    var COLS = [{ c: '#cd1230', f: 262 }, { c: '#ff5c96', f: 330 }, { c: '#ffba32', f: 392 }, { c: '#f4eee4', f: 523 }];
    var w = el('<div class="g-col"><div class="g-stats"><span class="sl">Niveau 0</span><span class="sr"></span></div><div class="simon"></div><div class="g-msg"></div><button class="gbtn" type="button">Commencer</button></div>');
    root.appendChild(w);
    var pad = w.querySelector('.simon'), sl = w.querySelector('.sl'), sr = w.querySelector('.sr'), msg = w.querySelector('.g-msg'), btn = w.querySelector('.gbtn');
    var seq = [], pos = 0, ok = false, timers = [], ac = null;
    COLS.forEach(function (k, i) { var b = el('<button type="button" class="sm" data-i="' + i + '" aria-label="Rose ' + (i + 1) + '">' + roseIcon(k.c) + '</button>'); pad.appendChild(b); });
    function best() { var b = store('simon'); sr.textContent = 'Record : ' + (b ? 'niveau ' + b : '–'); }
    function tone(f, d) {
      try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d / 1000);
        o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d / 1000 + 0.05);
      } catch (_) {}
    }
    function light(i, d) {
      var b = pad.children[i]; b.classList.add('lit'); tone(COLS[i].f, d);
      timers.push(setTimeout(function () { b.classList.remove('lit'); }, d));
    }
    function next() {
      seq.push((Math.random() * 4) | 0); pos = 0; ok = false; msg.className = 'g-msg'; msg.textContent = 'Regarde';
      sl.textContent = 'Niveau ' + (seq.length - 1);
      var gap = Math.max(260, 560 - seq.length * 20);
      seq.forEach(function (v, k) { timers.push(setTimeout(function () { light(v, gap - 120); }, 600 + k * gap)); });
      timers.push(setTimeout(function () { ok = true; msg.textContent = 'À toi'; }, 600 + seq.length * gap));
    }
    function start() { timers.forEach(clearTimeout); timers = []; seq = []; btn.textContent = 'Recommencer'; next(); }
    pad.addEventListener('click', function (e) {
      var b = e.target.closest('.sm'); if (!b || !ok) return;
      var i = +b.dataset.i; light(i, 200);
      if (i !== seq[pos]) {
        ok = false; var lvl = seq.length - 1, bs = +store('simon') || 0; if (lvl > bs) store('simon', lvl);
        msg.className = 'g-msg big'; msg.textContent = 'Raté — niveau ' + lvl; best(); return;
      }
      pos++;
      if (pos === seq.length) { ok = false; msg.textContent = 'Bien'; timers.push(setTimeout(next, 800)); }
    });
    btn.addEventListener('click', start);
    best();
    return function () { timers.forEach(clearTimeout); if (ac && ac.close) { try { ac.close(); } catch (_) {} } };
  }

  /* ---------- Démineur ---------- */
  function gMines(root) {
    var N = 9, M = 10;
    var w = el('<div class="g-col"><div class="seg"><button type="button" data-m="dig" aria-pressed="true">Creuser</button><button type="button" data-m="flag" aria-pressed="false">Planter</button></div><div class="g-stats"><span class="ml"></span><span class="mt"></span><span class="mr"></span></div><div class="mg"></div><div class="g-msg"></div><button class="gbtn" type="button">Rejouer</button></div>');
    root.appendChild(w);
    var grid = w.querySelector('.mg'), ml = w.querySelector('.ml'), mt = w.querySelector('.mt'), mr = w.querySelector('.mr'), msg = w.querySelector('.g-msg'), seg = w.querySelector('.seg');
    var cells, started, over, flagMode = false, t0, tmr, lp;
    function best() { var b = store('mines'); mr.textContent = 'Record : ' + (b ? b + ' s' : '–'); }
    function nb(i) { var x = i % N, y = (i / N) | 0, r = []; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var a = x + dx, b = y + dy; if (a >= 0 && a < N && b >= 0 && b < N) r.push(b * N + a); } return r; }
    function stop() { if (tmr) { clearInterval(tmr); tmr = null; } }
    function reset() {
      stop(); cells = []; for (var i = 0; i < N * N; i++) cells.push({ m: false, o: false, f: false, n: 0 });
      started = false; over = false; msg.textContent = ''; msg.className = 'g-msg'; mt.textContent = 'Temps : 0 s'; best();
      grid.innerHTML = ''; for (i = 0; i < N * N; i++) { var c = document.createElement('button'); c.type = 'button'; c.className = 'mcell'; c.dataset.i = i; grid.appendChild(c); }
      render();
    }
    function seed(first) {
      var safe = nb(first).concat(first), n = 0;
      while (n < M) { var i = (Math.random() * N * N) | 0; if (cells[i].m || safe.indexOf(i) >= 0) continue; cells[i].m = true; n++; }
      cells.forEach(function (c, i) { c.n = nb(i).filter(function (j) { return cells[j].m; }).length; });
      started = true; t0 = Date.now(); tmr = setInterval(function () { mt.textContent = 'Temps : ' + Math.round((Date.now() - t0) / 1000) + ' s'; }, 500);
    }
    var COL = ['', '#6aa9ff', '#6fd08c', '#ff7a7a', '#b48cff', '#ffba32', '#ffba32', '#ffba32', '#ffba32'];
    function render() {
      var flags = 0;
      Array.prototype.forEach.call(grid.children, function (b, i) {
        var c = cells[i]; if (c.f) flags++;
        b.className = 'mcell' + (c.o ? ' o' : '') + (c.f ? ' f' : '') + (c.boom ? ' b' : '');
        b.style.color = c.o && c.n ? COL[c.n] : '';
        b.innerHTML = c.o ? (c.m ? thornIcon() : (c.n || '')) : (c.f ? roseIcon(PINK) : (over && c.m ? thornIcon() : ''));
      });
      ml.textContent = 'Épines : ' + (M - flags);
    }
    function open(i) {
      var st = [i];
      while (st.length) {
        var k = st.pop(), c = cells[k]; if (c.o || c.f) continue; c.o = true;
        if (c.n === 0 && !c.m) nb(k).forEach(function (j) { if (!cells[j].o) st.push(j); });
      }
    }
    function act(i, flag) {
      if (over) return; var c = cells[i];
      if (flag) { if (!c.o) { c.f = !c.f; render(); } return; }
      if (c.f || c.o) return;
      if (!started) seed(i);
      if (c.m) {
        over = true; stop(); c.boom = true; cells.forEach(function (x) { if (x.m) x.o = true; });
        msg.textContent = 'Piqué'; render(); return;
      }
      open(i);
      if (cells.every(function (x) { return x.m || x.o; })) {
        over = true; stop(); var s = Math.round((Date.now() - t0) / 1000), b = +store('mines'), rec = !b || s < b; if (rec) store('mines', s);
        cells.forEach(function (x) { if (x.m) x.f = true; });
        msg.className = 'g-msg big'; msg.textContent = 'Jardin dégagé en ' + s + ' s' + (rec ? ' — nouveau record' : ''); best();
      }
      render();
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.mcell'); if (!b) return;
      if (lp) { lp = false; return; }
      act(+b.dataset.i, flagMode);
    });
    grid.addEventListener('contextmenu', function (e) { var b = e.target.closest('.mcell'); if (!b) return; e.preventDefault(); act(+b.dataset.i, true); });
    var lpT;
    grid.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.mcell'); if (!b || e.pointerType !== 'touch') return;
      lp = false; lpT = setTimeout(function () { lp = true; act(+b.dataset.i, true); }, 420);
    });
    function cancelLp() { clearTimeout(lpT); }
    grid.addEventListener('pointerup', cancelLp); grid.addEventListener('pointerleave', cancelLp); grid.addEventListener('pointercancel', cancelLp);
    seg.addEventListener('click', function (e) {
      var m = e.target.dataset && e.target.dataset.m; if (!m) return; flagMode = m === 'flag';
      Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute('aria-pressed', x.dataset.m === m ? 'true' : 'false'); });
    });
    w.querySelector('.gbtn').addEventListener('click', reset);
    reset();
    return function () { stop(); clearTimeout(lpT); };
  }

  /* ---------- navigation ---------- */
  var DEFS = [
    { id: 'petals', name: 'Il m’aime… pas du tout', init: gPetals },
    { id: 'memory', name: 'Mémoire en fleurs', init: gMemory, rec: function (v) { return v ? v + ' coups' : ''; } },
    { id: 'ttt', name: 'Morpion roses et épines', init: gTicTac },
    { id: 'c4', name: 'Puissance 4 roses', init: gConnect },
    { id: 'mines', name: 'Champ d’épines', init: gMines, rec: function (v) { return v ? v + ' s' : ''; } },
    { id: 'simon', name: 'Simon des roses', init: gSimon, rec: function (v) { return v ? 'niveau ' + v : ''; } },
    { id: 'catch', name: 'Pluie de pétales', init: gCatch, rec: function (v) { return v ? v + ' pts' : ''; } },
    { id: 'snake', name: 'Serpent fleuri', init: gSnake, rec: function (v) { return v ? v + ' roses' : ''; } }
  ];
  function stop() { if (cur) { cur(); cur = null; } gbody.innerHTML = ''; }
  function showMenu() {
    stop(); gtitle.textContent = 'Jeux'; gback.textContent = '← Retour'; gback.onclick = close;
    var m = el('<div class="gmenu"></div>');
    DEFS.forEach(function (d) {
      var r = d.rec ? d.rec(store(d.id)) : '';
      var c = el('<button type="button" class="gcard"><span class="gn">' + roseIcon(PINK) + d.name + '</span><em>' + (r ? 'Record : ' + r : '') + '</em></button>');
      c.addEventListener('click', function () { play(d); });
      m.appendChild(c);
    });
    gbody.appendChild(m); games.scrollTop = 0;
  }
  function play(d) {
    stop(); gtitle.textContent = d.name; gback.textContent = '← Jeux'; gback.onclick = showMenu;
    cur = d.init(gbody) || null;
  }
  function open() { games.hidden = false; document.body.classList.add('in-games'); showMenu(); gback.focus(); }
  function close() { stop(); games.hidden = true; document.body.classList.remove('in-games'); var g = $('go'); if (g) g.focus(); }
  $('games-btn').addEventListener('click', open); $('header-games').addEventListener('click', open);
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !games.hidden) gback.click(); });
})();
