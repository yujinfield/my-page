// 컷 편집기의 "그림 생성 (GPT)" 카드와 컷별 그림 영역
// 만든 그림은 이 화면에만 있어요(새로고침하면 사라짐). 마음에 들면 바로 내려받으세요.

import { TEMPLATES, findOption } from './guide.js';
import { buildImagePrompt, buildRevisePrompt } from './prompt.js';
import { modelName, loadReference, generateImage, dataUrlToBlob } from './image-gen.js';
import { settings, setupImageSettings } from './image-settings.js';
import { initKeyPanel, getApiKey, promptForKey } from './key-panel.js';
import { openSettings } from './settings-dialog.js';
import { addLog } from './history.js';
import { showError } from './error-dialog.js';
import { renderRevisePart, clearReviseDraft } from './image-revise.js';

const TURNAROUND_FILE = '꼼쥐_턴어라운드.png';

let options = {
  getForm: null,  // 지금 입력폼 (form.cuts)
};

const images = new Map();   // cut.id → 그림 주소
const previousImages = new Map(); // cut.id → 고치기 전 그림 (한 단계만 되돌리기)
let controller = null;      // 진행 중인 요청 (멈추기용)

// claude.ai 링크로 열면 외부 인터넷이 막혀 있어요.
function inClaudeArtifact() {
  return Boolean(window.claude && typeof window.claude.use === 'function');
}

function element(id) {
  return document.getElementById(id);
}

function cuts() {
  return options.getForm().cuts;
}

function cutLabel(index) {
  return `CUT ${String(index + 1).padStart(2, '0')}`;
}

function setStatus(message) {
  element('image-status').textContent = message;
}

function setBusy(busy) {
  element('image-stop').hidden = !busy;
  document.querySelectorAll('.image-button').forEach((button) => { button.disabled = busy || inClaudeArtifact(); });
}

// 그림을 만들 준비가 됐는지 확인 (안 됐으면 안내하고 false)
function ready() {
  if (inClaudeArtifact()) return false;
  if (getApiKey() === '') {
    const { message, focusId } = promptForKey();
    setStatus(message);
    openSettings(focusId);
    return false;
  }
  if (modelName(settings) === '') {
    setStatus('직접 입력할 모델 이름을 적어 주세요.');
    openSettings('image-custom-model');
    return false;
  }
  return true;
}

// ---------- 그리기 ----------

async function referencesFor(cut) {
  if (!settings.useReferences) return [];
  const template = findOption(TEMPLATES, cut.template);
  return Promise.all([loadReference(TURNAROUND_FILE), loadReference(template.reference)]);
}

function showCutImage(cut, index) {
  const url = images.get(cut.id);
  const box = element(`cut-image-box-${cut.id}`);
  if (!box) return;
  box.hidden = !url;
  if (!url) return;
  const img = element(`cut-image-${cut.id}`);
  img.src = url;
  img.alt = `${cutLabel(index)} 생성된 그림`;
  const link = element(`cut-image-download-${cut.id}`);
  link.href = url;
  link.download = `kkomjwi-cut-${String(index + 1).padStart(2, '0')}.png`;
  const undo = element(`cut-revise-undo-${cut.id}`);
  if (undo) undo.hidden = !previousImages.has(cut.id);
}

function setCutStatus(cut, message) {
  const status = element(`cut-image-status-${cut.id}`);
  if (status) status.textContent = message;
}

async function drawCut(index, signal) {
  const cut = cuts()[index];
  setCutStatus(cut, '그리는 중… 보통 30초~1분 걸려요.');
  try {
    const url = await generateImage({
      apiKey: getApiKey(),
      settings,
      prompt: buildImagePrompt(cut, index),
      references: await referencesFor(cut),
      signal,
    });
    images.set(cut.id, url);
    previousImages.delete(cut.id);
    setCutStatus(cut, '');
    showCutImage(cut, index);
    addLog('그림 생성', `${cutLabel(index)} · ${modelName(settings)} · ${settings.size}`);
    return null;
  } catch (error) {
    setCutStatus(cut, error.message);
    if (signal.aborted) return null;
    addLog('그림 생성 실패', `${cutLabel(index)} · ${error.message}`);
    return error;
  }
}

async function drawOne(index) {
  if (controller || !ready()) return;
  controller = new AbortController();
  setBusy(true);
  setStatus(`${cutLabel(index)} 그림을 만들고 있어요…`);
  const error = await drawCut(index, controller.signal);
  const ok = error === null && !controller.signal.aborted;
  setStatus(ok ? `${cutLabel(index)} 그림이 나왔어요! 마음에 들면 내려받아 주세요.` : '');
  if (error) showError(error, `${cutLabel(index)} 그림을 그리지 못했어요`);
  controller = null;
  setBusy(false);
}

async function drawAll() {
  if (controller || !ready()) return;
  const total = cuts().length;
  if (total === 0) {
    setStatus('먼저 컷을 만들어 주세요.');
    return;
  }
  if (!confirm(`${total}컷 그림을 차례대로 만들어요. 그림마다 OpenAI 비용이 들어요. 계속할까요?`)) return;

  controller = new AbortController();
  setBusy(true);
  let done = 0;
  let firstError = null;
  for (let index = 0; index < total; index += 1) {
    if (controller.signal.aborted) break;
    setStatus(`${index + 1}/${total}컷 그리는 중…`);
    const error = await drawCut(index, controller.signal);
    if (error === null && !controller.signal.aborted) done += 1;
    if (error && !firstError) firstError = error;
  }
  if (controller.signal.aborted) {
    setStatus(`멈췄어요. ${total}컷 중 ${done}컷을 그렸어요.`);
  } else {
    setStatus(`${total}컷 중 ${done}컷을 그렸어요.${done < total ? ' 실패한 컷은 컷 카드의 안내를 확인해 주세요.' : ''}`);
  }
  // 여러 컷이 실패해도 알림은 한 번만 (첫 번째 실패 이유)
  if (firstError) showError(firstError, `${total - done}컷 그림을 그리지 못했어요`);
  controller = null;
  setBusy(false);
}

// ✏️ 수정 요청: 지금 그림을 첫 번째 참고 이미지로 보내고, 적은 부분만 고쳐 달라고 함
async function reviseOne(index, request) {
  if (controller || !ready()) return;
  const cut = cuts()[index];
  const current = dataUrlToBlob(images.get(cut.id) || '');
  if (!current) {
    showError({ problem: '이 그림은 고칠 수 없어요.', fix: '"🎨 이 컷 그림 만들기"로 다시 그린 뒤 수정 요청을 해 주세요.' }, `${cutLabel(index)} 그림을 고치지 못했어요`);
    return;
  }

  controller = new AbortController();
  setBusy(true);
  setStatus(`${cutLabel(index)} 그림을 고치고 있어요…`);
  setCutStatus(cut, '고치는 중… 보통 30초~1분 걸려요.');
  try {
    const references = settings.useReferences ? [current, await loadReference(TURNAROUND_FILE)] : [current];
    const url = await generateImage({
      apiKey: getApiKey(),
      settings,
      prompt: buildRevisePrompt(cut, index, request),
      references,
      signal: controller.signal,
    });
    previousImages.set(cut.id, images.get(cut.id));
    images.set(cut.id, url);
    clearReviseDraft(cut.id);
    setCutStatus(cut, '고쳤어요! 마음에 안 들면 "↩︎ 이전 그림으로"를 누르세요.');
    showCutImage(cut, index);
    setStatus(`${cutLabel(index)} 그림을 고쳤어요.`);
    addLog('그림 수정', `${cutLabel(index)} · ${request.trim().slice(0, 60)}`);
  } catch (error) {
    setCutStatus(cut, error.message);
    setStatus('');
    if (!controller.signal.aborted) {
      addLog('그림 수정 실패', `${cutLabel(index)} · ${error.message}`);
      showError(error, `${cutLabel(index)} 그림을 고치지 못했어요`);
    }
  }
  controller = null;
  setBusy(false);
}

function undoRevise(index) {
  const cut = cuts()[index];
  if (controller || !previousImages.has(cut.id)) return;
  images.set(cut.id, previousImages.get(cut.id));
  previousImages.delete(cut.id);
  setCutStatus(cut, '고치기 전 그림으로 되돌렸어요.');
  showCutImage(cut, index);
}

// ---------- 컷 카드 안의 그림 영역 (cuts.js가 부름) ----------

export function renderCutImagePart(cut, index) {
  const part = document.createElement('div');
  part.className = 'cut-section cut-image';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button-small image-button';
  button.textContent = '🎨 이 컷 그림 만들기';
  button.setAttribute('aria-label', `${cutLabel(index)} 그림 만들기`);
  button.disabled = inClaudeArtifact() || controller !== null;
  button.addEventListener('click', () => drawOne(index));

  const status = document.createElement('p');
  status.className = 'field-help';
  status.id = `cut-image-status-${cut.id}`;
  status.setAttribute('aria-live', 'polite');

  const box = document.createElement('div');
  box.id = `cut-image-box-${cut.id}`;
  box.className = 'cut-image-box';
  box.hidden = true;
  const img = document.createElement('img');
  img.id = `cut-image-${cut.id}`;
  img.className = 'cut-image-preview';
  const link = document.createElement('a');
  link.id = `cut-image-download-${cut.id}`;
  link.className = 'button button-small button-primary';
  link.textContent = '내려받기';
  const revise = renderRevisePart(cut, cutLabel(index), {
    onSubmit: (request) => reviseOne(index, request),
    onUndo: () => undoRevise(index),
  });
  box.append(img, link, revise);

  part.append(button, status, box);
  // 카드가 다시 그려진 뒤에 이미 만든 그림을 보여 줌
  queueMicrotask(() => showCutImage(cut, index));
  return part;
}

export function initImagePanel(newOptions) {
  options = newOptions;
  initKeyPanel(); // 예전 평문 키 정리가 설정 저장보다 먼저 일어나야 해요
  setupImageSettings();

  element('image-help').textContent = inClaudeArtifact()
    ? '그림 생성은 공용 링크(yujinfield.github.io)나 내 컴퓨터에서 열었을 때만 돼요. claude.ai 링크는 외부 인터넷이 막혀 있어서 OpenAI에 연결할 수 없어요.'
    : '컷마다 이미지 생성 프롬프트로 GPT가 그림을 그려요. 그림마다 OpenAI 비용이 들어요.';

  element('image-all').addEventListener('click', drawAll);
  element('image-open-settings').addEventListener('click', () => openSettings());
  document.querySelectorAll('.gpt-model-change').forEach((button) => {
    button.addEventListener('click', () => openSettings('text-model'));
  });
  element('image-stop').addEventListener('click', () => {
    if (controller) controller.abort();
  });
  setBusy(false);
}
