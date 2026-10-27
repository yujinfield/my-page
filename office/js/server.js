// 사무실 서버(Cloudflare Workers, worker/office-server.js)와 주고받기. (DOM 사용 안 함)
// 서버를 설정하면 업무 지시는 서버가 처리하고, 사이트는 결과만 받아 옵니다. 창을 닫아도 일이 계속됩니다.

export function serverReady(settings) {
  return Boolean(settings.serverUrl && settings.serverToken);
}

async function call(settings, path, options = {}) {
  const url = settings.serverUrl.replace(/\/+$/, "") + path;
  let response;
  try {
    response = await fetch(url, {
      ...options,
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.serverToken}` },
    });
  } catch (error) {
    throw new Error("사무실 서버에 연결하지 못했어요. 서버 주소와 인터넷 연결을 확인해 주세요.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `사무실 서버 오류 (${response.status})`);
  return data;
}

// 연결 확인 → { ok, openai, db }
export function pingServer(settings) {
  return call(settings, "/ping");
}

// 업무 맡기기: { id, model, messages, tools }
export function submitJob(settings, job) {
  return call(settings, "/jobs", { method: "POST", body: JSON.stringify(job) });
}

// 업무 상태 → [{ id, status: "pending" | "running" | "done" | "failed", result, error }]
export async function fetchJobs(settings, ids) {
  const data = await call(settings, `/jobs?ids=${ids.map(encodeURIComponent).join(",")}`);
  return data.jobs || [];
}

// 결과를 받아 갔으면 서버에서 지움
export function ackJob(settings, id) {
  return call(settings, `/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// 승인한 완료 보고를 네이버 블로그에 임시 저장: { mcpUrl, accessToken, title, content } → { blog }
export function saveNaverDraft(settings, draft) {
  return call(settings, "/uplika/draft", { method: "POST", body: JSON.stringify(draft) });
}
