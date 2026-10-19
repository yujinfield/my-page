// 컷 그림 내려받기: 파일 이름 정하기, 여러 장 차례로 내려받기

import { cutLabel } from './grid.js';
import { downloadCanvas, downloadUrl } from './crop.js';

const WAIT_BETWEEN_FILES_MS = 300; // 한꺼번에 받으면 브라우저가 일부를 막을 수 있어서 조금씩 쉼
const MANY_FILES_NOTICE = '내려받는 중… 브라우저가 "여러 파일 내려받기"를 물으면 허용해 주세요.';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 원본 4:5 그림 파일 이름: 01.png
export function originalFileName(index) {
  return `${cutLabel(index)}.png`;
}

// 다시 그린 그림 파일 이름: 01_redraw.png (여러 장이면 지금 보는 번호를 붙여 01_redraw_2.png)
export function redrawFileName(index, redraw) {
  const version = redraw.images.length > 1 ? `_${redraw.current + 1}` : '';
  return `${cutLabel(index)}_redraw${version}.png`;
}

// makeCanvas(index) → 1080×1350 캔버스, setStatus(글)
export async function downloadAllOriginals(count, makeCanvas, setStatus) {
  setStatus(MANY_FILES_NOTICE);
  for (let index = 0; index < count; index += 1) {
    await downloadCanvas(makeCanvas(index), originalFileName(index));
    await wait(WAIT_BETWEEN_FILES_MS);
  }
  setStatus(`${count}장을 내려받았어요. (1080×1350)`);
}

// 컷마다 지금 보고 있는 다시 그린 그림 한 장씩
export async function downloadAllRedraws(redraws, setStatus) {
  const drawn = redraws
    .map((redraw, index) => ({ redraw, index }))
    .filter((item) => item.redraw.images.length > 0);
  if (drawn.length === 0) {
    setStatus('아직 다시 그린 그림이 없어요.');
    return;
  }
  setStatus(MANY_FILES_NOTICE);
  for (const { redraw, index } of drawn) {
    downloadUrl(redraw.images[redraw.current], redrawFileName(index, redraw));
    await wait(WAIT_BETWEEN_FILES_MS);
  }
  setStatus(`다시 그린 그림 ${drawn.length}장을 내려받았어요. (컷마다 지금 보고 있는 그림)`);
}
