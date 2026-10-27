// 대화방 위 "직원 설정 · 기억": 직원마다 GPT 모델 고르기, 기억 보기·추가·지우기

import { addMemory, MAX_MEMORIES } from "./employees.js";

const summary = document.getElementById("chat-profile-summary");
const modelInput = document.getElementById("chat-model");
const memoryList = document.getElementById("memory-list");
const memoryEmpty = document.getElementById("memory-empty");
const memoryForm = document.getElementById("memory-form");

let app;
let employee = null;

export function initProfile(appApi) {
  app = appApi;
  modelInput.placeholder = `기본: ${app.state.settings.model}`;
  modelInput.addEventListener("change", () => {
    if (!employee) return;
    employee.model = modelInput.value.trim();
    app.save();
    renderProfile(employee);
  });
  memoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = memoryForm.elements.text.value.trim();
    if (!employee || !text) return;
    addMemory(employee, text);
    memoryForm.reset();
    app.save();
    renderProfile(employee);
  });
}

export function renderProfile(current) {
  employee = current;
  const memories = employee.memory || [];
  const model = employee.model || app.state.settings.model;
  summary.textContent = `직원 설정 · 🧠 기억 ${memories.length}개 · ${model}`;
  modelInput.placeholder = `기본: ${app.state.settings.model}`;
  if (document.activeElement !== modelInput) modelInput.value = employee.model || "";

  memoryEmpty.hidden = memories.length > 0;
  memoryList.replaceChildren();
  // 최근 것이 위로
  [...memories].reverse().forEach((memory) => {
    const item = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = memory.text;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button";
    remove.textContent = "지우기";
    remove.setAttribute("aria-label", `기억 지우기: ${memory.text}`);
    remove.addEventListener("click", () => {
      employee.memory = employee.memory.filter((item) => item !== memory);
      app.save();
      renderProfile(employee);
    });
    item.append(text, remove);
    memoryList.append(item);
  });
  memoryForm.elements.text.placeholder = `직접 기억시키기 (최대 ${MAX_MEMORIES}개)`;
}
