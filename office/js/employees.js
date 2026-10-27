// 팀, 직원 외모, GPT에 보낼 말 만들기 (DOM 사용 안 함)

import { HAIR_COLORS, SKIN_COLORS, SHIRT_COLORS } from "./sprites.js";

export const TEAMS = {
  blog: { name: "블로그팀", job: "네이버 블로그 글 기획, 글쓰기, 검색 노출(키워드) 관리" },
  insta: { name: "인스타팀", job: "인스타그램 게시물·릴스 기획, 캡션, 해시태그, 팔로워 소통" },
};

export const SEATS_PER_TEAM = 4;

// 팀에서 비어 있는 자리 번호. 없으면 -1
export function freeSeat(employees, team) {
  for (let seat = 0; seat < SEATS_PER_TEAM; seat++) {
    const taken = employees.some((employee) => employee.team === team && employee.seat === seat);
    if (!taken) return seat;
  }
  return -1;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function randomLook() {
  return {
    hair: pick(HAIR_COLORS),
    hairStyle: pick(["short", "long"]),
    skin: pick(SKIN_COLORS),
    shirt: pick(SHIRT_COLORS),
  };
}

// ---- 채용 ----

export function applicantsMessages(posting) {
  const team = TEAMS[posting.team];
  return [
    {
      role: "system",
      content: "당신은 가상 회사의 채용 담당자입니다. 채용 공고를 보고 개성이 서로 다른 지원자 3명을 만들어 JSON으로만 답합니다.",
    },
    {
      role: "user",
      content: [
        `팀: ${team.name} (${team.job})`,
        `모집 직무: ${posting.role}`,
        `공고 내용: ${posting.details || "(없음)"}`,
        "",
        "다음 형식으로 답하세요. 모든 값은 한국어 글자입니다.",
        '{"applicants":[{"name":"한국 이름","age":"나이","role":"직무","personality":"성격 한 줄","speech":"말투 한 줄","strengths":"강점 한 줄","intro":"자기소개 2문장"}]}',
      ].join("\n"),
    },
  ];
}

// GPT 답(JSON 글자)을 지원자 목록으로 바꿈
export function parseApplicants(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data.applicants) ? data.applicants : [];
  return list.slice(0, 3).map((applicant) => ({
    name: String(applicant.name || "이름 없음"),
    age: String(applicant.age || ""),
    role: String(applicant.role || ""),
    personality: String(applicant.personality || ""),
    speech: String(applicant.speech || ""),
    strengths: String(applicant.strengths || ""),
    intro: String(applicant.intro || ""),
    look: randomLook(),
    hired: false,
  }));
}

// ---- 직원 성격 ----

// Uplika가 연결돼 있을 때 덧붙이는 말
const LOOKUP_RULE = [
  "Uplika 도구로 대표님의 실제 블로그·인스타 데이터(인사이트, 게시물, 네이버 노출·키워드)를 조회할 수 있습니다. 필요하면 먼저 조회하고, 숫자는 조회한 것만 씁니다.",
  "Uplika 작업공간이 하나뿐인 것은 정상입니다. 작업공간을 문제 삼지 않습니다.",
  "도구가 실패하면 원인을 지어내지 말고, 받은 오류 내용을 그대로 대표님께 전합니다.",
].join("\n");

function personaPrompt(employee, about, lookup = false) {
  const team = TEAMS[employee.team];
  return [
    `당신은 대표 한 명이 운영하는 작은 회사의 ${team.name} 직원 ${employee.name}(${employee.role})입니다.`,
    `팀 업무: ${team.job}`,
    `성격: ${employee.personality}`,
    `말투: ${employee.speech}`,
    `강점: ${employee.strengths}`,
    about ? `대표님의 블로그·인스타 소개: ${about}` : "",
    "사용자를 '대표님'이라고 부르고, 한국어로 실제 직원처럼 자연스럽게 말합니다.",
    "실제 조회수·팔로워 수처럼 모르는 정보는 지어내지 말고, 필요하면 대표님께 자료를 달라고 합니다.",
    // 직원은 조회만 할 수 있음. 발행·저장은 대표님이 완료 보고의 승인 버튼으로 함
    "당신은 글을 발행하거나 네이버에 임시 저장하거나 댓글·DM을 보낼 수 없습니다. 그런 일을 맡으면 결과물(제목과 본문)을 완성해서 보고하고, '보고서 아래 승인 버튼을 누르시면 네이버에 임시 저장됩니다'라고 안내합니다. 할 수 없는 일을 하겠다고 약속하지 않습니다.",
    lookup ? LOOKUP_RULE : "",
    memoryText(employee),
  ].filter(Boolean).join("\n");
}

// 직원마다 다른 GPT 모델을 쓸 수 있음 (비워 두면 설정의 기본 모델)
export function settingsFor(settings, employee) {
  return employee.model ? { ...settings, model: employee.model } : settings;
}

// ---- 기억 ----

export const MAX_MEMORIES = 30;

// 답 끝에 "[기억] 내용"을 적게 해서 기억할 것을 골라냄
const MEMORY_RULE = "대표님이 알려 준 정보·취향·결정 중 앞으로도 기억해 둘 만한 것이 있으면, 답 맨 끝에 '[기억] 내용' 형식으로 한 줄씩 적으세요. 이미 기억하는 것이나 사소한 것은 적지 않습니다.";

function memoryText(employee) {
  const memories = employee.memory || [];
  if (memories.length === 0) return "";
  return `기억하고 있는 것:\n${memories.map((memory) => `- ${memory.text}`).join("\n")}`;
}

// 답에서 "[기억] …" 줄을 떼어 냄 → { text: 보여 줄 답, memories: ["…"] }
export function extractMemories(reply) {
  const memories = [];
  const lines = reply.split("\n").filter((line) => {
    const match = line.match(/^\s*\[기억\]\s*(.+)$/);
    if (match) memories.push(match[1].trim());
    return !match;
  });
  return { text: lines.join("\n").trim(), memories };
}

// 기억 하나 추가 (오래된 것부터 지워서 MAX_MEMORIES개까지만)
export function addMemory(employee, text) {
  if (!employee.memory) employee.memory = [];
  if (employee.memory.some((memory) => memory.text === text)) return;
  employee.memory.push({ text, time: Date.now() });
  if (employee.memory.length > MAX_MEMORIES) employee.memory.shift();
}

// ---- 메신저 ----

const KIND_PREFIX = { task: "[업무 지시] ", report: "[완료 보고] " };

function historyMessages(messages, employeeId, count) {
  return messages
    .filter((message) => message.employeeId === employeeId)
    .slice(-count)
    .map((message) => ({
      role: message.from === "me" ? "user" : "assistant",
      content: (KIND_PREFIX[message.kind] || "") + message.text,
    }));
}

export function chatMessages(employee, messages, about) {
  return [
    { role: "system", content: `${personaPrompt(employee, about)}\n\n지금은 사내 메신저입니다. 짧게 1~3문장으로 답하세요.\n${MEMORY_RULE}` },
    ...historyMessages(messages, employee.id, 20),
  ];
}

export function taskMessages(employee, messages, task, about, lookup = false) {
  const instructions = [
    "대표님이 업무를 지시했습니다. 결과물을 직접 완성해서 보고하세요.",
    "첫 줄에 한 문장으로 무엇을 했는지 쓰고, 그 아래에 결과물(글 초안, 목록, 아이디어 등)을 씁니다.",
    MEMORY_RULE,
  ].join("\n");
  return [
    { role: "system", content: `${personaPrompt(employee, about, lookup)}\n\n${instructions}` },
    ...historyMessages(messages, employee.id, 10),
    { role: "user", content: KIND_PREFIX.task + task },
  ];
}

// ---- 회의 ----

function speakerName(speakerId, employees) {
  if (speakerId === "me") return "대표";
  const employee = employees.find((item) => item.id === speakerId);
  return employee ? employee.name : "퇴사한 직원";
}

export function transcriptText(meeting, employees) {
  if (meeting.lines.length === 0) return "(아직 발언 없음)";
  return meeting.lines.map((line) => `${speakerName(line.speakerId, employees)}: ${line.text}`).join("\n");
}

function meetingInfo(meeting, employees) {
  return [
    `회의 안건: ${meeting.topic}`,
    "",
    `참고 자료:\n${meeting.material || "(없음)"}`,
    "",
    `지금까지 회의 내용:\n${transcriptText(meeting, employees)}`,
  ].join("\n");
}

export function meetingMessages(employee, meeting, employees, about, lookup = false) {
  const rule = "지금은 회의 중입니다. 다른 사람 말에 동의하거나 반박하면서 구체적인 의견을 2~4문장으로 말하세요. 앞에 이름을 붙이지 말고 할 말만 쓰세요.";
  return [
    { role: "system", content: `${personaPrompt(employee, about, lookup)}\n\n${rule}` },
    { role: "user", content: `${meetingInfo(meeting, employees)}\n\n${employee.name} 님이 말할 차례입니다.` },
  ];
}

export function summaryMessages(employee, meeting, employees, about, lookup = false) {
  const rule = "회의를 정리하는 역할입니다. '결론:' 한 줄과 '할 일:' 3가지(담당자 이름 포함)를 짧게 쓰세요.";
  return [
    { role: "system", content: `${personaPrompt(employee, about, lookup)}\n\n${rule}` },
    { role: "user", content: meetingInfo(meeting, employees) },
  ];
}

// ---- 이미지 ----

export const DEFAULT_IMAGE_MODEL = "gpt-image-1";

// 업무에 어울리는 이미지를 그려 달라는 지시문 (서버는 뒤에 업무 결과를 덧붙임)
export function imagePrompt(employee, task) {
  const team = TEAMS[employee.team];
  return [
    `${team.name}에서 쓸 이미지를 만들어 주세요. 블로그 대표 사진이나 인스타그램 피드에 어울리게, 사진처럼 자연스럽고 밝은 느낌으로 만듭니다.`,
    "이미지 안에 글자나 로고는 넣지 않습니다.",
    `업무: ${task}`,
  ].join("\n");
}
