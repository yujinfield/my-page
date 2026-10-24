// 라이트·다크 모드 전환 (시스템 설정을 따르고, 직접 고르면 기억함)

import { loadTheme, saveTheme } from './store.js';

export function setupTheme() {
  const button = document.getElementById('theme-button');
  const saved = loadTheme();
  if (saved) document.documentElement.dataset.theme = saved;

  function isDark() {
    const theme = document.documentElement.dataset.theme;
    if (theme) return theme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function updateButton() {
    button.textContent = isDark() ? '☀️' : '🌙';
    button.setAttribute('aria-label', isDark() ? '라이트 모드로 전환' : '다크 모드로 전환');
  }
  button.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    saveTheme(next);
    updateButton();
  });
  updateButton();
}
