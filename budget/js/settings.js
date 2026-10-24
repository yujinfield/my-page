// 설정 창 (오른쪽 위 ⚙️): 두 사람 이름, 사람마다 결제 수단 목록
// 고치는 동안 바로 저장하고, 창을 닫으면 화면을 다시 그려서 표 머리줄·결제 수단 칸에 반영합니다.

import { normalizePaymentList } from './store.js';

const dialog = document.getElementById('settings-dialog');
const openButton = document.getElementById('settings-button');
const closeButton = document.getElementById('settings-close');
const nameInputs = { a: document.getElementById('name-a'), b: document.getElementById('name-b') };
const paymentInputs = { a: document.getElementById('payments-a'), b: document.getElementById('payments-b') };
const paymentLabels = { a: document.getElementById('payments-a-label'), b: document.getElementById('payments-b-label') };

const DEFAULT_NAMES = { a: '유진', b: '남편' };

let state = null;

export function setupSettings(appState, save, render) {
  state = appState;

  openButton.addEventListener('click', () => {
    fillSettings();
    dialog.showModal();
  });
  closeButton.addEventListener('click', () => dialog.close());
  // 창 바깥(어두운 부분)을 눌러도 닫힘
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Esc·✕·바깥 클릭 어떤 방법으로 닫아도 여기로 옴
  dialog.addEventListener('close', () => {
    fillSettings(); // "신한카드,,현금" 처럼 적은 것을 다듬어서 다시 보여 줌
    render();
    openButton.focus();
  });

  for (const key of ['a', 'b']) {
    nameInputs[key].addEventListener('input', () => {
      state.data.names[key] = nameInputs[key].value.trim() || DEFAULT_NAMES[key];
      paymentLabels[key].textContent = `${state.data.names[key]} 결제 수단`;
      save();
    });
    paymentInputs[key].addEventListener('input', () => {
      state.data.payments[key] = normalizePaymentList(paymentInputs[key].value.split(','));
      save();
    });
  }
}

// 지금 데이터로 입력칸 채우기 (백업을 불러온 뒤에도 부름)
export function fillSettings() {
  for (const key of ['a', 'b']) {
    nameInputs[key].value = state.data.names[key];
    paymentInputs[key].value = state.data.payments[key].join(', ');
    paymentLabels[key].textContent = `${state.data.names[key]} 결제 수단`;
  }
}
