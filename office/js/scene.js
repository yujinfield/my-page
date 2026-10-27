// 사무실 화면: 캔버스에 도트 그림을 그리고, 그 위에 직원 버튼·말풍선을 HTML로 올립니다.

import {
  SCENE_WIDTH, SCENE_HEIGHT, PERSON_WIDTH, PERSON_HEIGHT, SIGNS,
  drawOffice, drawChair, drawPerson, drawDesk,
} from "./sprites.js";
import { TEAMS, SEATS_PER_TEAM } from "./employees.js";

const canvas = document.getElementById("office-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("office-overlay");

const TEAM_LEFT = { blog: 22, insta: 146 };
const speeches = new Map(); // 직원 id → { text, until }
const buttons = new Map();  // 직원 id → 버튼
let getEmployees = () => [];
let onPick = () => {};
let hasNews = () => false; // 안 읽은 완료 보고가 있는 직원인지
let frame = 0;

// 자리 번호(0~3) → 사람을 그릴 위치
function seatPosition(team, seat) {
  return {
    x: TEAM_LEFT[team] + (seat % 2) * 44,
    y: 46 + Math.floor(seat / 2) * 40,
  };
}

function percent(value, total) {
  return `${(value / total) * 100}%`;
}

export function initScene(options) {
  getEmployees = options.getEmployees;
  onPick = options.onPick;
  hasNews = options.hasNews;
  canvas.width = SCENE_WIDTH;
  canvas.height = SCENE_HEIGHT;

  SIGNS.forEach((sign) => {
    const label = document.createElement("span");
    label.className = "team-sign";
    label.textContent = TEAMS[sign.team].name;
    label.style.left = percent(sign.x, SCENE_WIDTH);
    label.style.top = percent(sign.y, SCENE_HEIGHT);
    label.style.width = percent(sign.width, SCENE_WIDTH);
    label.style.height = percent(sign.height, SCENE_HEIGHT);
    overlay.append(label);
  });

  setInterval(tick, 450);
  renderScene();
}

function tick() {
  frame += 1;
  const now = Date.now();
  speeches.forEach((speech, id) => {
    if (speech.until < now) speeches.delete(id);
  });
  draw();
  renderOverlay(); // 말풍선이 끝났거나, 보고를 읽어서 "!"가 사라졌을 수 있음
}

// 머리 위에 띄울 것: 일하는 중이면 "Work!", 아니면 하던 말, 안 읽은 완료 보고가 있으면 "!"
function bubbleFor(employee) {
  if (employee.status === "working") return { text: "Work!", kind: "work" };
  const speech = speeches.get(employee.id);
  if (speech) return { text: speech.text, kind: "" };
  if (hasNews(employee)) return { text: "!", kind: "alert" };
  return { text: "", kind: "" };
}

// 직원 머리 위에 말풍선을 잠깐 띄움
export function say(employeeId, text, duration = 5000) {
  const short = text.length > 40 ? `${text.slice(0, 40)}…` : text;
  speeches.set(employeeId, { text: short, until: Date.now() + duration });
  renderOverlay();
}

export function renderScene() {
  draw();
  renderOverlay();
}

function draw() {
  const employees = getEmployees();
  drawOffice(ctx);
  Object.keys(TEAMS).forEach((team) => {
    for (let seat = 0; seat < SEATS_PER_TEAM; seat++) {
      const { x, y } = seatPosition(team, seat);
      const employee = employees.find((item) => item.team === team && item.seat === seat);
      const working = employee && employee.status === "working";
      drawChair(ctx, x, y);
      if (employee) {
        const index = employees.indexOf(employee);
        const blink = (frame + index * 5) % 11 === 0;
        const bob = working && frame % 2 === 0 ? 1 : 0; // 일하는 중이면 들썩들썩
        drawPerson(ctx, employee.look, x, y + bob, blink);
      }
      drawDesk(ctx, x, y, working);
    }
  });
}

// 직원마다 버튼 하나 (누르면 메신저가 열림). 이미 있는 버튼은 고쳐 쓰고 새로 만들지 않음 (키보드 초점 유지)
function renderOverlay() {
  const employees = getEmployees();
  buttons.forEach((button, id) => {
    if (!employees.some((employee) => employee.id === id)) {
      button.remove();
      buttons.delete(id);
    }
  });

  employees.forEach((employee) => {
    let button = buttons.get(employee.id);
    if (!button) {
      button = createButton(employee.id);
      buttons.set(employee.id, button);
      overlay.append(button);
    }
    const { x, y } = seatPosition(employee.team, employee.seat);
    button.style.left = percent(x - 3, SCENE_WIDTH);
    button.style.top = percent(y - 2, SCENE_HEIGHT);
    button.style.width = percent(PERSON_WIDTH + 6, SCENE_WIDTH);
    button.style.height = percent(PERSON_HEIGHT + 4, SCENE_HEIGHT);
    // 화면 양 끝 자리는 말풍선이 잘리지 않게 안쪽으로 붙임
    button.dataset.edge = x < SCENE_WIDTH / 4 ? "left" : x > (SCENE_WIDTH * 3) / 4 ? "right" : "";
    const { text, kind } = bubbleFor(employee);
    const state = kind === "work" ? ", 일하는 중" : kind === "alert" ? ", 새 완료 보고 있음" : "";
    button.setAttribute("aria-label", `${employee.name} (${TEAMS[employee.team].name})${state} 메신저 열기`);
    button.querySelector(".name-tag").textContent = employee.name;

    const bubble = button.querySelector(".bubble");
    if (bubble.textContent !== text) bubble.textContent = text;
    bubble.dataset.kind = kind;
    bubble.hidden = !text;
  });
}

function createButton(employeeId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "seat-button";
  button.addEventListener("click", () => onPick(employeeId));

  const bubble = document.createElement("span");
  bubble.className = "bubble";
  bubble.setAttribute("aria-live", "polite");
  const nameTag = document.createElement("span");
  nameTag.className = "name-tag";
  button.append(bubble, nameTag);
  return button;
}
