// Applies the saved or system theme before first paint to avoid a flash of the
// wrong theme. Kept as an external file so the CSP can forbid inline scripts.
(() => {
  let stored = null;
  try {
    stored = window.localStorage.getItem('huitong.theme');
  } catch {
    // Storage can be blocked (private mode, policy); fall back to the system theme.
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = stored === 'dark' || (stored !== 'light' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
})();
