// 회의실: 안건과 자료를 주면 직원들이 돌아가며 토론하고, 마지막에 정리

import { askGpt } from "./gpt.js";
import { TEAMS, meetingMessages, summaryMessages } from "./employees.js";
import { newId } from "./store.js";

const form = document.getElementById("meeting-form");
const status = document.getElementById("meeting-status");
const room = document.getElementById("meeting-room");
const roomTitle = document.getElementById("meeting-title");
const transcript = document.getElementById("meeting-transcript");
const commentForm = document.getElementById("meeting-comment-form");
const summaryButton = document.getElementById("meeting-summary");
const historySelect = document.getElementById("meeting-history");

let app;
let currentId = null;
let busy = false;

export function initMeeting(appApi) {
  app = appApi;
  form.addEventListener("submit", startMeeting);
  commentForm.addEventListener("submit", continueMeeting);
  summaryButton.addEventListener("click", summarize);
  historySelect.addEventListener("change", () => {
    currentId = historySelect.value || null;
    renderMeeting();
  });
  currentId = app.state.data.meetings[0]?.id ?? null;
  renderMeeting();
}

function currentMeeting() {
  return app.state.data.meetings.find((meeting) => meeting.id === currentId);
}

function participants(meeting) {
  return app.state.data.employees.filter((employee) => meeting.team === "all" || employee.team === meeting.team);
}

async function startMeeting(event) {
  event.preventDefault();
  if (busy) return;
  const meeting = {
    id: newId("m"),
    team: form.elements.team.value,
    topic: form.elements.topic.value.trim(),
    material: form.elements.material.value.trim(),
    lines: [],
    time: Date.now(),
  };
  if (!meeting.topic) return;
  if (participants(meeting).length === 0) {
    status.textContent = "회의에 들어올 직원이 없어요. 먼저 채용해 주세요.";
    return;
  }
  app.state.data.meetings.unshift(meeting);
  currentId = meeting.id;
  app.save();
  form.reset();
  renderMeeting();
  await runRound(meeting);
}

// 대표 한마디(있으면)를 넣고 한 바퀴 더 토론
async function continueMeeting(event) {
  event.preventDefault();
  const meeting = currentMeeting();
  if (busy || !meeting) return;
  const comment = commentForm.elements.comment.value.trim();
  if (comment) {
    meeting.lines.push({ speakerId: "me", text: comment });
    commentForm.reset();
    app.save();
    renderMeeting();
  }
  await runRound(meeting);
}

async function runRound(meeting) {
  await withBusy(async () => {
    for (const employee of participants(meeting)) {
      status.textContent = `${employee.name} 님이 말하는 중…`;
      app.say(employee.id, "음…", 60000);
      const messages = meetingMessages(employee, meeting, app.state.data.employees, app.state.settings.about);
      const text = await askGpt(app.state.settings, messages);
      addLine(meeting, employee, text, false);
    }
  });
}

async function summarize() {
  const meeting = currentMeeting();
  if (busy || !meeting) return;
  const leader = participants(meeting)[0];
  if (!leader) return;
  await withBusy(async () => {
    status.textContent = `${leader.name} 님이 회의를 정리하는 중…`;
    const messages = summaryMessages(leader, meeting, app.state.data.employees, app.state.settings.about);
    const text = await askGpt(app.state.settings, messages);
    addLine(meeting, leader, text, true);
  });
}

function addLine(meeting, employee, text, summary) {
  meeting.lines.push({ speakerId: employee.id, text, summary });
  app.save();
  app.say(employee.id, text, 7000);
  renderMeeting();
}

async function withBusy(work) {
  busy = true;
  setButtonsDisabled(true);
  try {
    await work();
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
    setButtonsDisabled(false);
  }
}

function setButtonsDisabled(disabled) {
  document.querySelectorAll("#meeting-panel button").forEach((button) => {
    button.disabled = disabled;
  });
}

export function renderMeeting() {
  renderHistory();
  const meeting = currentMeeting();
  room.hidden = !meeting;
  if (!meeting) return;

  const teamName = meeting.team === "all" ? "전체" : TEAMS[meeting.team].name;
  roomTitle.textContent = `${teamName} 회의 · ${meeting.topic}`;
  transcript.replaceChildren();
  meeting.lines.forEach((line) => transcript.append(lineElement(line)));
  transcript.scrollTop = transcript.scrollHeight;
}

function lineElement(line) {
  const item = document.createElement("li");
  item.className = line.speakerId === "me" ? "line me" : line.summary ? "line summary" : "line";
  const name = document.createElement("strong");
  const employee = app.state.data.employees.find((person) => person.id === line.speakerId);
  name.textContent = line.speakerId === "me" ? "대표" : employee ? employee.name : "퇴사한 직원";
  if (line.summary) name.textContent += " · 회의 정리";
  const text = document.createElement("p");
  text.textContent = line.text;
  item.append(name, text);
  return item;
}

function renderHistory() {
  const meetings = app.state.data.meetings;
  historySelect.replaceChildren();
  historySelect.parentElement.hidden = meetings.length === 0;
  meetings.forEach((meeting) => {
    const option = document.createElement("option");
    option.value = meeting.id;
    option.textContent = `${new Date(meeting.time).toLocaleDateString("ko-KR")} · ${meeting.topic}`;
    option.selected = meeting.id === currentId;
    historySelect.append(option);
  });
}
