// ☁️ 다른 기기에서도 보기 (동기화): 회사 데이터를 비밀번호로 잠가서 비공개 GitHub Gist에 올림
//
// - 처음 한 기기에서 GitHub 토큰 + 비밀번호로 "처음 만들기" → 연결 코드가 생김
// - 다른 기기에서는 연결 코드 + 비밀번호로 "연결하기" (연결 코드 안에 토큰과 Gist id가 들어 있음)
// - 고칠 때마다 잠시 뒤 올리고, 앱을 열거나 다시 볼 때 다른 기기에서 바뀐 게 있으면 받아 옴
// - 직원(직원 데이터·설정·API 키)이 함께 옮겨 가고, Uplika 연결만 기기마다 따로 합니다.

import { loadSync, saveSync } from "./store.js";
import { createGist, readGist, writeGist } from "./gist.js";
import { newSalt, makeKey, seal, unseal, exportKey, importKey } from "./lock.js";

const PUSH_DELAY = 3000; // 고친 뒤 이만큼 기다렸다 올림
const RETRY_DELAY = 10000; // 직원이 일하는 중이면 이만큼 뒤에 다시 받기
const MIN_PASSWORD = 4;
const CODE_PREFIX = "AIO1.";

const setupBox = document.getElementById("sync-setup");
const connectedBox = document.getElementById("sync-connected");
const codeText = document.getElementById("sync-code-text");
const messageText = document.getElementById("sync-message");
const statusText = document.getElementById("sync-status");

let app;
let sync = loadSync(); // 연결 안 했으면 null
let key = null;
let timer = null;
let busy = false;

export async function initSync(appApi) {
  app = appApi;
  document.getElementById("sync-create").addEventListener("click", () => run(create));
  document.getElementById("sync-connect").addEventListener("click", () => run(connect));
  document.getElementById("sync-copy").addEventListener("click", () => run(copyCode));
  document.getElementById("sync-now").addEventListener("click", () => run(pull));
  document.getElementById("sync-disconnect").addEventListener("click", disconnect);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pull();
  });
  renderSyncBox();
  if (sync) {
    key = await importKey(sync.key);
    pull();
  }
}

async function run(action) {
  messageText.textContent = "";
  try {
    await action();
  } catch (error) {
    messageText.textContent = error.message;
  }
}

// app.save()가 부름: 바뀐 게 있으니 잠시 뒤 올림
export function markChanged() {
  if (!sync) return;
  sync.dirty = true;
  saveSync(sync);
  showStatus("☁️ 올릴 준비 중…");
  clearTimeout(timer);
  timer = setTimeout(push, PUSH_DELAY);
}

// ---- 연결 코드 = 토큰 + Gist id를 한 줄 글자로 ----

function makeCode(token, gistId) {
  return CODE_PREFIX + btoa(JSON.stringify({ t: token, g: gistId }));
}

function readCode(code) {
  try {
    const parsed = JSON.parse(atob(code.trim().slice(CODE_PREFIX.length)));
    if (code.trim().startsWith(CODE_PREFIX) && parsed.t && parsed.g) return { token: parsed.t, gistId: parsed.g };
  } catch (error) {
    // 아래에서 안내
  }
  throw new Error("연결 코드가 올바르지 않아요. 처음 만든 기기에서 \"코드 복사\"로 다시 복사해 주세요.");
}

// ---- 올리기·받기 ----

async function pack(savedAt) {
  const content = JSON.stringify({ data: app.state.data, settings: app.state.settings });
  return JSON.stringify({ app: "AI 사무실", savedAt, box: await seal(key, sync.salt, content) });
}

async function readRemote(token, gistId) {
  const outer = JSON.parse(await readGist(token, gistId));
  return { savedAt: outer.savedAt, box: outer.box };
}

async function openRemote(remote) {
  return JSON.parse(await unseal(key, remote.box));
}

async function upload() {
  const savedAt = Date.now();
  await writeGist(sync.token, sync.gistId, await pack(savedAt));
  sync.remoteSavedAt = savedAt;
  sync.dirty = false;
  saveSync(sync);
  showStatus(`☁️ 올림 ${timeText(savedAt)}`);
}

async function push() {
  if (!sync || !key || !sync.dirty) return;
  if (busy) {
    timer = setTimeout(push, PUSH_DELAY);
    return;
  }
  busy = true;
  try {
    const remote = await readRemote(sync.token, sync.gistId);
    if (remote.savedAt > sync.remoteSavedAt) await resolveConflict(remote);
    else await upload();
  } catch (error) {
    showStatus(`☁️ 올리지 못했어요: ${error.message}`);
  } finally {
    busy = false;
  }
}

// 앱을 열 때·다시 볼 때: 다른 기기에서 바뀐 게 있으면 받아 옴
async function pull() {
  if (!sync || !key || busy) return;
  busy = true;
  try {
    const remote = await readRemote(sync.token, sync.gistId);
    if (remote.savedAt > sync.remoteSavedAt) {
      if (sync.dirty) await resolveConflict(remote);
      else await apply(remote);
    } else if (sync.dirty) {
      await upload(); // 지난번에 못 올린 것
    } else {
      showStatus(`☁️ 최신이에요 (${timeText(Date.now())} 확인)`);
    }
  } catch (error) {
    showStatus(`☁️ 받아 오지 못했어요: ${error.message}`);
  } finally {
    busy = false;
  }
}

async function apply(remote) {
  // 직원이 일하는 중에 데이터를 바꾸면 결과가 사라지므로, 끝난 뒤에 다시 받음
  if (app.isBusy()) {
    showStatus("☁️ 직원이 일하는 중이라 끝나면 받을게요");
    setTimeout(pull, RETRY_DELAY);
    return;
  }
  const content = await openRemote(remote);
  clearTimeout(timer);
  sync.remoteSavedAt = remote.savedAt;
  sync.dirty = false;
  saveSync(sync);
  app.replaceAll(content.data, content.settings);
  showStatus(`☁️ 다른 기기의 내용을 받았어요 (${timeText(remote.savedAt)})`);
}

async function resolveConflict(remote) {
  const takeRemote = window.confirm(
    `다른 기기에서 ${timeText(remote.savedAt)}에 바뀐 내용이 있는데, 이 기기에도 아직 안 올린 변경이 있어요.\n\n`
    + "확인: 다른 기기 내용 받기 (이 기기에서 바뀐 건 사라져요)\n취소: 이 기기 내용으로 올리기 (다른 기기에서 바뀐 건 사라져요)",
  );
  if (takeRemote) {
    await apply(remote);
  } else {
    sync.remoteSavedAt = remote.savedAt;
    await upload();
  }
}

// ---- 처음 만들기·연결하기·끊기 ----

function readPassword() {
  const password = document.getElementById("sync-password").value;
  if (password.length < MIN_PASSWORD) throw new Error(`비밀번호는 ${MIN_PASSWORD}자 이상이에요.`);
  return password;
}

// 이 기기의 회사로 새 Gist를 만듦
async function create() {
  const token = document.getElementById("sync-token").value.trim();
  const password = readPassword();
  if (!token) throw new Error("처음 만들 때는 GitHub 토큰이 필요해요.");
  messageText.textContent = "만드는 중…";
  const salt = newSalt();
  key = await makeKey(password, salt);
  sync = { token, gistId: "", key: await exportKey(key), salt, remoteSavedAt: 0, dirty: false };
  const savedAt = Date.now();
  try {
    sync.gistId = await createGist(token, await pack(savedAt));
  } catch (error) {
    sync = null;
    key = null;
    throw error;
  }
  sync.remoteSavedAt = savedAt;
  saveSync(sync);
  renderSyncBox();
  messageText.textContent = "만들었어요! 다른 기기에서 이 연결 코드와 비밀번호로 연결하세요.";
  showStatus(`☁️ 올림 ${timeText(savedAt)}`);
}

// 다른 기기에서 만든 회사에 연결: 받아서 이 기기 데이터를 바꿈
async function connect() {
  const { token, gistId } = readCode(document.getElementById("sync-code").value);
  const password = readPassword();
  if (app.isBusy()) throw new Error("직원이 일하는 중이에요. 끝난 뒤에 연결해 주세요.");
  messageText.textContent = "연결하는 중…";
  const remote = await readRemote(token, gistId);
  key = await makeKey(password, remote.box.salt);
  let content;
  try {
    content = await openRemote(remote);
  } catch (error) {
    key = null;
    throw new Error("비밀번호가 달라요.");
  }
  if (!window.confirm("이 기기의 사무실을 연결한 사무실 내용으로 바꿀까요? (이 기기에만 있던 내용은 사라져요)")) {
    key = null;
    messageText.textContent = "";
    return;
  }
  sync = { token, gistId, key: await exportKey(key), salt: remote.box.salt, remoteSavedAt: remote.savedAt, dirty: false };
  saveSync(sync);
  app.replaceAll(content.data, content.settings);
  renderSyncBox();
  messageText.textContent = "연결했어요!";
  showStatus(`☁️ 받음 ${timeText(remote.savedAt)}`);
}

async function copyCode() {
  const code = makeCode(sync.token, sync.gistId);
  try {
    await navigator.clipboard.writeText(code);
    messageText.textContent = "연결 코드를 복사했어요.";
  } catch (error) {
    messageText.textContent = "복사하지 못했어요. 위의 코드를 길게 눌러 직접 복사해 주세요.";
  }
}

function disconnect() {
  if (!window.confirm("이 기기의 동기화 연결을 끊을까요? (이 기기의 사무실은 그대로 남아요)")) return;
  clearTimeout(timer);
  saveSync(null);
  sync = null;
  key = null;
  renderSyncBox();
  messageText.textContent = "연결을 끊었어요.";
  showStatus("");
}

function renderSyncBox() {
  setupBox.hidden = Boolean(sync);
  connectedBox.hidden = !sync;
  codeText.textContent = sync ? makeCode(sync.token, sync.gistId) : "";
}

function showStatus(text) {
  statusText.textContent = text;
}

function timeText(ms) {
  const date = new Date(ms);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}
