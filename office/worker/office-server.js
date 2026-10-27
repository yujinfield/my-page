// AI 사무실 서버 (Cloudflare Workers에 붙여 넣는 코드)
//
// 하는 일
// 1. 업무 처리: 사이트가 맡긴 업무를 저장하고 GPT에 물어 결과를 저장합니다. 사이트 창을 닫아도 계속됩니다.
//    - 업무를 받으면 바로 시작하고, 1분마다 도는 크론이 남은 업무·멈춘 업무를 다시 처리합니다. (최대 3번 시도)
//    - 사이트는 결과를 받아 간 뒤 지웁니다. 7일이 지난 업무도 지웁니다.
//    - 업무에 이미지를 함께 맡기면 글 결과가 나온 뒤 이미지도 만들어 저장합니다.
// 2. Uplika 승인 중계 (?url=): Uplika가 다른 사이트의 브라우저 요청을 막아서 승인 요청만 대신 전달합니다.
// 3. 네이버 임시 저장 (/uplika/draft): 대표님이 완료 보고의 승인 버튼을 눌렀을 때만, Uplika로 네이버 블로그에 임시 저장합니다.
//
// Cloudflare 설정 (자세한 순서는 README.md)
// - 비밀 변수 OPENAI_API_KEY: OpenAI API 키
// - 비밀 변수 OFFICE_TOKEN: 사무실 서버 비밀번호 (사이트 설정에 같은 값을 넣음)
// - D1 데이터베이스 바인딩 이름 DB
// - 크론 트리거 "* * * * *" (1분마다)
//
// 이 파일은 AI 사무실 사이트에서 쓰지 않고, Cloudflare에 붙여 넣는 용도입니다.

const ALLOWED_ORIGINS = ["https://yujinfield.github.io", "http://localhost:8000"];
const STALE_MS = 5 * 60 * 1000;           // 이만큼 지나도 "처리 중"이면 멈춘 것으로 보고 다시 처리
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;  // 업무 보관 기간
const MAX_ATTEMPTS = 3;
const MAX_IDS = 50;

// ---- 응답 ----

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

// ---- 저장소 (D1) ----

let tableReady = false;

async function ensureTable(env) {
  if (tableReady) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    payload TEXT NOT NULL,
    result TEXT,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    finished_at INTEGER
  )`).run();
  // 이미지 칸은 나중에 생김: 예전에 만든 표에도 추가 (이미 있으면 오류가 나므로 무시)
  try {
    await env.DB.prepare("ALTER TABLE jobs ADD COLUMN image TEXT").run();
  } catch (error) {
    // 이미 있음
  }
  tableReady = true;
}

// ---- GPT ----

async function askGpt(env, { model, messages, tools }) {
  const useTools = Array.isArray(tools) && tools.length > 0;
  const url = useTools ? "https://api.openai.com/v1/responses" : "https://api.openai.com/v1/chat/completions";
  const body = useTools ? { model, input: messages, tools } : { model, messages };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GPT 요청 실패 (${response.status}) ${data.error?.message || ""}`.trim());
  if (!useTools) return data.choices[0].message.content.trim();

  // Responses API: 도구 호출 기록은 건너뛰고 글자만 모음
  const texts = [];
  (data.output || []).forEach((item) => {
    if (item.type !== "message") return;
    item.content.forEach((part) => {
      if (part.type === "output_text") texts.push(part.text);
    });
  });
  return texts.join("\n").trim() || "(답이 비어 있어요)";
}

// 이미지 만들기 → base64 글자 (webp)
async function makeImage(env, { model, prompt }) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, prompt, size: "1024x1024", quality: "medium", output_format: "webp", output_compression: 80 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`이미지 요청 실패 (${response.status}) ${data.error?.message || ""}`.trim());
  return data.data[0].b64_json;
}

// ---- 업무 처리 ----

// 업무 하나를 처리. 다른 곳(크론 등)에서 이미 처리 중이면 건너뜀
async function runJob(env, id) {
  const now = Date.now();
  const claimed = await env.DB.prepare(
    "UPDATE jobs SET status = 'running', started_at = ?, attempts = attempts + 1 WHERE id = ? AND (status = 'pending' OR (status = 'running' AND started_at < ?))",
  ).bind(now, id, now - STALE_MS).run();
  if (!claimed.meta.changes) return;

  const row = await env.DB.prepare("SELECT payload, attempts FROM jobs WHERE id = ?").bind(id).first();
  try {
    const payload = JSON.parse(row.payload);
    let result = await askGpt(env, payload);
    let image = null;
    if (payload.image) {
      // 이미지가 실패해도 글 결과는 남김
      try {
        image = await makeImage(env, { model: payload.image.model, prompt: `${payload.image.prompt}\n\n참고한 업무 결과:\n${result.slice(0, 1500)}` });
      } catch (error) {
        result += `\n\n(이미지는 만들지 못했어요: ${error.message})`;
      }
    }
    await env.DB.prepare("UPDATE jobs SET status = 'done', result = ?, image = ?, error = NULL, finished_at = ? WHERE id = ?")
      .bind(result, image, Date.now(), id).run();
  } catch (error) {
    // 3번까지는 크론이 다시 시도, 그 뒤에는 실패로 남김
    const status = row.attempts >= MAX_ATTEMPTS ? "failed" : "pending";
    await env.DB.prepare("UPDATE jobs SET status = ?, error = ?, finished_at = ? WHERE id = ?")
      .bind(status, String(error.message || error), Date.now(), id).run();
  }
}

async function runPending(env) {
  await ensureTable(env);
  const now = Date.now();
  const { results } = await env.DB.prepare(
    "SELECT id FROM jobs WHERE status = 'pending' OR (status = 'running' AND started_at < ?) ORDER BY created_at LIMIT 5",
  ).bind(now - STALE_MS).all();
  for (const row of results) await runJob(env, row.id);
  await env.DB.prepare("DELETE FROM jobs WHERE created_at < ?").bind(now - KEEP_MS).run();
}

// ---- 업무 API ----

async function handleJobs(request, env, ctx, url, origin) {
  await ensureTable(env);

  // 업무 맡기기: { id, model, messages, tools }
  if (request.method === "POST" && url.pathname === "/jobs") {
    const job = await request.json().catch(() => null);
    if (!job || typeof job.id !== "string" || !job.model || !Array.isArray(job.messages)) {
      return json(400, { error: "업무 형식이 올바르지 않아요." }, origin);
    }
    const payload = JSON.stringify({ model: job.model, messages: job.messages, tools: job.tools || null, image: job.image || null });
    await env.DB.prepare("INSERT OR IGNORE INTO jobs (id, status, payload, created_at) VALUES (?, 'pending', ?, ?)")
      .bind(job.id, payload, Date.now()).run();
    ctx.waitUntil(runJob(env, job.id)); // 바로 시작 (중간에 끊기면 크론이 이어서 함)
    return json(200, { ok: true }, origin);
  }

  // 업무 상태 보기: /jobs?ids=a,b,c
  if (request.method === "GET" && url.pathname === "/jobs") {
    const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, MAX_IDS);
    if (ids.length === 0) return json(200, { jobs: [] }, origin);
    const marks = ids.map(() => "?").join(",");
    const { results } = await env.DB.prepare(`SELECT id, status, result, error, image FROM jobs WHERE id IN (${marks})`)
      .bind(...ids).all();
    return json(200, { jobs: results }, origin);
  }

  // 결과를 받아 갔으면 지우기: DELETE /jobs/<id>
  if (request.method === "DELETE" && url.pathname.startsWith("/jobs/")) {
    const id = decodeURIComponent(url.pathname.slice("/jobs/".length));
    await env.DB.prepare("DELETE FROM jobs WHERE id = ?").bind(id).run();
    return json(200, { ok: true }, origin);
  }

  return json(404, { error: "없는 주소예요." }, origin);
}

// ---- Uplika 도구 직접 부르기 (MCP) ----
// 대표님이 승인 버튼을 눌렀을 때만 씁니다. GPT를 거치지 않으므로 보고 내용이 그대로 들어갑니다.

const MCP_VERSION = "2025-06-18";

async function mcpPost(mcpUrl, token, sessionId, message) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`,
    "MCP-Protocol-Version": MCP_VERSION,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  const response = await fetch(mcpUrl, { method: "POST", headers, body: JSON.stringify(message) });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    if (response.status === 401) throw new Error("Uplika 연결이 끝났어요. 설정에서 Uplika를 다시 연결해 주세요.");
    throw new Error(`Uplika 응답 오류 (${response.status}) ${detail}`.trim());
  }
  return response;
}

// JSON이나 SSE(data: …) 답에서 id가 맞는 메시지를 꺼냄
async function readRpc(response, id) {
  const text = await response.text();
  const isStream = (response.headers.get("Content-Type") || "").includes("text/event-stream");
  const pieces = isStream
    ? text.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim())
    : [text];
  for (const piece of pieces) {
    try {
      const message = JSON.parse(piece);
      if (message.id === id) return message;
    } catch (error) {
      // 다음 조각
    }
  }
  throw new Error("Uplika 답을 읽지 못했어요.");
}

// 도구 하나 부르기 → 글자 결과
async function callUplikaTool(mcpUrl, token, name, args) {
  const init = await mcpPost(mcpUrl, token, null, {
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: MCP_VERSION, capabilities: {}, clientInfo: { name: "ai-office", version: "1" } },
  });
  const sessionId = init.headers.get("Mcp-Session-Id");
  const ready = await readRpc(init, 1);
  if (ready.error) throw new Error(ready.error.message);
  await mcpPost(mcpUrl, token, sessionId, { jsonrpc: "2.0", method: "notifications/initialized" });

  const response = await mcpPost(mcpUrl, token, sessionId, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } });
  const message = await readRpc(response, 2);
  if (message.error) throw new Error(message.error.message);
  const text = (message.result?.content || []).filter((part) => part.type === "text").map((part) => part.text).join("\n");
  if (message.result?.isError) throw new Error(text || "Uplika 도구 오류");
  return text;
}

// 네이버 블로그 임시 저장: { mcpUrl, accessToken, title, content }
async function saveNaverDraft(request, origin) {
  const body = await request.json().catch(() => null);
  if (!body || !body.mcpUrl || !body.accessToken || !body.title || !body.content) {
    return json(400, { error: "제목과 본문, Uplika 연결이 필요해요." }, origin);
  }
  if (!isUplika(new URL(body.mcpUrl).hostname)) return json(403, { error: "Uplika 주소만 돼요." }, origin);

  const accounts = JSON.parse(await callUplikaTool(body.mcpUrl, body.accessToken, "list_accounts", {}));
  const blog = (accounts.data || []).find((account) => account.platform === "naver_blog" && account.status === "active");
  if (!blog) return json(400, { error: "Uplika에 연결된 네이버 블로그가 없어요." }, origin);

  const result = await callUplikaTool(body.mcpUrl, body.accessToken, "publish", {
    accountIds: [blog.id],
    content: body.content,
    options: { naver_blog: { title: body.title.slice(0, 100), draftOnly: true, layout: "as-is" } },
  });
  return json(200, { ok: true, blog: blog.displayName || blog.handle, result: result.slice(0, 500) }, origin);
}

// ---- Uplika 승인 중계 ----

function isUplika(host) {
  return host === "uplika.com" || host.endsWith(".uplika.com");
}

async function proxyUplika(request, url, origin) {
  if (request.method !== "GET" && request.method !== "POST") return json(405, { error: "GET, POST만 돼요." }, origin);
  let target;
  try {
    target = new URL(url.searchParams.get("url"));
  } catch (error) {
    return json(400, { error: "url이 올바르지 않아요." }, origin);
  }
  if (target.protocol !== "https:" || !isUplika(target.hostname)) return json(403, { error: "Uplika 주소만 전달해요." }, origin);

  // 쿠키 등은 빼고, 필요한 것만 전달
  const headers = { Accept: request.headers.get("Accept") || "application/json" };
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers["Content-Type"] = contentType;
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "POST" ? await request.text() : undefined,
    redirect: "follow",
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { ...corsHeaders(origin), "Content-Type": response.headers.get("Content-Type") || "application/json" },
  });
}

// ---- 시작점 ----

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response("허락되지 않은 사이트예요.", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

    const url = new URL(request.url);
    if (url.searchParams.has("url")) return proxyUplika(request, url, origin);

    if (!env.OFFICE_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.OFFICE_TOKEN}`) {
      return json(401, { error: "사무실 서버 비밀번호가 달라요." }, origin);
    }
    // 연결 확인: 설정이 다 됐는지 알려 줌
    if (url.pathname === "/ping") {
      return json(200, { ok: true, openai: Boolean(env.OPENAI_API_KEY), db: Boolean(env.DB) }, origin);
    }
    if (request.method === "POST" && url.pathname === "/uplika/draft") {
      try {
        return await saveNaverDraft(request, origin);
      } catch (error) {
        return json(502, { error: error.message }, origin);
      }
    }
    if (!env.DB) return json(500, { error: "D1 데이터베이스(DB)가 연결되지 않았어요." }, origin);
    return handleJobs(request, env, ctx, url, origin);
  },

  // 크론 (1분마다): 남은 업무·멈춘 업무 처리, 오래된 업무 정리
  async scheduled(event, env, ctx) {
    if (env.DB) ctx.waitUntil(runPending(env));
  },
};
