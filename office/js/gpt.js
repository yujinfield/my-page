// OpenAI(GPT)에 말을 보내고 답을 받아 옵니다.
// 보통은 Chat Completions, 도구(Uplika 등)를 쓸 때는 Responses API를 씁니다.
// 문서: https://platform.openai.com/docs/api-reference/chat
//       https://platform.openai.com/docs/api-reference/responses

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const IMAGES_URL = "https://api.openai.com/v1/images/generations";

// 지금 GPT 답을 기다리는 중인지 (동기화가 데이터를 바꾸지 않게)
let running = 0;
export function isGptRunning() {
  return running > 0;
}

// messages: [{ role: "system" | "user" | "assistant", content: "..." }]
// json: true면 답을 JSON 글자로 받음
// tools: GPT가 쓸 수 있는 도구 목록 (없으면 null)
export async function askGpt(settings, messages, options = {}) {
  if (!settings.apiKey) {
    throw new Error("오른쪽 위 ⚙︎ 설정에서 OpenAI API 키를 먼저 넣어 주세요.");
  }
  running += 1;
  try {
    return await ask(settings, messages, options);
  } finally {
    running -= 1;
  }
}

async function ask(settings, messages, { json = false, tools = null }) {
  if (tools && tools.length) {
    const data = await post(RESPONSES_URL, settings.apiKey, { model: settings.model, input: messages, tools });
    return outputText(data);
  }

  const body = { model: settings.model, messages };
  if (json) body.response_format = { type: "json_object" };
  const data = await post(CHAT_URL, settings.apiKey, body);
  return data.choices[0].message.content.trim();
}

async function post(url, apiKey, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error("GPT에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.json()).error.message;
    } catch (error) {
      detail = "";
    }
    throw new Error(`GPT 요청이 실패했어요 (${response.status}). ${detail}`);
  }
  return response.json();
}

// Responses API 답에서 글자만 모음 (도구 호출 기록은 건너뜀)
function outputText(data) {
  const texts = [];
  (data.output || []).forEach((item) => {
    if (item.type !== "message") return;
    item.content.forEach((part) => {
      if (part.type === "output_text") texts.push(part.text);
    });
  });
  return texts.join("\n").trim() || "(답이 비어 있어요)";
}

// 이미지 만들기 → base64 글자 (webp). 문서: https://platform.openai.com/docs/api-reference/images
export async function makeImage(settings, { model, prompt }) {
  if (!settings.apiKey) throw new Error("설정에서 OpenAI API 키를 먼저 넣어 주세요.");
  running += 1;
  try {
    const data = await post(IMAGES_URL, settings.apiKey, {
      model, prompt, size: "1024x1024", quality: "medium", output_format: "webp", output_compression: 80,
    });
    return data.data[0].b64_json;
  } finally {
    running -= 1;
  }
}
