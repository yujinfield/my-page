// 사내 메신저: 직원과 대화하고, 업무를 지시하면 끝난 뒤 완료 보고가 옴

import { askGpt } from "./gpt.js";
import { TEAMS, chatMessages, settingsFor, extractMemories, addMemory } from "./employees.js";
import { initProfile, renderProfile } from "./profile.js";
import { initTasks, runTask } from "./tasks.js";
import { makeAvatar } from "./sprites.js";
import { chosenChatSheet, sheetName } from "./sheet-panel.js";

const chatList = document.getElementById("chat-list");
const chatRoom = document.getElementById("chat-room");
const chatTitle = document.getElementById("chat-title");
const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatStatus = document.getElementById("chat-status");
const taskButton = document.getElementById("chat-task");
const backButton = document.getElementById("chat-back");
const fireButton = document.getElementById("chat-fire");
const emptyHint = document.getElementById("chat-empty");

let app;
let openId = null;

export function initMessenger(appApi) {
  app = appApi;
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendChat();
  });
  taskButton.addEventListener("click", sendTask);
  backButton.addEventListener("click", () => openChat(null));
  fireButton.addEventListener("click", fireEmployee);
  // Enter로 보내기, Shift+Enter는 줄바꿈 (한글 조합 중 Enter는 무시)
  chatForm.elements.text.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendChat();
    }
  });
  initProfile(app);
  initTasks(app, { remember, isChatVisible });
  renderMessenger();
}

function findEmployee(id) {
  return app.state.data.employees.find((employee) => employee.id === id);
}

export function openChat(employeeId) {
  openId = employeeId;
  renderMessenger();
  if (openId) chatForm.elements.text.focus();
}

// 지금 화면에 열려 있는 대화방이면 true (읽음 처리에 씀)
export function isChatVisible(employeeId) {
  return openId === employeeId && app.state.tab === "messenger";
}

function readText() {
  const text = chatForm.elements.text.value.trim();
  if (text) chatForm.reset();
  return text;
}

async function sendChat() {
  const employee = findEmployee(openId);
  const text = readText();
  if (!employee || !text) return;
  app.addMessage(employee.id, "me", text, "chat");
  app.save();
  renderMessenger();

  chatStatus.textContent = `${employee.name} 님이 입력 중…`;
  try {
    const messages = chatMessages(employee, app.state.data.messages, app.state.settings.about);
    const answer = await askGpt(settingsFor(app.state.settings, employee), messages);
    chatStatus.textContent = "";
    const reply = remember(employee, answer);
    app.addMessage(employee.id, "employee", reply, "chat");
    app.say(employee.id, reply);
    if (!isChatVisible(employee.id)) app.notify(`💬 ${employee.name}: ${reply}`, employee.id);
  } catch (error) {
    chatStatus.textContent = error.message;
  }
  app.save();
  app.refreshAll();
}

function sendTask() {
  const employee = findEmployee(openId);
  if (!employee || employee.status === "working") return;
  const sheetId = chosenChatSheet(); // 입력 칸을 비우면(reset) 고른 시트도 풀리므로 먼저 읽음
  const text = readText();
  if (!text) {
    chatStatus.textContent = "아래 칸에 시킬 일을 먼저 적어 주세요.";
    return;
  }
  const task = app.addMessage(employee.id, "me", text, "task");
  task.done = false;
  if (sheetId) task.sheetId = sheetId;
  app.addMessage(employee.id, "employee", "네, 대표님! 바로 시작하겠습니다.", "chat");
  app.save();
  runTask(employee, task);
}

// 답 끝의 "[기억] …" 줄을 직원 기억에 넣고, 나머지 답을 돌려줌
function remember(employee, reply) {
  const { text, memories } = extractMemories(reply);
  memories.forEach((memory) => addMemory(employee, memory));
  if (memories.length && openId === employee.id) chatStatus.textContent = `🧠 기억했어요: ${memories.join(", ")}`;
  return text || reply;
}

function fireEmployee() {
  const employee = findEmployee(openId);
  if (!employee) return;
  if (!confirm(`${employee.name} 님을 퇴사 처리할까요? 대화 기록도 지워집니다.`)) return;
  const data = app.state.data;
  data.employees = data.employees.filter((item) => item.id !== employee.id);
  data.messages = data.messages.filter((message) => message.employeeId !== employee.id);
  app.save();
  openChat(null);
  app.refreshAll();
}

export function unreadCount() {
  return app.state.data.messages.filter((message) => message.from === "employee" && !message.read).length;
}

export function renderMessenger() {
  const employees = app.state.data.employees;
  const employee = findEmployee(openId);
  if (!employee) openId = null;

  emptyHint.hidden = employees.length > 0;
  chatList.hidden = Boolean(employee);
  chatRoom.hidden = !employee;

  if (employee) {
    if (app.state.tab === "messenger") markRead(employee.id);
    renderRoom(employee);
  } else {
    renderList(employees);
  }
}

function markRead(employeeId) {
  app.state.data.messages.forEach((message) => {
    if (message.employeeId === employeeId && !message.read) message.read = true;
  });
  app.save();
}

function lastMessage(employeeId) {
  const messages = app.state.data.messages.filter((message) => message.employeeId === employeeId);
  return messages[messages.length - 1];
}

function renderList(employees) {
  chatList.replaceChildren();
  const sorted = [...employees].sort((a, b) => (lastMessage(b.id)?.time ?? 0) - (lastMessage(a.id)?.time ?? 0));
  sorted.forEach((employee) => {
    const unread = app.state.data.messages.filter((message) => message.employeeId === employee.id && message.from === "employee" && !message.read).length;
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-item";
    button.setAttribute("aria-label", `${employee.name} 대화 열기${unread ? `, 안 읽은 메시지 ${unread}개` : ""}`);
    button.addEventListener("click", () => openChat(employee.id));

    const text = document.createElement("span");
    text.className = "chat-item-text";
    const name = document.createElement("strong");
    name.textContent = `${employee.name} · ${TEAMS[employee.team].name}${employee.status === "working" ? " · 업무 중" : ""}`;
    const preview = document.createElement("span");
    preview.className = "muted preview";
    preview.textContent = lastMessage(employee.id)?.text ?? "";
    text.append(name, preview);

    button.append(makeAvatar(employee.look), text);
    if (unread) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = unread;
      button.append(badge);
    }
    item.append(button);
    chatList.append(item);
  });
}

function renderRoom(employee) {
  chatTitle.textContent = `${employee.name} · ${employee.role}`;
  renderProfile(employee);
  taskButton.disabled = employee.status === "working";
  taskButton.textContent = employee.status === "working" ? "업무 중…" : "업무 지시";

  chatLog.replaceChildren();
  app.state.data.messages
    .filter((message) => message.employeeId === employee.id)
    .forEach((message) => {
      const item = document.createElement("li");
      item.className = `message ${message.from} ${message.kind}`;
      if (message.kind !== "chat") {
        const label = document.createElement("span");
        label.className = "message-label";
        label.textContent = message.kind === "task" ? "📋 업무 지시" : "✅ 완료 보고";
        if (message.sheetId) label.textContent += ` · 📊 ${sheetName(message.sheetId)}`;
        item.append(label);
      }
      const text = document.createElement("p");
      text.textContent = message.text;
      item.append(text);
      chatLog.append(item);
    });
  chatLog.scrollTop = chatLog.scrollHeight;
}
