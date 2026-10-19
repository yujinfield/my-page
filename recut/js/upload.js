// 이미지 올리기: 파일 선택, 끌어다 놓기, 예시 이미지 읽기

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 열 수 없어요. PNG나 JPG 파일인지 확인해 주세요.'));
    image.src = url;
  });
}

export function loadImageFromFile(file) {
  return loadImage(URL.createObjectURL(file));
}

// dropZone에 끌어다 놓거나 fileInput으로 고르면 onFile(file)
export function setupUpload({ dropZone, fileInput, onFile }) {
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) onFile(file);
    fileInput.value = '';
  });

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragging'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  });
}
