// 오른쪽 위 📜 기록 창: 작업 기록 보기, 콘티 되돌리기, 내려받기, 지우기

import { getLogs, findSnapshot, clearLogs, onHistoryChange, formatTime, addLog } from './history.js';
import { setupModal, closeModal } from './modal.js';

const DIALOG_ID = 'history-dialog';

let options = {
  onRestore: null, // (snapshot) => 콘티를 그 시점으로 되돌림
};

function element(id) {
  return document.getElementById(id);
}

function render() {
  const logs = getLogs();
  element('history-empty').hidden = logs.length > 0;

  const items = logs.map((entry) => {
    const item = document.createElement('li');
    item.className = 'history-item';

    const time = document.createElement('span');
    time.className = 'history-time';
    time.textContent = formatTime(entry.time);

    const text = document.createElement('span');
    text.className = 'history-text';
    const action = document.createElement('strong');
    action.textContent = entry.action;
    text.append(action);
    if (entry.detail) text.append(` · ${entry.detail}`);

    item.append(time, text);

    if (entry.snapshot) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button-small';
      button.textContent = '이 콘티로 되돌리기';
      button.setAttribute('aria-label', `${formatTime(entry.time)} ${entry.action} 시점으로 되돌리기`);
      button.addEventListener('click', () => restore(entry));
      item.append(button);
    }
    return item;
  });
  element('history-list').replaceChildren(...items);
}

function restore(entry) {
  const snapshot = findSnapshot(entry.id);
  if (!snapshot) return;
  if (!confirm(`${formatTime(entry.time)} "${entry.action}" 시점의 콘티(${snapshot.cuts.length}컷)로 되돌릴까요?`)) return;
  options.onRestore(snapshot);
  addLog('되돌리기', `${formatTime(entry.time)} ${entry.action} (${snapshot.cuts.length}컷)`, snapshot);
  closeModal(DIALOG_ID);
}

// 기록을 .json 파일로 내려받기
function download() {
  const blob = new Blob([JSON.stringify(getLogs(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `kkomjwi-history-${today}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initHistoryPanel(newOptions) {
  options = newOptions;
  setupModal(DIALOG_ID, 'history-button', render);
  element('history-download').addEventListener('click', download);
  element('history-clear').addEventListener('click', () => {
    if (!confirm('작업 기록과 되돌리기용 콘티를 모두 지울까요?')) return;
    clearLogs();
  });
  onHistoryChange(() => {
    if (!element(DIALOG_ID).hidden) render();
  });
}
