// GPT 이미지 API로 컷 그림 만들기
// 화면(DOM)은 건드리지 않습니다. 버튼·결과 표시는 image-panel.js에서 합니다.
//
// 공용 링크(github.io)나 내 컴퓨터(localhost)에서 열었을 때만 동작합니다.
// claude.ai 링크로 연 페이지는 외부 인터넷 접속이 막혀 있어서 OpenAI에 요청할 수 없어요.

const OPENAI_URL = 'https://api.openai.com/v1/images';

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
  useReferences: true,
};

// 저장된 설정의 빈 칸·잘못된 값을 기본값으로
export function normalizeImageSettings(saved) {
  const settings = { ...DEFAULT_IMAGE_SETTINGS };
  if (!saved) return settings;
  if (typeof saved.customModel === 'string') settings.customModel = saved.customModel.trim();
  if (IMAGE_MODELS.some((item) => item.value === saved.model)) settings.model = saved.model;
  if (IMAGE_SIZES.some((item) => item.value === saved.size)) settings.size = saved.size;
  if (IMAGE_QUALITIES.some((item) => item.value === saved.quality)) settings.quality = saved.quality;
  if (typeof saved.useReferences === 'boolean') settings.useReferences = saved.useReferences;
  return settings;
}

export function modelName(settings) {
  return settings.model === 'custom' ? settings.customModel : settings.model;
}

// 레퍼런스 이미지 파일 읽기 (한 번 읽은 파일은 기억해 둠)
const referenceCache = new Map();

export async function loadReference(fileName) {
  if (referenceCache.has(fileName)) return referenceCache.get(fileName);
  const response = await fetch(`references/${encodeURIComponent(fileName)}`);
  if (!response.ok) throw new Error(`레퍼런스 이미지를 열 수 없어요: ${fileName}`);
  const blob = await response.blob();
  referenceCache.set(fileName, blob);
  return blob;
}

// OpenAI 오류 → 사람이 읽을 안내
function explainError(status, detail) {
  if (status === 401) return 'API 키가 맞지 않아요. 키를 다시 확인해 주세요.';
  if (status === 403) return '이 키로는 이 모델을 쓸 수 없어요. OpenAI 계정 인증·권한을 확인하거나 다른 모델을 골라 주세요.';
  if (status === 429) return '요청이 너무 많거나 크레딧이 부족해요. 잠시 뒤에 하거나 OpenAI 결제 상태를 확인해 주세요.';
  if (status >= 500) return 'OpenAI 쪽에 잠시 문제가 있어요. 조금 뒤에 다시 시도해 주세요.';
  return `OpenAI가 요청을 거절했어요: ${detail || `오류 ${status}`}`;
}

// 컷 하나 그리기 → 'data:image/png;base64,...' 주소
// references가 있으면 /edits(참고 이미지 포함), 없으면 /generations 로 보냅니다.
export async function generateImage({ apiKey, settings, prompt, references = [], signal }) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const common = {
    model: modelName(settings),
    prompt,
    size: settings.size,
    quality: settings.quality,
    n: 1,
  };

  let response;
  try {
    if (references.length > 0) {
      const body = new FormData();
      Object.entries(common).forEach(([key, value]) => body.append(key, String(value)));
      references.forEach((blob, i) => body.append('image[]', blob, `reference-${i + 1}.png`));
      response = await fetch(`${OPENAI_URL}/edits`, { method: 'POST', headers, body, signal });
    } else {
      response = await fetch(`${OPENAI_URL}/generations`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(common),
        signal,
      });
    }
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error('멈췄어요.');
    throw new Error('OpenAI에 연결하지 못했어요. 인터넷 연결을 확인하거나, 공용 링크·내 컴퓨터에서 열었는지 확인해 주세요.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && data.error && data.error.message;
    throw new Error(explainError(response.status, detail));
  }

  const first = data && Array.isArray(data.data) ? data.data[0] : null;
  if (first && first.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first && first.url) return first.url;
  throw new Error('OpenAI 응답에 그림이 없어요. 다시 시도해 주세요.');
}
