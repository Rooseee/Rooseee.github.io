/* ===== Rosa — cœur 3D (pur, sans DOM) ===== */
var TAU = Math.PI * 2;

/* Surface paramétrique d'une rose : u∈[0,1] (base→bord du pétale), v∈[0,20π] (enroulement) */
function roseSurface(u, v) {
  var phi = (Math.PI / 2) * Math.exp(-v / (8 * Math.PI));
  var m = (3.6 * v) % TAU;
  var q = 1.25 * Math.pow(1 - m / Math.PI, 2) - 0.25;
  var P = 1 - 0.5 * q * q;
  var y = 1.95653 * u * u * Math.pow(1.27689 * u - 1, 2) * Math.sin(phi);
  var r = P * (u * Math.sin(phi) + y * Math.cos(phi));
  return [r * Math.sin(v), r * Math.cos(v), P * (u * Math.cos(phi) - y * Math.sin(phi))];
}

var STEM_LEN = 1.6;
function stemCenter(s) { return [0.09 * Math.sin(s * 2.6), 0, -0.22 - s * STEM_LEN]; }
function stemSurface(s, a) {
  var c = stemCenter(s), r = 0.045 + 0.012 * (1 - s);
  return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]];
}
/* coupe (calice) sous la fleur */
function cupSurface(s, a) {
  var r = 0.045 + 0.15 * Math.pow(1 - s, 1.4);
  return [r * Math.cos(a), r * Math.sin(a), -0.24 * s + 0.05];
}
function leafSurface(psi, s0) {
  var base = stemCenter(s0);
  var dx = Math.cos(psi), dy = Math.sin(psi);
  return function (s, t) {
    var w = 0.17 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.75)), 0.9);
    var L = s * 1.0;
    var fold = 0.45 * Math.abs(t) * w;
    return [
      base[0] + dx * L * 0.95 - dy * t * w,
      base[1] + dy * L * 0.95 + dx * t * w,
      base[2] + L * 0.38 - 0.30 * s * s + fold
    ];
  };
}

function buildPart(f, nu, nv, u0, u1, v0, v1, kind, tagFn, ringStep, lineStep, off, eu, ev) {
  var n = nu * nv;
  var pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  var tag = new Float32Array(n), kd = new Uint8Array(n), sz = new Float32Array(n);
  var k = 0, du = (u1 - u0) / (nu - 1), dv = (v1 - v0) / (nv - 1);
  for (var iu = 0; iu < nu; iu++) {
    var u = u0 + (u1 - u0) * iu / (nu - 1);
    for (var iv = 0; iv < nv; iv++) {
      var v = v0 + (v1 - v0) * iv / (nv - 1);
      var p = f(u, v);
      var a1 = f(u + eu, v), a0 = f(u - eu, v), b1 = f(u, v + ev), b0 = f(u, v - ev);
      var ax = a1[0] - a0[0], ay = a1[1] - a0[1], az = a1[2] - a0[2];
      var bx = b1[0] - b0[0], by = b1[1] - b0[1], bz = b1[2] - b0[2];
      var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (l < 1e-12) { nx = 0; ny = 0; nz = 1; l = 1; }
      pos[3 * k] = p[0]; pos[3 * k + 1] = p[1]; pos[3 * k + 2] = p[2];
      nrm[3 * k] = nx / l; nrm[3 * k + 1] = ny / l; nrm[3 * k + 2] = nz / l;
      var su = Math.sqrt(ax * ax + ay * ay + az * az) / (2 * eu) * du, sv = Math.sqrt(bx * bx + by * by + bz * bz) / (2 * ev) * dv;
      sz[k] = su > sv ? su : sv;
      tag[k] = tagFn ? tagFn(u, v) : 1;
      kd[k] = kind;
      k++;
    }
  }
  return { n: n, pos: pos, nrm: nrm, tag: tag, kind: kd, sz: sz,
           meta: { off: off, nu: nu, nv: nv, kind: kind, ringStep: ringStep, lineStep: lineStep } };
}

function buildRoseMesh(densU, nvPetal) {
  var density = densU || 1;
  var parts = [];
  parts.push(buildPart(roseSurface, Math.round(64 * density), nvPetal || 2400, 0, 1, 0, 20 * Math.PI, 0,
    function (u) { return u; }, Math.max(1, Math.round(7 * density)), 48, 0, 0.002, 0.006));
  parts.push(buildPart(stemSurface, 70, 20, 0, 1, 0, TAU, 1, null, 6, 3, 0, 0.002, 0.01));
  parts.push(buildPart(cupSurface, 16, 24, 0, 1, 0, TAU, 1, null, 5, 4, 0, 0.002, 0.01));
  parts.push(buildPart(leafSurface(0.7, 0.42), 46, 28, 0, 1, -1, 1, 2, null, 5, 2, 0, 0.002, 0.01));
  parts.push(buildPart(leafSurface(0.7 + Math.PI * 1.05, 0.72), 46, 28, 0, 1, -1, 1, 2, null, 5, 2, 0, 0.002, 0.01));
  var n = 0, i;
  for (i = 0; i < parts.length; i++) { parts[i].meta.off = n; n += parts[i].n; }
  var pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), tag = new Float32Array(n), kind = new Uint8Array(n), sz = new Float32Array(n);
  var o = 0;
  for (i = 0; i < parts.length; i++) {
    pos.set(parts[i].pos, o * 3); nrm.set(parts[i].nrm, o * 3); tag.set(parts[i].tag, o); kind.set(parts[i].kind, o); sz.set(parts[i].sz, o);
    o += parts[i].n;
  }
  var zmin = 1e9, zmax = -1e9;
  for (i = 0; i < n; i++) { var z = pos[3 * i + 2]; if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
  var zc = (zmin + zmax) / 2, R0 = 0;
  for (i = 0; i < n; i++) {
    var x = pos[3 * i], y = pos[3 * i + 1], zz = pos[3 * i + 2] - zc;
    var d = Math.sqrt(x * x + y * y + zz * zz); if (d > R0) R0 = d;
  }
  return { n: n, pos: pos, nrm: nrm, tag: tag, kind: kind, sz: sz, parts: parts.map(function (p) { return p.meta; }), zc: zc, R0: R0, zmin: zmin, zmax: zmax };
}

/* ===== Rastérisation (z-buffer) ===== */
var LIGHT = (function () { var l = [-0.5, 0.6, 0.65], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
var HALF = (function () { var h = [LIGHT[0], LIGHT[1], LIGHT[2] + 1], n = Math.hypot(h[0], h[1], h[2]); return [h[0] / n, h[1] / n, h[2] / n]; })();

function makeFrame(W, H) {
  var n = W * H;
  return { W: W, H: H, z: new Float32Array(n), kd: new Uint8Array(n), dif: new Float32Array(n),
           ndv: new Float32Array(n), hh: new Float32Array(n), ao: new Float32Array(n) };
}

/* p: {spin,tilt,scaleX,scaleY,cx,cy,splat} — kd = kind+1 (0 = vide) */
function rasterize(mesh, fr, p) {
  var W = fr.W, H = fr.H, z = fr.z, kd = fr.kd, dif = fr.dif, ndv = fr.ndv, hh = fr.hh, ao = fr.ao;
  z.fill(-1e9); kd.fill(0);
  var cs = Math.cos(p.spin), sn = Math.sin(p.spin), ca = Math.cos(p.tilt), sa = Math.sin(p.tilt);
  var pos = mesh.pos, nrm = mesh.nrm, tag = mesh.tag, kind = mesh.kind, szs = mesh.sz, n = mesh.n, zc = mesh.zc;
  var sX = p.scaleX, sY = p.scaleY, cx = p.cx, cy = p.cy, sp0 = p.splat || 1, maxSp = p.maxSplat || sp0, sp = sp0;
  var L0 = LIGHT[0], L1 = LIGHT[1], L2 = LIGHT[2], H0 = HALF[0], H1 = HALF[1], H2 = HALF[2];
  var off = 0;
  for (var i = 0; i < n; i++) {
    sp = sp0;
    if (maxSp > sp0) { sp = Math.ceil(szs[i] * sY * 0.95); if (sp < sp0) sp = sp0; else if (sp > maxSp) sp = maxSp; }
    off = 0.5 - sp / 2;
    var x = pos[3 * i], y = pos[3 * i + 1], zz = pos[3 * i + 2] - zc;
    var xr = x * cs - y * sn, yr = x * sn + y * cs;
    var sy = yr * sa + zz * ca, dp = -yr * ca + zz * sa;
    var px = cx + xr * sX, py = cy - sy * sY;
    var ix0 = Math.floor(px + off), iy0 = Math.floor(py + off);
    if (ix0 + sp <= 0 || iy0 + sp <= 0 || ix0 >= W || iy0 >= H) continue;
    var nx = nrm[3 * i], ny = nrm[3 * i + 1], nz = nrm[3 * i + 2];
    var nxr = nx * cs - ny * sn, nyr = nx * sn + ny * cs;
    var nU = nyr * sa + nz * ca, nT = -nyr * ca + nz * sa;
    var d = nxr * L0 + nU * L1 + nT * L2; if (d < 0) d = -d;
    var vv = nT < 0 ? -nT : nT;
    var h = nxr * H0 + nU * H1 + nT * H2; if (h < 0) h = -h;
    var k = kind[i] + 1, a = tag[i];
    for (var dy = 0; dy < sp; dy++) {
      var yy = iy0 + dy; if (yy < 0 || yy >= H) continue;
      for (var dx = 0; dx < sp; dx++) {
        var xx = ix0 + dx; if (xx < 0 || xx >= W) continue;
        var j = yy * W + xx;
        if (dp > z[j]) { z[j] = dp; kd[j] = k; dif[j] = d; ndv[j] = vv; hh[j] = h; ao[j] = a; }
      }
    }
  }
}

/* luminance 0..1 pour les rendus texte */
function lumOf(d, v, a) {
  var b = d * (0.3 + 0.7 * a);
  var l = 0.07 + 0.78 * Math.pow(b, 1.15) + 0.28 * Math.pow(1 - v, 2.5);
  return l < 0.06 ? 0.06 : (l > 1 ? 1 : l);
}

/* >1 normal ; <1 : pixel masqué par un voisin plus proche (arête entre pétales) */
function edgeFactor(fr, x, y, thr) {
  var W = fr.W, H = fr.H, z = fr.z, i = y * W + x, zi = z[i] + thr;
  if ((x > 0 && z[i - 1] > zi) || (x < W - 1 && z[i + 1] > zi) || (y > 0 && z[i - W] > zi) || (y < H - 1 && z[i + W] > zi)) return 0.42;
  return 1;
}

/* couleur d'un pixel (rendu réaliste) → [r,g,b] 0..255 */
function shadeReal(k, d, v, h, a, base) {
  var rim = Math.pow(1 - v, 2.5), r, g, b;
  if (k === 1) {
    var m = 0.32 + 0.68 * Math.pow(a, 0.8), lit = 0.22 + 0.95 * d;
    var sp = Math.pow(h, 24) * 0.32;
    r = base[0] * m * lit + (base[0] * 0.5 + 110) * rim * 0.32 + 255 * sp;
    g = base[1] * m * lit + (base[1] * 0.5 + 110) * rim * 0.32 + 255 * sp;
    b = base[2] * m * lit + (base[2] * 0.5 + 110) * rim * 0.32 + 255 * sp;
  } else {
    var gb = k === 3 ? [70, 170, 80] : [48, 120, 62], lt = 0.25 + 0.95 * d, sp2 = Math.pow(h, 30) * 0.25;
    r = gb[0] * lt + 255 * sp2 + 25 * rim; g = gb[1] * lt + 255 * sp2 + 40 * rim; b = gb[2] * lt + 255 * sp2 + 20 * rim;
  }
  return [r > 255 ? 255 : r, g > 255 ? 255 : g, b > 255 ? 255 : b];
}

