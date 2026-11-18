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
    layoutId: store.get('layout', 'strip4'),
    photos: [],
    opts: { bg: store.get('bg', BGS[0]), gap: store.get('gap', 24), round: store.get('round', true), caption: '', date: false },
    countdown: store.get('countdown', 3),
    delay: store.get('delay', 2),
    mute: store.get('mute', false),
    mirror: true, facing: 'user', deviceId: null,
    stream: null, camToken: 0,
    busy: false, cancel: false,
    screen: 'home', mode: 'new', retakeIdx: null, uploadIdx: null
  };

  /* ---------- layouts ---------- */
  function strip(n, name) {
    return {
      id: 'strip' + n, name, count: n, aspect: 4 / 3,
      geom(o) {
        const W = 600, pad = 36, gap = o.gap, pw = W - pad * 2, ph = Math.round(pw * 3 / 4);
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
  const BUILTIN = [strip(4, 'Classic 4-cut'), strip(3, '3-cut strip'), strip(2, '2-cut strip'), polaroid];
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
  function drawCover(ctx, img, s) {
    const iw = img.width, ih = img.height, k = Math.max(s.w / iw, s.h / ih);
    const sw = s.w / k, sh = s.h / k;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, s.x, s.y, s.w, s.h);
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

  function render(canvas, L, photos, o, outW) {
    const g = L.geom(o), s = outW / g.w;
    canvas.width = Math.round(g.w * s); canvas.height = Math.round(g.h * s);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(s, 0, 0, s, 0, 0); ctx.imageSmoothingQuality = 'high';
    const bg = o.bg;
    if (bg.b) { const gr = ctx.createLinearGradient(0, 0, g.w * 0.4, g.h); gr.addColorStop(0, bg.a); gr.addColorStop(1, bg.b); ctx.fillStyle = gr; }
    else ctx.fillStyle = bg.a;
    ctx.fillRect(0, 0, g.w, g.h);
    g.slots.forEach((sl, i) => {
      const p = photos ? photos[i] : null;
      ctx.save(); rr(ctx, sl.x, sl.y, sl.w, sl.h, g.r || 0); ctx.clip();
      if (p) drawCover(ctx, p, sl); else drawPlaceholder(ctx, sl, i);
      ctx.restore();
    });
    if (g.overlay) ctx.drawImage(g.overlay, 0, 0, g.w, g.h);
    else drawFooter(ctx, g, o, lum(bg.a) > 0.5 && !(bg.b) ? '#2a1740' : (bg.b ? '#2a1740' : '#ffffff'));
  }

  /* ---------- pickers ---------- */
  function buildPicker(el, filter, onPick) {
    el.innerHTML = '';
    for (const L of layouts) {
      const b = document.createElement('button');
      b.className = 'layout-btn' + (L.id === state.layoutId ? ' on' : '');
      b.disabled = !!filter && !filter(L);
      if (b.disabled) b.title = 'Needs more photos than you took';
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
    if (state.screen === 'edit') renderEdit();
  }
  function refreshPickers() {
    buildPicker($('#homeStyles'), null, L => { setLayout(L); startBooth(); });
    buildPicker($('#boothLayouts'), null, setLayout);
    const have = state.photos.filter(Boolean).length;
    buildPicker($('#editLayouts'), L => L.count <= have, setLayout);
    $('#builtinControls').hidden = !!cur().frame;
  }
  function buildHero() {
    const o = { ...state.opts, caption: '', date: false, bg: BGS[0] };
    render($('#heroA'), BUILTIN[0], null, o, 300);
    render($('#heroB'), polaroid, null, { ...o, bg: BGS[5] }, 300);
    render($('#heroC'), BUILTIN[1], null, { ...o, bg: BGS[1] }, 300);
  }

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
    if (name === 'home') { buildHero(); refreshPickers(); }
    window.scrollTo(0, 0);
  }
  function startBooth() { state.mode = 'new'; state.retakeIdx = null; goTo('booth'); }

  /* ---------- camera ---------- */
  const video = $('#video');
  function showMsg(text) { $('#camMsgText').textContent = text; $('#camMsg').hidden = false; }
  function stopCamera() {
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
    return c;
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
      state.photos[indices[k]] = grabFrame();
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
      return c;
    } finally { URL.revokeObjectURL(url); }
  }
  function pickFiles(idx) { state.uploadIdx = idx; $('#fileInput').click(); }
  $('#fileInput').addEventListener('change', async e => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    try {
      if (state.uploadIdx !== null) {
        state.photos[state.uploadIdx] = await fileToCanvas(files[0]);
        state.uploadIdx = null; renderReview(); return;
      }
      const n = Math.min(files.length, 4);
      const L = BUILTIN.find(l => l.count === n) || BUILTIN[0];
      state.layoutId = L.id; store.set('layout', L.id);
      state.photos = Array(L.count).fill(null);
      for (let i = 0; i < L.count && i < files.length; i++) state.photos[i] = await fileToCanvas(files[i]);
      state.mode = 'new'; goTo('review');
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
        drawCover(t.getContext('2d'), p, { x: 0, y: 0, w: t.width, h: t.height }); fig.append(t);
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

  /* ---------- edit / export ---------- */
  let raf;
  function renderEdit() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const L = cur(); render($('#outCanvas'), L, state.photos.slice(0, L.count), state.opts, 900);
    });
  }
  function enterEdit() {
    const have = state.photos.filter(Boolean).length;
    if (cur().count > have) { const ok = layouts.find(l => l.count <= have); if (ok) { state.layoutId = ok.id; } }
    $('#gapRange').value = state.opts.gap; $('#roundChk').checked = state.opts.round;
    $('#captionInp').value = state.opts.caption; $('#dateChk').checked = state.opts.date;
    buildSwatches(); refreshPickers();
    (document.fonts ? document.fonts.load('600 40px Caveat').catch(() => {}) : Promise.resolve()).then(renderEdit);
    renderEdit();
  }
  function buildSwatches() {
    const box = $('#swatches'); box.innerHTML = '';
    const same = b => b.a === state.opts.bg.a && b.b === state.opts.bg.b;
    BGS.forEach(b => {
      const s = document.createElement('button'); s.className = 'sw' + (same(b) ? ' on' : '');
      s.style.background = b.b ? `linear-gradient(135deg,${b.a},${b.b})` : b.a; s.setAttribute('aria-label', 'Background ' + b.a);
      s.onclick = () => { state.opts.bg = b; store.set('bg', b); buildSwatches(); refreshPickers(); renderEdit(); };
      box.append(s);
    });
    const c = document.createElement('input'); c.type = 'color'; c.value = state.opts.bg.a; c.setAttribute('aria-label', 'Custom background color');
    c.oninput = () => { state.opts.bg = { a: c.value }; store.set('bg', state.opts.bg); renderEdit(); };
    box.append(c);
  }
  function download() {
    const L = cur(), c = document.createElement('canvas');
    render(c, L, state.photos.slice(0, L.count), state.opts, +$('#sizeSel').value);
    c.toBlob(blob => {
      if (!blob) { toast('Export failed. Try the Standard size.'); return; }
      const a = document.createElement('a'), d = new Date(), p = n => String(n).padStart(2, '0');
      a.href = URL.createObjectURL(blob);
      a.download = `irie-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Saved!');
    }, 'image/png');
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
  $('#roundChk').onchange = e => { state.opts.round = e.target.checked; store.set('round', state.opts.round); renderEdit(); };
  $('#captionInp').oninput = e => { state.opts.caption = e.target.value; renderEdit(); };
  $('#dateChk').onchange = e => { state.opts.date = e.target.checked; renderEdit(); };
  $('#downloadBtn').onclick = download;

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
  buildHero(); refreshPickers(); loadFrames();
  if (!layouts.find(l => l.id === state.layoutId)) state.layoutId = 'strip4';
})();
