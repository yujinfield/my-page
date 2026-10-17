// GPT(OpenAI)로 콘티 쓰기
// Claude 자동 작성(ai-conti.js)과 같은 요청문·같은 JSON 형식을 씁니다. API 키는 그림 생성과 같은 OpenAI 키예요.
// 공용 링크(github.io)나 내 컴퓨터에서 열었을 때 동작합니다. (claude.ai 링크는 외부 인터넷이 막혀 있음)

import { makeError, describeOpenAiError, CONNECT_ERROR } from './errors.js';
import { extractJson } from './conti-import.js';

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_MESSAGE = '너는 인스타그램 @꼼쥐의 콘텐츠 기획자다. 요청한 형식의 JSON 객체 하나만 출력한다. 설명 문장이나 코드블록 표시 없이 JSON만.';

// OpenAI에 한 번 요청
async function requestChat({ apiKey, model, prompt, signal, jsonMode }) {
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_MESSAGE },
      { role: 'user', content: prompt },
    ],
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  try {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
    const data = await response.json().catch(() => null);
    return { response, data };
  } catch (error) {
    if (error && error.name === 'AbortError') throw makeError({ problem: '멈췄어요. 지금 있던 컷은 그대로예요.' });
    throw makeError(CONNECT_ERROR);
  }
}

// 요청문 → JSON 객체 (실패하면 Error)
// JSON 모드를 받지 않는 모델이면 JSON 모드 없이 한 번 더 시도하고, 답에서 JSON을 찾아 읽어요.
export async function writeContiWithGpt({ apiKey, model, prompt, signal }) {
  let { response, data } = await requestChat({ apiKey, model, prompt, signal, jsonMode: true });

  let detail = data && data.error && data.error.message;
  if (!response.ok && response.status === 400 && /response_format|json/i.test(detail || '')) {
    ({ response, data } = await requestChat({ apiKey, model, prompt, signal, jsonMode: false }));
    detail = data && data.error && data.error.message;
  }

  if (!response.ok) {
    throw makeError(describeOpenAiError(response.status, detail, model, 'text-model'));
  }

  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  const content = choice && choice.message ? choice.message.content || '' : '';
  if (choice && choice.finish_reason === 'length') {
    throw makeError({ problem: 'GPT의 답이 너무 길어서 중간에 끊겼어요.', fix: '핵심 정보를 조금 줄이거나 다시 눌러 주세요.' });
  }
  const parsed = extractJson(content);
  if (!parsed) {
    throw makeError({
      problem: 'GPT의 답이 콘티 형식(JSON)이 아니었어요.',
      fix: '다시 눌러 주세요. 계속 그러면 모델 "바꾸기"에서 다른 모델을 골라 보세요.',
      detail: content.slice(0, 300) || '(빈 답)',
      settingsFocus: 'text-model',
    });
  }
  return parsed;
}
