/**
 * SenDeke.to — Native Dark Mode & System Theme Synchronizer
 * Automatically synchronizes Bootstrap 5.3 & custom glass plates
 * with user's native browser / OS color scheme preferences.
 */
(function() {
  function syncTheme() {
    try {
      var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    } catch(e) {}
  }
  syncTheme();
  if (window.matchMedia) {
    var mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (mql.addEventListener) {
      mql.addEventListener('change', syncTheme);
    } else if (mql.addListener) {
      mql.addListener(syncTheme);
    }
  }
})();
