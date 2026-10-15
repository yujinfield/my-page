// 오른쪽 위 ⚙️ 설정 창
// 오래된 Safari에서도 되도록 <dialog> 대신 직접 만든 창을 씁니다.
// 키보드: 열면 창 안으로 포커스, Tab은 창 안에서만 돌고, Esc로 닫으면 연 버튼으로 포커스가 돌아가요.

let lastFocused = null;

function dialog() {
  return document.getElementById('settings-dialog');
}

function focusableElements() {
  const selector = 'button, input, select, textarea, a[href], summary, [tabindex]:not([tabindex="-1"])';
  return [...dialog().querySelectorAll(selector)]
    .filter((item) => !item.disabled && item.offsetParent !== null);
}

export function isSettingsOpen() {
  return !dialog().hidden;
}

// focusId: 열자마자 포커스를 줄 칸 (없으면 닫기 버튼)
export function openSettings(focusId) {
  if (!isSettingsOpen()) {
    lastFocused = document.activeElement;
    dialog().hidden = false;
    document.body.classList.add('modal-open');
  }
  const target = (focusId && document.getElementById(focusId)) || document.getElementById('settings-close');
  target.focus();
}

export function closeSettings() {
  if (!isSettingsOpen()) return;
  dialog().hidden = true;
  document.body.classList.remove('modal-open');
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  lastFocused = null;
}

function keepFocusInside(event) {
  const items = focusableElements();
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function initSettingsDialog() {
  document.getElementById('settings-button').addEventListener('click', () => openSettings());
  document.getElementById('settings-close').addEventListener('click', closeSettings);

  // 창 바깥(어두운 부분)을 누르면 닫기
  dialog().addEventListener('click', (event) => {
    if (event.target === dialog()) closeSettings();
  });

  document.addEventListener('keydown', (event) => {
    if (!isSettingsOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSettings();
    } else if (event.key === 'Tab') {
      keepFocusInside(event);
    }
  });
}
