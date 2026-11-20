/* irie – passcode screen. This is a casual lock for a personal site, not real security:
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
  const unlocked = () => read(sessionStorage) === PASS_HASH || read(localStorage) === PASS_HASH;
  if (!unlocked()) root.classList.add('locked');

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('lockInput'), msg = document.getElementById('lockMsg'), btn = document.getElementById('lockGo'), card = document.querySelector('.lock-card');
    let tries = 0, waitUntil = 0;
    const open = remember => {
      try { sessionStorage.setItem(KEY, PASS_HASH); if (remember) localStorage.setItem(KEY, PASS_HASH); } catch { /* ignore */ }
      root.classList.remove('locked'); input.value = ''; msg.textContent = '';
    };
    const tryCode = () => {
      const now = Date.now();
      if (now < waitUntil) { msg.textContent = 'Too many tries. Wait a few seconds.'; return; }
      if (window.irieHash(input.value.trim()) === PASS_HASH) { open(document.getElementById('lockRemember').checked); return; }
      tries++; input.value = ''; msg.textContent = 'Wrong passcode. Try again.';
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      if (tries >= 5) { waitUntil = now + 30000; tries = 0; msg.textContent = 'Too many tries. Wait 30 seconds.'; }
    };
    btn.onclick = tryCode;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryCode(); });
    input.addEventListener('input', () => { if (/^\d{4}$/.test(input.value)) tryCode(); });
    document.getElementById('relock').onclick = () => { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* ignore */ } location.reload(); };
    if (!unlocked()) setTimeout(() => input.focus(), 50);
  });
})();
