/* irie – themes (skins) and the Settings panel.
   Each theme is a look for the whole site. Only themes marked ready can be chosen; the rest show "Coming soon". */
(() => {
  const SKINS = [
    { id: 'candy', name: 'Candy Bento', ready: true, note: 'Soft pink and lilac, puffy buttons', sw: 'linear-gradient(135deg,#ffc2e0,#d9c9ff)' },
    { id: 'pixel', name: 'Pixel Pastel Town', ready: false, note: 'Pixel city, chunky pixel buttons', sw: 'linear-gradient(135deg,#aee0ff,#ffb3da)' },
    { id: 'night', name: 'Night Garden', ready: false, note: 'Night garden, glass cards, fireflies', sw: 'linear-gradient(135deg,#1b2159,#ffd77a)' },
    { id: 'y2k', name: 'Y2K Desktop', ready: false, note: 'Sparkle grid, windows, bubble buttons', sw: 'linear-gradient(135deg,#cdb8ff,#ff9ad5)' },
    { id: 'sticker', name: 'Sticker Book', ready: false, note: 'Notebook page, tabs, taped photos', sw: 'linear-gradient(135deg,#fff8ec,#ffc2e0)' },
    { id: 'zine', name: 'Halftone Pop Zine', ready: false, note: 'Bold collage, halftone dots', sw: 'linear-gradient(135deg,#ff6fb7,#8b5cf6)' }
  ];
  const root = document.documentElement, $ = s => document.querySelector(s);
  const get = k => { try { return JSON.parse(localStorage.getItem('irie.' + k)); } catch { return null; } };
  const set = (k, v) => { try { localStorage.setItem('irie.' + k, JSON.stringify(v)); } catch { /* ignore */ } };

  function loadCss(id) {   // a ready theme other than the default brings its own stylesheet: themes/<id>.css
    if (id === 'candy' || document.getElementById('skin-css-' + id)) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'skin-css-' + id; l.href = 'themes/' + id + '.css'; document.head.append(l);
  }
  function applySkin(id) {
    const s = SKINS.find(x => x.id === id && x.ready) || SKINS[0];
    loadCss(s.id); root.dataset.skin = s.id; set('skin', s.id); render();
  }
  function render() {
    const cur = root.dataset.skin || 'candy', box = $('#skinList'); box.innerHTML = '';
    SKINS.forEach(s => {
      const b = document.createElement('button'); b.className = 'skin' + (s.id === cur ? ' on' : '');
      b.setAttribute('aria-pressed', String(s.id === cur));
      if (!s.ready) b.setAttribute('aria-disabled', 'true');
      b.innerHTML = '<span class="sw"></span><strong></strong><span class="tag"></span>';
      b.querySelector('.sw').style.background = s.sw; b.querySelector('strong').textContent = s.name;
      b.querySelector('.tag').textContent = s.ready ? (s.id === cur ? 'In use' : s.note) : 'Coming soon';
      b.onclick = () => { if (s.ready) applySkin(s.id); };
      box.append(b);
    });
    document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === root.dataset.theme));
  }

  let opener = null;
  function openSettings() { opener = document.activeElement; render(); $('#settings').hidden = false; $('#setClose').focus(); }
  function closeSettings() { $('#settings').hidden = true; if (opener && opener.focus) opener.focus(); }

  document.addEventListener('DOMContentLoaded', () => {
    loadCss(root.dataset.skin || 'candy');
    $('#settingsBtn').onclick = openSettings; $('#setClose').onclick = closeSettings;
    $('#settings').addEventListener('click', e => { if (e.target.id === 'settings') closeSettings(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#settings').hidden) closeSettings(); });
    document.querySelectorAll('#modeSeg button').forEach(b => { b.onclick = () => { root.dataset.theme = b.dataset.mode; set('theme', b.dataset.mode); render(); }; });
    render();
  });
  window.irieTheme = { SKINS, applySkin };
})();
