// 🔄 작성일 기준 확인 화면
// 바뀌는 정보 칸 아래의 확인 체크, 공통·상세 단계 아래의 확인 현황을 그립니다.

import { verifyKey, isVerified, setVerified, getVerifyStatus, formatDate } from './verify.js';

function verifyLabelText(draft) {
  return `${formatDate(draft.common.checkedDate)} 기준으로 다시 확인했어요`;
}

// 바뀌는 정보 칸 아래에 붙는 확인 체크
export function createVerifyBox(draft, scope, field, onChange) {
  const key = verifyKey(scope, field.key);
  const label = document.createElement('label');
  label.className = 'verify-check';

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'verify-input';
  box.dataset.key = key;
  box.checked = isVerified(draft, key);
  box.addEventListener('change', () => {
    setVerified(draft, key, box.checked);
    onChange({});
  });

  const text = document.createElement('span');
  text.className = 'verify-text';
  text.textContent = verifyLabelText(draft);

  label.append(box, text);
  return label;
}

// 작성일이 바뀌면 모든 확인 체크와 문구를 다시 맞춥니다.
export function updateVerifyBoxes(draft) {
  document.querySelectorAll('.verify-input').forEach((box) => {
    box.checked = isVerified(draft, box.dataset.key);
  });
  document.querySelectorAll('.verify-text').forEach((text) => {
    text.textContent = verifyLabelText(draft);
  });
}

// 공통·상세 단계 아래에 보이는 확인 현황
export function updateVerifySummary(draft) {
  const status = getVerifyStatus(draft);
  const title = document.getElementById('verify-summary-title');
  const list = document.getElementById('verify-summary-list');
  const box = document.getElementById('verify-summary');
  list.replaceChildren();

  if (status.total === 0) {
    box.classList.remove('is-done');
    title.textContent = '🔄 아직 입력한 바뀌는 정보(가격·조건)가 없어요.';
    return;
  }

  const date = formatDate(draft.common.checkedDate);
  title.textContent = `🔄 ${date} 기준 확인 ${status.verifiedCount} / ${status.total}`;
  box.classList.toggle('is-done', status.unverified.length === 0);
  if (status.unverified.length === 0) {
    title.textContent += ' — 모두 확인했어요';
    return;
  }

  title.textContent += ' — 아직 확인 안 한 항목:';
  status.unverified.forEach((label) => {
    const item = document.createElement('li');
    item.textContent = label;
    list.append(item);
  });
}
