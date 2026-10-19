// 캐릭터 참고 이미지(턴어라운드·캐릭터 시트) 올리기
// 올린 그림은 긴 쪽 1024px로 줄여 이 브라우저에 저장하고, 다시 그릴 때 두 번째 참고 이미지로 보냅니다.

import { loadImageFromFile } from './upload.js';
import { dataUrlToBlob } from './image-gen.js';
import { loadCharacterImage, saveCharacterImage, clearCharacterImage } from './store.js';

const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.92;
const PAPER_COLOR = '#ffffff'; // 투명한 부분은 흰색으로 채움 (JPEG는 투명을 못 담음)

let dataUrl = loadCharacterImage() || '';
const el = {};

// 저장 공간(localStorage)에 들어가도록 줄이고 JPEG로 바꿈
function shrink(image) {
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  context.fillStyle = PAPER_COLOR;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function refresh(message) {
  el.preview.hidden = !dataUrl;
  el.clear.hidden = !dataUrl;
  if (dataUrl) el.preview.src = dataUrl;
  el.status.textContent = message || (dataUrl
    ? '올린 캐릭터 이미지를 함께 보내요.'
    : '올린 이미지가 없어요. 꼼쥐툰 스타일이면 기본 꼼쥐 턴어라운드를 보내요.');
}

async function upload(file) {
  try {
    const image = await loadImageFromFile(file);
    dataUrl = shrink(image);
    const saved = saveCharacterImage(dataUrl);
    refresh(saved
      ? `${file.name}을 올렸어요. 다음에 열어도 남아 있어요.`
      : `${file.name}을 올렸어요. 저장 공간이 모자라 이 창에서만 써요 (새로고침하면 다시 올려 주세요).`);
  } catch (error) {
    refresh(error.message);
  }
}

export function setupCharacterImage() {
  el.input = document.getElementById('character-input');
  el.preview = document.getElementById('character-preview');
  el.clear = document.getElementById('character-clear');
  el.status = document.getElementById('character-status');

  el.input.addEventListener('change', () => {
    const file = el.input.files[0];
    if (file) upload(file);
    el.input.value = '';
  });
  el.clear.addEventListener('click', () => {
    dataUrl = '';
    clearCharacterImage();
    refresh('캐릭터 이미지를 지웠어요.');
  });
  refresh();
}

// 올린 캐릭터 이미지 파일 (없으면 null)
export function getCharacterImageBlob() {
  return dataUrl ? dataUrlToBlob(dataUrl) : null;
}
