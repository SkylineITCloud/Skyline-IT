"use strict";
(() => {
 const base = new URL('../../../index.html', location.href);
 base.pathname = base.pathname.replace(/\/Purple\/index\.html$/, '/index.html');
 function updateAppLinks() {
  const theme = document.body.dataset.theme === 'purple' ? 'purple' : 'original';
  const home = new URL(base);
  if (theme === 'purple') home.pathname = home.pathname.replace(/index\.html$/, 'Purple/index.html');
  document.querySelectorAll('.companion-nav a').forEach(link => {
   const target = link.dataset.app === 'checkout' ? new URL('checkout/index.html', base) : link.dataset.app === 'home' ? new URL(home) : new URL('Product/' + link.dataset.app + '/web/' + (link.dataset.file || 'index.html'), home);
   target.searchParams.set('theme', theme);
   link.href = target.href;
   if (target.pathname.replace('/Purple/', '/') === location.pathname.replace('/Purple/', '/')) link.setAttribute('aria-current', 'page');
   else link.removeAttribute('aria-current');
  });
 }
 document.addEventListener('mzansi-theme-change', updateAppLinks);
 for (const id of ['themeOriginal', 'themePurple']) document.getElementById(id).addEventListener('click', updateAppLinks);
 updateAppLinks();
})();
