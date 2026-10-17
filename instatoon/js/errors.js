// 오류를 한국어로 풀어 주기 (순수 함수, DOM 없음)
// 오류 객체에 담는 것:
//   problem  — 무엇이 문제인지
//   fix      — 이렇게 해 보세요
//   detail   — OpenAI가 보낸 원래 문구 (영어일 수 있음)
//   settingsFocus — "⚙️ 설정 열기"를 누르면 포커스를 줄 칸 (없으면 설정 버튼을 안 보여 줌)

export function makeError({ problem, fix = '', detail = '', settingsFocus = '' }) {
  const error = new Error(fix ? `${problem} ${fix}` : problem);
  error.problem = problem;
  error.fix = fix;
  error.detail = detail;
  error.settingsFocus = settingsFocus;
  return error;
}

export const CONNECT_ERROR = {
  problem: 'OpenAI 서버에 연결하지 못했어요.',
  fix: '인터넷 연결을 확인해 주세요. claude.ai 링크로 열었다면 공용 링크(github.io)에서 열어 주세요. 광고 차단 확장 프로그램이나 회사·학교 네트워크가 막고 있을 수도 있어요.',
};

// OpenAI 오류 응답 → { problem, fix, detail, settingsFocus }
// modelFieldId: 모델을 고르는 칸 (콘티는 'text-model', 그림은 'image-model')
export function describeOpenAiError(status, detail, model, modelFieldId) {
  const text = detail || '';
  const result = { detail: text || `오류 코드 ${status}`, settingsFocus: '' };

  if (status === 401) {
    return { ...result, problem: 'API 키가 틀렸거나 이미 지워진 키예요.', fix: '⚙️ 설정에서 키를 다시 넣어 주세요. 키는 sk-로 시작해요.', settingsFocus: 'key-input' };
  }
  if (status === 404 || (/model/i.test(text) && /(not exist|not found|does not have access|invalid)/i.test(text))) {
    return { ...result, problem: `"${model}" 모델을 찾을 수 없거나, 이 키로 쓸 권한이 없어요.`, fix: '모델 "바꾸기"에서 다른 모델(예: chat-latest)을 골라 주세요.', settingsFocus: modelFieldId };
  }
  if (status === 429 && /(quota|billing|credit)/i.test(text)) {
    return { ...result, problem: 'OpenAI 크레딧(잔액)이 부족해요.', fix: 'platform.openai.com의 Billing에서 크레딧을 충전해 주세요. ChatGPT 구독(Plus)과 API 요금은 따로예요.' };
  }
  if (status === 429) {
    return { ...result, problem: '짧은 시간에 요청이 너무 많았어요.', fix: '1분쯤 기다렸다가 다시 눌러 주세요.' };
  }
  if (status === 403) {
    return { ...result, problem: '이 키(계정)로는 이 기능을 쓸 수 없어요.', fix: 'OpenAI 계정의 조직 인증(Verify Organization)과 프로젝트 권한을 확인하거나, 다른 모델을 골라 주세요.', settingsFocus: modelFieldId };
  }
  if (status >= 500) {
    return { ...result, problem: 'OpenAI 서버에 잠시 문제가 있어요.', fix: '조금 뒤에 다시 눌러 주세요.' };
  }
  if (/(context length|maximum context|too many tokens)/i.test(text)) {
    return { ...result, problem: '보낸 내용이 너무 길어요.', fix: '입력 내용을 조금 줄여서 다시 시도해 주세요.' };
  }
  if (/(safety|content_policy|content policy|moderation)/i.test(text)) {
    return { ...result, problem: 'OpenAI 안전 기준에 걸려서 거절됐어요.', fix: '장면·문구에서 문제가 될 만한 표현을 바꿔서 다시 시도해 주세요.' };
  }
  if (/(size|quality)/i.test(text) && modelFieldId === 'image-model') {
    return { ...result, problem: '고른 그림 크기나 품질을 이 모델이 지원하지 않아요.', fix: '⚙️ 설정에서 크기·품질을 바꾸거나 다른 그림 모델을 골라 주세요.', settingsFocus: modelFieldId };
  }
  if (/(unsupported|not supported|unrecognized)/i.test(text)) {
    return { ...result, problem: '이 모델이 지원하지 않는 설정이 들어갔어요.', fix: '모델 "바꾸기"에서 다른 모델을 골라 주세요.', settingsFocus: modelFieldId };
  }
  return { ...result, problem: 'OpenAI가 요청을 거절했어요.', fix: '아래 "자세한 내용"을 확인하고, 다시 시도하거나 다른 모델을 골라 주세요.', settingsFocus: modelFieldId };
}
