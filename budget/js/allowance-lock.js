// 용돈 기록 잠그기·풀기 (브라우저에 들어 있는 Web Crypto 사용, DOM 사용 안 함)
// ☁️ 동기화(sync.js)도 Gist에 올리는 가계부를 같은 방법으로 잠급니다.
// 비밀번호 → PBKDF2로 열쇠를 만들고 → AES-GCM으로 글을 잠급니다.
// 저장되는 것은 잠긴 글뿐이라, 비밀번호를 모르면 백업 파일을 열어 봐도 내용을 읽을 수 없어요.
// 비밀번호 자체는 어디에도 저장하지 않습니다. (잊으면 되찾을 방법이 없음)

const ITERATIONS = 200000; // 비밀번호를 열쇠로 바꾸는 반복 횟수 (많을수록 비밀번호 맞히기가 느려짐)

// Web Crypto는 https나 localhost에서만 쓸 수 있음
export function canLock() {
  return Boolean(window.crypto && window.crypto.subtle);
}

// extractable: 열쇠를 꺼내서 저장할 수 있게 할지 (동기화는 기기마다 비밀번호를 한 번만 넣으려고 열쇠를 저장함)
async function makeKey(password, salt, extractable = false) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt'],
  );
}

// 새 비밀번호로 열쇠 만들기 → { key, salt }
export async function newLock(password, extractable = false) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { key: await makeKey(password, salt, extractable), salt };
}

// 열쇠 꺼내기·되살리기 (동기화 설정을 기기에 저장할 때) → { salt, key } base64 글자
export async function exportLock(lock) {
  const raw = await crypto.subtle.exportKey('raw', lock.key);
  return { salt: toBase64(lock.salt), key: toBase64(new Uint8Array(raw)) };
}

export async function importLock(saved) {
  const key = await crypto.subtle.importKey('raw', fromBase64(saved.key), 'AES-GCM', true, ['encrypt', 'decrypt']);
  return { key, salt: fromBase64(saved.salt) };
}

// 글 잠그기 → 저장할 상자 { salt, iv, data } (모두 base64 글자)
export async function lockText(lock, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, lock.key, new TextEncoder().encode(text));
  return { salt: toBase64(lock.salt), iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

// 이미 가진 열쇠로 풀기 (동기화: 비밀번호 없이). 열쇠가 다르면 에러
export async function openBox(box, lock) {
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(box.iv) }, lock.key, fromBase64(box.data));
  return new TextDecoder().decode(data);
}

// 상자 풀기 → { lock, text }. 비밀번호가 틀리면 에러
export async function unlockBox(box, password, extractable = false) {
  const salt = fromBase64(box.salt);
  const key = await makeKey(password, salt, extractable);
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(box.iv) }, key, fromBase64(box.data));
  return { lock: { key, salt }, text: new TextDecoder().decode(data) };
}

function toBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
