// 컷 편집의 "📋 Claude 답 붙여넣기"
// claude.ai에서 받은 답(맨 끝 JSON 포함)을 붙여 넣으면 컷·캡션·검토 메모를 채웁니다.

import { importContiText, describeAnalysis } from './conti-import.js';
import { addLog, makeSnapshot } from './history.js';

let options = {
  getForm: null,
  onCutsReplaced: null, // 컷 목록이 통째로 바뀐 뒤 (저장 + 다시 그리기)
};

function element(id) {
  return document.getElementById(id);
}

function applyPaste() {
  const { result, error } = importContiText(element('paste-input').value);
  if (error) {
    element('paste-status').textContent = error;
    return;
  }

  const form = options.getForm();
  if (form.cuts.length > 0 && !confirm(`지금 컷 ${form.cuts.length}개를 붙여 넣은 콘티로 바꿀까요? (지금 콘티는 📜 기록에서 되돌릴 수 있어요)`)) {
    return;
  }
  if (form.cuts.length > 0) addLog('바꾸기 전 콘티', `${form.cuts.length}컷`, makeSnapshot(form));

  form.cuts = result.cuts;
  form.caption = result.caption;
  form.review = result.review;
  options.onCutsReplaced();

  const summary = describeAnalysis(result.cuts);
  addLog('Claude 답 붙여넣기', summary, makeSnapshot(form));
  element('paste-input').value = '';
  element('paste-status').textContent = `컷 편집기에 넣었어요: ${summary}`;
  element('paste-box').open = false;
}

export function initPastePanel(newOptions) {
  options = newOptions;
  element('paste-apply').addEventListener('click', applyPaste);
}
