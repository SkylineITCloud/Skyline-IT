'use strict';
(() => {
  const buttons = Array.from(document.querySelectorAll('[data-appearance]'));
  const links = Array.from(document.querySelectorAll('a[data-theme-link]'));
  const baseHome = new URL('../../../index.html', window.location.href);
  baseHome.pathname = baseHome.pathname.replace(/\/Purple\/index\.html$/, '/index.html');
  function applyTheme(value) {
    const theme = value === 'purple' ? 'purple' : 'original';
    document.body.dataset.theme = theme;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.appearance === theme)));
    document.getElementById('companionThemeStatus').textContent = theme === 'purple' ? 'Purple appearance selected' : 'Mzansi appearance selected';
    links.forEach(link => {
      const target = link.dataset.themeLink;
      const themeHome = new URL(baseHome);
      if (theme === 'purple') themeHome.pathname = themeHome.pathname.replace(/index\.html$/, 'Purple/index.html');
      const url = target === 'home' ? themeHome : new URL('Product/' + target + '/web/' + (link.dataset.themeFile || 'index.html'), themeHome);
      url.searchParams.set('theme', theme);
      link.href = url.href;
    });
    const current = new URL(window.location.href);
    current.searchParams.set('theme', theme);
    try { window.history.replaceState(null, '', current); } catch {}
    document.dispatchEvent(new CustomEvent('mzansi-theme-change', {detail:{theme}}));
  }
  buttons.forEach(button => button.addEventListener('click', () => applyTheme(button.dataset.appearance)));
  const choice = new URLSearchParams(window.location.search).get('theme');
  applyTheme(choice === 'purple' || choice === 'original' ? choice : document.body.dataset.theme);
})();
