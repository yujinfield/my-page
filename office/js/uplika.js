// Uplika 연결: MCP 서버 승인(OAuth + PKCE)을 브라우저에서 처리하고, GPT에 넘길 도구 설정을 만듭니다.
// 흐름: 승인 정보 찾기 → 이 사이트를 앱으로 등록 → Uplika 승인 화면 → 돌아와서 출입증(토큰) 받기

import { loadUplikaAuth, saveUplikaAuth, loadUplikaPending, saveUplikaPending } from "./store.js";

// 직원들에게는 조회만 허락합니다. (발행·댓글·DM 같은 도구는 넣지 않음)
const READ_ONLY_TOOLS = [
  "list_accounts",
  "list_platforms",
  "get_insights",
  "list_posts",
  "get_post",
  "list_channel_posts",
  "list_replies",
  "list_mentions",
  "diagnose_naver_blog",
  "get_naver_visibility",
  "check_naver_visibility",
  "research_naver_keywords",
  "expand_naver_keywords",
  "get_naver_keyword_history",
  "list_naver_keyword_reports",
];

// 승인 후 돌아올 주소 = 지금 이 페이지
function redirectUri() {
  return location.origin + location.pathname;
}

async function getJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error(`${new URL(url).host}에 연결하지 못했어요. Uplika가 다른 사이트에서의 연결을 막았을 수 있어요.`);
  }
  if (!response.ok) throw new Error(`Uplika 응답 오류 (${response.status}, ${new URL(url).pathname})`);
  return response.json();
}

// 주소 여러 개를 차례로 시도해서 처음 성공한 JSON을 돌려줌
async function firstJson(urls) {
  for (const url of urls) {
    try {
      return await getJson(url);
    } catch (error) {
      // 다음 주소 시도
    }
  }
  return null;
}

// MCP 서버 주소에서 승인 서버 정보를 찾음
async function discover(serverUrl) {
  const server = new URL(serverUrl);
  const path = server.pathname === "/" ? "" : server.pathname;
  const resource = await firstJson([
    `${server.origin}/.well-known/oauth-protected-resource${path}`,
    `${server.origin}/.well-known/oauth-protected-resource`,
  ]);

  const issuer = new URL(resource?.authorization_servers?.[0] ?? server.origin);
  const issuerPath = issuer.pathname === "/" ? "" : issuer.pathname;
  const meta = await firstJson([
    `${issuer.origin}/.well-known/oauth-authorization-server${issuerPath}`,
    `${issuer.origin}/.well-known/openid-configuration${issuerPath}`,
  ]);
  if (!meta) {
    throw new Error("Uplika 승인 정보를 찾지 못했어요. 서버 주소가 맞는지 확인해 주세요. 맞는데도 이러면 Uplika가 다른 사이트에서의 연결을 막은 거예요.");
  }
  return { meta, scopes: resource?.scopes_supported ?? meta.scopes_supported ?? [] };
}

function base64url(bytes) {
  let text = "";
  bytes.forEach((byte) => {
    text += String.fromCharCode(byte);
  });
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function challengeOf(verifier) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(hash));
}

// 1단계: Uplika 승인 화면으로 이동 (이 함수가 끝나면 페이지가 바뀜)
export async function startConnect(serverUrl) {
  const { meta, scopes } = await discover(serverUrl);
  if (!meta.registration_endpoint) throw new Error("Uplika가 새 앱 등록을 지원하지 않아요.");

  const client = await getJson(meta.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "AI 사무실",
      redirect_uris: [redirectUri()],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });

  const verifier = randomString();
  const state = randomString();
  saveUplikaPending({ serverUrl, clientId: client.client_id, tokenEndpoint: meta.token_endpoint, verifier, state });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: client.client_id,
    redirect_uri: redirectUri(),
    code_challenge: await challengeOf(verifier),
    code_challenge_method: "S256",
    state,
    resource: serverUrl,
  });
  if (scopes.length) params.set("scope", scopes.join(" "));
  location.href = `${meta.authorization_endpoint}?${params}`;
}

function requestToken(endpoint, fields) {
  return getJson(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
}

function saveToken(base, token) {
  saveUplikaAuth({
    serverUrl: base.serverUrl,
    clientId: base.clientId,
    tokenEndpoint: base.tokenEndpoint,
    accessToken: token.access_token,
    refreshToken: token.refresh_token || base.refreshToken || "",
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : 0,
  });
}

// 2단계: 승인 화면에서 돌아왔으면 출입증을 받음. 돌아온 게 아니면 null
export async function finishConnect() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const error = params.get("error");
  if (!code && !error) return null;

  history.replaceState(null, "", redirectUri()); // 주소창의 code를 지움
  const pending = loadUplikaPending();
  saveUplikaPending(null);
  if (error) throw new Error(`Uplika 승인이 되지 않았어요 (${error}).`);
  if (!pending || params.get("state") !== pending.state) {
    throw new Error("Uplika 승인 확인에 실패했어요. 설정에서 다시 연결해 주세요.");
  }

  const token = await requestToken(pending.tokenEndpoint, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    client_id: pending.clientId,
    code_verifier: pending.verifier,
    resource: pending.serverUrl,
  });
  saveToken(pending, token);
  return "Uplika가 연결됐어요! 이제 직원들이 회의와 업무 때 내 계정을 조회해요.";
}

export function isUplikaConnected() {
  return Boolean(loadUplikaAuth());
}

export function disconnectUplika() {
  saveUplikaAuth(null);
}

// GPT에 넘길 도구 목록. 연결 안 했으면 null
export async function uplikaTools() {
  let auth = loadUplikaAuth();
  if (!auth) return null;

  // 출입증이 곧 끝나면 새로 받음
  if (auth.expiresAt && auth.expiresAt < Date.now() + 60000) {
    if (!auth.refreshToken) {
      saveUplikaAuth(null);
      throw new Error("Uplika 연결이 끝났어요. 설정에서 다시 연결해 주세요.");
    }
    const token = await requestToken(auth.tokenEndpoint, {
      grant_type: "refresh_token",
      refresh_token: auth.refreshToken,
      client_id: auth.clientId,
      resource: auth.serverUrl,
    });
    saveToken(auth, token);
    auth = loadUplikaAuth();
  }

  return [{
    type: "mcp",
    server_label: "uplika",
    server_url: auth.serverUrl,
    authorization: auth.accessToken,
    require_approval: "never",
    allowed_tools: READ_ONLY_TOOLS,
  }];
}
