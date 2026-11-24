/* irie – Phase 1: camera, countdown, multi-shot, retake, layouts, PNG export */
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('irie.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('irie.' + k, JSON.stringify(v)); } catch { /* ignore */ } }
  };

  /* ---------- state ---------- */
  const BGS = [
    { a: '#ffd6ec' }, { a: '#e4d4ff' }, { a: '#ffffff' }, { a: '#1b1030' }, { a: '#fff3e0' },
    { a: '#ff8cc6', b: '#9b7bff' }, { a: '#ffc4e1', b: '#c4b5fd' }
  ];
  const state = {
    layoutId: store.get('layout', 'plain'),
    photos: [],
    opts: { bg: store.get('bg', BGS[0]), gap: store.get('gap', 24), round: store.get('round', true), caption: '', date: false },
    countdown: store.get('countdown', 3),
    delay: store.get('delay', 2),
    mute: store.get('mute', false),
    mirror: true, facing: 'user', deviceId: null,
    stream: null, camToken: 0,
    busy: false, cancel: false,
    screen: 'home', mode: 'new', retakeIdx: null, uploadIdx: null,
    fx: IrieFX.defaultFx(), items: [], sel: null, compare: false,
    tab: 'design', fxTab: 'color', stickerCat: 'Hearts', hist: [], histIdx: -1, themeId: '',
    order: [], pe: {}, selPhoto: 0, uploadEdit: false
  };
  {
    const e = store.get('effect', 'none');
    state.fx.effect = IrieFX.EFFECTS.some(x => x.id === e) ? e : 'none';
    state.fx.strength = store.get('strength', 100);
    const ef = IrieFX.EFFECTS.find(x => x.id === state.fx.effect);
    if (ef && ef.cat !== 'none') state.fxTab = ef.cat;
  }
  let uid = 0;
  const tag = c => { c._id = ++uid; return c; };

  /* ---------- layouts ---------- */
  function strip(n, name, W0 = 600) {
    return {
      id: 'strip' + n, name, count: n, aspect: 4 / 3,
      geom(o) {
        const W = W0, pad = 36, gap = o.gap, pw = W - pad * 2, ph = Math.round(pw * 3 / 4);
        const fh = (o.caption.trim() || o.date) ? 150 : 70;
        const slots = [];
        for (let i = 0; i < n; i++) slots.push({ x: pad, y: pad + i * (ph + gap), w: pw, h: ph });
        const bottom = pad + n * ph + (n - 1) * gap;
        return { w: W, h: bottom + fh, slots, r: o.round ? 14 : 0, footer: { y: bottom, h: fh, size: 56 } };
      }
    };
  }
  const polaroid = {
    id: 'polaroid', name: 'Polaroid', count: 1, aspect: 1,
    geom(o) {
      const W = 700, pad = 40, ps = W - pad * 2, fh = 190;
      return { w: W, h: pad + ps + fh, slots: [{ x: pad, y: pad, w: ps, h: ps }], r: o.round ? 10 : 0, footer: { y: pad + ps, h: fh, size: 68 } };
    }
  };
  const plain = {
    id: 'plain', name: 'Normal photo', count: 1, aspect: 4 / 3, noStrip: true,
    geom() { return { w: 1200, h: 900, slots: [{ x: 0, y: 0, w: 1200, h: 900 }], r: 0 }; }
  };
  const plainP = {
    id: 'plainp', name: 'Normal photo (portrait)', count: 1, aspect: 3 / 4, noStrip: true,
    geom() { return { w: 900, h: 1200, slots: [{ x: 0, y: 0, w: 900, h: 1200 }], r: 0 }; }
  };
  const hasText = o => !!(o.caption.trim() || o.date);
  function grid(cols, rows, name, id) {
    return {
      id, name, count: cols * rows, aspect: 1,
      geom(o) {
        const W = cols === 3 ? 900 : 700, pad = 32, gap = o.gap, cw = (W - pad * 2 - (cols - 1) * gap) / cols, slots = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push({ x: pad + c * (cw + gap), y: pad + r * (cw + gap), w: cw, h: cw });
        const bottom = pad + rows * cw + (rows - 1) * gap, fh = hasText(o) ? 130 : pad;
        return { w: W, h: bottom + fh, slots, r: o.round ? 12 : 0, footer: { y: bottom, h: fh, size: 52 } };
      }
    };
  }
  const hstrip = {
    id: 'hstrip', name: 'Horizontal strip', count: 4, aspect: 1,
    geom(o) {
      const pad = 32, gap = o.gap, cw = 300, W = pad * 2 + 4 * cw + 3 * gap, slots = [];
      for (let i = 0; i < 4; i++) slots.push({ x: pad + i * (cw + gap), y: pad, w: cw, h: cw });
      const bottom = pad + cw, fh = hasText(o) ? 130 : pad;
      return { w: W, h: bottom + fh, slots, r: o.round ? 12 : 0, footer: { y: bottom, h: fh, size: 52 } };
    }
  };
  const dpolaroid = {
    id: 'dpolaroid', name: 'Double Polaroid', count: 2, aspect: 1,
    geom(o) {
      const cw = 560, ch = 680, pad = 50, gap = Math.max(o.gap, 20) + 20, W = pad * 2 + cw * 2 + gap, cards = [], slots = [];
      for (let i = 0; i < 2; i++) { const x = pad + i * (cw + gap); cards.push({ x, y: pad, w: cw, h: ch, r: 6 }); slots.push({ x: x + 30, y: pad + 30, w: 500, h: 500 }); }
      const bottom = pad + ch, fh = hasText(o) ? 130 : pad;
      return { w: W, h: bottom + fh, slots, cards, r: o.round ? 8 : 0, footer: { y: bottom, h: fh, size: 52 } };
    }
  };
  const film = {
    id: 'film', name: 'Film strip', count: 4, aspect: 1.5,
    geom(o) {
      const W = 600, side = 74, pw = W - side * 2, ph = Math.round(pw / 1.5), gap = 34, pad = 26, slots = [];
      for (let i = 0; i < 4; i++) slots.push({ x: side, y: pad + i * (ph + gap), w: pw, h: ph });
      const bottom = pad + 4 * ph + 3 * gap, fh = hasText(o) ? 110 : pad, H = bottom + fh;
      return {
        w: W, h: H, slots, r: 0, bg: '#141414', ink: '#f4f4f4', footer: { y: bottom, h: fh, size: 48 },
        deco(ctx) {
          ctx.fillStyle = '#e9e4d8';
          for (let y = 14; y < H - 20; y += 44) { rr(ctx, 22, y, 30, 22, 5); ctx.fill(); rr(ctx, W - 52, y, 30, 22, 5); ctx.fill(); }
          ctx.fillStyle = '#ff9a3c'; ctx.font = '600 18px "DM Sans", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          slots.forEach((sl, i) => ctx.fillText(String(i + 1) + 'A', sl.x + 4, sl.y + sl.h + 22));
        }
      };
    }
  };
  const collage = {
    id: 'collage', name: 'Collage', count: 4, aspect: 520 / 840,
    geom(o) {
      const pad = 30, gap = o.gap, W = 900, bh = 840, bw = 520, sx = pad + bw + gap, sw = W - pad - sx, sh = (bh - 2 * gap) / 3;
      const slots = [{ x: pad, y: pad, w: bw, h: bh }];
      for (let i = 0; i < 3; i++) slots.push({ x: sx, y: pad + i * (sh + gap), w: sw, h: sh });
      const bottom = pad + bh, fh = hasText(o) ? 120 : pad;
      return { w: W, h: bottom + fh, slots, r: o.round ? 12 : 0, footer: { y: bottom, h: fh, size: 52 } };
    }
  };
  const scrap = {
    id: 'scrap', name: 'Scrapbook', count: 4, aspect: 4 / 3,
    geom(o) {
      const b = 16, r = o.round ? 8 : 0;
      return { w: 900, h: 1250, r, slots: [
        { x: 70, y: 70, w: 420, h: 315, rot: -5, border: b }, { x: 430, y: 260, w: 420, h: 315, rot: 4, border: b },
        { x: 90, y: 560, w: 420, h: 315, rot: 3, border: b }, { x: 410, y: 850, w: 420, h: 315, rot: -4, border: b }
      ] };
    }
  };
  const BUILTIN = [plain, plainP, strip(4, 'Classic 4-cut'), strip(3, '3-cut strip'), strip(2, '2-cut strip'), strip(6, '6-cut strip', 500), hstrip,
    grid(2, 2, '2 × 2 grid', 'grid22'), grid(2, 3, '2 × 3 grid', 'grid23'), grid(3, 3, '3 × 3 grid', 'grid33'),
    polaroid, dpolaroid, film, collage, scrap];
  let layouts = [...BUILTIN];
  const cur = () => layouts.find(l => l.id === state.layoutId) || layouts[0];

  /* ---------- frames from /frames ---------- */
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  function detectSlots(img) {
    const W = img.naturalWidth, H = img.naturalHeight, sc = Math.min(1, 300 / Math.max(W, H));
    const w = Math.max(1, Math.round(W * sc)), h = Math.max(1, Math.round(H * sc));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    const seen = new Uint8Array(w * h), out = [], stack = [];
    const clear = i => d[i * 4 + 3] < 40;
    for (let s = 0; s < w * h; s++) {
      if (seen[s] || !clear(s)) continue;
      let minX = w, minY = h, maxX = 0, maxY = 0, area = 0, edge = false;
      seen[s] = 1; stack.push(s);
      while (stack.length) {
        const p = stack.pop(), px = p % w, py = (p / w) | 0;
        area++;
        if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
        if (px === 0 || py === 0 || px === w - 1 || py === h - 1) edge = true;
        const nb = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1];
        for (const n of nb) if (n >= 0 && !seen[n] && clear(n)) { seen[n] = 1; stack.push(n); }
      }
      if (!edge && area > w * h * 0.01) {
        out.push({ x: Math.round(minX / sc), y: Math.round(minY / sc), w: Math.round((maxX - minX + 1) / sc), h: Math.round((maxY - minY + 1) / sc) });
      }
    }
    out.sort((a, b) => Math.abs(a.y - b.y) > Math.min(a.h, b.h) * 0.5 ? a.y - b.y : a.x - b.x);
    return out;
  }

  async function loadFrames() {
    try {
      const res = await fetch('frames/frames.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const data = await res.json();
      for (const f of data.frames || []) {
        try {
          const img = await loadImg('frames/' + f.file);
          let slots = f.slots || detectSlots(img);
          if (f.photos) slots = slots.slice(0, f.photos);
          if (!slots.length) { console.warn('irie: no photo windows found in', f.file); continue; }
          layouts.push({
            id: 'frame:' + f.file, name: f.name || f.file, count: slots.length, aspect: slots[0].w / slots[0].h, frame: true,
            geom: () => ({ w: img.naturalWidth, h: img.naturalHeight, slots, r: 0, overlay: img })
          });
        } catch { console.warn('irie: could not load frame', f.file); }
      }
      refreshPickers();
    } catch { /* frames are optional */ }
  }

  /* ---------- rendering ---------- */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawCover(ctx, img, s, z = 1, ox = 0, oy = 0) {
    const iw = img.width, ih = img.height, k = Math.max(s.w / iw, s.h / ih) * z;
    const sw = s.w / k, sh = s.h / k;
    ctx.drawImage(img, (iw - sw) / 2 * (1 + ox), (ih - sh) / 2 * (1 + oy), sw, sh, s.x, s.y, s.w, s.h);
  }
  function drawPlaceholder(ctx, s, i) {
    const gr = ctx.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h);
    const hue = [330, 285, 310, 260][i % 4];
    gr.addColorStop(0, `hsl(${hue} 90% 82%)`); gr.addColorStop(1, `hsl(${hue + 40} 85% 72%)`);
    ctx.fillStyle = gr; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.min(s.w, s.h) * 0.25}px sans-serif`; ctx.fillText('✦', s.x + s.w / 2, s.y + s.h / 2);
  }
  function lum(hex) {
    const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  const fmtDate = () => new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  function fitText(ctx, text, font, size, maxW) {
    for (; size > 12; size -= 2) { ctx.font = font(size); if (ctx.measureText(text).width <= maxW) break; }
    return size;
  }
  function drawFooter(ctx, g, o, ink) {
    const f = g.footer; if (!f) return;
    const text = o.caption.trim(), date = o.date ? fmtDate() : '';
    if (!text && !date) return;
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cap = s => `600 ${s}px Caveat, cursive`, dt = s => `500 ${s}px "DM Sans", sans-serif`, cx = g.w / 2;
    const both = text && date;
    if (text) {
      const s = fitText(ctx, text, cap, f.size, g.w - 70); ctx.font = cap(s);
      ctx.fillText(text, cx, f.y + f.h * (both ? 0.4 : 0.5));
    }
    if (date) {
      const s = f.size * 0.4; ctx.font = dt(s); ctx.globalAlpha = 0.75;
      ctx.fillText(date, cx, f.y + f.h * (both ? 0.78 : 0.5)); ctx.globalAlpha = 1;
    }
  }

  /* ----- stickers & text drawing ----- */
  const FONTS = [
    { k: 'caveat', n: 'Handwritten', css: 'Caveat, cursive', w: 600 },
    { k: 'pacifico', n: 'Script', css: 'Pacifico, cursive', w: 400 },
    { k: 'marker', n: 'Marker', css: '"Permanent Marker", cursive', w: 400 },
    { k: 'bricolage', n: 'Bold', css: '"Bricolage Grotesque", sans-serif', w: 800 },
    { k: 'dm', n: 'Clean', css: '"DM Sans", sans-serif', w: 700 },
    { k: 'mono', n: 'Date stamp', css: '"Courier New", monospace', w: 700 }
  ];
  const fontOf = k => FONTS.find(f => f.k === k) || FONTS[0];
  const fontStr = (it, px) => { const f = fontOf(it.font); return `${f.w} ${px}px ${f.css}`; };
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const mctx = document.createElement('canvas').getContext('2d');
  const imgCache = new Map();
  function getImg(src) {
    let im = imgCache.get(src);
    if (!im) { im = new Image(); im.onload = () => { if (state.screen === 'edit') renderEdit(); }; im.src = src; imgCache.set(src, im); }
    return im;
  }
  const imgReady = src => new Promise(res => { const im = getImg(src); if (im.complete) res(); else { im.addEventListener('load', res); im.addEventListener('error', res); } });

  function itemBox(it, g) {
    const px = it.size * g.w;
    if (it.type === 'emoji') return { w: px * 1.2, h: px * 1.2 };
    if (it.type === 'img') { const im = getImg(it.value); const r = im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1; return { w: px, h: px * r }; }
    mctx.font = fontStr(it, px);
    return { w: Math.max(mctx.measureText(it.text || ' ').width, px * .5) + px * .3, h: px * 1.35 };
  }
  function drawItem(ctx, it, g, s) {
    const px = it.size * g.w;
    ctx.save(); ctx.translate(it.nx * g.w, it.ny * g.h); ctx.rotate(it.rot * Math.PI / 180);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (it.type === 'emoji') { ctx.font = `${px}px ${EMOJI_FONT}`; ctx.fillText(it.value, 0, 0); }
    else if (it.type === 'img') {
      const im = getImg(it.value);
      if (im.complete && im.naturalWidth) { const w = px, h = px * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, -w / 2, -h / 2, w, h); }
    } else {
      ctx.font = fontStr(it, px);
      if (it.shadow) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = px * .1 * s; ctx.shadowOffsetX = px * .04 * s; ctx.shadowOffsetY = px * .05 * s; }
      if (it.outline) { ctx.lineJoin = 'round'; ctx.lineWidth = px * .16; ctx.strokeStyle = lum(it.color) > .55 ? '#2a1740' : '#ffffff'; ctx.strokeText(it.text, 0, 0); }
      ctx.fillStyle = it.color; ctx.fillText(it.text, 0, 0);
    }
    ctx.restore();
  }

  /* ----- main render ----- */
  const fxCache = new Map();
  function render(canvas, L, photos, o, outW, ex = {}) {
    const g = L.geom(o), s = outW / g.w;
    canvas.width = Math.round(g.w * s); canvas.height = Math.round(g.h * s);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(s, 0, 0, s, 0, 0); ctx.imageSmoothingQuality = 'high';
    const bg = g.bg ? { a: g.bg } : o.bg;
    if (bg.b) { const gr = ctx.createLinearGradient(0, 0, g.w * 0.4, g.h); gr.addColorStop(0, bg.a); gr.addColorStop(1, bg.b); ctx.fillStyle = gr; }
    else ctx.fillStyle = bg.a;
    ctx.fillRect(0, 0, g.w, g.h);
    (g.cards || []).forEach(cd => {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 18 * s; ctx.shadowOffsetY = 6 * s;
      ctx.fillStyle = '#fff'; rr(ctx, cd.x, cd.y, cd.w, cd.h, cd.r || 6); ctx.fill(); ctx.restore();
    });
    if (g.deco) g.deco(ctx, g);
    const glFx = glOK && ex.fx ? ex.fx : null;
    g.slots.forEach((sl, i) => {
      const p = photos ? photos[i] : null, pe = (ex.pe && ex.pe[i]) || {};
      const z = pe.zoom || 1, ox = pe.ox || 0, oy = pe.oy || 0;
      let f = glFx; if (f && pe.effect) f = { ...f, effect: pe.effect };
      if (f && IrieFX.isNeutral(f)) f = null;
      ctx.save();
      if (sl.rot) { const cx = sl.x + sl.w / 2, cy = sl.y + sl.h / 2; ctx.translate(cx, cy); ctx.rotate(sl.rot * Math.PI / 180); ctx.translate(-cx, -cy); }
      if (sl.border) {
        const b = sl.border; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 14 * s; ctx.shadowOffsetY = 5 * s;
        ctx.fillStyle = '#fff'; rr(ctx, sl.x - b, sl.y - b, sl.w + 2 * b, sl.h + b * 3, 4); ctx.fill(); ctx.restore();
      }
      rr(ctx, sl.x, sl.y, sl.w, sl.h, g.r || 0); ctx.clip();
      if (p && f) {
        const sw = Math.max(1, Math.round(sl.w * s)), sh = Math.max(1, Math.round(sl.h * s));
        const key = `${p._id}|${sw}x${sh}|${JSON.stringify(f)}|${z}|${ox}|${oy}`;
        let t = ex.nocache ? null : fxCache.get(key);
        if (!t) { t = fxPhoto(p, sw, sh, f, z, ox, oy); if (!ex.nocache) { if (fxCache.size > 24) fxCache.delete(fxCache.keys().next().value); fxCache.set(key, t); } }
        ctx.drawImage(t, sl.x, sl.y, sl.w, sl.h);
      } else if (p) drawCover(ctx, p, sl, z, ox, oy);
      else drawPlaceholder(ctx, sl, i);
      ctx.restore();
    });
    if (g.overlay) ctx.drawImage(g.overlay, 0, 0, g.w, g.h);
    else drawFooter(ctx, g, o, g.ink || o.ink || (bg.b || lum(bg.a) > 0.5 ? '#2a1740' : '#ffffff'));
    (ex.items || []).forEach(it => drawItem(ctx, it, g, s));
    return g;
  }

  /* ---------- pickers ---------- */
  function buildPicker(el, filter, onPick, only) {
    el.innerHTML = '';
    for (const L of (only ? layouts.filter(l => only.includes(l.id)) : layouts)) {
      const b = document.createElement('button');
      b.className = 'layout-btn' + (L.id === state.layoutId ? ' on' : '');
      b.disabled = !!filter && !filter(L);
      b.title = L.name; b.setAttribute('aria-label', L.name); if (SHORT[L.id]) b.dataset.short = SHORT[L.id];
      if (b.disabled) b.title = L.name + ' (needs more photos than you took)';
      const c = document.createElement('canvas');
      render(c, L, null, { ...state.opts, caption: '', date: false }, 160);
      const t = document.createElement('span'); t.textContent = L.name;
      b.append(c, t);
      b.onclick = () => onPick(L);
      el.append(b);
    }
  }
  function setLayout(L) {
    state.layoutId = L.id; store.set('layout', L.id);
    $('#stage').style.setProperty('--ar', L.aspect);
    refreshPickers();
    if (state.screen === 'edit') { commit(); renderEdit(); renderPhotos(); }
  }
  const HOME_STYLES = ['plain', 'strip4', 'polaroid', 'film', 'collage'];
  const SHORT = { plain: 'Photo', strip4: '4-cut', polaroid: 'Polaroid', film: 'Film', collage: 'Collage' };
  function refreshPickers() {
    buildPicker($('#homeStyles'), null, L => { setLayout(L); startBooth(); }, HOME_STYLES);
    buildPicker($('#boothLayouts'), null, setLayout);
    const have = state.photos.filter(Boolean).length;
    buildPicker($('#editLayouts'), L => L.count <= have, setLayout);
    $('#builtinControls').hidden = !!(cur().frame || cur().noStrip);
  }
  /* The three strips on the home page show random pictures from your gallery. A new random set is picked on every page load. */
  let homePhotos = [];
  const layoutById = id => BUILTIN.find(l => l.id === id);
  const heroSet = (start, n) => (homePhotos.length ? Array.from({ length: n }, (_, k) => homePhotos[(start + k) % homePhotos.length]) : null);
  const photoUrl = c => c._url || (c._url = c.toDataURL('image/jpeg', 0.85));
  function buildHero() {
    const o = { ...state.opts, caption: '', date: false, bg: BGS[0] };
    render($('#heroA'), layoutById('strip4'), heroSet(0, 4), o, 300);
    render($('#heroB'), polaroid, heroSet(4, 1), { ...o, bg: BGS[5] }, 300);
    render($('#heroC'), layoutById('strip3'), heroSet(5, 3), { ...o, bg: BGS[1] }, 300);
    // the pixel theme draws its own frames with CSS, so give them the same pictures
    const fill = (sel, first) => $$(sel).forEach((el, i) => {
      const p = homePhotos.length ? homePhotos[(first + i) % homePhotos.length] : null;
      el.style.background = p ? `url(${photoUrl(p)}) center/cover` : '';
    });
    fill('.px-strip i', 0); fill('.px-polaroid i', 4);
  }
  async function loadRandomPhotos(n = 6) {
    const pool = [];
    (await loadAllCached()).forEach(r => (r.originals || []).forEach(o => pool.push(o)));
    for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }
    const out = [];
    for (const o of pool.slice(0, n)) {
      try {
        const bmp = await createImageBitmap(await origBlob(o)), k = Math.min(1, 600 / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); out.push(tag(c));
      } catch { /* skip one that cannot load */ }
    }
    return out;
  }
  async function refreshHomePhotos() { homePhotos = await loadRandomPhotos(); buildHero(); }

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- navigation ---------- */
  function goTo(name) {
    if (state.busy && name !== 'booth') state.cancel = true;
    state.screen = name;
    $$('.screen').forEach(s => { s.hidden = s.id !== name; });
    $$('.nav nav [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === name));
    if (name === 'booth') enterBooth(); else leaveBooth();
    if (name === 'review') renderReview();
    if (name === 'edit') enterEdit();
    if (name === 'home') { buildHero(); refreshPickers(); renderRecent(); if (!homePhotos.length) refreshHomePhotos(); }
    if (name === 'gallery') renderGallery();
    window.scrollTo(0, 0);
  }
  function startBooth() { state.mode = 'new'; state.retakeIdx = null; resetEdit(); goTo('booth'); }

  /* ---------- camera ---------- */
  const video = $('#video');
  function showMsg(text) { $('#camMsgText').textContent = text; $('#camMsg').hidden = false; }
  function stopCamera() {
    stopLive();
    state.camToken++;
    if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; }
    video.srcObject = null;
  }
  async function listCameras(currentId) {
    try {
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      const sel = $('#cameraSel'); sel.innerHTML = '';
      devs.forEach((d, i) => {
        const o = document.createElement('option'); o.value = d.deviceId; o.textContent = d.label || 'Camera ' + (i + 1);
        if (d.deviceId === currentId) o.selected = true; sel.append(o);
      });
      $('#cameraRow').hidden = devs.length < 2; $('#flipBtn').hidden = devs.length < 2;
    } catch { /* ignore */ }
  }
  async function startCamera() {
    stopCamera(); $('#camMsg').hidden = true;
    const tok = state.camToken;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showMsg('Camera is not available. Open irie over https (or localhost), or upload photos instead.'); return;
    }
    const attempt = async useDevice => {
      const v = { width: { ideal: 1280 }, height: { ideal: 720 } };
      if (useDevice && state.deviceId) v.deviceId = { exact: state.deviceId }; else v.facingMode = { ideal: state.facing };
      return navigator.mediaDevices.getUserMedia({ video: v, audio: false });
    };
    try {
      let stream;
      try { stream = await attempt(true); }
      catch (e) { if (e.name === 'OverconstrainedError' && state.deviceId) { state.deviceId = null; stream = await attempt(false); } else throw e; }
      if (tok !== state.camToken) { stream.getTracks().forEach(t => t.stop()); return; }
      state.stream = stream; video.srcObject = stream;
      await video.play().catch(() => {});
      const st = stream.getVideoTracks()[0].getSettings();
      state.mirror = st.facingMode ? st.facingMode === 'user' : state.facing === 'user';
      $('#mirrorChk').checked = state.mirror; applyMirror();
      startLive();
      await listCameras(st.deviceId);
    } catch (e) {
      if (tok !== state.camToken) return;
      const m = {
        NotAllowedError: 'Camera permission is blocked. Allow camera access in your browser settings, then press Try again.',
        PermissionDeniedError: 'Camera permission is blocked. Allow camera access in your browser settings, then press Try again.',
        NotFoundError: 'No camera was found on this device. You can upload photos instead.',
        NotReadableError: 'Your camera is being used by another app. Close it, then press Try again.'
      };
      showMsg(m[e.name] || 'The camera could not start. Press Try again, or upload photos instead.');
    }
  }
  function applyMirror() { video.style.transform = state.mirror ? 'scaleX(-1)' : 'none'; }
  function grabFrame() {
    const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return null;
    const c = document.createElement('canvas'); c.width = vw; c.height = vh;
    const x = c.getContext('2d');
    if (state.mirror) { x.translate(vw, 0); x.scale(-1, 1); }
    x.drawImage(video, 0, 0, vw, vh);
    c._seed = performance.now() / 1000;
    return tag(c);
  }

  /* ---------- live effects ---------- */
  let liveR = null, workR = null, glOK = false, liveRaf = 0, boothThumbs = [], thumbIdx = 0;
  const glParams = (fx, time, mirror, zoom, ox, oy) => ({ effect: fx.effect, k: fx.strength / 100, adj: fx.adj, time, mirror, zoom, ox, oy });
  function fxPhoto(p, sw, sh, fx, z, ox, oy) {
    workR.draw(p, p.width, p.height, glParams(fx, p._seed || 0, false, z, ox, oy), sw, sh);
    const c = document.createElement('canvas'); c.width = sw; c.height = sh; c.getContext('2d').drawImage(workR.canvas, 0, 0);
    return c;
  }
  function fillThumb(c, src, id, k) {
    workR.draw(src, src.width, src.height, { effect: id, k, adj: {}, time: 0, mirror: false }, 96, 72);
    c.getContext('2d').drawImage(workR.canvas, 0, 0);
  }
  const effectList = cat => IrieFX.EFFECTS.filter(e => e.cat === cat && (!glOK || liveR.usable(e.id)));
  const allEffects = () => IrieFX.EFFECTS.filter(e => e.id === 'none' || !glOK || liveR.usable(e.id));
  const effectOrder = () => { const o = allEffects(); return [o[0], ...IrieFX.CATS.flatMap(c => o.filter(e => e.cat === c.id))]; };

  function initGL() {
    try { liveR = IrieFX.create($('#liveCanvas')); workR = IrieFX.create(document.createElement('canvas')); } catch { liveR = workR = null; }
    glOK = !!(liveR && workR);
    $('#glMsg').hidden = glOK;
    if (glOK) liveR.compileAll(() => { if (!liveR.usable(state.fx.effect)) state.fx.effect = 'none'; if (state.screen === 'booth') renderBoothFx(); });
  }
  function startLive() {
    stopLive(); if (!glOK) return;
    $('#stage').classList.add('gl');
    const loop = t => {
      liveRaf = requestAnimationFrame(loop);
      if (!state.stream || video.readyState < 2 || !video.videoWidth) return;
      const r = $('#stage').getBoundingClientRect(); if (r.width < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5), k = Math.min(1, 1280 / Math.max(r.width * dpr, r.height * dpr));
      liveR.draw(video, video.videoWidth, video.videoHeight, glParams(state.fx, t / 1000, state.mirror), r.width * dpr * k, r.height * dpr * k);
      if (boothThumbs.length) {
        thumbIdx = (thumbIdx + 1) % boothThumbs.length;
        const th = boothThumbs[thumbIdx];
        workR.draw(video, video.videoWidth, video.videoHeight, { effect: th.id, k: state.fx.strength / 100, adj: {}, time: t / 1000, mirror: state.mirror }, 96, 72);
        th.c.getContext('2d').drawImage(workR.canvas, 0, 0);
      }
    };
    liveRaf = requestAnimationFrame(loop);
  }
  function stopLive() { cancelAnimationFrame(liveRaf); liveRaf = 0; const s = $('#stage'); if (s) s.classList.remove('gl'); }

  function renderBoothFx(scrollTo) {
    const strip = $('#fxStrip'); strip.innerHTML = ''; boothThumbs = [];
    $$('.fx-chips [data-cat]').forEach(b => b.classList.toggle('on', b.dataset.cat === state.fxTab));
    $('#fxNone').classList.toggle('on', state.fx.effect === 'none');
    const cur = IrieFX.EFFECTS.find(e => e.id === state.fx.effect);
    $('#fxLabel').textContent = glOK && cur && cur.id !== 'none' ? cur.name : '';
    $$('#fxPrev, #fxNext, #fxNone, #fxRandom, .fx-chips [data-cat], #boothStrength').forEach(b => { b.disabled = !glOK; });
    if (!glOK) return;
    effectList(state.fxTab).forEach(e => {
      const b = document.createElement('button'); b.className = e.id === state.fx.effect ? 'on' : '';
      const c = document.createElement('canvas'); c.width = 96; c.height = 72;
      const l = document.createElement('span'); l.textContent = e.name; b.append(c, l);
      b.onclick = () => setEffect(e.id); strip.append(b); boothThumbs.push({ id: e.id, c });
      if (scrollTo && e.id === state.fx.effect) setTimeout(() => b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), 0);
    });
  }
  function setEffect(id, scroll) {
    if (!glOK) return;
    state.fx.effect = id; store.set('effect', id);
    const e = IrieFX.EFFECTS.find(x => x.id === id); if (e && e.cat !== 'none') state.fxTab = e.cat;
    renderBoothFx(scroll);
  }
  function stepEffect(d) {
    const o = effectOrder(), i = Math.max(0, o.findIndex(e => e.id === state.fx.effect));
    setEffect(o[(i + d + o.length) % o.length].id, true);
  }
  function randomEffect() {
    const o = allEffects().filter(e => e.id !== 'none' && e.id !== state.fx.effect);
    if (o.length) setEffect(o[Math.floor(Math.random() * o.length)].id, true);
  }

  /* ---------- sound ---------- */
  let actx;
  function ensureAudio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* no audio */ } }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function shutterSound() {
    if (state.mute || !actx) return;
    const len = Math.floor(actx.sampleRate * 0.12), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = actx.createBufferSource(); src.buffer = buf;
    const hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const g = actx.createGain(); g.gain.value = 0.5;
    src.connect(hp); hp.connect(g); g.connect(actx.destination); src.start();
    const o = actx.createOscillator(), og = actx.createGain();
    o.type = 'square'; o.frequency.value = 900; og.gain.setValueAtTime(0.08, actx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.05);
    o.connect(og); og.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.06);
  }

  /* ---------- session ---------- */
  const sleep = async ms => { const end = Date.now() + ms; while (Date.now() < end && !state.cancel) await new Promise(r => setTimeout(r, 80)); };
  function setProgress(label, total, done) {
    const p = $('#progress'); p.innerHTML = '';
    if (!label) return;
    const t = document.createElement('span'); t.textContent = label; p.append(t);
    for (let i = 0; i < total; i++) { const d = document.createElement('i'); d.className = 'dot' + (i < done ? ' full' : ''); p.append(d); }
  }
  function setBusy(b) {
    state.busy = b;
    $('#startBtn').hidden = b; $('#cancelBtn').hidden = !b;
    $$('.fxbar button, .fx-arrow').forEach(e => { e.disabled = b || !glOK; });
    $$('#boothPanel select, #boothPanel input, #boothPanel button').forEach(e => { e.disabled = b; });
  }
  async function runCountdown(sec) {
    const el = $('#countdown');
    for (let n = sec; n > 0; n--) {
      if (state.cancel) break;
      el.textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      await sleep(1000);
    }
    el.textContent = ''; el.classList.remove('pop');
  }
  async function runSession(indices) {
    if (state.busy) return;
    if (!state.stream || !video.videoWidth) { toast('Camera is not ready yet.'); return; }
    ensureAudio(); state.cancel = false; setBusy(true);
    const total = state.photos.length;
    for (let k = 0; k < indices.length; k++) {
      setProgress(indices.length > 1 ? `Photo ${k + 1} of ${indices.length}` : 'Smile!', total, state.photos.filter(Boolean).length);
      await runCountdown(state.countdown);
      if (state.cancel) break;
      const stage = $('#stage'), fl = $('#flash');
      fl.classList.remove('go'); stage.classList.remove('snap'); void fl.offsetWidth; fl.classList.add('go'); stage.classList.add('snap');
      shutterSound();
      state.photos[indices[k]] = grabFrame(); delete state.pe[indices[k]];
      setProgress(indices.length > 1 ? `Photo ${k + 1} of ${indices.length}` : 'Got it!', total, state.photos.filter(Boolean).length);
      if (k < indices.length - 1) { await sleep(Math.max(state.delay, 1) * 1000); }
    }
    const cancelled = state.cancel;
    setBusy(false); setProgress(null);
    if (cancelled) return;
    state.mode = 'new'; state.retakeIdx = null;
    await sleep(350);
    goTo('review');
  }

  function enterBooth() {
    const retake = state.mode === 'retake';
    $('#layoutBlock').hidden = retake;
    $('#startBtn').textContent = retake ? `Retake photo ${state.retakeIdx + 1}` : (cur().count === 1 ? 'Take photo' : `Take ${cur().count} photos`);
    $('#stage').style.setProperty('--ar', cur().aspect);
    $('#countdownSel').value = state.countdown; $('#delaySel').value = state.delay; $('#muteChk').checked = state.mute;
    $('#fsBtn').hidden = !(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    refreshPickers(); setProgress(null);
    $('#boothStrength').value = state.fx.strength; renderBoothFx();
    startCamera();
  }
  function leaveBooth() {
    stopCamera();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  function updateStartLabel() {
    if (state.mode !== 'retake') $('#startBtn').textContent = cur().count === 1 ? 'Take photo' : `Take ${cur().count} photos`;
  }

  /* ---------- upload ---------- */
  async function fileToCanvas(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url);
      const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return tag(c);
    } finally { URL.revokeObjectURL(url); }
  }
  function pickFiles(idx) { state.uploadIdx = idx; state.uploadEdit = false; $('#fileInput').click(); }
  $('#fileInput').addEventListener('change', async e => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    try {
      if (state.uploadIdx !== null) {
        const idx = state.uploadIdx;
        state.photos[idx] = await fileToCanvas(files[0]); delete state.pe[idx]; state.uploadIdx = null;
        if (state.uploadEdit) { state.uploadEdit = false; commit(); renderPhotos(); renderEdit(); } else renderReview();
        return;
      }
      const n = Math.min(files.length, 4);
      const L = BUILTIN.find(l => l.count === n) || BUILTIN[0];
      state.layoutId = L.id; store.set('layout', L.id);
      state.photos = Array(L.count).fill(null);
      for (let i = 0; i < L.count && i < files.length; i++) state.photos[i] = await fileToCanvas(files[i]);
      state.mode = 'new'; resetEdit(); goTo('review');
    } catch { toast('Could not read that image.'); }
  });

  /* ---------- review ---------- */
  function renderReview() {
    const grid = $('#reviewGrid'); grid.innerHTML = '';
    const L = cur();
    state.photos.forEach((p, i) => {
      const fig = document.createElement('div'); fig.className = 'shot glass';
      fig.style.setProperty('--ar', L.aspect);
      if (p) {
        const t = document.createElement('canvas'); t.width = 400; t.height = Math.round(400 / L.aspect);
        if (glOK && !IrieFX.isNeutral(state.fx)) t.getContext('2d').drawImage(fxPhoto(p, t.width, t.height, state.fx), 0, 0);
        else drawCover(t.getContext('2d'), p, { x: 0, y: 0, w: t.width, h: t.height });
        fig.append(t);
      } else { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Empty'; fig.append(e); }
      const row = document.createElement('div'); row.className = 'row';
      const a = document.createElement('button'); a.className = 'btn ghost'; a.textContent = p ? 'Retake' : 'Take photo';
      a.onclick = () => { state.mode = 'retake'; state.retakeIdx = i; goTo('booth'); };
      const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = 'Upload';
      b.onclick = () => pickFiles(i);
      row.append(a, b); fig.append(row); grid.append(fig);
    });
    $('#reviewContinue').disabled = !state.photos.length || state.photos.some(p => !p);
  }

  /* ---------- edit: history ---------- */
  const snap = () => JSON.stringify({ fx: state.fx, items: state.items, opts: state.opts, layoutId: state.layoutId, order: state.order, pe: state.pe });
  function commit() {
    const j = snap();
    if (state.hist[state.histIdx] === j) return;
    state.hist = state.hist.slice(0, state.histIdx + 1); state.hist.push(j);
    if (state.hist.length > 60) state.hist.shift();
    state.histIdx = state.hist.length - 1; updateUndoUI();
  }
  function restore(i) {
    state.histIdx = i;
    const d = JSON.parse(state.hist[i]);
    state.fx = d.fx; state.items = d.items; state.opts = d.opts; state.layoutId = d.layoutId; state.order = d.order || []; state.pe = d.pe || {};
    if (!state.items.find(it => it.id === state.sel)) state.sel = null;
    syncAll(); renderEdit(); updateUndoUI();
  }
  function undo() { if (state.histIdx > 0) restore(state.histIdx - 1); }
  function redo() { if (state.histIdx < state.hist.length - 1) restore(state.histIdx + 1); }
  function updateUndoUI() { $('#undoBtn').disabled = state.histIdx <= 0; $('#redoBtn').disabled = state.histIdx >= state.hist.length - 1; }
  function resetEdit() { state.items = []; state.sel = null; state.hist = []; state.histIdx = -1; state.order = []; state.pe = {}; state.selPhoto = 0; state.themeId = ''; }

  /* ---------- edit: render ---------- */
  let raf, lastG = null, lastS = 1;
  function ensureOrder() { if (state.order.length !== state.photos.length) state.order = state.photos.map((_, i) => i); }
  const photosNow = () => { ensureOrder(); return state.order.map(i => state.photos[i]).slice(0, cur().count); };
  const peNow = () => { ensureOrder(); return state.order.map(i => state.pe[i] || null).slice(0, cur().count); };
  function renderEdit() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const out = $('#outCanvas'), L = cur();
      lastG = render(out, L, photosNow(), state.opts, 900, { fx: state.compare ? null : state.fx, items: state.items, pe: peNow() });
      lastS = out.width / lastG.w;
      const ov = $('#overlay'); ov.width = out.width; ov.height = out.height;
      drawOverlay();
    });
  }
  function selected() { return state.items.find(it => it.id === state.sel) || null; }
  function cssK() { const ov = $('#overlay'), r = ov.getBoundingClientRect(); return r.width ? (ov.width / r.width) / lastS : 1; }
  function handlePos(it) {
    const bx = itemBox(it, lastG), a = it.rot * Math.PI / 180, hx = bx.w / 2, hy = bx.h / 2;
    return { x: it.nx * lastG.w + hx * Math.cos(a) - hy * Math.sin(a), y: it.ny * lastG.h + hx * Math.sin(a) + hy * Math.cos(a) };
  }
  function drawOverlay() {
    const ov = $('#overlay'), ctx = ov.getContext('2d'); ctx.clearRect(0, 0, ov.width, ov.height);
    const it = selected(); if (!it || !lastG || state.compare) return;
    const k = cssK(), bx = itemBox(it, lastG);
    ctx.setTransform(lastS, 0, 0, lastS, 0, 0);
    ctx.save(); ctx.translate(it.nx * lastG.w, it.ny * lastG.h); ctx.rotate(it.rot * Math.PI / 180);
    ctx.lineWidth = 2 * k; ctx.setLineDash([6 * k, 4 * k]); ctx.strokeStyle = it.locked ? '#888' : '#e63e92';
    ctx.strokeRect(-bx.w / 2, -bx.h / 2, bx.w, bx.h); ctx.restore();
    if (!it.locked) {
      const h = handlePos(it);
      ctx.setLineDash([]); ctx.beginPath(); ctx.arc(h.x, h.y, 9 * k, 0, Math.PI * 2);
      ctx.fillStyle = '#7c4dff'; ctx.fill(); ctx.lineWidth = 2.5 * k; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
  }

  /* ---------- edit: items ---------- */
  function addItem(it) {
    const j = () => (Math.random() - .5) * .16;
    const item = { id: 'i' + (++uid), nx: .5 + j(), ny: .5 + j(), rot: 0, locked: false, ...it };
    state.items.push(item); state.sel = item.id; commit(); syncSel(); renderEdit();
    return item;
  }
  function addText(opts) { return addItem({ type: 'text', text: 'your text', font: 'caveat', color: '#ffffff', size: .1, outline: true, shadow: false, ...opts }); }
  function stamp() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    addText({ text: `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`, font: 'mono', color: '#ff9a3c', size: .055, outline: false, shadow: true, nx: .5, ny: .93 });
  }
  function hit(it, p) {
    const bx = itemBox(it, lastG), a = -it.rot * Math.PI / 180, dx = p.x - it.nx * lastG.w, dy = p.y - it.ny * lastG.h;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(lx) <= bx.w / 2 && Math.abs(ly) <= bx.h / 2;
  }
  function selectItem(id) { state.sel = id; syncSel(); drawOverlay(); }

  let drag = null;
  function toDesign(e) { const r = $('#overlay').getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * lastG.w, y: (e.clientY - r.top) / r.height * lastG.h }; }
  const overlay = $('#overlay');
  overlay.addEventListener('pointerdown', e => {
    if (!lastG) return;
    const p = toDesign(e), sel = selected(), k = cssK();
    if (sel && !sel.locked) {
      const h = handlePos(sel);
      if (Math.hypot(p.x - h.x, p.y - h.y) <= 16 * k) {
        const cx = sel.nx * lastG.w, cy = sel.ny * lastG.h;
        drag = { mode: 'scale', id: sel.id, cx, cy, d0: Math.hypot(p.x - cx, p.y - cy) || 1, a0: Math.atan2(p.y - cy, p.x - cx), size0: sel.size, rot0: sel.rot, moved: false };
        overlay.setPointerCapture(e.pointerId); return;
      }
    }
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      if (hit(it, p)) {
        selectItem(it.id);
        if (!it.locked) { drag = { mode: 'move', id: it.id, ox: p.x - it.nx * lastG.w, oy: p.y - it.ny * lastG.h, moved: false }; overlay.setPointerCapture(e.pointerId); }
        return;
      }
    }
    selectItem(null);
  });
  overlay.addEventListener('pointermove', e => {
    if (!drag) return;
    const it = state.items.find(x => x.id === drag.id); if (!it) return;
    const p = toDesign(e); drag.moved = true;
    if (drag.mode === 'move') { it.nx = Math.min(1, Math.max(0, (p.x - drag.ox) / lastG.w)); it.ny = Math.min(1, Math.max(0, (p.y - drag.oy) / lastG.h)); }
    else {
      const d = Math.hypot(p.x - drag.cx, p.y - drag.cy), a = Math.atan2(p.y - drag.cy, p.x - drag.cx);
      it.size = Math.min(.8, Math.max(.02, drag.size0 * d / drag.d0));
      let r = drag.rot0 + (a - drag.a0) * 180 / Math.PI; r = ((r + 180) % 360 + 360) % 360 - 180; it.rot = Math.round(r);
      syncSel();
    }
    renderEdit();
  });
  const endDrag = () => { if (drag && drag.moved) commit(); drag = null; };
  overlay.addEventListener('pointerup', endDrag); overlay.addEventListener('pointercancel', endDrag);

  /* ---------- edit: panel sync ---------- */
  function syncSel() {
    const it = selected(), box = $('#selBox'); box.hidden = !it; if (!it) return;
    const isText = it.type === 'text';
    $('#selTitle').textContent = isText ? 'Selected text' : 'Selected sticker';
    $('#selTextRow').hidden = !isText; $('#selFontRow').hidden = !isText; $('#selColorRow').hidden = !isText;
    if (isText) {
      $('#selText').value = it.text; $('#selFont').value = it.font; $('#selColor').value = it.color;
      $('#selOutline').checked = !!it.outline; $('#selShadow').checked = !!it.shadow;
    }
    const sz = $('#selSize'); sz.min = isText ? 3 : 4; sz.max = isText ? 40 : 70; sz.value = Math.round(it.size * 100);
    $('#selRot').value = it.rot; $('#selLock').checked = !!it.locked;
  }
  function syncFx() {
    $('#fxStrength').value = state.fx.strength;
    $$('#adjList .adj').forEach(row => { const k = row.dataset.k, v = state.fx.adj[k]; $('input', row).value = v; $('.v', row).textContent = v; });
    renderFxGrid();
  }
  function syncDesign() {
    $('#gapRange').value = state.opts.gap; $('#roundChk').checked = state.opts.round;
    $('#captionInp').value = state.opts.caption; $('#dateChk').checked = state.opts.date;
    buildSwatches(); refreshPickers();
  }
  function syncAll() { syncDesign(); syncFx(); syncSel(); renderPhotos(); updateUndoUI(); }

  function buildSwatches() {
    const box = $('#swatches'); box.innerHTML = '';
    const same = b => b.a === state.opts.bg.a && b.b === state.opts.bg.b;
    BGS.forEach(b => {
      const sw = document.createElement('button'); sw.className = 'sw' + (same(b) ? ' on' : '');
      sw.style.background = b.b ? `linear-gradient(135deg,${b.a},${b.b})` : b.a; sw.setAttribute('aria-label', 'Background ' + b.a);
      sw.onclick = () => { state.opts.bg = b; delete state.opts.ink; store.set('bg', b); buildSwatches(); refreshPickers(); commit(); renderEdit(); };
      box.append(sw);
    });
    const c = document.createElement('input'); c.type = 'color'; c.value = state.opts.bg.a; c.setAttribute('aria-label', 'Custom background color');
    c.oninput = () => { state.opts.bg = { a: c.value }; delete state.opts.ink; store.set('bg', state.opts.bg); renderEdit(); };
    c.onchange = () => { commit(); buildSwatches(); };
    box.append(c);
  }

  /* ---------- edit: filters ---------- */
  function pickEdit(id) {
    state.fx.effect = id; store.set('effect', id);
    const e = IrieFX.EFFECTS.find(x => x.id === id); if (e && e.cat !== 'none') state.fxTab = e.cat;
    syncFx(); commit(); renderEdit();
  }
  function renderFxGrid() {
    const cats = $('#editCats'), grid = $('#fxGrid'); cats.innerHTML = ''; grid.innerHTML = '';
    const chip = (label, on, fn) => { const b = document.createElement('button'); b.textContent = label; b.className = on ? 'on' : ''; b.onclick = fn; cats.append(b); };
    chip('None', state.fx.effect === 'none', () => pickEdit('none'));
    IrieFX.CATS.forEach(c => chip(c.name, c.id === state.fxTab, () => { state.fxTab = c.id; renderFxGrid(); }));
    chip('Random', false, () => { const o = allEffects().filter(e => e.id !== 'none'); if (o.length) pickEdit(o[Math.floor(Math.random() * o.length)].id); });
    if (!glOK) { grid.textContent = 'Effects need WebGL, which this browser does not support.'; return; }
    const src = state.photos.find(Boolean);
    effectList(state.fxTab).forEach(e => {
      const b = document.createElement('button'); b.className = e.id === state.fx.effect ? 'on' : '';
      const c = document.createElement('canvas'); c.width = 96; c.height = 72; if (src) fillThumb(c, src, e.id, state.fx.strength / 100);
      const l = document.createElement('span'); l.textContent = e.name; b.append(c, l);
      b.onclick = () => pickEdit(e.id); grid.append(b);
    });
  }
  function buildAdjust() {
    const box = $('#adjList'); box.innerHTML = '';
    IrieFX.ADJ.forEach(([k, name, min, max]) => {
      const row = document.createElement('label'); row.className = 'adj'; row.dataset.k = k;
      row.innerHTML = `<div class="top">${name}<span class="v">0</span></div><input type="range" min="${min}" max="${max}" value="0">`;
      const inp = $('input', row);
      inp.oninput = () => { state.fx.adj[k] = +inp.value; $('.v', row).textContent = inp.value; renderEdit(); };
      inp.onchange = commit;
      inp.ondblclick = () => { inp.value = 0; inp.oninput(); commit(); };
      box.append(row);
    });
  }

  /* ---------- edit: stickers ---------- */
  const STICKERS = {
    Hearts: ['💖', '💗', '💕', '💘', '💝', '🩷', '💜', '🤍', '❤️', '💞', '💓', '🫶'],
    Stars: ['⭐', '🌟', '💫', '🌠', '✴️', '🪐', '🌙', '☄️'],
    Flowers: ['🌸', '🌷', '🌹', '🌺', '🌼', '🌻', '🪷', '💐', '🪻', '🌿'],
    Bows: ['🎀', '🎗️', '🩰', '🎁', '🧵', '🪢'],
    Sparkles: ['✨', '💎', '🔮', '🪩', '🫧', '🎇', '🎆', '⚡'],
    Butterflies: ['🦋', '🐝', '🐞', '🍃', '🪽', '🌱'],
    Cute: ['🧸', '🐰', '🐻', '🐱', '🐶', '🐥', '🍓', '🍒', '🍑', '🍰', '🧁', '🍡', '🍭', '☁️', '🌈'],
    Retro: ['📼', '📷', '📻', '🕹️', '💾', '☎️', '🎞️', '💿', '📺', '🎧'],
    Y2K: ['💿', '📟', '✌️', '💅', '👛', '🦄', '🌈', '👾', '💋', '🕶️', '📱', '🪩'],
    Seasonal: ['🎄', '🎅', '❄️', '⛄', '🎃', '👻', '🦃', '🍂', '💘', '🐣', '☀️', '🏖️', '🎂', '🎉', '🎈']
  };
  let custom = {};
  async function loadStickers() {
    try {
      const res = await fetch('stickers/stickers.json', { cache: 'no-cache' }); if (!res.ok) return;
      const data = await res.json();
      (data.stickers || []).forEach(s => { const c = s.category || 'Mine'; (custom[c] = custom[c] || []).push({ type: 'img', value: 'stickers/' + s.file, name: s.name || s.file }); });
      renderStickers();
    } catch { /* optional */ }
  }
  function stickerCats() {
    const names = Object.keys(STICKERS); Object.keys(custom).forEach(c => { if (!names.includes(c)) names.push(c); });
    return names;
  }
  function renderStickers() {
    const cats = stickerCats(); if (!cats.includes(state.stickerCat)) state.stickerCat = cats[0];
    const bar = $('#stickerCats'); bar.innerHTML = '';
    cats.forEach(c => { const b = document.createElement('button'); b.textContent = c; b.className = c === state.stickerCat ? 'on' : ''; b.onclick = () => { state.stickerCat = c; renderStickers(); }; bar.append(b); });
    const grid = $('#stickerGrid'); grid.innerHTML = '';
    const list = (STICKERS[state.stickerCat] || []).map(v => ({ type: 'emoji', value: v })).concat(custom[state.stickerCat] || []);
    list.forEach(st => {
      const b = document.createElement('button'); b.title = st.name || '';
      if (st.type === 'img') { const im = document.createElement('img'); im.src = st.value; im.alt = st.name || ''; b.append(im); } else b.textContent = st.value;
      b.onclick = () => addItem({ type: st.type, value: st.value, size: st.type === 'img' ? .22 : .16 });
      grid.append(b);
    });
  }

  /* ---------- edit: individual photos ---------- */
  const getPE = () => { const pi = state.order[state.selPhoto]; return state.pe[pi] || (state.pe[pi] = {}); };
  function renderPhotos() {
    const list = $('#phList'); list.innerHTML = '';
    const ph = photosNow(); if (state.selPhoto >= ph.length) state.selPhoto = 0;
    ph.forEach((p, i) => {
      const b = document.createElement('button'); b.className = i === state.selPhoto ? 'on' : '';
      const c = document.createElement('canvas'); c.width = 96; c.height = 72;
      if (p) drawCover(c.getContext('2d'), p, { x: 0, y: 0, w: 96, h: 72 });
      const l = document.createElement('span'); l.textContent = 'Photo ' + (i + 1); b.append(c, l);
      b.onclick = () => { state.selPhoto = i; renderPhotos(); }; list.append(b);
    });
    const pe = state.pe[state.order[state.selPhoto]] || {};
    $('#phFx').value = pe.effect || ''; $('#phZoom').value = Math.round((pe.zoom || 1) * 100);
    $('#phX').value = Math.round((pe.ox || 0) * 100); $('#phY').value = Math.round((pe.oy || 0) * 100);
    $('#phUp').disabled = state.selPhoto <= 0; $('#phDown').disabled = state.selPhoto >= ph.length - 1;
    $('#phFx').disabled = !glOK;
  }
  function buildPhFx() {
    const sel = $('#phFx'); sel.innerHTML = '';
    const add = (p, v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; p.append(o); };
    add(sel, '', 'Same as all photos'); add(sel, 'none', 'No effect');
    IrieFX.CATS.forEach(c => {
      const g = document.createElement('optgroup'); g.label = c.name;
      IrieFX.EFFECTS.filter(e => e.cat === c.id).forEach(e => add(g, e.id, e.name)); sel.append(g);
    });
  }
  function movePhoto(d) {
    const i = state.selPhoto, j = i + d, n = photosNow().length; if (j < 0 || j >= n) return;
    [state.order[i], state.order[j]] = [state.order[j], state.order[i]];
    state.selPhoto = j; commit(); renderPhotos(); renderEdit();
  }

  /* ---------- edit: themes ---------- */
  const THEMES = [
    { id: 'y2k', name: 'Y2K', layout: 'strip4', bg: { a: '#ff9ad5', b: '#8ee8ff' }, ink: '#2a1740', effect: 'bloom', strength: 60, caption: 'y2k forever', gap: 20, round: true, items: [['✨', .15, .07, .12, -10], ['💿', .86, .06, .14, 12], ['🦋', .14, .95, .13, -8], ['💖', .86, .95, .12, 10]] },
    { id: 'korean', name: 'Korean Photobooth', layout: 'strip4', bg: { a: '#ffffff' }, ink: '#2a1740', effect: 'pastel', strength: 55, caption: 'our 4 cuts', date: true, gap: 14, round: false, items: [['🤍', .86, .07, .1, 0], ['🎀', .14, .95, .11, -8]] },
    { id: 'vfilm', name: 'Vintage Film', layout: 'film', bg: { a: '#141414' }, ink: '#f4f4f4', effect: 'vintage', strength: 100, adj: { grain: 35, vignette: 25 }, caption: 'film roll', gap: 34, round: false, items: [] },
    { id: 'arcade', name: 'Retro Arcade', layout: 'strip4', bg: { a: '#1b1030' }, ink: '#ffffff', effect: 'neon', strength: 70, caption: 'player 1', gap: 18, round: false, items: [['🕹️', .14, .06, .12, -10], ['👾', .86, .06, .12, 10], ['⭐', .86, .95, .1, 0]] },
    { id: 'coquette', name: 'Pink Coquette', layout: 'strip4', bg: { a: '#ffd6ec' }, ink: '#2a1740', effect: 'pastel', strength: 50, caption: 'coquette', gap: 22, round: true, items: [['🎀', .14, .06, .14, -12], ['🎀', .86, .06, .14, 12], ['🩷', .86, .95, .1, 0], ['🌸', .14, .95, .11, 0]] },
    { id: 'dreamy', name: 'Dreamy Pastel', layout: 'strip4', bg: { a: '#ffc4e1', b: '#c4b5fd' }, ink: '#2a1740', effect: 'dreamy', strength: 80, caption: 'dreamy', gap: 22, round: true, items: [['☁️', .15, .07, .14, 0], ['✨', .86, .06, .11, 10], ['🦋', .14, .95, .12, -8], ['🌈', .86, .95, .12, 0]] },
    { id: 'academia', name: 'Dark Academia', layout: 'strip4', bg: { a: '#2e2118' }, ink: '#f4e8d8', effect: 'vintage', strength: 75, adj: { contrast: 12, vignette: 30 }, caption: 'dark academia', gap: 16, round: false, items: [['📚', .15, .06, .12, -8], ['🕯️', .86, .06, .12, 8], ['🍂', .86, .95, .11, 0]] },
    { id: 'summer', name: 'Summer Memories', layout: 'strip4', bg: { a: '#ffe29a', b: '#ff9a8b' }, ink: '#2a1740', effect: 'warm', strength: 80, adj: { saturation: 20 }, caption: 'summer memories', date: true, gap: 22, round: true, items: [['☀️', .86, .06, .14, 0], ['🏖️', .14, .95, .12, 0], ['🍉', .86, .95, .11, 0]] },
    { id: 'xmas', name: 'Christmas', layout: 'strip4', bg: { a: '#b3202a', b: '#1f6b3a' }, ink: '#ffffff', effect: 'warm', strength: 40, caption: 'merry christmas', gap: 22, round: true, items: [['🎄', .14, .06, .14, -8], ['⭐', .86, .06, .11, 10], ['🎅', .14, .95, .12, 0], ['❄️', .86, .95, .11, 0]] },
    { id: 'valentine', name: "Valentine's Day", layout: 'strip4', bg: { a: '#ff9ab8', b: '#ff4f8b' }, ink: '#ffffff', effect: 'warm', strength: 35, caption: 'be mine', gap: 22, round: true, items: [['💘', .14, .06, .13, -10], ['💖', .86, .06, .12, 10], ['💌', .14, .95, .12, 0], ['🌹', .86, .95, .12, 0]] },
    { id: 'birthday', name: 'Birthday', layout: 'strip4', bg: { a: '#ffe08a', b: '#ff9ad5' }, ink: '#2a1740', effect: 'citrus', strength: 50, caption: 'happy birthday', gap: 22, round: true, items: [['🎂', .14, .06, .13, -8], ['🎈', .86, .06, .13, 8], ['🎉', .14, .95, .12, 0], ['🎁', .86, .95, .12, 0]] },
    { id: 'bw', name: 'Classic Black & White', layout: 'strip4', bg: { a: '#ffffff' }, ink: '#2a1740', effect: 'bw', strength: 100, caption: '', gap: 20, round: false, items: [] }
  ];
  function buildThemes() {
    const box = $('#themeList'); box.innerHTML = '';
    THEMES.forEach(t => {
      const b = document.createElement('button'); b.className = 'theme-btn'; b.textContent = t.name;
      b.style.background = t.bg.b ? `linear-gradient(135deg,${t.bg.a},${t.bg.b})` : t.bg.a; b.style.color = t.ink;
      b.onclick = () => applyTheme(t); box.append(b);
    });
  }
  function applyTheme(t) {
    const have = state.photos.filter(Boolean).length, L = layouts.find(l => l.id === t.layout);
    if (L && L.count <= have) state.layoutId = L.id;
    state.opts.bg = t.bg; state.opts.ink = t.ink; state.opts.round = t.round; state.opts.gap = t.gap;
    state.opts.caption = t.caption || ''; state.opts.date = !!t.date;
    const base = IrieFX.defaultFx();
    state.fx = { effect: glOK && liveR.usable(t.effect) ? t.effect : 'none', strength: t.strength || 100, adj: { ...base.adj, ...(t.adj || {}) } };
    store.set('effect', state.fx.effect);
    state.items = state.items.filter(it => !it.theme);
    t.items.forEach(([v, nx, ny, size, rot]) => state.items.push({ id: 'i' + (++uid), type: 'emoji', value: v, nx, ny, size, rot, locked: false, theme: true }));
    state.themeId = t.id; state.sel = null; commit(); syncAll(); renderEdit();
    toast(t.name + ' applied');
  }

  /* ---------- edit: enter / export ---------- */
  function enterEdit() {
    const have = state.photos.filter(Boolean).length;
    if (cur().count > have) { const ok = layouts.find(l => l.count <= have); if (ok) state.layoutId = ok.id; }
    state.compare = false;
    commit();
    syncAll(); renderEdit();
    const loads = FONTS.map(f => (document.fonts ? document.fonts.load(`${f.w} 40px ${f.css}`).catch(() => {}) : Promise.resolve()));
    Promise.all(loads).then(renderEdit);
  }
  function setTab(name) {
    state.tab = name;
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    $$('.tabpane').forEach(p => { p.hidden = p.id !== 'tab-' + name; });
  }
  const toBlob = (c, type, q) => new Promise(res => c.toBlob(res, type, q));
  function saveBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const stampName = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `irie-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
  async function renderFinal(width) {
    const L = cur(), c = document.createElement('canvas');
    await Promise.all(state.items.filter(it => it.type === 'img').map(it => imgReady(it.value)));
    render(c, L, photosNow(), state.opts, width, { fx: state.fx, items: state.items, pe: peNow(), nocache: true });
    return c;
  }
  async function download() {
    const jpeg = $('#fmtSel').value === 'jpeg';
    const c = await renderFinal(+$('#sizeSel').value);
    const blob = await toBlob(c, jpeg ? 'image/jpeg' : 'image/png', 0.92);
    if (workR) workR.canvas.width = workR.canvas.height = 1;
    if (!blob) { toast('Export failed. Try the Standard size.'); return; }
    saveBlob(blob, stampName() + (jpeg ? '.jpg' : '.png')); toast('Saved!');
  }

  /* ---------- gallery (IndexedDB, stays on this device) ---------- */
  const DB = {
    open() { return new Promise((res, rej) => { const r = indexedDB.open('irie', 1); r.onupgradeneeded = () => r.result.createObjectStore('creations', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('creations', mode), q = fn(t.objectStore('creations'));
        t.oncomplete = () => { db.close(); res(q ? q.result : undefined); };
        t.onerror = t.onabort = () => { db.close(); rej(t.error); };
      });
    },
    put(o) { return this.run('readwrite', s => s.put(o)); },
    all() { return this.run('readonly', s => s.getAll()); },
    del(id) { return this.run('readwrite', s => s.delete(id)); },
    clear() { return this.run('readwrite', s => s.clear()); }
  };
  /* ---------- shared gallery (optional, Supabase) ---------- */
  const CFG = window.IRIE_CONFIG || {};
  if (CFG.supabaseUrl) CFG.supabaseUrl = String(CFG.supabaseUrl).trim().replace(/\/+$/, '');
  const Cloud = {
    on: !!(CFG.supabaseUrl && CFG.supabaseKey),
    // (the URL is cleaned of spaces and a trailing slash below)
    h(extra) {
      const k = String(CFG.supabaseKey).trim(), base = { apikey: k };
      if (k.startsWith('eyJ')) base.Authorization = 'Bearer ' + k;   // older-style keys are sent this way; newer sb_publishable_ keys use apikey only
      return { ...base, ...(extra || {}) };
    },
    pub(path) { return `${CFG.supabaseUrl}/storage/v1/object/public/irie/${path}`; },
    async upload(path, blob) {
      const r = await fetch(`${CFG.supabaseUrl}/storage/v1/object/irie/${path}`, { method: 'POST', headers: this.h({ 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true' }), body: blob });
      if (!r.ok) throw new Error('uploading a file failed (' + r.status + ') ' + await this.why(r));
    },
    async why(r) { try { const b = await r.clone().json(); return b.message || b.error || ''; } catch { return ''; } },
    async list() {
      const r = await fetch(`${CFG.supabaseUrl}/rest/v1/creations?select=*&order=created.desc`, { headers: this.h() });
      if (!r.ok) throw new Error('list failed');
      return (await r.json()).map(w => ({
        id: w.id, created: Number(w.created), name: w.name, layoutId: w.layout_id, layoutName: w.layout_name, themeId: w.theme_id, themeName: w.theme_name,
        favorite: !!w.favorite, thumbUrl: this.pub(w.thumb_path), finalUrl: this.pub(w.final_path),
        originals: (w.originals || []).map(o => ({ url: this.pub(o.path), seed: o.seed })), project: w.project,
        _paths: [w.final_path, w.thumb_path, ...(w.originals || []).map(o => o.path)]
      }));
    },
    async save(rec) {
      const base = rec.id + '/', orig = [];
      await this.upload(base + 'final.png', rec.final); await this.upload(base + 'thumb.jpg', rec.thumb);
      const ogs = rec.originals || [];
      for (let i = 0; i < ogs.length; i++) { const p = `${base}o${i}.jpg`; await this.upload(p, ogs[i].blob); orig.push({ path: p, seed: ogs[i].seed }); }
      const r = await fetch(`${CFG.supabaseUrl}/rest/v1/creations`, {
        method: 'POST', headers: this.h({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ id: rec.id, created: rec.created, name: rec.name, layout_id: rec.layoutId, layout_name: rec.layoutName, theme_id: rec.themeId || '', theme_name: rec.themeName || '', favorite: false, final_path: base + 'final.png', thumb_path: base + 'thumb.jpg', originals: orig, project: rec.project })
      });
      if (!r.ok) throw new Error('saving the details failed (' + r.status + ') ' + await this.why(r));
    },
    async patch(id, fields) {
      const r = await fetch(`${CFG.supabaseUrl}/rest/v1/creations?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: this.h({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: JSON.stringify(fields) });
      if (!r.ok) throw new Error('update failed');
    },
    async del(rec) {
      await fetch(`${CFG.supabaseUrl}/storage/v1/object/irie`, { method: 'DELETE', headers: this.h({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: rec._paths || [] }) });
      const r = await fetch(`${CFG.supabaseUrl}/rest/v1/creations?id=eq.${encodeURIComponent(rec.id)}`, { method: 'DELETE', headers: this.h() });
      if (!r.ok) throw new Error('delete failed');
    }
  };
  const GS = {
    all: () => (Cloud.on ? Cloud.list() : DB.all()),
    save: rec => (Cloud.on ? Cloud.save(rec) : DB.put(rec)),
    update: rec => (Cloud.on ? Cloud.patch(rec.id, { name: rec.name, favorite: !!rec.favorite }) : DB.put(rec)),
    del: rec => (Cloud.on ? Cloud.del(rec) : DB.del(rec.id)),
    async clearAll(list) { if (Cloud.on) { for (const r of list) await Cloud.del(r); } else await DB.clear(); }
  };
  async function finalBlob(rec) { if (rec.final) return rec.final; const r = await fetch(rec.finalUrl); if (!r.ok) throw new Error('fetch'); return r.blob(); }
  async function origBlob(o) { if (o.blob) return o.blob; const r = await fetch(o.url); if (!r.ok) throw new Error('fetch'); return r.blob(); }

  async function saveToGallery() {
    try {
      const L = cur();
      const [final, thumb] = await Promise.all([toBlob(await renderFinal(1200), 'image/png'), renderFinal(360).then(c => toBlob(c, 'image/jpeg', 0.85))]);
      const originals = [];
      for (const p of state.photos) if (p) originals.push({ blob: await toBlob(p, 'image/jpeg', 0.92), seed: p._seed || 0 });
      const d = new Date();
      await GS.save({
        id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6), created: d.getTime(), name: 'irie ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        layoutId: L.id, layoutName: L.name, final, thumb, originals,
        project: { fx: state.fx, items: state.items, opts: state.opts, layoutId: state.layoutId, order: state.order, pe: state.pe, themeId: state.themeId },
        favorite: false, themeId: state.themeId, themeName: (THEMES.find(t => t.id === state.themeId) || {}).name || ''
      });
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
      cacheVal = null; toast(Cloud.on ? 'Saved to the shared gallery' : 'Saved to your gallery');
    } catch { toast(Cloud.on ? 'Could not reach the shared gallery. Check your internet and try again.' : 'Could not save here. Your browser may block local storage.'); }
  }
  async function convertBlob(blob, type) {
    const bmp = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0);
    return toBlob(c, type, 0.92);
  }
  async function downloadRec(rec, jpeg) {
    try { const base = await finalBlob(rec); const blob = jpeg ? await convertBlob(base, 'image/jpeg') : base; saveBlob(blob, `irie-${rec.id}.${jpeg ? 'jpg' : 'png'}`); }
    catch { toast('Could not download that one.'); }
  }
  async function openRec(rec) {
    try {
      const photos = [];
      for (const o of rec.originals) {
        const bmp = await createImageBitmap(await origBlob(o)), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        c.getContext('2d').drawImage(bmp, 0, 0); c._seed = o.seed || 0; photos.push(tag(c));
      }
      const pj = rec.project;
      state.photos = photos; state.fx = pj.fx; state.items = pj.items; state.opts = pj.opts; state.layoutId = pj.layoutId; state.order = pj.order || []; state.pe = pj.pe || {}; state.selPhoto = 0; state.themeId = pj.themeId || '';
      state.sel = null; state.hist = []; state.histIdx = -1; state.mode = 'new';
      goTo('edit');
    } catch { toast('Could not open that creation.'); }
  }
  let galleryUrls = [];
  const galState = { sort: store.get('gsort', 'new'), layout: store.get('glayout', ''), theme: store.get('gtheme', ''), fav: store.get('gfav', false) };
  const fmtWhen = t => new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  function startRename(rec, el) {
    const inp = document.createElement('input'); inp.type = 'text'; inp.value = rec.name; inp.maxLength = 40; inp.className = 'gname-edit';
    el.replaceWith(inp); inp.focus(); inp.select();
    let finished = false;
    const finish = async save => {
      if (finished) return; finished = true;
      const v = inp.value.trim();
      if (save && v && v !== rec.name) { rec.name = v; try { await GS.update(rec); } catch { toast('Could not rename that one.'); } }
      el.textContent = rec.name; inp.replaceWith(el);
    };
    inp.onkeydown = e => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); };
    inp.onblur = () => finish(true);
  }
  function thumbObjUrl(rec) { const u = URL.createObjectURL(rec.thumb); galleryUrls.push(u); return u; }
  function recCard(rec, small) {
    const card = document.createElement('div'); card.className = 'gcard glass';
    const im = document.createElement('img'); im.src = rec.thumbUrl || thumbObjUrl(rec); im.alt = rec.name; im.onclick = () => (small ? goTo('gallery') : openRec(rec));
    if (small) { card.append(im); return card; }
    const top = document.createElement('div'); top.className = 'gtop';
    const name = document.createElement('div'); name.className = 'gname'; name.textContent = rec.name; name.tabIndex = 0; name.title = 'Click to rename';
    name.onclick = () => startRename(rec, name);
    name.onkeydown = e => { if (e.key === 'Enter') startRename(rec, name); };
    const fav = document.createElement('button'); fav.className = 'fav' + (rec.favorite ? ' on' : ''); fav.textContent = rec.favorite ? '♥' : '♡';
    fav.setAttribute('aria-label', rec.favorite ? 'Remove from favorites' : 'Add to favorites'); fav.setAttribute('aria-pressed', String(!!rec.favorite));
    fav.onclick = async () => { rec.favorite = !rec.favorite; try { await GS.update(rec); } catch { toast('Could not save that.'); } renderGallery(); };
    top.append(name, fav); card.append(top, im);
    const m = document.createElement('div'); m.className = 'meta';
    m.textContent = fmtWhen(rec.created) + ' · ' + rec.layoutName + (rec.themeName ? ' · ' + rec.themeName : ''); card.append(m);
    const row = document.createElement('div'); row.className = 'row';
    const mk = (t, fn) => { const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = t; b.onclick = fn; row.append(b); };
    mk('Edit', () => openRec(rec)); mk('PNG', () => downloadRec(rec, false)); mk('JPEG', () => downloadRec(rec, true));
    mk('Delete', async () => { if (confirm('Delete "' + rec.name + '"?' + (Cloud.on ? ' It will be removed for everyone.' : ''))) { try { await GS.del(rec); } catch { toast('Could not delete that one.'); } renderGallery(); } });
    card.append(row); return card;
  }
  async function loadAll(quiet) { try { return (await GS.all()).sort((a, b) => b.created - a.created); } catch { if (!quiet) { toast(Cloud.on ? 'Could not load the shared gallery. Press "Check connection" to see why.' : 'Could not open the gallery here.'); if (Cloud.on) $('#galStatus').textContent = 'Press "Check connection" to see what is wrong.'; } return []; } }
  let cacheVal = null, cacheAt = 0;   // the home page and its photos share one quick read of the gallery
  async function loadAllCached() { if (cacheVal && Date.now() - cacheAt < 10000) return cacheVal; cacheVal = await loadAll(true); cacheAt = Date.now(); return cacheVal; }
  function fillSelect(sel, pairs, value) {
    sel.innerHTML = '';
    pairs.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.append(o); });
    sel.value = pairs.some(p => p[0] === value) ? value : '';
    return sel.value;
  }
  async function showStorage() {
    const el = $('#galStorage');
    if (Cloud.on) { el.textContent = ''; return; }
    try { const e = await navigator.storage.estimate(); el.textContent = `Using about ${(e.usage / 1048576).toFixed(1)} MB on this device.`; } catch { el.textContent = ''; }
  }
  async function renderGallery() {
    galleryUrls.forEach(u => URL.revokeObjectURL(u)); galleryUrls = [];
    $('#galNote').textContent = Cloud.on ? 'Shared gallery: everyone with the passcode can see these pictures.' : 'Saved on this device only. To see your pictures on other devices, turn on the shared gallery (see the README).';
    $('#galTest').hidden = !Cloud.on; $('#galMove').hidden = true;
    if (Cloud.on) {   // pictures saved on this device before sharing was turned on can be moved over
      let n = 0; try { n = (await DB.all()).length; } catch { /* no local storage */ }
      if (n) { $('#galMove').hidden = false; $('#galMove').textContent = `Move ${n} picture${n === 1 ? '' : 's'} from this device to the shared gallery`; }
      $('#galStatus').textContent = n ? `${n} picture${n === 1 ? ' is' : 's are'} saved on this device only. Press the button to share ${n === 1 ? 'it' : 'them'}.`
        : 'This device has no unshared pictures. If you saved pictures on another device or browser (or at a different website address), open irie there and press Move.';
    }
    cacheVal = null;
    const all = await loadAll(), grid = $('#galleryGrid'); grid.innerHTML = '';
    $('#galTools').hidden = !all.length; $('#galleryEmpty').hidden = all.length > 0;
    $('#clearGallery').hidden = !all.length; $('#clearNonFav').hidden = !all.some(r => r.favorite);
    if (!all.length) { $('#galCount').textContent = ''; showStorage(); return; }
    const layoutsSeen = new Map(), themesSeen = new Map();
    all.forEach(r => { layoutsSeen.set(r.layoutId, r.layoutName); if (r.themeId) themesSeen.set(r.themeId, r.themeName || r.themeId); });
    galState.layout = fillSelect($('#galLayout'), [['', 'All layouts'], ...layoutsSeen], galState.layout);
    galState.theme = fillSelect($('#galTheme'), [['', 'All themes'], ['none', 'No theme'], ...themesSeen], galState.theme);
    $('#galSort').value = galState.sort; $('#galFav').checked = galState.fav;
    let list = all.filter(r => (!galState.layout || r.layoutId === galState.layout)
      && (!galState.theme || (galState.theme === 'none' ? !r.themeId : r.themeId === galState.theme)) && (!galState.fav || r.favorite));
    const by = {
      new: (a, b) => b.created - a.created, old: (a, b) => a.created - b.created,
      fav: (a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || b.created - a.created,
      name: (a, b) => a.name.localeCompare(b.name)
    };
    list = list.sort(by[galState.sort] || by.new);
    $('#galCount').textContent = list.length === all.length ? `${all.length} saved` : `Showing ${list.length} of ${all.length}`;
    if (!list.length) { const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'No creations match these filters.'; grid.append(p); }
    list.forEach(r => grid.append(recCard(r, false)));
    showStorage();
  }
  async function testCloud() {
    const out = $('#galStatus'); out.textContent = 'Checking…';
    try {
      const r = await fetch(`${CFG.supabaseUrl}/rest/v1/creations?select=id&limit=1`, { headers: Cloud.h() });
      if (!r.ok) {
        let b = {}; try { b = await r.json(); } catch { /* not json */ }
        const msg = String(b.message || '');
        out.textContent =
          (b.code === '42501' || /permission denied/i.test(msg)) ? 'The table exists, but Supabase is not sharing it with the website yet (Supabase changed this in 2026). In Supabase open SQL Editor and run:  grant select, insert, update, delete on public.creations to anon, authenticated;  then press Check connection again.'
          : /invalid api key/i.test(msg) ? 'Supabase says the key is not valid. Copy the key again from Project Settings > API Keys into config.js, with no spaces, and make sure it belongs to the same project as the URL.'
          : (r.status === 404 || b.code === 'PGRST205' || b.code === '42P01') ? 'Connected, but the "creations" table is missing. Run the setup SQL from the README.'
          : `The server answered with error ${r.status}${msg ? ': ' + msg : ''}.`;
        return;
      }
      const path = '_test/ping-' + Date.now() + '.txt';
      const up = await fetch(`${CFG.supabaseUrl}/storage/v1/object/irie/${path}`, { method: 'POST', headers: Cloud.h({ 'Content-Type': 'text/plain', 'x-upsert': 'true' }), body: new Blob(['ok'], { type: 'text/plain' }) });
      if (!up.ok) { out.textContent = `The table works, but saving files failed (error ${up.status}). Run the storage part of the setup SQL (the "irie" bucket and its policies).`; return; }
      await fetch(`${CFG.supabaseUrl}/storage/v1/object/irie`, { method: 'DELETE', headers: Cloud.h({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: [path] }) });
      out.textContent = 'Connected. The shared gallery works. Pictures saved on any device with this same setup show up here.';
    } catch { out.textContent = 'Could not reach Supabase. Check the URL in config.js and your internet.'; }
  }
  async function moveLocalToCloud() {
    const btn = $('#galMove'), out = $('#galStatus'); btn.disabled = true; let ok = 0, total = 0, failed = '';
    try {
      const local = await DB.all(); total = local.length;
      for (const r of local) {
        try { await Cloud.save(r); if (r.favorite) await Cloud.patch(r.id, { favorite: true }); await DB.del(r.id); ok++; out.textContent = `Moved ${ok} of ${total}…`; }
        catch (e) { failed = `Could not move "${r.name}": ${e.message}`; break; }
      }
    } catch (e) { failed = 'Could not read the pictures saved on this device: ' + e.message; }
    btn.disabled = false; cacheVal = null; await renderGallery();
    out.textContent = failed ? failed : `Moved ${ok} picture${ok === 1 ? '' : 's'} to the shared gallery.`;
  }
  async function renderRecent() {
    const all = await loadAllCached(), list = all.slice(0, 3), row = $('#recentRow'); row.innerHTML = '';
    $('#recentBlock').hidden = !list.length; $('#recentCount').textContent = '▸ ' + all.length + (all.length === 1 ? ' strip' : ' strips');
    list.forEach(r => {
      const b = document.createElement('button'); b.className = 'dock-thumb'; b.setAttribute('aria-label', 'Open the gallery: ' + r.name);
      const im = document.createElement('img'); im.alt = '';
      if (r.thumbUrl) im.src = r.thumbUrl; else { const u = URL.createObjectURL(r.thumb); im.src = u; im.onload = () => URL.revokeObjectURL(u); }
      b.append(im); b.onclick = () => goTo('gallery'); row.append(b);
    });
    $('#recentBlock').onclick = () => goTo('gallery');
  }

  /* ---------- events ---------- */
  $$('[data-go]').forEach(b => b.addEventListener('click', () => (b.dataset.go === 'booth' ? startBooth() : goTo(b.dataset.go))));
  $('#startBtnHome').onclick = startBooth;
  $('#uploadBtnHome').onclick = () => pickFiles(null);
  $('#uploadFromMsg').onclick = () => pickFiles(null);
  $('#retryCam').onclick = startCamera;
  $('#startBtn').onclick = () => {
    if (state.mode === 'retake') runSession([state.retakeIdx]);
    else { const n = cur().count; state.photos = Array(n).fill(null); runSession([...Array(n).keys()]); }
  };
  $('#cancelBtn').onclick = () => { state.cancel = true; };
  $('#countdownSel').onchange = e => { state.countdown = +e.target.value; store.set('countdown', state.countdown); };
  $('#delaySel').onchange = e => { state.delay = +e.target.value; store.set('delay', state.delay); };
  $('#muteChk').onchange = e => { state.mute = e.target.checked; store.set('mute', state.mute); };
  $('#mirrorChk').onchange = e => { state.mirror = e.target.checked; applyMirror(); };
  $('#cameraSel').onchange = e => { state.deviceId = e.target.value; startCamera(); };
  $('#flipBtn').onclick = () => { state.deviceId = null; state.facing = state.facing === 'user' ? 'environment' : 'user'; startCamera(); };
  $('#fsBtn').onclick = () => {
    const w = $('#stageWrap');
    if (document.fullscreenElement) document.exitFullscreen(); else if (w.requestFullscreen) w.requestFullscreen().catch(() => toast('Fullscreen is not available.'));
  };
  $('#retakeAll').onclick = startBooth;
  $('#reviewContinue').onclick = () => goTo('edit');
  $('#backReview').onclick = () => goTo('review');
  $('#newSession').onclick = startBooth;
  $('#gapRange').oninput = e => { state.opts.gap = +e.target.value; store.set('gap', state.opts.gap); renderEdit(); };
  $('#gapRange').onchange = commit;
  $('#roundChk').onchange = e => { state.opts.round = e.target.checked; store.set('round', state.opts.round); commit(); renderEdit(); };
  $('#captionInp').oninput = e => { state.opts.caption = e.target.value; renderEdit(); };
  $('#captionInp').onchange = commit;
  $('#dateChk').onchange = e => { state.opts.date = e.target.checked; commit(); renderEdit(); };
  $('#downloadBtn').onclick = download;
  $('#saveBtn').onclick = saveToGallery;
  [['#galSort', 'sort', 'gsort'], ['#galLayout', 'layout', 'glayout'], ['#galTheme', 'theme', 'gtheme']].forEach(([id, k, sk]) => {
    $(id).onchange = e => { galState[k] = e.target.value; store.set(sk, galState[k]); renderGallery(); };
  });
  $('#galFav').onchange = e => { galState.fav = e.target.checked; store.set('gfav', galState.fav); renderGallery(); };
  $('#galTest').onclick = testCloud;
  $('#galMove').onclick = moveLocalToCloud;
  $('#clearNonFav').onclick = async () => {
    if (!confirm('Delete everything that is not a favorite?' + (Cloud.on ? ' This removes them for everyone.' : '') + ' This cannot be undone.')) return;
    const all = await loadAll(); for (const r of all) if (!r.favorite) { try { await GS.del(r); } catch { /* skip */ } }
    renderGallery(); toast('Kept your favorites');
  };
  $('#clearGallery').onclick = async () => { if (confirm('Delete everything saved in this gallery?' + (Cloud.on ? ' This removes it for EVERYONE.' : '') + ' This cannot be undone.')) { try { await GS.clearAll(await loadAll()); } catch { toast('Could not clear everything.'); } renderGallery(); toast('Gallery cleared'); } };

  // toolbar
  $('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
  const cmp = $('#compareBtn');
  const setCompare = v => { if (state.compare !== v) { state.compare = v; renderEdit(); } };
  cmp.addEventListener('pointerdown', e => { e.preventDefault(); setCompare(true); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => cmp.addEventListener(ev, () => setCompare(false)));
  cmp.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setCompare(true); } });
  cmp.addEventListener('keyup', () => setCompare(false));
  document.addEventListener('keydown', e => {
    if (state.screen !== 'edit') return;
    const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox';
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && selected()) { e.preventDefault(); $('#selDel').click(); }
  });

  // individual photos
  $('#phFx').onchange = e => { const pe = getPE(); if (e.target.value) pe.effect = e.target.value; else delete pe.effect; commit(); renderEdit(); };
  const phSlider = (id, fn) => { $(id).addEventListener('input', e => { fn(getPE(), +e.target.value); renderEdit(); }); $(id).addEventListener('change', commit); };
  phSlider('#phZoom', (pe, v) => { pe.zoom = v / 100; }); phSlider('#phX', (pe, v) => { pe.ox = v / 100; }); phSlider('#phY', (pe, v) => { pe.oy = v / 100; });
  $('#phUp').onclick = () => movePhoto(-1); $('#phDown').onclick = () => movePhoto(1);
  $('#phReplace').onclick = () => { state.uploadIdx = state.order[state.selPhoto]; state.uploadEdit = true; $('#fileInput').click(); };
  $('#phReset').onclick = () => { delete state.pe[state.order[state.selPhoto]]; commit(); renderPhotos(); renderEdit(); };

  // tabs + filters
  $$('.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $('#fxStrength').oninput = e => { state.fx.strength = +e.target.value; store.set('strength', state.fx.strength); renderEdit(); };
  $('#fxStrength').onchange = () => { commit(); renderFxGrid(); };
  $('#boothStrength').oninput = e => { state.fx.strength = +e.target.value; store.set('strength', state.fx.strength); };
  $$('.fx-chips [data-cat]').forEach(b => b.onclick = () => { state.fxTab = b.dataset.cat; renderBoothFx(); });
  $('#fxNone').onclick = () => setEffect('none');
  $('#fxRandom').onclick = randomEffect;
  $('#fxPrev').onclick = () => stepEffect(-1);
  $('#fxNext').onclick = () => stepEffect(1);
  $('#fxReset').onclick = () => { state.fx = IrieFX.defaultFx(); syncFx(); commit(); renderEdit(); };
  $('#addText').onclick = () => { addText(); setTab('text'); };
  $('#addStamp').onclick = stamp;

  // selected item controls
  const FONT_SEL = $('#selFont');
  FONTS.forEach(f => { const o = document.createElement('option'); o.value = f.k; o.textContent = f.n; FONT_SEL.append(o); });
  const live = (id, fn) => { $(id).addEventListener('input', e => { const it = selected(); if (it) { fn(it, e.target); renderEdit(); } }); $(id).addEventListener('change', commit); };
  live('#selText', (it, t) => { it.text = t.value; });
  live('#selFont', (it, t) => { it.font = t.value; });
  live('#selColor', (it, t) => { it.color = t.value; });
  live('#selOutline', (it, t) => { it.outline = t.checked; });
  live('#selShadow', (it, t) => { it.shadow = t.checked; });
  live('#selSize', (it, t) => { it.size = +t.value / 100; });
  live('#selRot', (it, t) => { it.rot = +t.value; });
  $('#selLock').addEventListener('change', e => { const it = selected(); if (it) { it.locked = e.target.checked; commit(); drawOverlay(); } });
  $('#selDup').onclick = () => { const it = selected(); if (it) { const c = { ...JSON.parse(JSON.stringify(it)), id: 'i' + (++uid), nx: Math.min(1, it.nx + .04), ny: Math.min(1, it.ny + .04), locked: false }; state.items.push(c); state.sel = c.id; commit(); syncSel(); renderEdit(); } };
  $('#selDel').onclick = () => { const it = selected(); if (it) { state.items = state.items.filter(x => x !== it); state.sel = null; commit(); syncSel(); renderEdit(); } };
  const move = d => { const i = state.items.findIndex(x => x.id === state.sel), j = i + d; if (i < 0 || j < 0 || j >= state.items.length) return; [state.items[i], state.items[j]] = [state.items[j], state.items[i]]; commit(); renderEdit(); };
  $('#selFwd').onclick = () => move(1); $('#selBack').onclick = () => move(-1);

  // pickers on booth screen change the start button label
  $('#boothLayouts').addEventListener('click', () => setTimeout(updateStartLabel));

  // theme
  const setTheme = t => { document.documentElement.dataset.theme = t; store.set('theme', t); };
  setTheme(store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

  // stop the camera when the tab is hidden or closed
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (state.screen === 'booth' && !state.busy) stopCamera(); }
    else if (state.screen === 'booth' && !state.stream) startCamera();
  });
  addEventListener('pagehide', stopCamera);

  /* ---------- start ---------- */
  if (Cloud.on) $('#leadText').textContent = 'Take a few photos, pick a layout, download your strip. Saved pictures go to the shared gallery.';
  initGL(); buildThemes(); buildPhFx(); buildHero(); refreshHomePhotos(); refreshPickers(); loadFrames(); buildAdjust(); renderStickers(); loadStickers(); renderRecent();
  if (!layouts.find(l => l.id === state.layoutId)) state.layoutId = 'plain';
})();
