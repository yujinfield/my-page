// ⑥ 백업·이력: 백업 파일 내려받기·불러오기, 변경 이력 보기

import { normalizeData, looksLikeBackup } from './store.js';
import { addHistory } from './history.js';

const statusText = document.getElementById('backup-status');
const exportButton = document.getElementById('backup-export');
const importInput = document.getElementById('backup-import');
const importMessage = document.getElementById('backup-message');
const historyList = document.getElementById('history-list');
const clearButton = document.getElementById('history-clear');

const DAY = 24 * 60 * 60 * 1000;

let state = null;
let save = null;
let onReplace = null; // 데이터를 통째로 바꾼 뒤 app.js가 화면을 새로 고침

export function setupBackup(appState, onSave, onDataReplaced) {
  state = appState;
  save = onSave;
  onReplace = onDataReplaced;
  exportButton.addEventListener('click', exportBackup);
  importInput.addEventListener('change', importBackup);
  clearButton.addEventListener('click', clearHistory);
}

export function renderBackup() {
  renderStatus();
  renderHistory();
}

// "2026.10.24 14:03"
function formatTime(time) {
  const date = new Date(time);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderStatus() {
  const last = state.data.lastBackupAt;
  if (last === null) {
    statusText.textContent = '아직 백업한 적이 없어요. 기록은 이 브라우저에만 있으니 가끔 백업 파일을 내려받아 두세요.';
    statusText.classList.add('bad');
    return;
  }
  const days = Math.floor((Date.now() - last) / DAY);
  statusText.textContent = `마지막 백업: ${formatTime(last)} (${days === 0 ? '오늘' : `${days}일 전`})`
    + (days >= 30 ? ' · 한 달이 지났어요. 새로 백업해 두세요.' : '');
  statusText.classList.toggle('bad', days >= 30);
}

function exportBackup() {
  state.data.lastBackupAt = Date.now();
  const text = JSON.stringify(state.data, null, 2);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = `budget-backup-${formatTime(Date.now()).slice(0, 10).replaceAll('.', '-')}.json`;
  document.body.append(link); // 일부 브라우저는 화면에 붙은 링크만 파일 이름을 지켜 줌
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);

  addHistory(state.data, '[백업] 백업 파일 내려받음');
  save();
  renderBackup();
}

function importBackup() {
  const file = importInput.files[0];
  importInput.value = ''; // 같은 파일을 다시 골라도 change가 일어나게
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    let saved = null;
    try {
      saved = JSON.parse(reader.result);
    } catch (error) {
      saved = null;
    }
    if (!looksLikeBackup(saved)) {
      importMessage.textContent = '가계부 백업 파일이 아니에요. 이 화면에서 내려받은 .json 파일을 골라 주세요.';
      return;
    }
    if (!window.confirm('지금 기록을 백업 파일 내용으로 바꿀까요? (지금 기록은 사라져요)')) return;

    state.data = normalizeData(saved);
    addHistory(state.data, `[백업] "${file.name}" 파일에서 불러옴`);
    save();
    importMessage.textContent = `"${file.name}"에서 불러왔어요.`;
    onReplace();
  });
  reader.readAsText(file);
}

function renderHistory() {
  const entries = state.data.history.slice().reverse(); // 최근 것부터
  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'hint';
    empty.textContent = '아직 이력이 없어요. 금액을 고치면 여기에 남아요.';
    historyList.replaceChildren(empty);
    return;
  }
  historyList.replaceChildren(...entries.map((entry) => {
    const item = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = formatTime(entry.time);
    const text = document.createElement('span');
    text.textContent = entry.text;
    item.append(time, text);
    return item;
  }));
}

function clearHistory() {
  if (!window.confirm('변경 이력을 모두 지울까요? (가계부 기록은 그대로예요)')) return;
  state.data.history = [];
  save();
  renderHistory();
}
