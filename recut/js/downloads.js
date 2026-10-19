// 컷 그림 저장: 파일 이름 정하기, 한 장 / 여러 장 저장
//
// 휴대폰(터치 화면)에서는 공유 창(navigator.share)을 엽니다. 아이폰은 여기서 "이미지 저장"을 누르면 사진 앱에 들어가요.
// 컴퓨터나 공유를 못 쓰는 브라우저에서는 <a download>로 내려받기 폴더에 저장합니다.

import { cutLabel } from './grid.js';

const WAIT_BETWEEN_FILES_MS = 400;   // 한꺼번에 받으면 브라우저가 일부를 막을 수 있어서 조금씩 쉼
const REVOKE_AFTER_MS = 60 * 1000;   // 파일 주소를 너무 빨리 지우면(특히 Safari) 내려받기가 실패해서 1분 뒤에 지움

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

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

// 터치 화면이고 파일 공유가 되는 브라우저인지
function canShareFiles(files) {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  return isTouch && Boolean(navigator.canShare) && navigator.canShare({ files });
}

// items: [{ blob, fileName }] → 'shared' | 'cancelled' | 'downloaded'
export async function saveFiles(items) {
  const files = items.map((item) => new File([item.blob], item.fileName, { type: item.blob.type || 'image/png' }));
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files });
      return 'shared';
    } catch (error) {
      if (error && error.name === 'AbortError') return 'cancelled';
      // 공유가 막히면(시간이 지나 허락이 풀린 경우 등) 아래 내려받기로 넘어감
    }
  }
  for (let i = 0; i < items.length; i += 1) {
    if (i > 0) await wait(WAIT_BETWEEN_FILES_MS);
    downloadBlob(items[i].blob, items[i].fileName);
  }
  return 'downloaded';
}

// 결과를 사용자에게 보여 줄 글
export function saveMessage(result, count) {
  if (result === 'shared') return `${count}장을 공유 창으로 보냈어요. 아이폰은 "이미지 저장"을 누르면 사진 앱에 들어가요.`;
  if (result === 'cancelled') return '저장을 취소했어요.';
  return `${count}장을 내려받았어요. 내려받기 폴더(아이폰은 파일 앱)를 확인해 주세요. 카카오톡·인스타그램 안에서 열었다면 Safari·Chrome으로 열어 주세요.`;
}
