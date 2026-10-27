// AI 사무실 서버 (Cloudflare Workers에 붙여 넣는 코드)
//
// 하는 일
// 1. 업무 처리: 사이트가 맡긴 업무를 저장하고 GPT에 물어 결과를 저장합니다. 사이트 창을 닫아도 계속됩니다.
//    - 업무를 받으면 바로 시작하고, 1분마다 도는 크론이 남은 업무·멈춘 업무를 다시 처리합니다. (최대 3번 시도)
//    - 사이트는 결과를 받아 간 뒤 지웁니다. 7일이 지난 업무도 지웁니다.
// 2. Uplika 승인 중계 (?url=): Uplika가 다른 사이트의 브라우저 요청을 막아서 승인 요청만 대신 전달합니다.
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
    const result = await askGpt(env, JSON.parse(row.payload));
    await env.DB.prepare("UPDATE jobs SET status = 'done', result = ?, error = NULL, finished_at = ? WHERE id = ?")
      .bind(result, Date.now(), id).run();
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
    const payload = JSON.stringify({ model: job.model, messages: job.messages, tools: job.tools || null });
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
    const { results } = await env.DB.prepare(`SELECT id, status, result, error FROM jobs WHERE id IN (${marks})`)
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
    if (!env.DB) return json(500, { error: "D1 데이터베이스(DB)가 연결되지 않았어요." }, origin);
    return handleJobs(request, env, ctx, url, origin);
  },

  // 크론 (1분마다): 남은 업무·멈춘 업무 처리, 오래된 업무 정리
  async scheduled(event, env, ctx) {
    if (env.DB) ctx.waitUntil(runPending(env));
  },
};
