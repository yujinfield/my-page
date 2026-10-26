// 진입점. 상태(state)를 들고 사무실 화면·채용·회의·메신저를 연결합니다.

import { loadData, saveData, loadSettings, saveSettings, loadTheme, saveTheme, newId, DEFAULT_MODEL } from "./store.js";
import { initScene, renderScene, say } from "./scene.js";
import { initHire, renderHire } from "./hire.js";
import { initMeeting, renderMeeting } from "./meeting.js";
import { initMessenger, renderMessenger, openChat, unreadCount, isChatVisible } from "./messenger.js";

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
  save: () => saveData(state.data),
  say,
  notify,
  addMessage,
  refreshAll,
};

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
  settingsDialog.showModal();
});

settingsForm.addEventListener("submit", (event) => {
  if (event.submitter && event.submitter.value === "cancel") return;
  state.settings = {
    apiKey: settingsForm.elements.apiKey.value.trim(),
    model: settingsForm.elements.model.value.trim() || DEFAULT_MODEL,
    about: settingsForm.elements.about.value.trim(),
  };
  saveSettings(state.settings);
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
initScene({ getEmployees: () => state.data.employees, onPick: pickEmployee });
initHire(app);
initMeeting(app);
initMessenger(app);
showTab(state.data.employees.length ? "messenger" : "hire");
renderUnread();
if (!state.settings.apiKey) notify("⚙︎ 설정에서 OpenAI API 키를 넣으면 직원들이 일을 시작해요.");
