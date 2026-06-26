// color-math.js — pure color-space conversions for the talk (classic script).
// Exposes window.ColorMath. sRGB(D65) <-> linear <-> XYZ <-> Lab / Luv / LCh, HSL, HSV, HSLuv.
// HSLuv portion adapted from the public-domain reference algorithm at hsluv.org.
(function () {
  const M_XYZ_FROM_RGB = [
    [0.41239079926595, 0.35758433938387, 0.18048078840183],
    [0.21263900587151, 0.71516867876775, 0.07219231536073],
    [0.01933081871559, 0.11919477979462, 0.95053215224966],
  ];
  const M_RGB_FROM_XYZ = [
    [ 3.24096994190452, -1.53738317757009, -0.49861076029301],
    [-0.96924363628087,  1.87596750150772,  0.04155505740718],
    [ 0.05563007969699, -0.20397695888897,  1.05697151424288],
  ];
  const REF_U = 0.19783000664283, REF_V = 0.46831999493879;
  const KAPPA = 903.2962962, EPSILON = 0.0088564516;
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;

  function dot(r, v) { return r[0] * v[0] + r[1] * v[1] + r[2] * v[2]; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function toLinear(c) { return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; }
  function fromLinear(c) { c = clamp01(c); return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }

  function rgbToXyz(rgb) {
    const rl = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
    return [dot(M_XYZ_FROM_RGB[0], rl), dot(M_XYZ_FROM_RGB[1], rl), dot(M_XYZ_FROM_RGB[2], rl)];
  }
  function xyzToRgb(xyz) {
    return [fromLinear(dot(M_RGB_FROM_XYZ[0], xyz)), fromLinear(dot(M_RGB_FROM_XYZ[1], xyz)), fromLinear(dot(M_RGB_FROM_XYZ[2], xyz))];
  }

  function fLab(t) { return t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116; }
  function fLabInv(t) { const t3 = t * t * t; return t3 > EPSILON ? t3 : (116 * t - 16) / KAPPA; }
  function xyzToLab(xyz) {
    const fx = fLab(xyz[0] / Xn), fy = fLab(xyz[1] / Yn), fz = fLab(xyz[2] / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function labToXyz(lab) {
    const fy = (lab[0] + 16) / 116, fx = fy + lab[1] / 500, fz = fy - lab[2] / 200;
    return [fLabInv(fx) * Xn, fLabInv(fy) * Yn, fLabInv(fz) * Zn];
  }
  function rgbToLab(rgb) { return xyzToLab(rgbToXyz(rgb)); }
  function labToRgb(lab) { return xyzToRgb(labToXyz(lab)); }

  function yToL(Y) { return Y <= EPSILON ? Y * KAPPA : 116 * Math.pow(Y, 1 / 3) - 16; }
  function lToY(L) { return L <= 8 ? L / KAPPA : Math.pow((L + 16) / 116, 3); }
  function xyzToLuv(xyz) {
    const X = xyz[0], Y = xyz[1], Z = xyz[2], div = X + 15 * Y + 3 * Z;
    if (div === 0) return [0, 0, 0];
    const u = 4 * X / div, v = 9 * Y / div, L = yToL(Y);
    if (L === 0) return [0, 0, 0];
    return [L, 13 * L * (u - REF_U), 13 * L * (v - REF_V)];
  }
  function luvToXyz(luv) {
    const L = luv[0], U = luv[1], V = luv[2];
    if (L === 0) return [0, 0, 0];
    const u = U / (13 * L) + REF_U, v = V / (13 * L) + REF_V, Y = lToY(L);
    const X = -(9 * Y * u) / ((u - 4) * v - u * v);
    const Z = (9 * Y - 15 * v * Y - v * X) / (3 * v);
    return [X, Y, Z];
  }
  function luvToLch(luv) {
    const L = luv[0], U = luv[1], V = luv[2], C = Math.sqrt(U * U + V * V);
    let H = 0; if (C >= 1e-8) { H = Math.atan2(V, U) * 180 / Math.PI; if (H < 0) H += 360; }
    return [L, C, H];
  }
  function lchToLuv(lch) {
    const L = lch[0], C = lch[1], hr = lch[2] / 180 * Math.PI;
    return [L, Math.cos(hr) * C, Math.sin(hr) * C];
  }
  function rgbToLch(rgb) { return luvToLch(xyzToLuv(rgbToXyz(rgb))); }

  function getBounds(L) {
    const result = [], sub1 = Math.pow(L + 16, 3) / 1560896, sub2 = sub1 > EPSILON ? sub1 : L / KAPPA;
    for (let c = 0; c < 3; c++) {
      const m1 = M_RGB_FROM_XYZ[c][0], m2 = M_RGB_FROM_XYZ[c][1], m3 = M_RGB_FROM_XYZ[c][2];
      for (let t = 0; t < 2; t++) {
        const top1 = (284517 * m1 - 94839 * m3) * sub2;
        const top2 = (838422 * m3 + 769860 * m2 + 731718 * m1) * L * sub2 - 769860 * t * L;
        const bottom = (632260 * m3 - 126452 * m2) * sub2 + 126452 * t;
        result.push([top1 / bottom, top2 / bottom]);
      }
    }
    return result;
  }
  function maxChromaForLH(L, H) {
    const hr = H / 360 * Math.PI * 2, bounds = getBounds(L);
    let min = Infinity;
    for (const b of bounds) { const l = b[1] / (Math.sin(hr) - b[0] * Math.cos(hr)); if (l >= 0) min = Math.min(min, l); }
    return min;
  }
  function hsluvToLch(t) {
    const H = t[0], S = t[1], L = t[2];
    if (L > 99.9999999) return [100, 0, H];
    if (L < 1e-8) return [0, 0, H];
    return [L, maxChromaForLH(L, H) / 100 * S, H];
  }
  function lchToHsluv(t) {
    const L = t[0], C = t[1], H = t[2];
    if (L > 99.9999999) return [H, 0, 100];
    if (L < 1e-8) return [H, 0, 0];
    return [H, C / maxChromaForLH(L, H) * 100, L];
  }
  function hsluvToRgb(hsl) { return xyzToRgb(luvToXyz(lchToLuv(hsluvToLch(hsl)))); }
  function rgbToHsluv(rgb) { return lchToHsluv(luvToLch(xyzToLuv(rgbToXyz(rgb)))); }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const hk = (tt) => { if (tt < 0) tt += 1; if (tt > 1) tt -= 1; if (tt < 1 / 6) return p + (q - p) * 6 * tt; if (tt < 1 / 2) return q; if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6; return p; };
    return [hk(h + 1 / 3), hk(h), hk(h - 1 / 3)];
  }
  function hsvToRgb(h, s, v) {
    h /= 60; s /= 100; v /= 100;
    const i = Math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - s * f), tt = v * (1 - s * (1 - f));
    switch (((i % 6) + 6) % 6) {
      case 0: return [v, tt, p]; case 1: return [q, v, p]; case 2: return [p, v, tt];
      case 3: return [p, q, v]; case 4: return [tt, p, v]; default: return [v, p, q];
    }
  }

  function rgbToHex(rgb) { return '#' + rgb.map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); }
  function css(rgb) { return 'rgb(' + rgb.map((c) => Math.round(clamp01(c) * 255)).join(',') + ')'; }
  function inGamut(rgb, eps) { eps = eps || 1e-4; return rgb.every((c) => c >= -eps && c <= 1 + eps); }

  window.ColorMath = {
    M_XYZ_FROM_RGB, M_RGB_FROM_XYZ, toLinear, fromLinear,
    rgbToXyz, xyzToRgb, xyzToLab, labToXyz, rgbToLab, labToRgb,
    xyzToLuv, luvToXyz, luvToLch, lchToLuv, rgbToLch,
    maxChromaForLH, hsluvToLch, lchToHsluv, hsluvToRgb, rgbToHsluv,
    hslToRgb, hsvToRgb, clamp01, inGamut, rgbToHex, css,
  };
})();
