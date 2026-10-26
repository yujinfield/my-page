// 채용: 공고 올리기 → GPT가 지원자 3명을 만듦 → 골라서 채용

import { askGpt } from "./gpt.js";
import { TEAMS, applicantsMessages, parseApplicants, freeSeat } from "./employees.js";
import { makeAvatar } from "./sprites.js";
import { newId } from "./store.js";

const form = document.getElementById("hire-form");
const status = document.getElementById("hire-status");
const list = document.getElementById("applicant-list");

let app;

export function initHire(appApi) {
  app = appApi;
  form.addEventListener("submit", postJob);
  renderHire();
}

async function postJob(event) {
  event.preventDefault();
  const posting = {
    team: form.elements.team.value,
    role: form.elements.role.value.trim(),
    details: form.elements.details.value.trim(),
  };
  if (!posting.role) return;

  setBusy(true, "공고를 올렸어요. 지원서를 받는 중…");
  try {
    const answer = await askGpt(app.state.settings, applicantsMessages(posting), { json: true });
    app.state.data.posting = { ...posting, applicants: parseApplicants(answer) };
    app.save();
    renderHire();
    setBusy(false, "지원서가 도착했어요!");
  } catch (error) {
    setBusy(false, error.message);
  }
}

function setBusy(busy, message) {
  form.querySelector("button[type=submit]").disabled = busy;
  status.textContent = message;
}

export function renderHire() {
  list.replaceChildren();
  const posting = app.state.data.posting;
  if (!posting) return;

  const title = document.createElement("h3");
  title.className = "section-title";
  title.textContent = `${TEAMS[posting.team].name} · ${posting.role} 지원자`;
  list.append(title);
  posting.applicants.forEach((applicant) => list.append(applicantCard(applicant, posting)));
}

function applicantCard(applicant, posting) {
  const card = document.createElement("article");
  card.className = "card applicant";

  const header = document.createElement("div");
  header.className = "card-header";
  const name = document.createElement("strong");
  name.textContent = applicant.age ? `${applicant.name} (${applicant.age})` : applicant.name;
  const role = document.createElement("span");
  role.className = "muted";
  role.textContent = applicant.role;
  header.append(makeAvatar(applicant.look), name, role);

  const details = document.createElement("dl");
  [["성격", applicant.personality], ["말투", applicant.speech], ["강점", applicant.strengths]].forEach(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    details.append(term, description);
  });

  const intro = document.createElement("blockquote");
  intro.textContent = applicant.intro;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary";
  const seatLeft = freeSeat(app.state.data.employees, posting.team) >= 0;
  button.textContent = applicant.hired ? "채용 완료" : seatLeft ? "채용하기" : "자리가 없어요";
  button.disabled = applicant.hired || !seatLeft;
  button.setAttribute("aria-label", `${applicant.name} 채용하기`);
  button.addEventListener("click", () => hire(applicant, posting));

  card.append(header, details, intro, button);
  return card;
}

function hire(applicant, posting) {
  const employees = app.state.data.employees;
  const seat = freeSeat(employees, posting.team);
  if (seat < 0) return;

  const employee = {
    id: newId("e"),
    name: applicant.name,
    team: posting.team,
    role: applicant.role || posting.role,
    personality: applicant.personality,
    speech: applicant.speech,
    strengths: applicant.strengths,
    look: applicant.look,
    seat,
    status: "idle",
    hiredAt: Date.now(),
  };
  employees.push(employee);
  applicant.hired = true;

  const greeting = `안녕하세요 대표님! 오늘부터 ${TEAMS[employee.team].name}에서 일하게 된 ${employee.name}입니다. ${applicant.intro}`;
  app.addMessage(employee.id, "employee", greeting, "chat");
  app.save();
  app.refreshAll();
  app.say(employee.id, "잘 부탁드립니다!");
  status.textContent = `${employee.name} 님을 채용했어요. 메신저에 인사가 도착했어요.`;
}
