// 콘티 자동 작성 패널 (컷 편집기 안)
//  - ✨ Claude: claude.ai 링크로 열었을 때만. 사용하는 사람의 claude.ai 사용량을 쓰고 API 키 불필요
//  - 🤖 GPT: 공용 링크·내 컴퓨터에서. ⚙️ 설정의 OpenAI API 키를 씀

import { buildContiRequest, readContiAnswer } from './ai-conti.js';
import { addLog, makeSnapshot } from './history.js';
import { writeContiWithGpt } from './gpt-conti.js';
import { getApiKey, promptForKey } from './key-panel.js';
import { getTextModelName } from './image-panel.js';
import { openSettings } from './settings-dialog.js';

// app.js·cuts.js에서 넘겨받는 함수들
let options = {
  getForm: null,
  getType: null,
  onChange: null,
  copyText: null,
  onCutsReplaced: null, // 컷 목록이 통째로 바뀐 뒤 (저장 + 다시 그리기)
};

// claude.ai 링크로 열었을 때만 쓸 수 있어요. (사용하는 사람의 claude.ai 사용량을 씀, API 키 불필요)

const TYPE_NAMES = { story: '스토리형', info: '정보형' };

// 사용할 수 없게 되는 오류 (다시 묻지 않고 버튼을 숨김)
const UNAVAILABLE_CODES = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];

const ERROR_MESSAGES = {
  cancelled: '멈췄어요. 지금 있던 컷은 그대로예요.',
  not_granted: 'Claude 사용이 허용되지 않았어요. 페이지 메뉴의 권한에서 바꿀 수 있어요.',
  rate_limited: '지금은 사용량이 많아요. 잠시 뒤에 다시 눌러 주세요.',
  session_expired: 'claude.ai에 다시 로그인해 주세요.',
  refused: 'Claude가 이 내용으로는 답하지 못했어요. 입력 내용을 고쳐서 다시 시도해 주세요.',
  invalid_json: 'Claude의 답을 컷으로 바꾸지 못했어요. 다시 눌러 주세요.',
  empty_completion: 'Claude의 답이 비어 있었어요. 다시 눌러 주세요.',
  prompt_too_large: '입력 내용이 너무 길어요. 조금 줄여서 다시 시도해 주세요.',
};

let sample = null;        // Claude에게 묻는 함수 (못 쓰면 null)
let aiController = null;  // 지금 진행 중인 요청 (멈추기용)

function showAiAvailability(available) {
  document.querySelectorAll('.ai-button').forEach((button) => { button.hidden = !available; });
  document.getElementById('ai-unavailable').hidden = available;
}

async function setupAi() {
  // 내 컴퓨터에서 열면 window.claude가 없어요.
  if (!window.claude || typeof window.claude.use !== 'function') {
    showAiAvailability(false);
    return;
  }
  try {
    sample = await window.claude.use('sample');
  } catch (error) {
    sample = null;
  }
  showAiAvailability(sample !== null);
}

function setAiStatus(message, busy) {
  document.getElementById('ai-status-box').hidden = message === '';
  document.getElementById('ai-status-text').textContent = message;
  document.getElementById('ai-stop').hidden = !busy;
  document.querySelectorAll('.ai-button, .gpt-button').forEach((button) => { button.disabled = busy; });
}

// 받은 콘티를 컷 편집기에 넣기 (Claude·GPT 공통)
function applyConti(result, logAction) {
  const form = options.getForm();
  form.cuts = result.cuts;
  form.caption = result.caption;
  form.review = result.review;
  options.onCutsReplaced();
  addLog(logAction, `${result.cuts.length}컷`, makeSnapshot(form));
}

function finishWriting() {
  aiController = null;
  document.querySelectorAll('.ai-button, .gpt-button').forEach((button) => { button.disabled = false; });
  document.getElementById('ai-stop').hidden = true;
}

// claude.ai 링크 안에서는 외부 인터넷이 막혀 있어서 GPT를 못 불러요.
function inClaudeArtifact() {
  return Boolean(window.claude && typeof window.claude.use === 'function');
}

async function writeContiWithGptButton() {
  if (aiController) return;
  const apiKey = getApiKey();
  if (apiKey === '') {
    const { message, focusId } = promptForKey();
    setAiStatus(`GPT로 쓰려면 OpenAI API 키가 필요해요. ${message}`, false);
    openSettings(focusId);
    return;
  }
  const model = getTextModelName();
  if (model === '') {
    setAiStatus('⚙️ 설정에서 콘티 작성 모델 이름을 적어 주세요.', false);
    openSettings('text-custom-model');
    return;
  }
  if (options.getForm().cuts.length > 0 && !confirm('지금 컷을 지우고 GPT가 새로 쓴 콘티로 바꿀까요? (지금 콘티는 📜 기록에서 되돌릴 수 있어요)')) return;
  // 성공했을 때만 "바꾸기 전 콘티"를 기록에 남기려고 미리 복사해 둠
  const before = options.getForm().cuts.length > 0 ? makeSnapshot(options.getForm()) : null;

  const type = options.getType();
  aiController = new AbortController();
  setAiStatus(`GPT(${model})가 ${TYPE_NAMES[type]} 콘티를 쓰고 있어요… 보통 30초~2분 걸려요.`, true);
  try {
    const answer = await writeContiWithGpt({
      apiKey,
      model,
      prompt: buildContiRequest(options.getForm(), type),
      signal: aiController.signal,
    });
    const result = readContiAnswer(answer);
    if (!result) {
      setAiStatus('GPT의 답에서 컷을 찾지 못했어요. 다시 눌러 주세요.', false);
      return;
    }
    if (before) addLog('바꾸기 전 콘티', `${before.cuts.length}컷`, before);
    applyConti(result, `GPT 자동 작성 (${model})`);
    setAiStatus(`${result.cuts.length}컷 콘티가 들어왔어요! 노란 경고가 있는 컷부터 확인해 주세요.`, false);
  } catch (error) {
    setAiStatus(error.message, false);
    if (!aiController.signal.aborted) addLog('GPT 자동 작성 실패', error.message);
  } finally {
    finishWriting();
  }
}

async function writeContiWithClaude() {
  if (!sample || aiController) return;
  if (options.getForm().cuts.length > 0 && !confirm('지금 컷을 지우고 Claude가 새로 쓴 콘티로 바꿀까요?')) return;

  const type = options.getType();
  aiController = new AbortController();
  setAiStatus(`Claude가 ${TYPE_NAMES[type]} 콘티를 쓰고 있어요… 보통 1~2분 걸려요.`, true);

  try {
    const answer = await sample.json(buildContiRequest(options.getForm(), type), {
      signal: aiController.signal,
      cache: false,
      onText: ({ text }) => {
        setAiStatus(`Claude가 콘티를 쓰고 있어요… ${text.length.toLocaleString()}자`, true);
      },
    });

    const result = readContiAnswer(answer);
    if (!result) {
      setAiStatus('Claude의 답에서 컷을 찾지 못했어요. 다시 눌러 주세요.', false);
      return;
    }

    applyConti(result, 'Claude 자동 작성');
    setAiStatus(`${result.cuts.length}컷 콘티가 들어왔어요! 노란 경고가 있는 컷부터 확인해 주세요.`, false);
  } catch (error) {
    const code = error && error.code;
    setAiStatus(ERROR_MESSAGES[code] || '잠시 문제가 생겼어요. 다시 눌러 주세요.', false);
    if (UNAVAILABLE_CODES.includes(code)) showAiAvailability(false);
  } finally {
    finishWriting();
  }
}

// Claude가 남긴 캡션·검토 메모
export function renderAiNotes() {
  const form = options.getForm();
  document.getElementById('ai-notes').hidden = form.caption === '' && form.review === '';
  document.getElementById('ai-caption').value = form.caption;
  document.getElementById('ai-review').value = form.review;
}

export function initAiPanel(newOptions) {
  options = newOptions;

  document.getElementById('ai-start').addEventListener('click', writeContiWithClaude);
  document.getElementById('ai-rebuild').addEventListener('click', writeContiWithClaude);
  document.getElementById('gpt-start').addEventListener('click', writeContiWithGptButton);
  document.getElementById('gpt-rebuild').addEventListener('click', writeContiWithGptButton);
  document.querySelectorAll('.gpt-button').forEach((button) => { button.hidden = inClaudeArtifact(); });
  document.getElementById('ai-stop').addEventListener('click', () => {
    if (aiController) aiController.abort();
  });
  document.getElementById('ai-caption').addEventListener('input', (event) => {
    options.getForm().caption = event.target.value;
    options.onChange();
  });
  document.getElementById('ai-review').addEventListener('input', (event) => {
    options.getForm().review = event.target.value;
    options.onChange();
  });
  document.getElementById('ai-caption-copy').addEventListener('click', () => {
    options.copyText(options.getForm().caption, '캡션을 복사했어요!');
  });

  setupAi();
}
