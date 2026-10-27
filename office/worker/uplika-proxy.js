// Uplika 승인 중계 서버 (Cloudflare Workers에 붙여 넣는 코드)
//
// Uplika는 다른 웹사이트에서 브라우저로 직접 오는 승인 요청을 받지 않습니다(CORS).
// 그래서 AI 사무실이 이 중계 서버에 "이 주소로 대신 물어봐 줘"라고 부탁합니다.
//   사용: https://<중계 서버 주소>/?url=<Uplika 주소>
//
// - Uplika 주소(uplika.com, *.uplika.com)로만 전달합니다. 다른 곳은 거절합니다.
// - ALLOWED_ORIGINS에 있는 사이트에서 온 요청만 받습니다.
// - 아무것도 저장하지 않습니다. 받은 요청을 그대로 전달하고 답을 돌려줄 뿐입니다.
// 이 파일은 AI 사무실 사이트에서 쓰지 않고, Cloudflare에 붙여 넣는 용도입니다.

const ALLOWED_ORIGINS = ["https://yujinfield.github.io", "http://localhost:8000"];

function isUplika(host) {
  return host === "uplika.com" || host.endsWith(".uplika.com");
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function reply(status, text, origin) {
  return new Response(text, { status, headers: { ...corsHeaders(origin), "Content-Type": "text/plain; charset=utf-8" } });
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    if (!ALLOWED_ORIGINS.includes(origin)) return reply(403, "허락되지 않은 사이트예요.", "null");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== "GET" && request.method !== "POST") return reply(405, "GET, POST만 돼요.", origin);

    let target;
    try {
      target = new URL(new URL(request.url).searchParams.get("url"));
    } catch (error) {
      return reply(400, "url이 올바르지 않아요.", origin);
    }
    if (target.protocol !== "https:" || !isUplika(target.hostname)) return reply(403, "Uplika 주소만 전달해요.", origin);

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
  },
};
