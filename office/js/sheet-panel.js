// 데이터 시트 화면: 설정 창에서 시트 추가·읽어 보기·지우기, 회의·업무에서 시트 고르기

import { readSheet, sheetIdOf } from "./sheets.js";
import { newId } from "./store.js";

const list = document.getElementById("sheet-list");
const nameInput = document.getElementById("sheet-name");
const urlInput = document.getElementById("sheet-url");
const tabsInput = document.getElementById("sheet-tabs");
const status = document.getElementById("sheet-status");
const meetingBox = document.getElementById("meeting-sheets");
const meetingList = document.getElementById("meeting-sheet-list");
const chatLabel = document.getElementById("chat-sheet-label");
const chatSelect = document.getElementById("chat-sheet");

let app;

export function initSheetPanel(appApi) {
  app = appApi;
  document.getElementById("sheet-add").addEventListener("click", addSheet);
  document.getElementById("sheet-test").addEventListener("click", testSheet);
  renderSheetPanel();
}

function sheets() {
  return app.state.settings.dataSheets || [];
}

// 입력 칸 → { name, url, tabs }
function readForm() {
  const sheet = {
    name: nameInput.value.trim() || "데이터 시트",
    url: urlInput.value.trim(),
    tabs: tabsInput.value.split(/[,，]/).map((tab) => tab.trim()).filter(Boolean),
  };
  if (!sheetIdOf(sheet.url)) throw new Error("구글 시트 주소를 넣어 주세요. (docs.google.com/spreadsheets/d/…)");
  if (sheet.tabs.length === 0) throw new Error("읽을 탭 이름을 하나 이상 넣어 주세요. 쉼표로 구분해요.");
  return sheet;
}

async function testSheet() {
  try {
    const sheet = readForm();
    status.textContent = "읽는 중…";
    const results = await readSheet(sheet);
    status.textContent = results
      .map(({ tab, table }) => `✅ ${tab}: 칸 ${table.header.length}개, 데이터 ${table.records.length}줄`)
      .join("\n");
  } catch (error) {
    status.textContent = error.message;
  }
}

function addSheet() {
  try {
    const sheet = { id: newId("s"), ...readForm() };
    app.state.settings.dataSheets = [...sheets(), sheet];
    app.saveSettings();
    nameInput.value = "";
    urlInput.value = "";
    tabsInput.value = "";
    status.textContent = `"${sheet.name}"을 추가했어요. 회의실과 업무 지시에서 고를 수 있어요.`;
    renderSheetPanel();
  } catch (error) {
    status.textContent = error.message;
  }
}

function removeSheet(sheet) {
  app.state.settings.dataSheets = sheets().filter((item) => item.id !== sheet.id);
  app.saveSettings();
  renderSheetPanel();
}

export function renderSheetPanel() {
  // 설정 창 목록
  list.replaceChildren();
  sheets().forEach((sheet) => {
    const item = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = `📊 ${sheet.name} (${sheet.tabs.join(", ")})`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button";
    remove.textContent = "지우기";
    remove.setAttribute("aria-label", `데이터 시트 지우기: ${sheet.name}`);
    remove.addEventListener("click", () => removeSheet(sheet));
    item.append(text, remove);
    list.append(item);
  });

  // 회의실 체크 칸 (이미 고른 것은 유지)
  const checked = chosenMeetingSheets();
  meetingBox.hidden = sheets().length === 0;
  meetingList.replaceChildren();
  sheets().forEach((sheet) => {
    const label = document.createElement("label");
    label.className = "check";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = sheet.id;
    box.checked = checked.includes(sheet.id);
    label.append(box, ` ${sheet.name}`);
    meetingList.append(label);
  });

  // 업무 지시용 고르기 (이미 고른 것은 유지)
  const selected = chatSelect.value;
  chatLabel.hidden = sheets().length === 0;
  chatSelect.replaceChildren(new Option("없음", ""));
  sheets().forEach((sheet) => chatSelect.append(new Option(sheet.name, sheet.id)));
  chatSelect.value = sheets().some((sheet) => sheet.id === selected) ? selected : "";
}

export function chosenMeetingSheets() {
  return [...meetingList.querySelectorAll("input:checked")].map((box) => box.value);
}

export function chosenChatSheet() {
  return chatSelect.value;
}

export function sheetName(id) {
  const sheet = sheets().find((item) => item.id === id);
  return sheet ? sheet.name : "지운 시트";
}
