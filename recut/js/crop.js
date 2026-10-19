// 캔버스로 컷 자르기, 4:5에 맞추기
// 이미지는 서버로 보내지 않고 브라우저 안에서만 처리합니다.

export const OUTPUT_WIDTH = 1080;
export const OUTPUT_HEIGHT = 1350;

// 4:5에 맞출 때 남는 곳을 채우는 색 (꼼쥐툰 아이보리 종이색, 다크 모드와 상관없이 고정)
const PAPER_COLOR = '#fbf7ee';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// 원본에서 사각형 하나 잘라 내기 → 캔버스
export function cropToCanvas(image, rect) {
  const canvas = makeCanvas(rect.width, rect.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return canvas;
}

// 잘라 낸 컷 → 1080×1350 캔버스
// mode "fit": 컷 전체가 보이게 줄이고 남는 곳은 종이색 / "fill": 꽉 차게 키우고 넘치는 곳은 가운데 기준으로 잘라 냄
export function fitToPortrait(source, mode) {
  const canvas = makeCanvas(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const context = canvas.getContext('2d');
  context.fillStyle = PAPER_COLOR;
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const scaleX = OUTPUT_WIDTH / source.width;
  const scaleY = OUTPUT_HEIGHT / source.height;
  const scale = mode === 'fill' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const width = source.width * scale;
  const height = source.height * scale;

  context.imageSmoothingQuality = 'high';
  context.drawImage(source, (OUTPUT_WIDTH - width) / 2, (OUTPUT_HEIGHT - height) / 2, width, height);
  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// 자동 맞추기용: 세로줄(열)마다, 가로줄(행)마다 평균 밝기 목록
export function measureBrightness(image) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;

  const columns = new Array(width).fill(0);
  const rows = new Array(height).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const light = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      columns[x] += light;
      rows[y] += light;
    }
  }
  return {
    columns: columns.map((sum) => sum / height),
    rows: rows.map((sum) => sum / width),
  };
}
