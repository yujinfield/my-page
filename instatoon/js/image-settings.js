// ⚙️ 설정 창의 콘티 작성(GPT)·그림 생성 설정
// 설정 값(settings)은 이 파일이 들고 있고, 바뀔 때마다 store.js로 저장해요.

import {
  TEXT_MODELS, IMAGE_MODELS, IMAGE_SIZES, IMAGE_QUALITIES, normalizeImageSettings,
} from './image-gen.js';
import { loadImageSettings, saveImageSettings } from './store.js';

// 다른 파일은 이 객체를 읽기만 해요. (값은 아래 설정 화면에서만 바꿈)
export const settings = normalizeImageSettings(loadImageSettings());

function element(id) {
  return document.getElementById(id);
}

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
  showTextModel();
}

// 컷 편집의 "🤖 콘티 모델: …" 줄
function showTextModel() {
  const name = getTextModelName();
  document.querySelectorAll('.gpt-model-name').forEach((item) => {
    item.textContent = name || '(모델 이름을 적어 주세요)';
  });
}

// 🤖 GPT 콘티 작성에 쓸 모델 이름 ('' 이면 직접 입력이 비어 있음)
export function getTextModelName() {
  return settings.textModel === 'custom' ? settings.customTextModel : settings.textModel;
}

export function setupImageSettings() {
  fillSelect('text-model', TEXT_MODELS, settings.textModel);
  element('text-custom-model').value = settings.customTextModel;
  element('text-custom-model-field').hidden = settings.textModel !== 'custom';
  showTextModel();
  element('text-model').addEventListener('change', (event) => {
    settings.textModel = event.target.value;
    settings.textModelChosen = true;
    saveSettings();
    if (settings.textModel === 'custom') element('text-custom-model').focus();
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
  element('image-draw-text').checked = settings.drawText;
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
  element('image-draw-text').addEventListener('change', (event) => {
    settings.drawText = event.target.checked;
    saveSettings();
  });
  element('image-use-refs').addEventListener('change', (event) => {
    settings.useReferences = event.target.checked;
    saveSettings();
  });
}
