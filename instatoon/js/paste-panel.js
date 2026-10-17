// 컷 편집의 "📋 Claude 답 붙여넣기"
// claude.ai에서 받은 답(맨 끝 JSON 포함)을 붙여 넣으면 컷·캡션·검토 메모를 채웁니다.

import { importContiText, describeAnalysis, buildJsonOnlyRequest } from './conti-import.js';
import { editorValues, EDITOR_JSON_SHAPE } from './editor-format.js';
import { addLog, makeSnapshot } from './history.js';

let options = {
  getForm: null,
  copyText: null,
  onCutsReplaced: null, // 컷 목록이 통째로 바뀐 뒤 (저장 + 다시 그리기)
};

function element(id) {
  return document.getElementById(id);
}

function applyPaste() {
  const { result, error, notice, source } = importContiText(element('paste-input').value);
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
  const sourceNames = { json: 'JSON', partial: '잘린 JSON', text: '콘티 글' };
  addLog('Claude 답 붙여넣기', `${summary} · ${sourceNames[source] || 'JSON'}에서 읽음`, makeSnapshot(form));
  element('paste-input').value = '';
  element('paste-status').textContent = notice
    ? `컷 편집기에 넣었어요: ${summary}\n${notice}`
    : `컷 편집기에 넣었어요: ${summary}`;
  if (!notice) element('paste-box').open = false;
}

export function initPastePanel(newOptions) {
  options = newOptions;
  element('paste-apply').addEventListener('click', applyPaste);
  element('paste-json-request').addEventListener('click', () => {
    options.copyText(buildJsonOnlyRequest(editorValues(), EDITOR_JSON_SHAPE),
      '복사했어요! 같은 claude.ai 대화에 보내고, 받은 답을 다시 붙여 넣으세요.');
  });
}
