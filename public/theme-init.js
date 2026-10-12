// Apply the persisted (or system-preferred) theme before React mounts
// to avoid a flash of light content on dark-preference reloads.
// A file and not an inline script: the extension's CSP blocks inline code.
(function () {
  try {
    var stored = localStorage.getItem('bookmarkify:theme');
    var theme = (stored === 'light' || stored === 'dark')
      ? stored
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (_) { /* localStorage blocked — fall back to light */ }
})();
