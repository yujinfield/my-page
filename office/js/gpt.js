// OpenAI(GPT)에 말을 보내고 답을 받아 옵니다.
// 보통은 Chat Completions, 도구(Uplika 등)를 쓸 때는 Responses API를 씁니다.
// 문서: https://platform.openai.com/docs/api-reference/chat
//       https://platform.openai.com/docs/api-reference/responses

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const RESPONSES_URL = "https://api.openai.com/v1/responses";

// messages: [{ role: "system" | "user" | "assistant", content: "..." }]
// json: true면 답을 JSON 글자로 받음
// tools: GPT가 쓸 수 있는 도구 목록 (없으면 null)
export async function askGpt(settings, messages, { json = false, tools = null } = {}) {
  if (!settings.apiKey) {
    throw new Error("오른쪽 위 ⚙︎ 설정에서 OpenAI API 키를 먼저 넣어 주세요.");
  }

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
