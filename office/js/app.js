// 진입점. 상태(state)를 들고 사무실 화면·채용·회의·메신저를 연결합니다.

import { loadData, saveData, loadSettings, saveSettings, loadTheme, saveTheme, newId, migrate, DEFAULT_MODEL } from "./store.js";
import { isGptRunning } from "./gpt.js";
import { initSync, markChanged } from "./sync.js";
import { initScene, renderScene, say } from "./scene.js";
import { initHire, renderHire } from "./hire.js";
import { initMeeting, renderMeeting } from "./meeting.js";
import { initMessenger, renderMessenger, openChat, unreadCount, isChatVisible } from "./messenger.js";
import { initSheetPanel, renderSheetPanel } from "./sheet-panel.js";
import { serverReady, pingServer } from "./server.js";
import { startConnect, finishConnect, isUplikaConnected, disconnectUplika, setUplikaProxy } from "./uplika.js";

const state = {
  data: loadData(),
  settings: loadSettings(),
  tab: "messenger",
};

const tabButtons = document.querySelectorAll("[role=tab]");
const toast = document.getElementById("toast");
const settingsDialog = document.getElementById("settings-dialog");
const settingsForm = document.getElementById("settings-form");

// 다른 파일에서 쓰는 기능 모음
const app = {
  state,
  save,
  say,
  notify,
  addMessage,
  refreshAll,
  isBusy,
  replaceAll,
  saveSettings: saveSettingsNow,
};

// 설정을 바꾼 뒤 저장 (설정 창 밖에서 바꿀 때)
function saveSettingsNow() {
  saveSettings(state.settings);
  markChanged();
}

function save() {
  saveData(state.data);
  markChanged();
}

// 직원이 일하거나 GPT 답을 기다리는 중인지 (이때는 동기화로 데이터를 바꾸지 않음)
function isBusy() {
  return isGptRunning() || state.data.employees.some((employee) => employee.status === "working");
}

// 동기화로 받은 내용으로 통째로 바꿈
function replaceAll(data, settings) {
  const fixed = migrate(data);
  if (!fixed) return;
  state.data = fixed;
  state.settings = { ...state.settings, ...settings };
  setUplikaProxy(state.settings.serverUrl);
  saveData(state.data);
  saveSettings(state.settings);
  refreshAll();
}

function addMessage(employeeId, from, text, kind) {
  const message = { id: newId("msg"), employeeId, from, text, kind, time: Date.now(), read: from === "me" || isChatVisible(employeeId) };
  state.data.messages.push(message);
  return message;
}

function refreshAll() {
  renderScene();
  renderHire();
  renderMeeting();
  renderMessenger();
  renderSheetPanel();
  renderUnread();
}

function renderUnread() {
  const count = unreadCount();
  const badge = document.getElementById("messenger-badge");
  badge.textContent = count;
  badge.hidden = count === 0;
  document.title = count ? `(${count}) AI 사무실` : "AI 사무실";
}

// ---- 탭 ----

function showTab(name) {
  state.tab = name;
  tabButtons.forEach((button) => {
    const selected = button.dataset.tab === name;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    document.getElementById(`${button.dataset.tab}-panel`).hidden = !selected;
  });
  if (name === "messenger") {
    renderMessenger();
    renderUnread();
  }
}

tabButtons.forEach((button, index) => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
  // 방향키로 탭 이동
  button.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = tabButtons[(index + step + tabButtons.length) % tabButtons.length];
    next.focus();
    showTab(next.dataset.tab);
  });
});

// ---- 알림 ----

let toastTimer = null;
let toastEmployeeId = null;

function notify(text, employeeId) {
  toastEmployeeId = employeeId;
  toast.textContent = text.length > 60 ? `${text.slice(0, 60)}…` : text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 5000);
  renderUnread();
}

toast.addEventListener("click", () => {
  toast.hidden = true;
  if (toastEmployeeId) pickEmployee(toastEmployeeId);
});

function pickEmployee(employeeId) {
  showTab("messenger");
  openChat(employeeId);
  renderUnread();
}

// ---- 설정 ----

document.getElementById("btn-settings").addEventListener("click", () => {
  settingsForm.elements.apiKey.value = state.settings.apiKey;
  settingsForm.elements.model.value = state.settings.model;
  settingsForm.elements.about.value = state.settings.about;
  settingsForm.elements.uplikaUrl.value = state.settings.uplikaUrl;
  settingsForm.elements.serverUrl.value = state.settings.serverUrl;
  settingsForm.elements.serverToken.value = state.settings.serverToken;
  serverStatus.textContent = "";
  renderUplikaStatus();
  settingsDialog.showModal();
});

function saveSettingsForm() {
  state.settings = {
    ...state.settings,
    apiKey: settingsForm.elements.apiKey.value.trim(),
    model: settingsForm.elements.model.value.trim() || DEFAULT_MODEL,
    about: settingsForm.elements.about.value.trim(),
    uplikaUrl: settingsForm.elements.uplikaUrl.value.trim(),
    serverUrl: settingsForm.elements.serverUrl.value.trim(),
    serverToken: settingsForm.elements.serverToken.value.trim(),
  };
  saveSettings(state.settings);
  setUplikaProxy(state.settings.serverUrl);
  markChanged();
}

settingsForm.addEventListener("submit", (event) => {
  if (event.submitter && event.submitter.value === "cancel") return;
  saveSettingsForm();
});

// ---- 사무실 서버 ----

const serverStatus = document.getElementById("server-status");

document.getElementById("btn-server-ping").addEventListener("click", async () => {
  saveSettingsForm();
  if (!serverReady(state.settings)) {
    serverStatus.textContent = "서버 주소와 비밀번호를 넣어 주세요.";
    return;
  }
  serverStatus.textContent = "확인하는 중…";
  try {
    const result = await pingServer(state.settings);
    const missing = [!result.openai && "OPENAI_API_KEY", !result.db && "D1 데이터베이스(DB)"].filter(Boolean);
    serverStatus.textContent = missing.length
      ? `서버는 연결됐는데 Cloudflare 설정이 빠졌어요: ${missing.join(", ")}`
      : "✅ 연결됐어요. 이제 업무 지시는 서버가 처리해서 창을 닫아도 계속돼요.";
  } catch (error) {
    serverStatus.textContent = error.message;
  }
});

// ---- Uplika 연결 ----

const uplikaStatus = document.getElementById("uplika-status");

function renderUplikaStatus() {
  const connected = isUplikaConnected();
  uplikaStatus.textContent = connected ? "✅ 연결됨: 회의와 업무 때 직원들이 조회해요. (발행은 못 해요)" : "연결 안 됨";
  document.getElementById("btn-uplika-disconnect").hidden = !connected;
}

document.getElementById("btn-uplika-connect").addEventListener("click", async () => {
  if (!settingsForm.elements.uplikaUrl.value.trim()) {
    uplikaStatus.textContent = "서버 주소를 먼저 넣어 주세요.";
    return;
  }
  saveSettingsForm();
  uplikaStatus.textContent = "Uplika 승인 화면으로 이동하는 중…";
  try {
    await startConnect(state.settings.uplikaUrl);
  } catch (error) {
    uplikaStatus.textContent = error.message;
  }
});

document.getElementById("btn-uplika-disconnect").addEventListener("click", () => {
  disconnectUplika();
  renderUplikaStatus();
});

// ---- 테마 ----

function applyTheme(theme) {
  if (theme === "dark" || theme === "light") document.documentElement.dataset.theme = theme;
}

document.getElementById("btn-theme").addEventListener("click", () => {
  const current = document.documentElement.dataset.theme
    || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  saveTheme(next);
});

// ---- 시작 ----

applyTheme(loadTheme());
initScene({
  getEmployees: () => state.data.employees,
  onPick: pickEmployee,
  hasNews: (employee) => state.data.messages.some((message) => message.employeeId === employee.id && message.kind === "report" && !message.read),
});
initHire(app);
initMeeting(app);
initSheetPanel(app);
initMessenger(app);
initSync(app);
showTab(state.data.employees.length ? "messenger" : "hire");
renderUnread();
if (!state.settings.apiKey) notify("⚙︎ 설정에서 OpenAI API 키를 넣으면 직원들이 일을 시작해요.");
// Uplika 승인 화면에서 돌아왔으면 연결 마무리
setUplikaProxy(state.settings.serverUrl);
finishConnect()
  .then((message) => {
    if (message) notify(message);
  })
  .catch((error) => notify(error.message));
