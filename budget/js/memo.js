// 📝 메모: 오른쪽 위 버튼 → 메모 창. 쓰고 Enter를 누르면 날짜와 함께 포스트잇이 하나씩 쌓입니다.

import { newMemo } from './store.js';
import { deleteButton } from './cells.js';

const dialog = document.getElementById('memo-dialog');
const openButton = document.getElementById('memo-button');
const closeButton = document.getElementById('memo-close');
const input = document.getElementById('memo-input');
const list = document.getElementById('memo-list');

let state = null;
let save = null;

export function setupMemo(appState, onSave) {
  state = appState;
  save = onSave;

  openButton.addEventListener('click', () => {
    renderMemos();
    dialog.showModal();
    input.focus();
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // 창 바깥을 눌러도 닫힘
  });
  dialog.addEventListener('close', () => openButton.focus());

  // Enter: 붙이기, Shift+Enter: 줄 바꿈. 한글을 조합하는 중(isComposing)의 Enter는 무시
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    addMemo();
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="delete"]');
    if (!button) return;
    const id = button.closest('.memo-note').dataset.id;
    state.data.memos = state.data.memos.filter((memo) => memo.id !== id);
    save();
    renderMemos();
    input.focus();
  });
}

function addMemo() {
  const text = input.value.trim();
  if (!text) return;
  state.data.memos.push(newMemo(text));
  save();
  input.value = '';
  renderMemos();
}

// "2026.10.25 14:03"
function formatTime(time) {
  const date = new Date(time);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 새로 쓴 게 맨 앞
function renderMemos() {
  const notes = state.data.memos.slice().reverse().map((memo) => {
    const note = document.createElement('li');
    note.className = 'memo-note';
    note.dataset.id = memo.id;
    const text = document.createElement('p');
    text.className = 'memo-text';
    text.textContent = memo.text;
    const time = document.createElement('time');
    time.className = 'memo-time';
    time.textContent = formatTime(memo.time);
    note.append(deleteButton('메모 지우기'), text, time);
    return note;
  });
  if (notes.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'hint memo-empty';
    empty.textContent = '아직 메모가 없어요. 위에 쓰고 Enter를 눌러 보세요.';
    notes.push(empty);
  }
  list.replaceChildren(...notes);
}
