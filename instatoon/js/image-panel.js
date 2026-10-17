// 컷 편집기의 "그림 생성 (GPT)" 카드와 컷별 그림 영역
// 만든 그림은 이 화면에만 있어요(새로고침하면 사라짐). 마음에 들면 바로 내려받으세요.

import { TEMPLATES, findOption, findLayout } from './guide.js';
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

// cut.id → { list: [그림 주소, ...], index: 지금 보는 그림 번호 }
// 새로 그리거나 고칠 때마다 맨 뒤에 쌓여서, 이전·다음 그림으로 오갈 수 있어요.
const versions = new Map();

function currentImage(cutId) {
  const version = versions.get(cutId);
  return version ? version.list[version.index] : '';
}

function addImage(cutId, url) {
  const version = versions.get(cutId) || { list: [], index: 0 };
  version.list.push(url);
  version.index = version.list.length - 1;
  versions.set(cutId, version);
}
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
  versions.forEach((version, cutId) => showVersionButtons(cutId));
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
  // 기본이 아닌 구도는 템플릿 레퍼런스를 보내지 않아요 (보내면 늘 같은 틀로 그려져서)
  if (findLayout(template, cut.layout).prompt !== '') return [await loadReference(TURNAROUND_FILE)];
  return Promise.all([loadReference(TURNAROUND_FILE), loadReference(template.reference)]);
}

function showCutImage(cut, index) {
  const url = currentImage(cut.id);
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
  showVersionButtons(cut.id);
}

// ◀ 이전 그림 · 2/3 · 다음 그림 ▶ (그림이 2장 이상일 때만)
function showVersionButtons(cutId) {
  const version = versions.get(cutId);
  const row = element(`cut-version-row-${cutId}`);
  if (!version || !row) return;
  row.hidden = version.list.length < 2;
  element(`cut-version-count-${cutId}`).textContent = `${version.index + 1} / ${version.list.length}`;
  element(`cut-version-prev-${cutId}`).disabled = controller !== null || version.index === 0;
  element(`cut-version-next-${cutId}`).disabled = controller !== null || version.index === version.list.length - 1;
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
    addImage(cut.id, url);
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
  const current = dataUrlToBlob(currentImage(cut.id));
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
    addImage(cut.id, url);
    clearReviseDraft(cut.id);
    setCutStatus(cut, '고쳤어요! 마음에 안 들면 "◀ 이전 그림"을 누르세요.');
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

// step: -1(이전 그림) / +1(다음 그림)
function moveVersion(index, step) {
  const cut = cuts()[index];
  const version = versions.get(cut.id);
  if (controller || !version) return;
  const next = version.index + step;
  if (next < 0 || next >= version.list.length) return;
  version.index = next;
  setCutStatus(cut, '');
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
    onPrevious: () => moveVersion(index, -1),
    onNext: () => moveVersion(index, 1),
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
