// 완료 보고 아래: 만든 이미지 보기·저장, 승인하면 네이버 블로그에 임시 저장
// 직원(GPT)은 발행·저장을 못 하고, 대표님이 여기서 승인할 때만 사무실 서버가 Uplika로 저장합니다.

import { loadImage } from "./store.js";
import { serverReady, saveNaverDraft } from "./server.js";
import { uplikaCredentials } from "./uplika.js";

let app;

export function initReportActions(appApi) {
  app = appApi;
}

// 완료 보고 메시지 → 그 아래에 붙일 요소
export function reportActions(message) {
  const box = document.createElement("div");
  box.className = "report-actions";
  if (message.imageId) box.append(imageBlock(message.imageId));
  box.append(draftBlock(message));
  return box;
}

// ---- 이미지 ----

function imageBlock(imageId) {
  const figure = document.createElement("figure");
  figure.className = "report-image";
  const note = document.createElement("p");
  note.className = "muted small";
  note.textContent = "🖼️ 이미지를 불러오는 중…";
  figure.append(note);

  loadImage(imageId).then((base64) => {
    if (!base64) {
      note.textContent = "🖼️ 이미지는 만든 기기에서만 보여요.";
      return;
    }
    const source = `data:image/webp;base64,${base64}`;
    const image = document.createElement("img");
    image.src = source;
    image.alt = "직원이 만든 이미지";
    const link = document.createElement("a");
    link.href = source;
    link.download = `ai-office-${imageId}.webp`;
    link.textContent = "이미지 저장";
    figure.replaceChildren(image, link);
  });
  return figure;
}

// ---- 네이버 임시 저장 ----

// 제목 줄이면 제목을 돌려줌: "# 제목" 또는 "제목: …". 아니면 null
function titleIn(line) {
  const heading = line.match(/^#{1,3}\s+(.+)/);
  if (heading) return heading[1].trim();
  const labeled = line.match(/^\**제목\**\s*[:：]\s*(.+)/);
  if (labeled) return labeled[1].replace(/\*+/g, "").trim();
  return null;
}

// 보고 글에서 처음 나오는 제목. 없으면 ""
function guessTitle(text) {
  for (const line of text.split("\n")) {
    const title = titleIn(line);
    if (title) return title;
  }
  return "";
}

// 첫 줄("○○을 했어요" 요약)과 제목 줄은 빼고 본문만 (네이버에서 제목이 두 번 나오지 않게)
function bodyOf(text, title) {
  const lines = text.split("\n");
  const rest = lines.length > 1 ? lines.slice(1) : lines;
  const titleLine = rest.findIndex((line) => titleIn(line) === title);
  if (titleLine >= 0) rest.splice(titleLine, 1);
  return rest.join("\n").trim();
}

function draftBlock(message) {
  const box = document.createElement("div");
  box.className = "draft-box";

  if (message.naverDraftAt) {
    const done = document.createElement("p");
    done.className = "muted small";
    done.textContent = "📝 네이버 블로그 임시 저장을 요청했어요. 브라우저 확장 프로그램이 저장해요.";
    box.append(done);
    return box;
  }

  const open = document.createElement("button");
  open.type = "button";
  open.className = "text-button";
  open.textContent = "✅ 승인 → 네이버 임시 저장";
  open.addEventListener("click", () => {
    open.hidden = true;
    form.hidden = false;
    titleInput.focus();
  });

  const form = document.createElement("div");
  form.className = "draft-form";
  form.hidden = true;
  const label = document.createElement("label");
  label.className = "field";
  label.textContent = "글 제목";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.maxLength = 100;
  titleInput.value = guessTitle(message.text);
  label.append(titleInput);
  const save = document.createElement("button");
  save.type = "button";
  save.className = "primary";
  save.textContent = "임시 저장";
  const status = document.createElement("p");
  status.className = "status long-message";
  status.setAttribute("aria-live", "polite");
  form.append(label, save, status);

  save.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    if (!title) {
      status.textContent = "제목을 넣어 주세요.";
      return;
    }
    save.disabled = true;
    status.textContent = "저장하는 중…";
    try {
      await saveDraft(message, title);
      app.save();
      app.refreshAll();
    } catch (error) {
      status.textContent = error.message;
      save.disabled = false;
    }
  });

  box.append(open, form);
  return box;
}

async function saveDraft(message, title) {
  const settings = app.state.settings;
  if (!serverReady(settings)) throw new Error("⚙︎ 설정에서 사무실 서버를 먼저 연결해 주세요. (Uplika가 사이트에서 바로 저장하는 걸 막아서 서버를 거쳐요)");
  const credentials = await uplikaCredentials();
  if (!credentials) throw new Error("⚙︎ 설정에서 Uplika를 먼저 연결해 주세요.");
  await saveNaverDraft(settings, { ...credentials, title, content: bodyOf(message.text, title) });
  message.naverDraftAt = Date.now();
}
