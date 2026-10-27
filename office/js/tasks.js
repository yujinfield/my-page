// 업무 처리: 업무 지시를 GPT에 맡기고 완료 보고를 받음
// - 사무실 서버를 설정했으면 서버가 처리하고(창을 닫아도 계속), 사이트는 결과를 받아 옴
// - 설정 안 했으면 이 브라우저에서 바로 처리 (창을 닫으면 멈췄다가 다시 열 때 처음부터)

import { askGpt, makeImage } from "./gpt.js";
import { taskMessages, settingsFor, imagePrompt, DEFAULT_IMAGE_MODEL } from "./employees.js";
import { saveImage } from "./store.js";
import { uplikaTools } from "./uplika.js";
import { sheetsText } from "./sheets.js";
import { serverReady, submitJob, fetchJobs, ackJob } from "./server.js";

const POLL_DELAY = 8000;           // 서버 업무 결과를 확인하는 간격
const LOST_AFTER = 30 * 60 * 1000; // 서버에 업무가 없는 채로 이만큼 지나면 실패로 처리

let app;
let hooks;
let pollTimer = null;
let polling = false;

// hooks: { remember(employee, reply) → 보여 줄 답, isChatVisible(employeeId) }
export function initTasks(appApi, taskHooks) {
  app = appApi;
  hooks = taskHooks;
  resumeTasks();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pollServerTasks();
  });
}

function findEmployee(id) {
  return app.state.data.employees.find((employee) => employee.id === id);
}

function openTasks() {
  return app.state.data.messages.filter((message) => message.kind === "task" && message.done === false);
}

// GPT에 보낼 업무 내용 (데이터 시트를 골랐으면 최신 내용을 붙임)
async function buildJob(employee, task) {
  const history = app.state.data.messages.filter((message) => message !== task);
  const tools = await uplikaTools();
  let taskText = task.text;
  if (task.sheetId) {
    const sheet = await sheetsText(app.state.settings.dataSheets || [], [task.sheetId]);
    taskText += `\n\n참고 데이터 시트:\n${sheet}`;
  }
  return {
    id: task.id,
    model: settingsFor(app.state.settings, employee).model,
    messages: taskMessages(employee, history, taskText, app.state.settings.about, Boolean(tools)),
    tools,
    // 이미지도 맡겼으면: 글 결과가 나온 뒤 이 지시문(+ 결과)으로 이미지를 만듦
    image: task.withImage
      ? { model: app.state.settings.imageModel || DEFAULT_IMAGE_MODEL, prompt: imagePrompt(employee, task.text) }
      : null,
  };
}

// 이미지를 이 기기에 저장하고 id를 돌려줌. 실패하면 null
async function keepImage(task, base64) {
  if (!base64) return null;
  try {
    await saveImage(task.id, base64);
    return task.id;
  } catch (error) {
    console.warn("이미지를 저장하지 못했습니다.", error);
    return null;
  }
}

export async function runTask(employee, task) {
  employee.status = "working";
  app.save();
  app.refreshAll();

  try {
    const job = await buildJob(employee, task);
    if (serverReady(app.state.settings)) {
      await submitJob(app.state.settings, job);
      task.onServer = true;
      app.save();
      schedulePoll();
      return; // 결과는 pollServerTasks가 받아 옴
    }
    const settings = { ...app.state.settings, model: job.model };
    let result = await askGpt(settings, job.messages, { tools: job.tools });
    let imageId = null;
    if (job.image) {
      // 이미지가 실패해도 글 결과는 보고함
      try {
        const prompt = `${job.image.prompt}\n\n참고한 업무 결과:\n${result.slice(0, 1500)}`;
        imageId = await keepImage(task, await makeImage(app.state.settings, { model: job.image.model, prompt }));
      } catch (error) {
        result += `\n\n(이미지는 만들지 못했어요: ${error.message})`;
      }
    }
    finishTask(task, result, true, imageId);
  } catch (error) {
    finishTask(task, error.message, false);
  }
}

// 업무를 끝내고 완료 보고(또는 실패 메시지)를 남김. 이미 끝낸 업무면 아무것도 안 함
function finishTask(task, text, success, imageId = null) {
  if (task.done) return;
  task.done = true;
  const employee = findEmployee(task.employeeId);
  if (!employee) {
    app.save();
    return; // 일하는 사이에 퇴사함
  }
  const stillWorking = openTasks().some((other) => other.employeeId === employee.id);
  if (!stillWorking) employee.status = "idle";

  const reply = success ? hooks.remember(employee, text) : `죄송해요 대표님, 일을 끝내지 못했어요. (${text})`;
  const message = app.addMessage(employee.id, "employee", reply, success ? "report" : "chat");
  if (imageId) message.imageId = imageId;
  app.save();
  app.refreshAll();
  app.say(employee.id, success ? "다 했어요!" : "앗…");
  if (!hooks.isChatVisible(employee.id)) {
    app.notify(`📨 ${employee.name}: ${success ? "업무 완료 보고가 왔어요" : "업무 중 문제가 생겼어요"}`, employee.id);
  }
}

// ---- 서버 업무 결과 받기 ----

function schedulePoll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(pollServerTasks, POLL_DELAY);
}

export async function pollServerTasks() {
  const waiting = openTasks().filter((task) => task.onServer);
  if (waiting.length === 0 || polling || !serverReady(app.state.settings)) return;
  polling = true;
  try {
    const jobs = await fetchJobs(app.state.settings, waiting.map((task) => task.id));
    for (const task of waiting) {
      const job = jobs.find((item) => item.id === task.id);
      if (job && job.status === "done") {
        finishTask(task, job.result, true, await keepImage(task, job.image));
        await ackJob(app.state.settings, task.id);
      } else if (job && job.status === "failed") {
        finishTask(task, job.error || "서버에서 실패했어요.", false);
        await ackJob(app.state.settings, task.id);
      } else if (!job && Date.now() - task.time > LOST_AFTER) {
        // 다른 기기가 이미 받아 갔으면 동기화로 끝난 상태가 오므로, 오래 지난 것만 실패로 봄
        finishTask(task, "서버에서 업무를 찾지 못했어요.", false);
      }
    }
  } catch (error) {
    console.warn("서버 업무를 확인하지 못했습니다.", error);
  } finally {
    polling = false;
  }
  if (openTasks().some((task) => task.onServer)) schedulePoll();
}

// 새로고침 등으로 끊긴 업무 이어 하기: 서버 업무는 결과를 받아 오고, 브라우저 업무는 다시 시작
function resumeTasks() {
  openTasks().forEach((task) => {
    const employee = findEmployee(task.employeeId);
    if (!employee) task.done = true;
    else if (!task.onServer) runTask(employee, task);
  });
  app.state.data.employees.forEach((employee) => {
    const hasTask = openTasks().some((task) => task.employeeId === employee.id);
    employee.status = hasTask ? "working" : "idle";
  });
  pollServerTasks();
}
