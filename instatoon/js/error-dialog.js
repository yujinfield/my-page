// 오류 알림 창: 무엇이 문제인지, 어떻게 하면 되는지 한국어로 보여 줘요. (여닫기는 modal.js)

import { openModal, closeModal } from './modal.js';
import { openSettings } from './settings-dialog.js';

const DIALOG_ID = 'error-dialog';
let settingsFocus = '';

// error: errors.js의 makeError로 만든 오류 (그냥 Error여도 message를 보여 줌)
// title: 창 제목 (예: '콘티를 만들지 못했어요')
export function showError(error, title) {
  const problem = error.problem || error.message || '알 수 없는 문제가 생겼어요.';
  const fix = error.fix || '';
  const detail = error.detail || '';
  settingsFocus = error.settingsFocus || '';

  document.getElementById('error-title').textContent = `⚠️ ${title}`;
  document.getElementById('error-problem').textContent = problem;
  document.getElementById('error-fix').textContent = fix;
  document.getElementById('error-fix-box').hidden = fix === '';
  document.getElementById('error-detail').textContent = detail;
  document.getElementById('error-detail-box').hidden = detail === '';
  document.getElementById('error-settings').hidden = settingsFocus === '';
  openModal(DIALOG_ID, 'error-ok');
}

export function initErrorDialog() {
  const dialog = document.getElementById(DIALOG_ID);
  dialog.querySelector('.modal-close').addEventListener('click', () => closeModal(DIALOG_ID));
  document.getElementById('error-ok').addEventListener('click', () => closeModal(DIALOG_ID));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeModal(DIALOG_ID);
  });
  document.getElementById('error-settings').addEventListener('click', () => {
    closeModal(DIALOG_ID);
    openSettings(settingsFocus);
  });
}
