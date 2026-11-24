/* irie – passcode page. A casual lock for a personal site, not real security:
   anyone who reads this file can work out the code. Do not rely on it for anything private. */
(() => {
  const hash = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  };
  const PASS_HASH = '6484868908060847';   // to change the passcode: run irieHash('1234') in the browser console and paste the result here
  window.irieHash = code => String(hash('irie:' + code));

  const KEY = 'irie.pass', root = document.documentElement;
  const read = st => { try { return st.getItem(KEY); } catch { return null; } };
  const saved = k => { try { return JSON.parse(localStorage.getItem('irie.' + k)); } catch { return null; } };
  const unlocked = () => read(sessionStorage) === PASS_HASH || read(localStorage) === PASS_HASH;

  // use the saved theme right away, so the passcode page already looks right
  const READY = ['classic', 'pixel', 'night', 'y2k'];   // themes that are built (the others show "Coming soon" in Settings)
  window.IRIE_SKINS_READY = READY;
  const skin = READY.includes(saved('skin')) ? saved('skin') : 'classic';
  root.dataset.skin = skin;
  if (skin !== 'classic') document.write('<link rel="stylesheet" id="skin-css-' + skin + '" href="themes/' + skin + '.css">');
  const mode = saved('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.dataset.theme = mode;
  if (!unlocked()) root.classList.add('locked');

  document.addEventListener('DOMContentLoaded', () => {
    const dots = [...document.querySelectorAll('.lk-dot')], msg = document.getElementById('lockMsg'), card = document.querySelector('.lock-card');
    const status = document.getElementById('lockStatus');
    let code = '', tries = 0, waitUntil = 0;
    const show = () => { dots.forEach((d, i) => d.classList.toggle('on', i < code.length)); status.textContent = code.length + ' of 4 digits entered'; };
    const open = () => {
      const remember = document.getElementById('lockRemember').checked;
      try { sessionStorage.setItem(KEY, PASS_HASH); if (remember) localStorage.setItem(KEY, PASS_HASH); } catch { /* ignore */ }
      root.classList.remove('locked'); code = ''; show(); msg.textContent = '';
    };
    const check = () => {
      if (window.irieHash(code) === PASS_HASH) { open(); return; }
      tries++; code = ''; show(); msg.textContent = 'Wrong passcode. Try again.';
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      if (tries >= 5) { waitUntil = Date.now() + 30000; tries = 0; msg.textContent = 'Too many tries. Wait 30 seconds.'; }
    };
    const press = d => {
      if (Date.now() < waitUntil) { msg.textContent = 'Too many tries. Wait a few seconds.'; return; }
      if (code.length >= 4) return;
      msg.textContent = ''; code += d; show();
      if (code.length === 4) setTimeout(check, 140);
    };
    const back = () => { code = code.slice(0, -1); show(); };
    document.querySelectorAll('.lk-key[data-k]').forEach(b => { b.onclick = () => press(b.dataset.k); });
    document.getElementById('lockBack').onclick = back;
    document.addEventListener('keydown', e => {
      if (!root.classList.contains('locked')) return;
      if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') back();
    });
    document.getElementById('relock').onclick = () => { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* ignore */ } location.reload(); };
    show();
  });
})();
