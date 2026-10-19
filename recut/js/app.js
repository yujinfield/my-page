// 진입점: 상태를 들고 각 모듈을 연결합니다.

import { computeCutRects, applyNudge, cutCount, cutLabel, findLines, normalizeGrid } from './grid.js';
import { cropToCanvas, fitToPortrait, canvasToBlob, downloadCanvas, downloadUrl, measureBrightness } from './crop.js';
import { loadImage, loadImageFromFile, setupUpload } from './upload.js';
import { SAMPLES, fetchSampleCuts, sampleImageUrl } from './sample.js';
import { setupGridPanel, fillGridInputs, drawGridPreview } from './grid-panel.js';
import { renderCuts, updatePreview, setCutText, showRedraw, setCutStatus, setCutBusy, scrollToCut } from './cuts-panel.js';
import { setupKeyPanel, getApiKey } from './key-panel.js';
import { buildRedrawPrompt, buildRevisePrompt } from './redraw-prompt.js';
import { generateImage, loadTurnaround, dataUrlToBlob } from './image-gen.js';
import { setupImageSettings } from './image-settings.js';
import { setupTheme } from './theme.js';
import { loadDraft, saveDraft, emptyCut, loadImageSettings, saveImageSettings } from './store.js';

const state = {
  image: null,                 // 올린 원본 (<img>), 저장하지 않음
  draft: loadDraft(),          // 격자·맞추는 방법·컷 글 (저장함)
  settings: loadImageSettings(),
  redraws: [],                 // 컷마다 { images: ['data:...'], current }, 메모리에만
  controller: null,            // 그리는 중이면 AbortController
};

const el = {
  uploadStatus: document.getElementById('upload-status'),
  cutList: document.getElementById('cut-list'),
  cutsEmpty: document.getElementById('cuts-empty'),
  cutTotal: document.getElementById('cut-total'),
  cutsStatus: document.getElementById('cuts-status'),
  stopButton: document.getElementById('stop-button'),
  redrawAllButton: document.getElementById('redraw-all-button'),
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- 컷 계산 ----------

// 격자 칸 수에 맞게 컷 글 목록 길이 맞추기 (있던 글은 그대로)
function syncCutCount() {
  const count = cutCount(state.draft.grid);
  while (state.draft.cuts.length < count) state.draft.cuts.push(emptyCut());
  state.draft.cuts.length = count;
  while (state.redraws.length < count) state.redraws.push({ images: [], current: 0 });
  state.redraws.length = count;
}

function cutRects() {
  const width = state.image.naturalWidth;
  const height = state.image.naturalHeight;
  return computeCutRects(width, height, state.draft.grid)
    .map((rect, index) => applyNudge(rect, state.draft.cuts[index].nudge, width, height));
}

function cropCut(index) {
  return cropToCanvas(state.image, cutRects()[index]);
}

function portraitCut(index) {
  return fitToPortrait(cropCut(index), state.draft.fitMode);
}

// ---------- 화면 갱신 ----------

function refreshPreview(index) {
  updatePreview(index, portraitCut(index));
}

function refreshAll() {
  syncCutCount();
  saveDraft(state.draft);
  fillGridInputs(state.draft.grid, state.draft.fitMode);
  const hasImage = Boolean(state.image);
  drawGridPreview(state.image, hasImage ? cutRects() : []);
  el.cutsEmpty.hidden = hasImage;
  el.cutTotal.textContent = hasImage ? state.draft.cuts.length : 0;
  if (!hasImage) {
    el.cutList.replaceChildren();
    return;
  }
  renderCuts(el.cutList, state.draft.cuts, cutHandlers);
  state.draft.cuts.forEach((cut, index) => {
    refreshPreview(index);
    showRedraw(index, state.redraws[index]);
  });
}

function setImage(image, message) {
  state.image = image;
  state.redraws = [];
  refreshAll();
  el.uploadStatus.textContent = message;
}

// ---------- ① 올리기 ----------

async function openFile(file) {
  try {
    const image = await loadImageFromFile(file);
    setImage(image, `${file.name} (${image.naturalWidth}×${image.naturalHeight})을 열었어요.`);
  } catch (error) {
    el.uploadStatus.textContent = error.message;
  }
}

function hasWrittenText() {
  return state.draft.cuts.some((cut) => cut.text.trim() || cut.memo.trim());
}

async function openSample() {
  const sample = SAMPLES[0];
  if (hasWrittenText() && !window.confirm('지금 적어 둔 컷 내용·수정 메모를 예시 대본으로 바꿀까요?')) return;
  el.uploadStatus.textContent = '예시를 불러오는 중…';
  try {
    const [image, sampleCuts] = await Promise.all([loadImage(sampleImageUrl(sample)), fetchSampleCuts(sample)]);
    state.draft.grid = normalizeGrid(sample.grid);
    state.draft.cuts = sampleCuts.map((cut) => ({ ...emptyCut(), text: cut.text, memo: cut.memo }));
    state.image = image;
    autoFitLines();
    setImage(image, `예시 "${sample.label}"를 열고 자동으로 경계선을 맞췄어요. 컷 내용도 대본으로 채웠어요.`);
  } catch (error) {
    el.uploadStatus.textContent = error.message;
  }
}

// ---------- ② 격자 ----------

function autoFitLines() {
  const { columns, rows } = measureBrightness(state.image);
  state.draft.grid.xLines = findLines(columns, state.draft.grid.cols);
  state.draft.grid.yLines = findLines(rows, state.draft.grid.rows);
}

const gridHandlers = {
  getGrid: () => state.draft.grid,
  onGridChange(grid) {
    state.draft.grid = grid;
    refreshAll();
  },
  onFitChange(mode) {
    state.draft.fitMode = mode;
    saveDraft(state.draft);
    if (state.image) state.draft.cuts.forEach((cut, index) => refreshPreview(index));
  },
  onAuto() {
    if (!state.image) return;
    autoFitLines();
    refreshAll();
  },
  onEven() {
    state.draft.grid.xLines = null;
    state.draft.grid.yLines = null;
    refreshAll();
  },
};

// ---------- ④ 다시 그리기 ----------

function errorText(error) {
  const text = error.problem ? `${error.problem} ${error.fix || ''}`.trim() : error.message;
  return error.detail ? `${text} (자세한 내용: ${error.detail})` : text;
}

// mode "redraw": 원본 컷으로 새로 그리기 / "revise": 지금 보고 있는 다시 그린 그림 고치기
async function drawCut(index, mode, apiKey, signal) {
  const cut = state.draft.cuts[index];
  const total = state.draft.cuts.length;
  const redraw = state.redraws[index];
  const references = [];
  let prompt;

  if (mode === 'revise') {
    references.push(dataUrlToBlob(redraw.images[redraw.current]));
    prompt = buildRevisePrompt({ index, total, memo: cut.memo });
  } else {
    references.push(await canvasToBlob(cropCut(index)));
    const { style, watermark, useTurnaround } = state.settings;
    const sendTurnaround = style === 'kkomjwi' && useTurnaround;
    if (sendTurnaround) references.push(await loadTurnaround());
    prompt = buildRedrawPrompt({
      index, total, text: cut.text, memo: cut.memo, style, watermark, useTurnaround: sendTurnaround,
    });
  }

  const image = await generateImage({ apiKey, settings: state.settings, prompt, references, signal });
  redraw.images.push(image);
  redraw.current = redraw.images.length - 1;
  showRedraw(index, redraw);
}

// 한 장 그리기 + 상태 표시. 성공하면 true
async function runCut(index, mode, apiKey) {
  const label = cutLabel(index);
  setCutBusy(index, true);
  setCutStatus(index, mode === 'revise' ? '고치는 중… (1~2분 걸릴 수 있어요)' : '다시 그리는 중… (1~2분 걸릴 수 있어요)');
  try {
    await drawCut(index, mode, apiKey, state.controller.signal);
    setCutStatus(index, '다 그렸어요. 마음에 들면 내려받기를 눌러 주세요 (새로고침하면 사라져요).');
    return true;
  } catch (error) {
    setCutStatus(index, `${label}컷: ${errorText(error)}`);
    if (error.settingsFocus) {
      const field = document.getElementById(error.settingsFocus);
      if (field) field.focus();
    }
    return false;
  } finally {
    setCutBusy(index, false);
  }
}

function startWork() {
  if (state.controller) {
    el.cutsStatus.textContent = '다른 컷을 그리는 중이에요. 끝나거나 멈춘 뒤에 눌러 주세요.';
    return false;
  }
  state.controller = new AbortController();
  el.stopButton.hidden = false;
  el.redrawAllButton.disabled = true;
  return true;
}

function endWork() {
  state.controller = null;
  el.stopButton.hidden = true;
  el.redrawAllButton.disabled = false;
}

async function redrawOne(index, mode) {
  const apiKey = getApiKey();
  if (!apiKey || !startWork()) return;
  await runCut(index, mode, apiKey);
  endWork();
}

async function redrawAll() {
  if (!state.image) return;
  const total = state.draft.cuts.length;
  if (!window.confirm(`${total}장을 차례로 다시 그릴까요? 그림마다 OpenAI 비용이 들어요.`)) return;
  const apiKey = getApiKey();
  if (!apiKey || !startWork()) return;
  for (let index = 0; index < total; index += 1) {
    if (state.controller.signal.aborted) break;
    el.cutsStatus.textContent = `${cutLabel(index)}컷 그리는 중… (${index + 1}/${total})`;
    scrollToCut(index);
    const ok = await runCut(index, 'redraw', apiKey);
    if (!ok) {
      el.cutsStatus.textContent = `${cutLabel(index)}컷에서 멈췄어요. 그 컷의 안내를 확인해 주세요.`;
      endWork();
      return;
    }
  }
  el.cutsStatus.textContent = state.controller.signal.aborted ? '멈췄어요.' : `${total}장을 모두 그렸어요. 컷마다 내려받기를 눌러 저장하세요.`;
  endWork();
}

async function downloadAll() {
  if (!state.image) return;
  el.cutsStatus.textContent = '내려받는 중… 브라우저가 "여러 파일 내려받기"를 물으면 허용해 주세요.';
  for (let index = 0; index < state.draft.cuts.length; index += 1) {
    await downloadCanvas(portraitCut(index), `${cutLabel(index)}.png`);
    await wait(300);
  }
  el.cutsStatus.textContent = `${state.draft.cuts.length}장을 내려받았어요. (1080×1350)`;
}

const cutHandlers = {
  onText(index, field, value) {
    state.draft.cuts[index][field] = value;
    saveDraft(state.draft);
  },
  onNudge(index, nudge) {
    state.draft.cuts[index].nudge = nudge;
    saveDraft(state.draft);
    refreshPreview(index);
    drawGridPreview(state.image, cutRects());
  },
  onDownload(index) {
    downloadCanvas(portraitCut(index), `${cutLabel(index)}.png`);
  },
  onRedraw(index) {
    redrawOne(index, 'redraw');
  },
  onRevise(index) {
    redrawOne(index, 'revise');
  },
  onDownloadRedraw(index) {
    const redraw = state.redraws[index];
    const version = redraw.images.length > 1 ? `_${redraw.current + 1}` : '';
    downloadUrl(redraw.images[redraw.current], `${cutLabel(index)}_redraw${version}.png`);
  },
  onMoveRedraw(index, step) {
    const redraw = state.redraws[index];
    redraw.current = Math.min(redraw.images.length - 1, Math.max(0, redraw.current + step));
    showRedraw(index, redraw);
  },
};

// ---------- 시작 ----------

setupTheme(() => {
  if (state.image) drawGridPreview(state.image, cutRects()); // 선 색(--accent)이 바뀜
});
setupUpload({
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  onFile: openFile,
});
document.getElementById('sample-button').addEventListener('click', openSample);
setupGridPanel(gridHandlers);
setupKeyPanel();
setupImageSettings(state.settings, (settings) => {
  state.settings = settings;
  saveImageSettings(settings);
});
document.getElementById('download-all-button').addEventListener('click', downloadAll);
el.redrawAllButton.addEventListener('click', redrawAll);
el.stopButton.addEventListener('click', () => {
  if (state.controller) state.controller.abort();
});
refreshAll();
