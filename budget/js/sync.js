// ☁️ 같이 쓰기 (동기화): 가계부를 비공개 GitHub Gist에 잠가서 올리고, 여러 기기·두 사람이 같은 가계부를 씀
//
// - "우리집 비밀번호"로 잠근 뒤 올려서, Gist 링크를 알아도 비밀번호 없이는 내용을 못 봄 (allowance-lock.js)
// - 처음 한 기기에서 "처음 만들기" → 연결 코드(Gist id)가 생김
//   다른 기기에서는 같은 GitHub 토큰·연결 코드·우리집 비밀번호로 "연결하기"
// - 고칠 때마다 2초 뒤 올리고, 앱을 열거나 다시 볼 때 다른 기기에서 바뀐 게 있으면 받아 옴
// - 양쪽에서 동시에 고쳤으면 어느 쪽을 남길지 물어봄
// 기기마다 저장하는 설정(토큰·연결 코드·열쇠)은 store.js의 loadSync·saveSync

import { loadSync, saveSync, clearSync, normalizeData } from './store.js';
import { createGist, readGist, writeGist } from './gist.js';
import { canLock, newLock, lockText, openBox, unlockBox, exportLock, importLock } from './allowance-lock.js';

const PUSH_DELAY = 2000; // 고친 뒤 이만큼 기다렸다 올림 (칠 때마다 올리지 않게)
const MIN_PASSWORD = 4;
const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=%EC%9A%B0%EB%A6%AC%EC%A7%91%20%EA%B0%80%EA%B3%84%EB%B6%80';

const box = document.getElementById('sync-box');
const statusText = document.getElementById('sync-status');

let state = null;
let replaceData = null; // app.js: 받아 온 데이터로 통째로 바꾸고 화면을 다시 그림
let sync = loadSync(); // 연결 안 했으면 null
let lock = null; // 잠그고 푸는 열쇠 (sync.lock에서 되살림)
let timer = null;
let busy = false;
let message = ''; // 설정 창 안내 (예: "비밀번호가 달라요")

export async function setupSync(appState, onReplace) {
  state = appState;
  replaceData = onReplace;
  box.addEventListener('click', handleClick);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pull();
  });
  renderSyncBox();
  if (sync && canLock()) {
    lock = await importLock(sync.lock);
    pull();
  }
}

// app.js의 save()가 부름: 바뀐 게 있으니 잠시 뒤 올림
export function markChanged() {
  if (!sync) return;
  sync.dirty = true;
  saveSync(sync);
  showStatus('☁️ 올릴 준비 중…');
  clearTimeout(timer);
  timer = setTimeout(push, PUSH_DELAY);
}

/* ── 올리기·받기 ── */

// 올릴 글: 바깥은 저장 시각만 보이고, 가계부는 잠긴 상자 안에
async function pack(savedAt) {
  const sealed = await lockText(lock, JSON.stringify(state.data));
  return JSON.stringify({ app: '우리집 가계부', savedAt, box: sealed });
}

// Gist에서 받아 풀기 → { savedAt, data }
async function readRemote() {
  const outer = JSON.parse(await readGist(sync.token, sync.gistId));
  const text = await openBox(outer.box, lock);
  return { savedAt: outer.savedAt, data: JSON.parse(text) };
}

async function push() {
  if (!sync || !lock || !sync.dirty) return;
  if (busy) {
    timer = setTimeout(push, PUSH_DELAY);
    return;
  }
  busy = true;
  try {
    const remote = await readRemote();
    // 마지막으로 받은 뒤 다른 기기에서 올린 게 있으면 그냥 덮어쓰지 않고 물어봄
    if (remote.savedAt > sync.remoteSavedAt) {
      await resolveConflict(remote);
      return;
    }
    await upload();
  } catch (error) {
    showStatus(`☁️ 올리지 못했어요: ${error.message}`);
  } finally {
    busy = false;
  }
}

async function upload() {
  const savedAt = Date.now();
  await writeGist(sync.token, sync.gistId, await pack(savedAt));
  sync.remoteSavedAt = savedAt;
  sync.dirty = false;
  saveSync(sync);
  showStatus(`☁️ 올림 ${timeText(savedAt)}`);
}

// 앱을 열 때·다시 볼 때: 다른 기기에서 바뀐 게 있으면 받아 옴
async function pull() {
  if (!sync || !lock || busy) return;
  busy = true;
  try {
    const remote = await readRemote();
    if (remote.savedAt > sync.remoteSavedAt) {
      if (sync.dirty) await resolveConflict(remote);
      else apply(remote);
    } else if (sync.dirty) {
      await upload(); // 지난번에 못 올린 것
    } else {
      showStatus(`☁️ 최신이에요 (${timeText(Date.now())} 확인)`);
    }
  } catch (error) {
    showStatus(`☁️ 받아 오지 못했어요: ${error.message}`);
  } finally {
    busy = false;
  }
}

function apply(remote) {
  clearTimeout(timer);
  sync.remoteSavedAt = remote.savedAt;
  sync.dirty = false;
  saveSync(sync);
  replaceData(normalizeData(remote.data));
  showStatus(`☁️ 다른 기기에서 바뀐 내용을 받았어요 (${timeText(remote.savedAt)})`);
}

async function resolveConflict(remote) {
  // 고치던 칸의 변경(이력)을 먼저 마무리 (물어보는 창이 뜨면서 늦게 남으면 받아 온 데이터에 섞임)
  if (document.activeElement) document.activeElement.blur();
  const takeRemote = window.confirm(
    `다른 기기에서 ${timeText(remote.savedAt)}에 가계부를 고쳤는데, 이 기기에도 아직 안 올린 변경이 있어요.\n\n`
    + '확인: 다른 기기 내용 받기 (이 기기에서 고친 건 사라져요)\n취소: 이 기기 내용으로 올리기 (다른 기기에서 고친 건 사라져요)',
  );
  if (takeRemote) {
    apply(remote);
  } else {
    sync.remoteSavedAt = remote.savedAt;
    await upload();
  }
}

/* ── 설정 창: 연결하기·처음 만들기·연결 끊기 ── */

function renderSyncBox() {
  if (!canLock()) {
    box.replaceChildren(paragraph('이 주소(https나 localhost가 아님)에서는 동기화를 쓸 수 없어요.', 'hint'));
    return;
  }
  if (sync) {
    renderConnected();
    return;
  }
  const token = field('GitHub 토큰 (gist 권한)', 'sync-token', 'password', 'ghp_…');
  const password = field(`우리집 비밀번호 (${MIN_PASSWORD}자 이상, 두 사람이 같이 씀)`, 'sync-password', 'password', '');
  const code = field('연결 코드 (다른 기기에서 이미 만들었으면)', 'sync-code', 'text', '처음이면 비워 두기');

  const buttons = document.createElement('div');
  buttons.className = 'row';
  buttons.append(button('처음 만들기', 'create', true), button('연결하기', 'connect'));

  const link = document.createElement('a');
  link.href = TOKEN_URL;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'GitHub 토큰 만들기 (gist만 체크)';

  const help = paragraph('', 'hint');
  help.append(
    link,
    ' · 처음 한 기기에서 "처음 만들기"를 누르면 연결 코드가 생겨요. '
    + '다른 기기·다른 사람은 같은 토큰, 연결 코드, 우리집 비밀번호를 넣고 "연결하기"를 눌러요.',
  );
  box.replaceChildren(token, password, code, buttons, paragraph(message, 'sync-message'), help);
}

function renderConnected() {
  const info = paragraph('', 'sync-connected');
  const code = document.createElement('code');
  code.textContent = sync.gistId;
  info.append('연결됨 · 연결 코드 ', code);

  const buttons = document.createElement('div');
  buttons.className = 'row';
  buttons.append(button('코드 복사', 'copy'), button('지금 동기화', 'now', true), button('연결 끊기', 'disconnect'));
  box.replaceChildren(
    info,
    buttons,
    paragraph(message, 'sync-message'),
    paragraph('다른 기기·다른 사람은 같은 GitHub 토큰, 이 연결 코드, 우리집 비밀번호로 "연결하기"를 누르면 돼요. '
      + '연결을 끊어도 이 기기의 가계부는 그대로 남아요.', 'hint'),
  );
}

function field(labelText, id, type, placeholder) {
  const label = document.createElement('label');
  label.className = 'settings-field';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.className = 'text-input';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  label.append(text, input);
  return label;
}

function button(text, action, primary) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = primary ? 'button button-primary' : 'button';
  element.dataset.action = action;
  element.textContent = text;
  return element;
}

function paragraph(text, className) {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  return p;
}

// 안내 글만 바꿈 (다시 그리면 적어 둔 토큰·비밀번호가 지워지므로)
function setMessage(text) {
  message = text;
  const element = box.querySelector('.sync-message');
  if (element) element.textContent = text;
}

async function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  try {
    if (action === 'create') await create();
    if (action === 'connect') await connect();
    if (action === 'copy') await copyCode();
    if (action === 'now') {
      setMessage('');
      await pull();
    }
    if (action === 'disconnect') disconnect();
  } catch (error) {
    setMessage(error.message);
  }
}

function readInputs() {
  const token = document.getElementById('sync-token').value.trim();
  const password = document.getElementById('sync-password').value;
  const code = document.getElementById('sync-code').value.trim();
  if (!token) throw new Error('GitHub 토큰을 넣어 주세요.');
  if (password.length < MIN_PASSWORD) throw new Error(`우리집 비밀번호는 ${MIN_PASSWORD}자 이상이에요.`);
  return { token, password, code };
}

// 이 기기의 가계부로 새 Gist를 만듦
async function create() {
  const { token, password, code } = readInputs();
  if (code) throw new Error('연결 코드가 있으면 "연결하기"를 눌러 주세요.');
  setMessage('만드는 중…');
  lock = await newLock(password, true);
  const savedAt = Date.now();
  const gistId = await createGist(token, await pack(savedAt));
  sync = { token, gistId, lock: await exportLock(lock), remoteSavedAt: savedAt, dirty: false };
  saveSync(sync);
  message = '만들었어요. 다른 기기에서 이 연결 코드로 연결하세요.';
  renderSyncBox();
  showStatus(`☁️ 올림 ${timeText(savedAt)}`);
}

// 다른 기기에서 만든 Gist에 연결: 받아서 이 기기 가계부를 바꿈
async function connect() {
  const { token, password, code } = readInputs();
  if (!code) throw new Error('연결 코드를 넣어 주세요. 처음이면 "처음 만들기"를 눌러요.');
  setMessage('연결하는 중…');
  let outer;
  try {
    outer = JSON.parse(await readGist(token, code));
  } catch (error) {
    throw new Error(error instanceof SyntaxError ? '가계부 Gist가 아니에요.' : error.message);
  }
  let opened;
  try {
    opened = await unlockBox(outer.box, password, true);
  } catch (error) {
    throw new Error('우리집 비밀번호가 달라요.');
  }
  if (!window.confirm('이 기기의 가계부를 연결한 가계부 내용으로 바꿀까요? (이 기기에만 있던 내용은 사라져요)')) {
    setMessage('');
    return;
  }
  lock = opened.lock;
  sync = { token, gistId: code, lock: await exportLock(lock), remoteSavedAt: 0, dirty: false };
  message = '연결했어요.';
  apply({ savedAt: outer.savedAt, data: JSON.parse(opened.text) });
  renderSyncBox();
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(sync.gistId);
    setMessage('연결 코드를 복사했어요.');
  } catch (error) {
    setMessage(`복사하지 못했어요. 직접 적어 주세요: ${sync.gistId}`);
  }
}

function disconnect() {
  if (!window.confirm('이 기기의 동기화 연결을 끊을까요? (가계부 내용은 그대로 남고, Gist도 지워지지 않아요)')) return;
  clearTimeout(timer);
  clearSync();
  sync = null;
  lock = null;
  message = '연결을 끊었어요.';
  renderSyncBox();
  showStatus('');
}

/* ── 위쪽 상태 글 ── */

function showStatus(text) {
  statusText.textContent = text;
}

function timeText(ms) {
  const date = new Date(ms);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}
