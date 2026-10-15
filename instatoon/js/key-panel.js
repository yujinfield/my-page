// OpenAI API 키 관리 화면 (그림 생성 카드 안)
//
// 상태 3가지
//  - 새 키: 키 + 잠금 비밀번호를 넣고 "잠가서 저장" 또는 "이번만 쓰기"
//  - 잠김: 이 기기에 암호문만 있음 → 잠금 비밀번호로 해제
//  - 사용 중: 키가 이 화면의 메모리에만 있음 (새로고침·30분 미사용이면 다시 잠김)
//
// 원래 키는 localStorage에 절대 평문으로 저장하지 않습니다.

import { canEncrypt, lockKey, unlockKey, maskKey } from './key-vault.js';
import {
  loadLockedKey, saveLockedKey, clearLockedKey, loadImageSettings, saveImageSettings,
} from './store.js';

const AUTO_LOCK_MS = 30 * 60 * 1000; // 30분 동안 안 쓰면 자동으로 잠금
const MIN_PASSPHRASE = 4;

let activeKey = '';     // 지금 쓰는 키 (메모리에만)
let autoLockTimer = null;

function element(id) {
  return document.getElementById(id);
}

function setStatus(message) {
  element('key-status').textContent = message;
}

function hasLockedKey() {
  return loadLockedKey() !== null;
}

// 상태에 맞는 칸만 보이기
function render() {
  const locked = hasLockedKey();
  element('key-new').hidden = activeKey !== '' || locked;
  element('key-locked').hidden = activeKey !== '' || !locked;
  element('key-active').hidden = activeKey === '';

  if (activeKey !== '') {
    element('key-active-text').textContent = `🔓 키 사용 중: ${maskKey(activeKey)}`;
    element('key-active-note').textContent = locked
      ? '이 기기에 잠가서 저장돼 있어요. 새로고침하거나 30분 동안 안 쓰면 다시 잠겨요.'
      : '저장하지 않았어요. 이 창을 닫거나 새로고침하면 지워져요.';
    element('key-delete').hidden = !locked;
  }

  // 그림 생성 카드에 보이는 한 줄 요약
  let summary = 'API 키가 없어요. ⚙️ 설정에서 넣어 주세요.';
  if (activeKey !== '') summary = `🔓 키 사용 중 (${maskKey(activeKey)})`;
  else if (locked) summary = '🔒 키가 잠겨 있어요. ⚙️ 설정에서 열어 주세요.';
  element('image-key-summary').textContent = summary;
}

function forgetActiveKey() {
  activeKey = '';
  clearTimeout(autoLockTimer);
}

// 키를 쓸 때마다 자동 잠금 시간을 다시 셈
function touch() {
  clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(() => {
    forgetActiveKey();
    render();
    setStatus('30분 동안 쓰지 않아서 키를 잠갔어요.');
  }, AUTO_LOCK_MS);
}

function useKey(apiKey) {
  activeKey = apiKey;
  touch();
  render();
}

function readNewKey() {
  const apiKey = element('key-input').value.trim();
  if (apiKey === '') {
    element('key-input').focus();
    setStatus('API 키를 넣어 주세요.');
    return '';
  }
  return apiKey;
}

function clearInputs() {
  element('key-input').value = '';
  element('key-pass').value = '';
  element('key-unlock-pass').value = '';
}

async function saveLocked() {
  const apiKey = readNewKey();
  if (apiKey === '') return;
  const passphrase = element('key-pass').value;
  if (passphrase.length < MIN_PASSPHRASE) {
    element('key-pass').focus();
    setStatus(`잠금 비밀번호를 ${MIN_PASSPHRASE}자 이상 정해 주세요.`);
    return;
  }
  if (!canEncrypt()) {
    setStatus('이 브라우저에서는 암호화를 쓸 수 없어요. "이번만 쓰기"를 눌러 주세요.');
    return;
  }

  setStatus('잠그는 중…');
  const record = await lockKey(apiKey, passphrase);
  if (!saveLockedKey(record)) {
    setStatus('브라우저 저장 공간에 저장하지 못했어요. "이번만 쓰기"를 눌러 주세요.');
    return;
  }
  clearInputs();
  useKey(apiKey);
  setStatus('키를 잠가서 이 기기에 저장했어요. 다음부터는 잠금 비밀번호만 넣으면 돼요.');
}

function useOnce() {
  const apiKey = readNewKey();
  if (apiKey === '') return;
  clearInputs();
  useKey(apiKey);
  setStatus('이번 창에서만 키를 써요. 저장하지 않았어요.');
}

async function unlock() {
  const passphrase = element('key-unlock-pass').value;
  if (passphrase === '') {
    element('key-unlock-pass').focus();
    setStatus('잠금 비밀번호를 넣어 주세요.');
    return;
  }
  setStatus('여는 중…');
  const apiKey = await unlockKey(loadLockedKey(), passphrase);
  if (apiKey === null) {
    element('key-unlock-pass').select();
    setStatus('잠금 비밀번호가 맞지 않아요.');
    return;
  }
  clearInputs();
  useKey(apiKey);
  setStatus('키를 열었어요.');
}

function lockNow() {
  forgetActiveKey();
  render();
  setStatus(hasLockedKey() ? '키를 잠갔어요.' : '키를 지웠어요. (저장하지 않은 키였어요)');
}

function deleteKey() {
  if (!confirm('이 기기에 저장된 API 키를 지울까요?')) return;
  clearLockedKey();
  forgetActiveKey();
  clearInputs();
  render();
  setStatus('저장된 키를 지웠어요.');
}

// Enter 키로도 버튼을 누를 수 있게
function onEnter(inputId, action) {
  element(inputId).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      action();
    }
  });
}

// 예전 버전이 설정에 평문으로 저장한 키를 지우고, 이번 창에서만 쓰게 옮김
function migratePlainKey() {
  const saved = loadImageSettings();
  if (!saved || typeof saved.apiKey !== 'string') return;
  const legacyKey = saved.apiKey.trim();
  delete saved.apiKey;
  saveImageSettings(saved);
  if (legacyKey !== '') {
    useKey(legacyKey);
    setStatus('보안을 강화했어요. 예전에 그냥 저장돼 있던 키를 지웠어요. 이번 창에서는 그대로 쓸 수 있고, 계속 저장하려면 "잠그기"를 누른 뒤 키와 잠금 비밀번호를 다시 넣어 주세요.');
  }
}

// ---------- 다른 파일에서 쓰는 함수 ----------

// 지금 쓸 수 있는 키 ('' 이면 없음)
export function getApiKey() {
  if (activeKey !== '') touch();
  return activeKey;
}

// 키가 없을 때: 안내 문구와 포커스할 칸 (설정 창 안의 칸)
export function promptForKey() {
  const message = hasLockedKey()
    ? '키가 잠겨 있어요. 잠금 비밀번호를 넣어 열어 주세요.'
    : '먼저 OpenAI API 키를 넣어 주세요.';
  setStatus(message);
  return { message, focusId: hasLockedKey() ? 'key-unlock-pass' : 'key-input' };
}

export function initKeyPanel() {
  element('key-save').addEventListener('click', saveLocked);
  element('key-once').addEventListener('click', useOnce);
  element('key-unlock').addEventListener('click', unlock);
  element('key-lock').addEventListener('click', lockNow);
  element('key-delete').addEventListener('click', deleteKey);
  element('key-delete-locked').addEventListener('click', deleteKey);
  onEnter('key-pass', saveLocked);
  onEnter('key-unlock-pass', unlock);

  if (!canEncrypt()) {
    element('key-save').disabled = true;
    element('key-pass').disabled = true;
  }

  migratePlainKey();
  render();
}
