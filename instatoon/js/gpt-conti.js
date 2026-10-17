// GPT(OpenAI)로 콘티 쓰기
// Claude 자동 작성(ai-conti.js)과 같은 요청문·같은 JSON 형식을 씁니다. API 키는 그림 생성과 같은 OpenAI 키예요.
// 공용 링크(github.io)나 내 컴퓨터에서 열었을 때 동작합니다. (claude.ai 링크는 외부 인터넷이 막혀 있음)

import { explainOpenAiError } from './image-gen.js';

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

// 고를 수 있는 글쓰기 모델 (이름이 바뀌면 "직접 입력")
export const TEXT_MODELS = [
  { value: 'gpt-5.5', label: 'gpt-5.5 (기본, OpenAI 추천)' },
  { value: 'chat-latest', label: 'chat-latest (가장 최신 채팅 모델)' },
  { value: 'custom', label: '직접 입력' },
];

const SYSTEM_MESSAGE = '너는 인스타그램 @꼼쥐의 콘텐츠 기획자다. 요청한 형식의 JSON 객체 하나만 출력한다. 설명 문장이나 코드블록 표시 없이 JSON만.';

// 요청문 → JSON 객체 (실패하면 Error)
export async function writeContiWithGpt({ apiKey, model, prompt, signal }) {
  let response;
  try {
    response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
      signal,
    });
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error('멈췄어요. 지금 있던 컷은 그대로예요.');
    throw new Error('OpenAI에 연결하지 못했어요. 인터넷 연결을 확인하거나, 공용 링크·내 컴퓨터에서 열었는지 확인해 주세요.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && data.error && data.error.message;
    throw new Error(explainOpenAiError(response.status, detail));
  }

  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  const content = choice && choice.message ? choice.message.content : '';
  if (choice && choice.finish_reason === 'length') {
    throw new Error('답이 너무 길어서 중간에 끊겼어요. 핵심 정보를 조금 줄이거나 다시 눌러 주세요.');
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error('GPT의 답을 컷으로 바꾸지 못했어요. 다시 눌러 주세요.');
  }
}
