(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), pre = $('ascii'), cv = $('cv'), ctx = cv.getContext('2d');

  /* ---------- données ---------- */
  var MODES = [
    { id: 'ascii',   label: 'Lettres' },
    { id: 'asciic',  label: 'Lettres couleur' },
    { id: 'braille', label: 'Pointillé' },
    { id: 'real',    label: 'Réaliste' },
    { id: 'neon',    label: 'Lumineux' }
  ];
  var PALETTES = [
    { name: 'Rouge',  rgb: [205, 18, 48] },
    { name: 'Rose',   rgb: [255, 92, 150] },
    { name: 'Or',     rgb: [255, 186, 50] },
    { name: 'Blanc',  rgb: [244, 238, 228] },
    { name: 'Bleu',   rgb: [74, 134, 255] },
    { name: 'Violet', rgb: [168, 96, 255] }
  ];
  var RAMP = ' .,:-~=+*oxX#%@', RAMP2 = ' .:;|!Il1H';
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var BITS = [[1, 8], [2, 16], [4, 32], [64, 128]]; /* [ligne][colonne] */

  var mesh = buildRoseMesh(1), meshHi = null;
  var st = { mode: 'ascii', pal: 1, spin: 0.6, tilt: 34 * Math.PI / 180, speed: 1, zoom: 1, paused: false, drag: false, dirty: true };
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) st.paused = true;

  /* ---------- couleurs ---------- */
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  var GREEN = [70, 170, 90], tables = null;
  function colorFor(kind, L) {
    var base = kind === 1 ? PALETTES[st.pal].rgb : GREEN;
    var c = mix([base[0] * 0.26, base[1] * 0.26, base[2] * 0.26], base, Math.min(1, L * 1.12));
    if (L > 0.85) c = mix(c, [255, 255, 255], (L - 0.85) / 0.15 * 0.5);
    return c;
  }
  function buildTables() {
    tables = [];
    for (var k = 0; k < 4; k++) { tables[k] = []; for (var q = 0; q < 8; q++) tables[k][q] = css(colorFor(k === 1 ? 1 : 2, (q + 0.5) / 8)); }
  }

  /* ---------- interface ---------- */
  var tabs = $('tabs');
  MODES.forEach(function (m, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = m.label; b.dataset.id = m.id;
    b.title = 'Raccourci : ' + (i + 1);
    b.addEventListener('click', function () { setMode(m.id); });
    tabs.appendChild(b);
  });
  var ticks = document.querySelector('.hp-ticks');
  MODES.forEach(function (m) {
    var t = document.createElement('button');
    t.type = 'button'; t.className = 'tick'; t.dataset.id = m.id; t.title = m.label; t.setAttribute('aria-label', m.label);
    t.addEventListener('click', function () { setMode(m.id); startHomeTimer(); });
    ticks.appendChild(t);
  });
  function setMode(id) {
    st.mode = id;
    Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute('aria-selected', b.dataset.id === id ? 'true' : 'false'); });
    Array.prototype.forEach.call(ticks.children, function (t) { t.classList.toggle('on', t.dataset.id === id); });
    layout(); st.dirty = true;
  }
  function setPal(i) {
    st.pal = i;
    var c = PALETTES[i].rgb;
    document.documentElement.style.setProperty('--accent', css(c));
    buildTables(); st.dirty = true;
  }
  function setPaused(p) { st.paused = p; st.dirty = true; }
  var entered = false, intro = $('intro'), go = $('go'), homeTimer = null;
  function startHomeTimer() {
    clearInterval(homeTimer);
    homeTimer = setInterval(function () {
      if (document.body.classList.contains('in-games') || st.drag) return;
      var i = MODES.map(function (m) { return m.id; }).indexOf(st.mode);
      setMode(MODES[(i + 1) % MODES.length].id);
    }, 4500);
  }
  function startHome() {
    document.body.classList.add('home'); intro.classList.remove('gone'); entered = false;
    startHomeTimer();
  }
  function leaveHome() {
    document.body.classList.remove('home'); intro.classList.add('gone'); entered = true;
    clearInterval(homeTimer); homeTimer = null; st.dirty = true;
  }
  go.addEventListener('click', leaveHome);
  $('home-btn').addEventListener('click', startHome);
  window.addEventListener('keydown', function (e) {
    if (!entered) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); setPaused(!st.paused); }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= MODES.length) setMode(MODES[n - 1].id);
  });

  /* glisser pour tourner */
  var lx = 0, ly = 0;
  stage.addEventListener('pointerdown', function (e) {
    st.drag = true; lx = e.clientX; ly = e.clientY; stage.classList.add('drag');
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  });
  stage.addEventListener('pointermove', function (e) {
    if (!st.drag) return;
    st.spin += (e.clientX - lx) * 0.012;
    st.tilt = Math.max(-0.2, Math.min(1.31, st.tilt + (e.clientY - ly) * 0.008));
    lx = e.clientX; ly = e.clientY; st.dirty = true;
  });
  function endDrag() { st.drag = false; stage.classList.remove('drag'); }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  /* ---------- mise en page ---------- */
  var G = { C: 0, R: 0, a: 0.6, fr: null, side: 0, res: 0 };
  function charAspect(txt) {
    var s = document.createElement('span');
    s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:100px/1 ' + getComputedStyle(pre).fontFamily;
    s.textContent = txt.repeat(20); document.body.appendChild(s);
    var w = s.getBoundingClientRect().width / 20 / 100; document.body.removeChild(s);
    return w > 0.2 ? w : 0.6;
  }
  function layout() {
    var r = stage.getBoundingClientRect(), W = r.width, H = r.height;
    var text = st.mode === 'ascii' || st.mode === 'asciic' || st.mode === 'braille';
    pre.style.display = text ? 'block' : 'none';
    cv.style.display = text ? 'none' : 'block';
    if (text) {
      var br = st.mode === 'braille';
      var a = charAspect(br ? '⣿' : 'M');
      var R = br ? 44 : 50, C = Math.round(R * 0.98 / a) + 4;
      var fs = Math.min(W / (C * a), H / R);
      pre.style.fontSize = fs + 'px';
      G.C = C; G.R = R; G.a = a;
      G.fr = br ? makeFrame(C * 2, R * 4) : makeFrame(C, R);
    } else {
      var side = Math.floor(Math.min(W, H));
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var res = Math.floor(Math.min(side * dpr, st.mode === 'real' ? 620 : 1000));
      cv.style.width = cv.style.height = side + 'px';
      cv.width = cv.height = res;
      G.side = side; G.res = res; G.fr = st.mode === 'real' ? makeFrame(res, res) : null;
      G.img = st.mode === 'real' ? ctx.createImageData(res, res) : null;
      G.u32 = G.img ? new Uint32Array(G.img.data.buffer) : null;
      if (st.mode === 'neon') {
        G.px = new Float32Array(mesh.n * 2);
        G.bc = G.bc || document.createElement('canvas');
        G.bc2 = G.bc2 || document.createElement('canvas');
        G.bc.width = G.bc.height = Math.max(8, res >> 2);
        G.bc2.width = G.bc2.height = Math.max(8, res >> 4);
      }
    }
  }
  window.addEventListener('resize', function () { layout(); st.dirty = true; });
  if (window.ResizeObserver) new ResizeObserver(function () { layout(); st.dirty = true; }).observe(stage);

  /* ---------- rendus texte ---------- */
  function lumIdx(L, len) { var i = 1 + ((L * (len - 2)) | 0); return i < 1 ? 1 : (i > len - 1 ? len - 1 : i); }

  function drawAscii(colored) {
    var C = G.C, R = G.R, fr = G.fr, a = G.a;
    var sY = (R / 2 * 0.98) / mesh.R0 * st.zoom, sX = sY / a;
    rasterize(mesh, fr, { spin: st.spin, tilt: st.tilt, scaleX: sX, scaleY: sY, cx: C / 2, cy: R / 2, splat: 1 });
    var kd = fr.kd, out = '', y, x, i, k, L, len;
    if (!colored) {
      for (y = 0; y < R; y++) {
        for (x = 0; x < C; x++) {
          i = y * C + x; k = kd[i];
          if (!k) { out += ' '; continue; }
          L = lumOf(fr.dif[i], fr.ndv[i], fr.ao[i]) * edgeFactor(fr, x, y, 0.07);
          if (k === 1) out += RAMP[lumIdx(L, RAMP.length)]; else out += RAMP2[lumIdx(L, RAMP2.length)];
        }
        out += '\n';
      }
      pre.textContent = out; pre.style.color = ''; return;
    }
    var cur = '';
    for (y = 0; y < R; y++) {
      for (x = 0; x < C; x++) {
        i = y * C + x; k = kd[i];
        if (!k) { out += ' '; continue; }
        L = lumOf(fr.dif[i], fr.ndv[i], fr.ao[i]) * edgeFactor(fr, x, y, 0.07);
        var q = Math.min(7, (L * 8) | 0), key = (k === 1 ? 1 : 2) * 8 + q;
        if (key !== cur) { if (cur !== '') out += '</span>'; out += '<span style="color:' + tables[k === 1 ? 1 : 2][q] + '">'; cur = key; }
        out += k === 1 ? RAMP[lumIdx(L, RAMP.length)] : RAMP2[lumIdx(L, RAMP2.length)];
      }
      out += '\n';
    }
    if (cur !== '') out += '</span>';
    pre.innerHTML = out;
  }

  function drawBraille() {
    var C = G.C, R = G.R, fr = G.fr, W = C * 2, H = R * 4;
    var sY = (H / 2 * 0.98) / mesh.R0 * st.zoom, sX = sY / (2 * G.a);
    rasterize(mesh, fr, { spin: st.spin, tilt: st.tilt, scaleX: sX, scaleY: sY, cx: W / 2, cy: H / 2, splat: 1 });
    var kd = fr.kd, out = '', cur = '', cy, cx, dy, dx, bits, nPet, nGrn, sum, cnt;
    for (cy = 0; cy < R; cy++) {
      for (cx = 0; cx < C; cx++) {
        bits = 0; nPet = 0; nGrn = 0; sum = 0; cnt = 0;
        for (dy = 0; dy < 4; dy++) for (dx = 0; dx < 2; dx++) {
          var x = cx * 2 + dx, y = cy * 4 + dy, i = y * W + x, k = kd[i];
          if (!k) continue;
          var L = lumOf(fr.dif[i], fr.ndv[i], fr.ao[i]) * edgeFactor(fr, x, y, 0.06);
          var thr = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
          if (L > thr * 0.75 + 0.03) { bits |= BITS[dy][dx]; if (k === 1) nPet++; else nGrn++; sum += L; cnt++; }
        }
        if (!bits) { out += '⠀'; continue; }
        var kk = nPet >= nGrn ? 1 : 2, q = Math.min(7, ((sum / cnt) * 8) | 0), key = kk * 8 + q;
        if (key !== cur) { if (cur !== '') out += '</span>'; out += '<span style="color:' + tables[kk][q] + '">'; cur = key; }
        out += String.fromCharCode(0x2800 + bits);
      }
      out += '\n';
    }
    if (cur !== '') out += '</span>';
    pre.innerHTML = out;
  }

  /* ---------- rendu réaliste ---------- */
  function drawReal() {
    if (!meshHi) meshHi = buildRoseMesh(1.1, 3300);
    var S = G.res, fr = G.fr, sc = (S / 2 * 0.96) / meshHi.R0 * st.zoom;
    rasterize(meshHi, fr, { spin: st.spin, tilt: st.tilt, scaleX: sc, scaleY: sc, cx: S / 2, cy: S / 2, splat: 2, maxSplat: 5 });
    var u32 = G.u32, kd = fr.kd, n = S * S, base = PALETTES[st.pal].rgb;
    var pr = base[0], pg = base[1], pb = base[2], rr = pr * 0.5 + 110, rg = pg * 0.5 + 110, rb = pb * 0.5 + 110;
    for (var i = 0; i < n; i++) {
      var k = kd[i];
      if (!k) { u32[i] = 0; continue; }
      var d = fr.dif[i], v = fr.ndv[i], h = fr.hh[i], a = fr.ao[i];
      var rim = Math.pow(1 - v, 2.5), r, g, b;
      if (k === 1) {
        var m = 0.32 + 0.68 * Math.pow(a, 0.8), lit = 0.22 + 0.95 * d, sp = Math.pow(h, 24) * 0.32;
        r = pr * m * lit + rr * rim * 0.32 + 255 * sp;
        g = pg * m * lit + rg * rim * 0.32 + 255 * sp;
        b = pb * m * lit + rb * rim * 0.32 + 255 * sp;
      } else {
        var lt = 0.25 + 0.95 * d, sp2 = Math.pow(h, 30) * 0.25, leaf = k === 3;
        r = (leaf ? 70 : 48) * lt + 255 * sp2 + 25 * rim;
        g = (leaf ? 170 : 120) * lt + 255 * sp2 + 40 * rim;
        b = (leaf ? 80 : 62) * lt + 255 * sp2 + 20 * rim;
      }
      u32[i] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
    }
    ctx.putImageData(G.img, 0, 0);
  }

  /* ---------- rendu néon (fil de fer lumineux) ---------- */
  function drawNeon() {
    var S = G.res, W = S, H = S, sc = (S / 2 * 0.96) / mesh.R0 * st.zoom;
    var cs = Math.cos(st.spin), sn = Math.sin(st.spin), ca = Math.cos(st.tilt), sa = Math.sin(st.tilt);
    var pos = mesh.pos, px = G.px, zc = mesh.zc, n = mesh.n, i;
    for (i = 0; i < n; i++) {
      var x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2] - zc;
      var xr = x * cs - y * sn, yr = x * sn + y * cs;
      px[2 * i] = W / 2 + xr * sc; px[2 * i + 1] = H / 2 - (yr * sa + z * ca) * sc;
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var lw = Math.max(1, S / 560), base = PALETTES[st.pal].rgb;
    mesh.parts.forEach(function (pt) {
      var petal = pt.kind === 0, c1, c2;
      var rings = [], lines = [];
      for (var iu = 0; iu < pt.nu; iu += pt.ringStep) rings.push(iu);
      if (rings[rings.length - 1] !== pt.nu - 1) rings.push(pt.nu - 1);
      /* anneaux */
      rings.forEach(function (iu) {
        var f = iu / (pt.nu - 1);
        c1 = petal ? mix(base, [255, 255, 255], 0.1 + 0.55 * f) : (pt.kind === 1 ? [90, 255, 170] : [110, 255, 150]);
        ctx.strokeStyle = 'rgba(' + (c1[0] | 0) + ',' + (c1[1] | 0) + ',' + (c1[2] | 0) + ',' + (petal ? (0.14 + 0.4 * f * f).toFixed(2) : 0.5) + ')';
        ctx.lineWidth = lw;
        ctx.beginPath();
        var o = pt.off + iu * pt.nv;
        ctx.moveTo(px[2 * o], px[2 * o + 1]);
        for (var iv = 1; iv < pt.nv; iv++) ctx.lineTo(px[2 * (o + iv)], px[2 * (o + iv) + 1]);
        ctx.stroke();
      });
      /* méridiens */
      c2 = petal ? base : [70, 220, 130];
      ctx.strokeStyle = 'rgba(' + (c2[0] | 0) + ',' + (c2[1] | 0) + ',' + (c2[2] | 0) + ',' + (petal ? 0.1 : 0.26) + ')';
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      for (var iv2 = 0; iv2 < pt.nv; iv2 += pt.lineStep) {
        var o2 = pt.off + iv2;
        ctx.moveTo(px[2 * o2], px[2 * o2 + 1]);
        for (var iu2 = 1; iu2 < pt.nu; iu2++) { var q = pt.off + iu2 * pt.nv + iv2; ctx.lineTo(px[2 * q], px[2 * q + 1]); }
      }
      ctx.stroke();
    });
    /* halo : deux passes floues par réduction/agrandissement */
    var b1 = G.bc, b2 = G.bc2, c1x = b1.getContext('2d'), c2x = b2.getContext('2d');
    c1x.globalCompositeOperation = 'copy'; c1x.drawImage(cv, 0, 0, b1.width, b1.height);
    c2x.globalCompositeOperation = 'copy'; c2x.drawImage(cv, 0, 0, b2.width, b2.height);
    ctx.globalAlpha = 0.55; ctx.drawImage(b1, 0, 0, W, H);
    ctx.globalAlpha = 0.6; ctx.drawImage(b2, 0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- boucle ---------- */
  function render() {
    switch (st.mode) {
      case 'ascii': drawAscii(false); break;
      case 'asciic': drawAscii(true); break;
      case 'braille': drawBraille(); break;
      case 'real': drawReal(); break;
      case 'neon': drawNeon(); break;
    }
  }
  var last = 0;
  function tick(t) {
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (document.body.classList.contains('in-games')) { requestAnimationFrame(tick); return; }
    if (!st.paused && !st.drag) { st.spin += dt * 0.7 * st.speed; st.dirty = st.dirty || st.speed > 0; }
    if (st.dirty) { st.dirty = false; render(); }
    requestAnimationFrame(tick);
  }

  setPal(1); setMode('ascii'); startHome();
  requestAnimationFrame(function (t) { last = t; tick(t); });
})();
