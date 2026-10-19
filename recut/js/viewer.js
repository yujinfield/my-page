// 크게 보기 창: 컷 그림을 크게 보고, 이전·다음 컷으로 넘기고, 원본 ↔ 다시 그린 그림을 바꾸고, 저장
// 창을 연 버튼으로 포커스를 돌려주고, Esc·바깥 클릭으로 닫히며, Tab은 창 안에서만 돕니다.

import { cutLabel } from './grid.js';
import { downloadUrl } from './crop.js';

const KIND_LABELS = { original: '원본 (4:5)', redraw: '다시 그린 그림' };

const el = {};
let options = null;      // { getCount(), hasRedraw(index), getImage(index, kind) → Promise<{ url, fileName } | null> }
let current = { index: 0, kind: 'original' };
let shown = null;        // 지금 보이는 { url, fileName }
let opener = null;       // 창을 연 버튼 (닫으면 여기로 포커스)

function focusableElements() {
  return [...el.dialog.querySelectorAll('button')].filter((button) => !button.hidden && !button.disabled);
}

async function show(index, kind) {
  const image = await options.getImage(index, kind);
  if (!image) return false;
  current = { index, kind };
  shown = image;
  el.image.src = image.url;
  el.image.alt = `${cutLabel(index)}컷 ${KIND_LABELS[kind]}`;
  el.title.textContent = `${cutLabel(index)}컷 · ${KIND_LABELS[kind]}`;
  el.prev.disabled = index === 0;
  el.next.disabled = index === options.getCount() - 1;
  el.original.setAttribute('aria-pressed', String(kind === 'original'));
  el.redraw.setAttribute('aria-pressed', String(kind === 'redraw'));
  el.redraw.disabled = !options.hasRedraw(index);
  return true;
}

// 이전·다음 컷: 다시 그린 그림을 보고 있었는데 그 컷에 없으면 원본으로
async function move(step) {
  const index = current.index + step;
  if (index < 0 || index >= options.getCount()) return;
  if (!(await show(index, current.kind))) await show(index, 'original');
}

export function closeViewer() {
  if (el.modal.hidden) return;
  el.modal.hidden = true;
  document.body.classList.remove('is-modal-open');
  if (opener) opener.focus();
}

export async function openViewer(index, kind, openerButton) {
  if (!(await show(index, kind))) return;
  opener = openerButton || null;
  el.modal.hidden = false;
  document.body.classList.add('is-modal-open');
  el.close.focus();
}

function handleKeydown(event) {
  if (el.modal.hidden) return;
  if (event.key === 'Escape') closeViewer();
  if (event.key === 'ArrowLeft') move(-1);
  if (event.key === 'ArrowRight') move(1);
  if (event.key === 'Tab') {
    const items = focusableElements();
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
}

export function setupViewer(viewerOptions) {
  options = viewerOptions;
  el.modal = document.getElementById('viewer');
  el.dialog = el.modal.querySelector('.viewer-dialog');
  el.title = document.getElementById('viewer-title');
  el.image = document.getElementById('viewer-image');
  el.prev = document.getElementById('viewer-prev');
  el.next = document.getElementById('viewer-next');
  el.original = document.getElementById('viewer-original');
  el.redraw = document.getElementById('viewer-redraw');
  el.save = document.getElementById('viewer-save');
  el.close = document.getElementById('viewer-close');

  el.prev.addEventListener('click', () => move(-1));
  el.next.addEventListener('click', () => move(1));
  el.original.addEventListener('click', () => show(current.index, 'original'));
  el.redraw.addEventListener('click', () => show(current.index, 'redraw'));
  el.save.addEventListener('click', () => {
    if (shown) downloadUrl(shown.url, shown.fileName);
  });
  el.close.addEventListener('click', closeViewer);
  // 어두운 바깥을 누르면 닫기
  el.modal.addEventListener('click', (event) => {
    if (event.target === el.modal) closeViewer();
  });
  document.addEventListener('keydown', handleKeydown);
}
