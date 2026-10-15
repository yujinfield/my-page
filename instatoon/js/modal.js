// 창(모달) 여닫기 공통 기능
// 오래된 Safari에서도 되도록 <dialog> 대신 직접 만든 창을 씁니다.
// 키보드: 열면 창 안으로 포커스, Tab은 창 안에서만 돌고, Esc로 닫으면 연 버튼으로 포커스가 돌아가요.

let openModalId = null;
let lastFocused = null;

function focusableElements(dialog) {
  const selector = 'button, input, select, textarea, a[href], summary, [tabindex]:not([tabindex="-1"])';
  return [...dialog.querySelectorAll(selector)]
    .filter((item) => !item.disabled && item.offsetParent !== null);
}

export function isModalOpen(id) {
  return openModalId === id;
}

// focusId: 열자마자 포커스를 줄 칸 (없으면 창의 닫기 버튼)
export function openModal(id, focusId) {
  if (openModalId && openModalId !== id) closeModal(openModalId);
  const dialog = document.getElementById(id);
  if (openModalId !== id) {
    lastFocused = document.activeElement;
    dialog.hidden = false;
    document.body.classList.add('modal-open');
    openModalId = id;
  }
  const target = (focusId && document.getElementById(focusId)) || dialog.querySelector('.modal-close');
  if (target) target.focus();
}

export function closeModal(id) {
  if (openModalId !== id) return;
  document.getElementById(id).hidden = true;
  document.body.classList.remove('modal-open');
  openModalId = null;
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  lastFocused = null;
}

function keepFocusInside(event, dialog) {
  const items = focusableElements(dialog);
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

// 창 하나 연결: 여는 버튼, 닫기 버튼(.modal-close), 바깥 클릭
export function setupModal(id, openButtonId, onOpen) {
  const dialog = document.getElementById(id);
  document.getElementById(openButtonId).addEventListener('click', () => {
    if (onOpen) onOpen();
    openModal(id);
  });
  dialog.querySelector('.modal-close').addEventListener('click', () => closeModal(id));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeModal(id);
  });
}

// Esc·Tab은 열려 있는 창 하나에만
document.addEventListener('keydown', (event) => {
  if (!openModalId) return;
  const dialog = document.getElementById(openModalId);
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal(openModalId);
  } else if (event.key === 'Tab') {
    keepFocusInside(event, dialog);
  }
});
