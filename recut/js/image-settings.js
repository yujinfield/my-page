// ③ GPT 그림 설정 화면: 모델·크기·품질·스타일·워터마크·턴어라운드

import { IMAGE_MODELS, IMAGE_SIZES, IMAGE_QUALITIES } from './image-gen.js';
import { STYLES } from './redraw-prompt.js';

function fillSelect(select, options, value) {
  options.forEach((option) => select.append(new Option(option.label, option.value)));
  select.value = value;
}

// onChange(새 설정)
export function setupImageSettings(initial, onChange) {
  const model = document.getElementById('image-model');
  const customField = document.getElementById('custom-model-field');
  const customModel = document.getElementById('custom-model');
  const size = document.getElementById('image-size');
  const quality = document.getElementById('image-quality');
  const turnaround = document.getElementById('use-turnaround');
  const turnaroundField = document.getElementById('turnaround-field');
  const style = document.getElementById('redraw-style');
  const watermark = document.getElementById('watermark');
  const watermarkField = document.getElementById('watermark-field');

  fillSelect(model, IMAGE_MODELS, initial.model);
  fillSelect(size, IMAGE_SIZES, initial.size);
  fillSelect(quality, IMAGE_QUALITIES, initial.quality);
  customModel.value = initial.customModel;
  fillSelect(style, STYLES, initial.style);
  watermark.value = initial.watermark;
  turnaround.checked = initial.useTurnaround;

  // 고른 값에 따라 필요한 칸만 보이기 (꼼쥐툰 스타일은 워터마크가 '@꼼쥐'로 정해져 있음)
  function updateFields() {
    customField.hidden = model.value !== 'custom';
    turnaroundField.hidden = style.value !== 'kkomjwi';
    watermarkField.hidden = style.value === 'kkomjwi';
  }
  updateFields();

  function save() {
    const settings = {
      model: model.value,
      customModel: customModel.value.trim(),
      size: size.value,
      quality: quality.value,
      style: style.value,
      watermark: watermark.value.trim(),
      useTurnaround: turnaround.checked,
    };
    updateFields();
    onChange(settings);
  }
  [model, customModel, size, quality, style, watermark, turnaround].forEach((input) => input.addEventListener('change', save));
}
