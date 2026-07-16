(function () {
  const STORAGE_KEY = 'logicflow-theme';
  const THEME_ATTR = 'data-theme';

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {

    }
  }

  function getEffectiveTheme() {
    return getStoredTheme() === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute(THEME_ATTR, 'dark');
    } else {
      document.documentElement.removeAttribute(THEME_ATTR);
    }
    updateToggleIcons(theme);
  }

  function updateToggleIcons(theme) {
    document.querySelectorAll('.lf-theme-toggle').forEach(btn => {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btn.setAttribute('title', isDark ? 'Modo claro' : 'Modo oscuro');

      const sun = btn.querySelector('.lf-theme-icon--sun');
      const moon = btn.querySelector('.lf-theme-icon--moon');
      if (sun) sun.style.display = isDark ? 'block' : 'none';
      if (moon) moon.style.display = isDark ? 'none' : 'block';
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute(THEME_ATTR) === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setStoredTheme(next);
  }

  function init() {
    applyTheme(getEffectiveTheme());

    document.querySelectorAll('.lf-theme-toggle').forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LFTheme = { applyTheme, toggleTheme, getEffectiveTheme };
})();
