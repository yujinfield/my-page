// GPT 이미지 API로 컷 다시 그리기
// 화면(DOM)은 건드리지 않습니다. 버튼·결과 표시는 cuts-panel.js와 app.js에서 합니다.
//
// 공용 링크(github.io)나 내 컴퓨터(localhost)에서 열었을 때만 동작합니다.
// claude.ai 링크로 연 페이지는 외부 인터넷 접속이 막혀 있어서 OpenAI에 요청할 수 없어요.

import { makeError, describeOpenAiError, CONNECT_ERROR } from './errors.js';

const OPENAI_EDITS_URL = 'https://api.openai.com/v1/images/edits';
const TURNAROUND_URL = '../instatoon/references/꼼쥐_턴어라운드.png';

// 고를 수 있는 모델 (OpenAI가 이름을 바꾸면 "직접 입력"으로 넣을 수 있음)
export const IMAGE_MODELS = [
  { value: 'gpt-image-2', label: 'gpt-image-2 (기본)' },
  { value: 'gpt-image-2.5-flare', label: 'gpt-image-2.5-flare (빠름)' },
  { value: 'gpt-image-2.5-sunburst', label: 'gpt-image-2.5-sunburst (정밀·편집)' },
  { value: 'custom', label: '직접 입력' },
];

// 그림 크기: 인스타 4:5가 기본, 안 되는 모델이면 2:3 세로를 고름
export const IMAGE_SIZES = [
  { value: '1024x1280', label: '1024×1280 (4:5 인스타 비율)' },
  { value: '1024x1536', label: '1024×1536 (2:3 세로, 대부분 모델 지원)' },
];

export const IMAGE_QUALITIES = [
  { value: 'auto', label: '자동' },
  { value: 'low', label: '낮음 (저렴, 빠름)' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음 (비쌈, 느림)' },
];

// API 키는 설정에 넣지 않습니다. (key-panel.js가 잠금·해제해서 따로 넘겨줌)
export const DEFAULT_IMAGE_SETTINGS = {
  model: 'gpt-image-2',
  customModel: '',
  size: '1024x1280',
  quality: 'auto',
  style: 'original',   // "original": 원본 그림체 그대로 / "kkomjwi": 꼼쥐툰 스타일 (redraw-prompt.js의 STYLES)
  watermark: '',       // 그림 위쪽 가운데 작은 글씨 (예: @내계정). 비우면 넣지 않음
  useCharacterImage: true, // 캐릭터 참고 이미지(올린 것, 없으면 꼼쥐툰 스타일일 때 기본 턴어라운드)를 두 번째 참고 이미지로 보냄
};

// 저장된 설정의 빈 칸·잘못된 값을 기본값으로
export function normalizeImageSettings(saved) {
  const settings = { ...DEFAULT_IMAGE_SETTINGS };
  if (!saved) return settings;
  if (typeof saved.customModel === 'string') settings.customModel = saved.customModel.trim();
  if (IMAGE_MODELS.some((item) => item.value === saved.model)) settings.model = saved.model;
  if (IMAGE_SIZES.some((item) => item.value === saved.size)) settings.size = saved.size;
  if (IMAGE_QUALITIES.some((item) => item.value === saved.quality)) settings.quality = saved.quality;
  if (saved.style === 'original' || saved.style === 'kkomjwi') settings.style = saved.style;
  if (typeof saved.watermark === 'string') settings.watermark = saved.watermark.trim();
  if (typeof saved.useCharacterImage === 'boolean') settings.useCharacterImage = saved.useCharacterImage;
  else if (typeof saved.useTurnaround === 'boolean') settings.useCharacterImage = saved.useTurnaround; // 예전 이름
  return settings;
}

export function modelName(settings) {
  return settings.model === 'custom' ? settings.customModel : settings.model;
}

// 기본 꼼쥐 턴어라운드 읽기 (캐릭터 이미지를 안 올렸을 때 꼼쥐툰 스타일에서 씀, 한 번 읽으면 기억해 둠)
let turnaroundBlob = null;

export async function loadTurnaround() {
  if (turnaroundBlob) return turnaroundBlob;
  const response = await fetch(TURNAROUND_URL);
  if (!response.ok) throw makeError({ problem: '꼼쥐 턴어라운드 이미지를 열 수 없어요.', fix: '그림 설정에서 캐릭터 이미지를 직접 올리거나 "캐릭터 참고 이미지 함께 보내기"를 끄고 다시 해 보세요.' });
  turnaroundBlob = await response.blob();
  return turnaroundBlob;
}

// 만든 그림('data:image/png;base64,...') → 파일(Blob). 고치기 때 참고 이미지로 보냄
// (fetch로 data: 주소를 읽으면 보안 설정(CSP)에 막혀서 직접 바꿔요)
export function dataUrlToBlob(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

// 참고 이미지와 프롬프트로 그림 한 장 → 'data:image/png;base64,...' 주소
export async function generateImage({ apiKey, settings, prompt, references, signal }) {
  if (!modelName(settings)) {
    throw makeError({ problem: '그림 모델 이름이 비어 있어요.', fix: '그림 설정에서 모델을 골라 주세요.', settingsFocus: 'image-model' });
  }
  const body = new FormData();
  body.append('model', modelName(settings));
  body.append('prompt', prompt);
  body.append('size', settings.size);
  body.append('quality', settings.quality);
  body.append('n', '1');
  references.forEach((blob, i) => body.append('image[]', blob, `reference-${i + 1}.png`));

  let response;
  try {
    response = await fetch(OPENAI_EDITS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      signal,
    });
  } catch (error) {
    if (error && error.name === 'AbortError') throw makeError({ problem: '멈췄어요.' });
    throw makeError(CONNECT_ERROR);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && data.error && data.error.message;
    throw makeError(describeOpenAiError(response.status, detail, modelName(settings), 'image-model'));
  }

  const first = data && Array.isArray(data.data) ? data.data[0] : null;
  if (first && first.b64_json) return `data:image/png;base64,${first.b64_json}`;
  throw makeError({ problem: 'OpenAI 응답에 그림이 없어요.', fix: '다시 눌러 주세요.' });
}
