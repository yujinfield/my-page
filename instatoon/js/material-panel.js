// PART 3 "노션 자료" 패널
// 1) Claude가 자료 초안을 씀 → 2) 사용자가 고침 → 3) 노션에 비공개 페이지로 저장
// claude.ai 링크로 열었을 때만 자동으로 되고, 공용 링크·내 컴퓨터에서는 요청문을 복사해 Claude에게 부탁합니다.

import {
  NOTION_SERVER, NOTION_CREATE_TOOL, buildMaterialRequest, buildMaterialChatRequest,
  readMaterialAnswer, draftToText, textToDraft, buildNotionPageInput, findNotionUrl,
} from './notion-material.js';

// app.js에서 넘겨받는 함수들
let options = {
  getForm: null,
  onChange: null,
  copyText: null,
};

let sample = null;  // Claude에게 묻는 함수 (못 쓰면 null)
let mcp = null;     // 노션 커넥터를 부르는 기능 (못 쓰면 null)
let busy = false;

const DRAFT_ERRORS = {
  cancelled: '멈췄어요.',
  not_granted: 'Claude 사용이 허용되지 않았어요. 페이지 메뉴의 권한에서 바꿀 수 있어요.',
  rate_limited: '지금은 사용량이 많아요. 잠시 뒤에 다시 눌러 주세요.',
  session_expired: 'claude.ai에 다시 로그인해 주세요.',
  refused: 'Claude가 이 내용으로는 답하지 못했어요. 자료 내용을 고쳐서 다시 시도해 주세요.',
  invalid_json: 'Claude의 답을 읽지 못했어요. 다시 눌러 주세요.',
};

const NOTION_ERRORS = {
  server_not_connected: 'Notion이 연결되어 있지 않아요. claude.ai 설정 → 커넥터에서 Notion을 연결해 주세요.',
  needs_reauth: 'Notion 연결이 만료됐어요. claude.ai 설정 → 커넥터에서 다시 연결해 주세요.',
  selection_required: 'Notion 연결이 여러 개예요. claude.ai가 띄운 창에서 하나를 골라 주세요.',
  not_in_manifest: '노션 저장이 허용되지 않았어요. 페이지 메뉴의 권한에서 Notion을 허용해 주세요.',
  approval_required: '노션 저장을 허용해야 해요. 다시 누르면 허용 창이 떠요.',
  blocked_by_policy: '조직 정책으로 노션 저장이 막혀 있어요.',
  tool_error: '노션이 페이지를 만들지 못했어요. 초안 내용을 조금 고쳐서 다시 시도해 주세요.',
};

// 페이지가 만들어졌는지 알 수 없는 오류
const UNKNOWN_RESULT_CODES = ['server_unavailable', 'upstream_error', 'cancelled'];

function element(id) {
  return document.getElementById(id);
}

function setStatus(message) {
  element('material-status').textContent = message;
}

function setBusy(value) {
  busy = value;
  element('material-draft-button').disabled = value;
  element('material-save-button').disabled = value;
}

// 폼 상태에 맞춰 보이기/숨기기 (입력 중인 글상자 값은 건드리지 않음)
export function renderMaterialPanel() {
  const form = options.getForm();
  element('material-panel').hidden = form.materialType === 'none';

  const hasDraft = form.materialDraft.trim() !== '';
  element('material-draft-box').hidden = !hasDraft;
  element('material-save-button').hidden = !hasDraft || mcp === null;

  element('material-link-row').hidden = form.notionUrl === '';
  element('material-link').href = form.notionUrl || '#';
}

// 저장된 초안을 글상자에 다시 채움 (처음 열 때, 처음부터 할 때)
export function resetMaterialPanel() {
  element('material-draft').value = options.getForm().materialDraft;
  setStatus('');
  renderMaterialPanel();
}

async function writeDraft() {
  if (!sample || busy) return;
  const form = options.getForm();
  if (form.materialDraft.trim() !== '' && !confirm('지금 초안을 지우고 새로 쓸까요?')) return;

  setBusy(true);
  setStatus('Claude가 자료 초안을 쓰고 있어요… 보통 30초~1분 걸려요.');
  try {
    const answer = await sample.json(buildMaterialRequest(form), {
      cache: false,
      onText: ({ text }) => setStatus(`Claude가 자료를 쓰고 있어요… ${text.length.toLocaleString()}자`),
    });
    const draft = readMaterialAnswer(answer);
    if (!draft) {
      setStatus('Claude의 답에서 자료를 찾지 못했어요. 다시 눌러 주세요.');
      return;
    }
    form.materialDraft = draftToText(draft.title, draft.content);
    element('material-draft').value = form.materialDraft;
    options.onChange();
    setStatus('초안이 나왔어요! "(검증 필요)" 표시를 확인하고 고친 뒤 노션에 저장하세요.');
  } catch (error) {
    setStatus(DRAFT_ERRORS[error && error.code] || '잠시 문제가 생겼어요. 다시 눌러 주세요.');
  } finally {
    setBusy(false);
    renderMaterialPanel();
  }
}

async function saveToNotion() {
  if (!mcp || busy) return;
  const form = options.getForm();
  const { title, content } = textToDraft(form.materialDraft);
  if (content === '') {
    setStatus('초안 본문이 비어 있어요. 첫 줄은 제목, 그 아래에 본문을 적어 주세요.');
    return;
  }
  if (form.notionUrl && !confirm('이미 만든 노션 페이지가 있어요. 새 페이지를 하나 더 만들까요?')) return;

  setBusy(true);
  setStatus('노션에 저장하고 있어요…');
  try {
    const result = await mcp.callTool(NOTION_SERVER, NOTION_CREATE_TOOL, buildNotionPageInput(title, content));
    const url = findNotionUrl(result.payload !== undefined ? result.payload : result.content);
    form.notionUrl = url;
    options.onChange();
    setStatus(url
      ? '노션에 비공개 페이지로 저장했어요! 공유할 때는 노션에서 공유 설정을 바꿔 주세요.'
      : '노션에 저장했어요. 링크를 찾지 못했으니 노션의 "비공개" 페이지 목록에서 확인해 주세요.');
  } catch (error) {
    const code = error && error.code;
    if (UNKNOWN_RESULT_CODES.includes(code)) {
      setStatus('노션 응답이 없어요. 페이지가 이미 만들어졌을 수 있으니, 다시 누르기 전에 노션을 먼저 확인해 주세요.');
    } else {
      setStatus(NOTION_ERRORS[code] || '노션 저장 중 문제가 생겼어요. 노션을 확인한 뒤 다시 눌러 주세요.');
    }
  } finally {
    setBusy(false);
    renderMaterialPanel();
  }
}

async function setupClaude() {
  // 내 컴퓨터에서 열면 window.claude가 없어요.
  if (window.claude && typeof window.claude.use === 'function') {
    try {
      sample = await window.claude.use('sample');
    } catch (error) {
      sample = null;
    }
    try {
      mcp = await window.claude.use('mcp');
    } catch (error) {
      mcp = null;
    }
  }

  const automatic = sample !== null && mcp !== null;
  element('material-draft-button').hidden = sample === null;
  element('material-help').textContent = automatic
    ? 'Claude가 위 내용으로 자료 초안을 쓰고, 확인한 뒤 노션에 비공개 페이지로 저장해요.'
    : '자동 저장은 claude.ai 링크로 열었을 때만 돼요. 여기서는 요청문을 복사해 Claude에게 "노션에 정리해 줘"라고 부탁하세요.';
  renderMaterialPanel();
}

export function initMaterialPanel(newOptions) {
  options = newOptions;

  element('material-draft-button').addEventListener('click', writeDraft);
  element('material-save-button').addEventListener('click', saveToNotion);
  element('material-copy-request').addEventListener('click', () => {
    options.copyText(buildMaterialChatRequest(options.getForm()), '요청문을 복사했어요! Claude에게 붙여 넣으세요.');
  });
  element('material-draft').addEventListener('input', (event) => {
    options.getForm().materialDraft = event.target.value;
    options.onChange();
  });

  resetMaterialPanel();
  setupClaude();
}
