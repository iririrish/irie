/* irie – photo effects engine (filters, adjustments, warps). Pure canvas, no libraries. */
'use strict';
(() => {
  const O = [0, 0, 0];
  const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  function sat(r, g, b, k) { const l = lum(r, g, b); O[0] = l + (r - l) * k; O[1] = l + (g - l) * k; O[2] = l + (b - l) * k; }
  const con = (v, k) => (v - 128) * k + 128;

  function makeLut(stops) {
    const L = new Uint8Array(768);
    for (let i = 0; i < 256; i++) {
      const t = i / 255; let a = stops[0], b = stops[stops.length - 1];
      for (let s = 0; s < stops.length - 1; s++) if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
      const u = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
      for (let c = 0; c < 3; c++) L[i * 3 + c] = a[1][c] + (b[1][c] - a[1][c]) * u;
    }
    return L;
  }
  const THERMAL = makeLut([[0, [0, 0, 40]], [.25, [70, 0, 170]], [.5, [225, 35, 60]], [.75, [255, 175, 0]], [1, [255, 255, 210]]]);

  /* ----- color filters ----- */
  const PRESETS = [
    { id: 'orig', name: 'Original', fn: null },
    { id: 'bw', name: 'Black & White', fn: (r, g, b) => { const l = con(lum(r, g, b), 1.1); O[0] = O[1] = O[2] = l; } },
    { id: 'vintage', name: 'Vintage', fn: (r, g, b) => {
      const sr = .393 * r + .769 * g + .189 * b, sg = .349 * r + .686 * g + .168 * b, sb = .272 * r + .534 * g + .131 * b;
      O[0] = (r + sr) / 2 * .92 + 22; O[1] = (g + sg) / 2 * .9 + 16; O[2] = (b + sb) / 2 * .85 + 14; } },
    { id: 'retro', name: 'Retro', fn: (r, g, b) => { O[0] = con(r, 1.1) + 14; O[1] = con(g, 1.05) + 4; O[2] = con(b, .95) - 14; } },
    { id: 'warm', name: 'Warm', fn: (r, g, b) => { O[0] = r * 1.08 + 10; O[1] = g * 1.02 + 3; O[2] = b * .88; } },
    { id: 'cool', name: 'Cool', fn: (r, g, b) => { O[0] = r * .88; O[1] = g; O[2] = b * 1.1 + 10; } },
    { id: 'bloom', name: 'Bloom', glow: .7, fn: (r, g, b) => sat(r, g, b, 1.15) },
    { id: 'citrus', name: 'Citrus', fn: (r, g, b) => sat(r * 1.06 + 6, g * 1.1 + 6, b * .78, 1.25) },
    { id: 'neon', name: 'Neon', fn: (r, g, b) => { sat(r, g, b, 1.9); O[0] = con(O[0], 1.25) + 10; O[1] = con(O[1], 1.25) - 8; O[2] = con(O[2], 1.25) + 20; } },
    { id: 'night', name: 'Night Vision', fn: (r, g, b) => { const l = lum(r, g, b) * 1.35; O[0] = l * .15; O[1] = Math.min(255, l * 1.05 + 25); O[2] = l * .2; } },
    { id: 'thermal', name: 'Thermal', fn: (r, g, b) => { let i = lum(r, g, b) | 0; if (i > 255) i = 255; O[0] = THERMAL[i * 3]; O[1] = THERMAL[i * 3 + 1]; O[2] = THERMAL[i * 3 + 2]; } },
    { id: 'underwater', name: 'Underwater', fn: (r, g, b) => { O[0] = r * .55; O[1] = g * .98 + 8; O[2] = b * 1.1 + 22; } },
    { id: 'sepia', name: 'Sepia', fn: (r, g, b) => { O[0] = .393 * r + .769 * g + .189 * b; O[1] = .349 * r + .686 * g + .168 * b; O[2] = .272 * r + .534 * g + .131 * b; } },
    { id: 'faded', name: 'Faded Film', fn: (r, g, b) => { sat(r, g, b, .8); O[0] = O[0] * .84 + 38; O[1] = O[1] * .84 + 34; O[2] = O[2] * .84 + 34; } },
    { id: 'pastel', name: 'Pastel', fn: (r, g, b) => { sat(r, g, b, .7); O[0] = O[0] * .72 + 70; O[1] = O[1] * .72 + 70; O[2] = O[2] * .72 + 74; } },
    { id: 'cinema', name: 'Cinematic', fn: (r, g, b) => {
      const t = (lum(r, g, b) / 255 - .5) * 44; sat(con(r + t, 1.15), con(g, 1.15), con(b - t, 1.15), .9); } },
    { id: 'dreamy', name: 'Dreamy', glow: 1, fn: (r, g, b) => { O[0] = r * 1.04 + 10; O[1] = g + 4; O[2] = b * 1.04 + 14; } },
    { id: 'contrast', name: 'High Contrast', fn: (r, g, b) => sat(con(r, 1.5), con(g, 1.5), con(b, 1.5), 1.15) },
    { id: 'matte', name: 'Matte', fn: (r, g, b) => { sat(r, g, b, .9); O[0] = O[0] * .82 + 28; O[1] = O[1] * .82 + 28; O[2] = O[2] * .82 + 30; } }
  ];
  const WARPS = [
    { id: 'none', name: 'None' }, { id: 'fisheye', name: 'Fisheye' }, { id: 'bulge', name: 'Bulge' }, { id: 'pinch', name: 'Pinch' },
    { id: 'ripple', name: 'Ripple' }, { id: 'spiral', name: 'Spiral' }, { id: 'stretch', name: 'Stretch' }, { id: 'twist', name: 'Twist' },
    { id: 'wave', name: 'Wave' }, { id: 'mirror', name: 'Mirror' }, { id: 'kaleido', name: 'Kaleidoscope' }
  ];
  const ADJ = [
    ['brightness', 'Brightness', -100, 100], ['contrast', 'Contrast', -100, 100], ['saturation', 'Saturation', -100, 100],
    ['exposure', 'Exposure', -100, 100], ['temperature', 'Temperature', -100, 100], ['tint', 'Tint', -100, 100],
    ['highlights', 'Highlights', -100, 100], ['shadows', 'Shadows', -100, 100],
    ['sharpness', 'Sharpness', 0, 100], ['vignette', 'Vignette', 0, 100], ['grain', 'Grain', 0, 100]
  ];

  const defaultFx = () => {
    const adj = {}; ADJ.forEach(a => { adj[a[0]] = 0; });
    return { color: 'orig', warp: 'none', strength: 100, warpStrength: 60, adj };
  };
  const isNeutral = fx => fx.color === 'orig' && fx.warp === 'none' && ADJ.every(a => !fx.adj[a[0]]);

  /* ----- warps (inverse mapping: for each output pixel, where to read from) ----- */
  function makeWarp(id, w, h, k) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2, Rd = Math.hypot(cx, cy), S = [0, 0];
    const rot = (dx, dy, a) => { const c = Math.cos(a), s = Math.sin(a); S[0] = cx + dx * c - dy * s; S[1] = cy + dx * s + dy * c; return S; };
    switch (id) {
      case 'fisheye': return (x, y) => { const dx = x - cx, dy = y - cy, f = Math.pow(Math.hypot(dx, dy) / Rd, k * .9); S[0] = cx + dx * f; S[1] = cy + dy * f; return S; };
      case 'bulge': return (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) / R, f = r < 1 ? 1 - k * .7 * (1 - r * r) : 1; S[0] = cx + dx * f; S[1] = cy + dy * f; return S; };
      case 'pinch': return (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) / R, f = r < 1 ? 1 + k * .8 * (1 - r * r) : 1; S[0] = cx + dx * f; S[1] = cy + dy * f; return S; };
      case 'ripple': return (x, y) => { const dx = x - cx, dy = y - cy, f = 1 + k * .05 * Math.sin(Math.hypot(dx, dy) / Rd * 38); S[0] = cx + dx * f; S[1] = cy + dy * f; return S; };
      case 'spiral': return (x, y) => { const dx = x - cx, dy = y - cy; return rot(dx, dy, k * 5 * Math.min(Math.hypot(dx, dy) / R, 1)); };
      case 'twist': return (x, y) => { const dx = x - cx, dy = y - cy, t = Math.max(0, 1 - Math.hypot(dx, dy) / R); return rot(dx, dy, k * 3 * t * t); };
      case 'stretch': return (x, y) => { const t = 1 - Math.abs(x - cx) / cx, f = 1 - k * .55 * t * t; S[0] = x; S[1] = cy + (y - cy) * f; return S; };
      case 'wave': { const amp = k * .035 * Math.min(w, h); return (x, y) => { S[0] = x + amp * Math.sin(y / h * Math.PI * 6); S[1] = y + amp * .6 * Math.sin(x / w * Math.PI * 4); return S; }; }
      case 'mirror': return (x, y) => { S[0] = x < cx ? x : w - 1 - x; S[1] = y; return S; };
      case 'kaleido': {
        const n = Math.max(3, Math.round(3 + k * 7)), seg = Math.PI * 2 / n;
        return (x, y) => { const dx = x - cx, dy = y - cy; let m = ((Math.atan2(dy, dx) % seg) + seg) % seg; if (m > seg / 2) m = seg - m;
          const r = Math.hypot(dx, dy) * .85; S[0] = cx + r * Math.cos(m + .4); S[1] = cy + r * Math.sin(m + .4); return S; };
      }
      default: return null;
    }
  }
  function warpData(d, w, h, map) {
    const out = new Uint8ClampedArray(d.length), mx = w - 1, my = h - 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = map(x, y); let sx = s[0], sy = s[1];
      sx = sx < 0 ? 0 : sx > mx ? mx : sx; sy = sy < 0 ? 0 : sy > my ? my : sy;
      const x0 = sx | 0, y0 = sy | 0, x1 = x0 < mx ? x0 + 1 : x0, y1 = y0 < my ? y0 + 1 : y0, fx = sx - x0, fy = sy - y0;
      const a = (y0 * w + x0) * 4, b = (y0 * w + x1) * 4, c = (y1 * w + x0) * 4, e = (y1 * w + x1) * 4, o = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const top = d[a + ch] + (d[b + ch] - d[a + ch]) * fx, bot = d[c + ch] + (d[e + ch] - d[c + ch]) * fx;
        out[o + ch] = top + (bot - top) * fy;
      }
      out[o + 3] = 255;
    }
    return out;
  }

  function blurBuf(d, w, h) {
    const a = document.createElement('canvas'); a.width = w; a.height = h;
    a.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d), w, h), 0, 0);
    const sm = document.createElement('canvas'); sm.width = Math.max(1, (w / 10) | 0); sm.height = Math.max(1, (h / 10) | 0);
    const sx = sm.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(a, 0, 0, sm.width, sm.height);
    const b = document.createElement('canvas'); b.width = w; b.height = h;
    const bx = b.getContext('2d', { willReadFrequently: true }); bx.imageSmoothingQuality = 'high'; bx.drawImage(sm, 0, 0, w, h);
    return bx.getImageData(0, 0, w, h).data;
  }

  function colorPass(d, fx, B) {
    const P = PRESETS.find(p => p.id === fx.color), k = fx.strength / 100, a = fx.adj;
    const usePreset = !!(P && P.fn) && k > 0;
    const ex = Math.pow(2, a.exposure / 100 * 1.5), br = a.brightness * .9, cf = 1 + a.contrast / 100, sa = 1 + a.saturation / 100;
    const tmp = a.temperature * .5, tint = a.tint * .4, sh = a.shadows / 100, hi = a.highlights / 100;
    const hasAdj = ex !== 1 || br || cf !== 1 || sa !== 1 || tmp || tint || sh || hi;
    if (!usePreset && !hasAdj) return;
    const glow = usePreset && P.glow && B ? P.glow * k : 0;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (usePreset) {
        P.fn(r, g, b); r += (O[0] - r) * k; g += (O[1] - g) * k; b += (O[2] - b) * k;
        if (glow) { r = 255 - (255 - r) * (255 - B[i] * glow) / 255; g = 255 - (255 - g) * (255 - B[i + 1] * glow) / 255; b = 255 - (255 - b) * (255 - B[i + 2] * glow) / 255; }
      }
      if (hasAdj) {
        if (ex !== 1) { r *= ex; g *= ex; b *= ex; }
        if (tmp || tint) { r += tmp + tint * .3; g -= tint * .6; b += -tmp + tint * .3; }
        if (sh || hi) {
          let l = (.299 * r + .587 * g + .114 * b) / 255; l = l < 0 ? 0 : l > 1 ? 1 : l;
          const add = (sh * (1 - l) * (1 - l) + hi * l * l) * 70; r += add; g += add; b += add;
        }
        if (br) { r += br; g += br; b += br; }
        if (cf !== 1) { r = (r - 128) * cf + 128; g = (g - 128) * cf + 128; b = (b - 128) * cf + 128; }
        if (sa !== 1) { const l = .299 * r + .587 * g + .114 * b; r = l + (r - l) * sa; g = l + (g - l) * sa; b = l + (b - l) * sa; }
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }
  function sharpen(d, w, h, amt) {
    const s = new Uint8ClampedArray(d);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v = 5 * s[o + c] - s[o - 4 + c] - s[o + 4 + c] - s[o - w * 4 + c] - s[o + w * 4 + c];
        d[o + c] = s[o + c] + (v - s[o + c]) * amt;
      }
    }
  }
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function finish(d, w, h, a) {
    const vg = a.vignette / 100, gr = a.grain / 100 * 45, cx = w / 2, cy = h / 2, Rd = Math.hypot(cx, cy);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; let m = 1, n = 0;
      if (vg > 0) { m = 1 - vg * Math.pow(Math.hypot(x - cx, y - cy) / Rd, 2.2) * 1.3; if (m < 0) m = 0; }
      if (gr > 0) n = (hash(x, y) - .5) * gr;
      d[i] = d[i] * m + n; d[i + 1] = d[i + 1] * m + n; d[i + 2] = d[i + 2] * m + n;
    }
  }

  /* Crop `src` to sw x sh (cover), then apply warp + filter + adjustments. Returns a canvas. */
  function process(src, sw, sh, fx) {
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const k = Math.max(sw / src.width, sh / src.height), cw = sw / k, ch = sh / k;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, (src.width - cw) / 2, (src.height - ch) / 2, cw, ch, 0, 0, sw, sh);
    if (isNeutral(fx)) return c;
    const img = ctx.getImageData(0, 0, sw, sh), d = img.data, wk = fx.warpStrength / 100;
    if (fx.warp !== 'none' && wk > 0) { const m = makeWarp(fx.warp, sw, sh, wk); if (m) d.set(warpData(d, sw, sh, m)); }
    const P = PRESETS.find(p => p.id === fx.color);
    const B = P && P.glow && fx.strength > 0 ? blurBuf(d, sw, sh) : null;
    colorPass(d, fx, B);
    if (fx.adj.sharpness > 0) sharpen(d, sw, sh, fx.adj.sharpness / 100 * 1.2);
    if (fx.adj.vignette > 0 || fx.adj.grain > 0) finish(d, sw, sh, fx.adj);
    ctx.putImageData(img, 0, 0);
    return c;
  }

  window.IrieFX = { PRESETS, WARPS, ADJ, defaultFx, isNeutral, process };
})();
