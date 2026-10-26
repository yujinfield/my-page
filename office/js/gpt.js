// OpenAI(GPT)에 말을 보내고 답을 받아 옵니다.
// 문서: https://platform.openai.com/docs/api-reference/chat

const API_URL = "https://api.openai.com/v1/chat/completions";

// messages: [{ role: "system" | "user" | "assistant", content: "..." }]
// json: true면 답을 JSON 글자로 받음
export async function askGpt(settings, messages, { json = false } = {}) {
  if (!settings.apiKey) {
    throw new Error("오른쪽 위 ⚙︎ 설정에서 OpenAI API 키를 먼저 넣어 주세요.");
  }

  const body = { model: settings.model, messages };
  if (json) body.response_format = { type: "json_object" };

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
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

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
