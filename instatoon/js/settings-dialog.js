// 오른쪽 위 ⚙️ 설정 창 (여닫기는 modal.js)

import { openModal, setupModal } from './modal.js';

const DIALOG_ID = 'settings-dialog';

// focusId: 열자마자 포커스를 줄 칸 (없으면 닫기 버튼)
export function openSettings(focusId) {
  openModal(DIALOG_ID, focusId);
}

export function initSettingsDialog() {
  setupModal(DIALOG_ID, 'settings-button');
}
