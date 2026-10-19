// API 키 화면: 새 키 넣기 / 잠김 / 사용 중
// 풀린 키는 메모리(apiKey 변수)에만 있고, 새로고침하거나 30분 동안 안 쓰면 사라집니다.
// 키·비밀번호는 어디에도 기록하거나 화면에 다 보여 주지 않습니다.

import { canEncrypt, lockKey, unlockKey, maskKey } from './key-vault.js';
import { loadLockedKey, saveLockedKey, clearLockedKey } from './store.js';

const AUTO_LOCK_MS = 30 * 60 * 1000;

let apiKey = '';
let autoLockTimer = null;
const el = {};

function show(state) {
  el.newBox.hidden = state !== 'new';
  el.lockedBox.hidden = state !== 'locked';
  el.readyBox.hidden = state !== 'ready';
}

function setStatus(text) {
  el.status.textContent = text;
}

function refresh() {
  if (apiKey) {
    el.masked.textContent = maskKey(apiKey);
    show('ready');
  } else if (loadLockedKey()) {
    show('locked');
  } else {
    show('new');
  }
}

function lockNow(message) {
  apiKey = '';
  clearTimeout(autoLockTimer);
  refresh();
  setStatus(message);
}

// 키를 쓸 때마다 30분 타이머를 다시 시작
function restartAutoLock() {
  clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(() => lockNow('30분 동안 쓰지 않아서 키를 잠갔어요.'), AUTO_LOCK_MS);
}

function useKey(key) {
  apiKey = key;
  restartAutoLock();
  refresh();
}

async function saveLocked() {
  const key = el.keyInput.value.trim();
  const passphrase = el.passInput.value;
  if (!key.startsWith('sk-')) return setStatus('API 키는 sk-로 시작해요.');
  if (passphrase.length < 4) return setStatus('잠금 비밀번호를 4글자 이상 넣어 주세요.');
  if (!canEncrypt()) return setStatus('이 주소에서는 암호화를 쓸 수 없어요. "이번만 쓰기"를 쓰거나 https·localhost로 열어 주세요.');
  saveLockedKey(await lockKey(key, passphrase));
  el.keyInput.value = '';
  el.passInput.value = '';
  useKey(key);
  setStatus('키를 잠가서 이 기기에 저장했어요.');
}

function useOnce() {
  const key = el.keyInput.value.trim();
  if (!key.startsWith('sk-')) return setStatus('API 키는 sk-로 시작해요.');
  el.keyInput.value = '';
  el.passInput.value = '';
  useKey(key);
  setStatus('이 창에서만 키를 써요. 새로고침하면 사라져요.');
}

async function unlock() {
  if (!canEncrypt()) return setStatus('이 주소에서는 잠금을 풀 수 없어요. https·localhost로 열어 주세요.');
  const key = await unlockKey(loadLockedKey(), el.unlockInput.value);
  el.unlockInput.value = '';
  if (!key) return setStatus('비밀번호가 맞지 않아요.');
  useKey(key);
  setStatus('잠금을 풀었어요.');
}

function forget() {
  if (!window.confirm('저장된 API 키를 지울까요? 다시 쓰려면 키를 새로 넣어야 해요.')) return;
  clearLockedKey();
  lockNow('저장된 키를 지웠어요.');
}

export function setupKeyPanel() {
  el.newBox = document.getElementById('key-new');
  el.lockedBox = document.getElementById('key-locked');
  el.readyBox = document.getElementById('key-ready');
  el.keyInput = document.getElementById('key-input');
  el.passInput = document.getElementById('key-pass');
  el.unlockInput = document.getElementById('unlock-pass');
  el.masked = document.getElementById('key-masked');
  el.status = document.getElementById('key-status');

  document.getElementById('key-save-button').addEventListener('click', saveLocked);
  document.getElementById('key-once-button').addEventListener('click', useOnce);
  document.getElementById('unlock-button').addEventListener('click', unlock);
  document.getElementById('forget-button').addEventListener('click', forget);
  document.getElementById('lock-button').addEventListener('click', () => lockNow('키를 잠갔어요.'));
  el.unlockInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') unlock();
  });
  refresh();
}

// 다시 그리기 직전에 부름. 키가 없으면 안내하고 빈 문자열
export function getApiKey() {
  if (!apiKey) {
    setStatus('먼저 API 키를 넣거나 잠금을 풀어 주세요.');
    const input = loadLockedKey() ? el.unlockInput : el.keyInput;
    input.focus();
    return '';
  }
  restartAutoLock();
  return apiKey;
}
