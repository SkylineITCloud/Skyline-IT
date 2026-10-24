'use strict';
function chooseInitialTheme(search) {
  return new URLSearchParams(search).get('theme') === 'purple' ? 'purple' : 'original';
}
if (typeof module !== 'undefined') module.exports = { chooseInitialTheme };
if (typeof document !== 'undefined') {
  const original = document.getElementById('themeOriginal');
  const purple = document.getElementById('themePurple');
  function applyTheme(value) {
    const theme = value === 'purple' ? 'purple' : 'original';
    document.body.dataset.theme = theme;
    original.setAttribute('aria-pressed', String(theme === 'original'));
    purple.setAttribute('aria-pressed', String(theme === 'purple'));
    document.getElementById('themeStatus').textContent = theme === 'purple' ? 'Purple theme selected' : 'Mzansi theme selected';
    const homeLink = document.querySelector('.home-link');
    const home = new URL(homeLink.getAttribute('href'), window.location.href);
    home.pathname = home.pathname.replace(/\/Purple\/index\.html$/, '/index.html');
    if (theme === 'purple') home.pathname = home.pathname.replace(/\/index\.html$/, '/Purple/index.html');
    for (const link of document.querySelectorAll('.home-link, .brand')) link.href = home.href;
    const url = new URL(window.location.href);
    url.searchParams.set('theme', theme);
    try { window.history.replaceState(null, '', url); } catch {}
    document.dispatchEvent(new CustomEvent('mzansi-theme-change', { detail: { theme } }));
  }
  original.addEventListener('click', () => applyTheme('original'));
  purple.addEventListener('click', () => applyTheme('purple'));
  applyTheme(new URLSearchParams(window.location.search).has('theme') ? chooseInitialTheme(window.location.search) : document.body.dataset.theme);
}