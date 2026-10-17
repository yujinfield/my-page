// 컷 편집기의 "그림 생성 (GPT)" 카드와 컷별 그림 영역
// 만든 그림은 이 화면에만 있어요(새로고침하면 사라짐). 마음에 들면 바로 내려받으세요.

import { TEMPLATES, findOption } from './guide.js';
import { buildImagePrompt } from './prompt.js';
import {
  IMAGE_MODELS, IMAGE_SIZES, IMAGE_QUALITIES, normalizeImageSettings, modelName,
  loadReference, generateImage,
} from './image-gen.js';
import { loadImageSettings, saveImageSettings } from './store.js';
import { initKeyPanel, getApiKey, promptForKey } from './key-panel.js';
import { openSettings } from './settings-dialog.js';
import { addLog } from './history.js';
import { TEXT_MODELS } from './gpt-conti.js';

const TURNAROUND_FILE = '꼼쥐_턴어라운드.png';

let options = {
  getForm: null,  // 지금 입력폼 (form.cuts)
};

let settings = normalizeImageSettings(loadImageSettings());
const images = new Map();   // cut.id → 그림 주소
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

// ---------- 설정 ----------

function fillSelect(id, list, value) {
  const select = element(id);
  select.replaceChildren(...list.map((item) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    option.selected = item.value === value;
    return option;
  }));
}

function saveSettings() {
  saveImageSettings(settings);
  element('image-custom-model-field').hidden = settings.model !== 'custom';
  element('text-custom-model-field').hidden = settings.textModel !== 'custom';
}

// 🤖 GPT 콘티 작성에 쓸 모델 이름 ('' 이면 직접 입력이 비어 있음)
export function getTextModelName() {
  return settings.textModel === 'custom' ? settings.customTextModel : settings.textModel;
}

function setupSettings() {
  fillSelect('text-model', TEXT_MODELS, settings.textModel);
  element('text-custom-model').value = settings.customTextModel;
  element('text-custom-model-field').hidden = settings.textModel !== 'custom';
  element('text-model').addEventListener('change', (event) => {
    settings.textModel = event.target.value;
    saveSettings();
  });
  element('text-custom-model').addEventListener('input', (event) => {
    settings.customTextModel = event.target.value.trim();
    saveSettings();
  });

  fillSelect('image-model', IMAGE_MODELS, settings.model);
  element('image-custom-model').value = settings.customModel;
  fillSelect('image-size', IMAGE_SIZES, settings.size);
  fillSelect('image-quality', IMAGE_QUALITIES, settings.quality);
  element('image-use-refs').checked = settings.useReferences;
  element('image-custom-model-field').hidden = settings.model !== 'custom';

  element('image-model').addEventListener('change', (event) => {
    settings.model = event.target.value;
    saveSettings();
  });
  element('image-custom-model').addEventListener('input', (event) => {
    settings.customModel = event.target.value.trim();
    saveSettings();
  });
  element('image-size').addEventListener('change', (event) => {
    settings.size = event.target.value;
    saveSettings();
  });
  element('image-quality').addEventListener('change', (event) => {
    settings.quality = event.target.value;
    saveSettings();
  });
  element('image-use-refs').addEventListener('change', (event) => {
    settings.useReferences = event.target.checked;
    saveSettings();
  });
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
    setCutStatus(cut, '');
    showCutImage(cut, index);
    addLog('그림 생성', `${cutLabel(index)} · ${modelName(settings)} · ${settings.size}`);
    return true;
  } catch (error) {
    setCutStatus(cut, error.message);
    if (!signal.aborted) addLog('그림 생성 실패', `${cutLabel(index)} · ${error.message}`);
    return false;
  }
}

async function drawOne(index) {
  if (controller || !ready()) return;
  controller = new AbortController();
  setBusy(true);
  setStatus(`${cutLabel(index)} 그림을 만들고 있어요…`);
  const ok = await drawCut(index, controller.signal);
  setStatus(ok ? `${cutLabel(index)} 그림이 나왔어요! 마음에 들면 내려받아 주세요.` : '');
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
  for (let index = 0; index < total; index += 1) {
    if (controller.signal.aborted) break;
    setStatus(`${index + 1}/${total}컷 그리는 중…`);
    if (await drawCut(index, controller.signal)) done += 1;
  }
  if (controller.signal.aborted) {
    setStatus(`멈췄어요. ${total}컷 중 ${done}컷을 그렸어요.`);
  } else {
    setStatus(`${total}컷 중 ${done}컷을 그렸어요.${done < total ? ' 실패한 컷은 컷 카드의 안내를 확인해 주세요.' : ''}`);
  }
  controller = null;
  setBusy(false);
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
  box.append(img, link);

  part.append(button, status, box);
  // 카드가 다시 그려진 뒤에 이미 만든 그림을 보여 줌
  queueMicrotask(() => showCutImage(cut, index));
  return part;
}

export function initImagePanel(newOptions) {
  options = newOptions;
  initKeyPanel(); // 예전 평문 키 정리가 설정 저장보다 먼저 일어나야 해요
  setupSettings();

  element('image-help').textContent = inClaudeArtifact()
    ? '그림 생성은 공용 링크(yujinfield.github.io)나 내 컴퓨터에서 열었을 때만 돼요. claude.ai 링크는 외부 인터넷이 막혀 있어서 OpenAI에 연결할 수 없어요.'
    : '컷마다 이미지 생성 프롬프트로 GPT가 그림을 그려요. 그림마다 OpenAI 비용이 들어요.';

  element('image-all').addEventListener('click', drawAll);
  element('image-open-settings').addEventListener('click', () => openSettings());
  element('image-stop').addEventListener('click', () => {
    if (controller) controller.abort();
  });
  setBusy(false);
}
