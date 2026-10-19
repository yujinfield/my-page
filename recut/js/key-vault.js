// API 키 잠금(암호화)·잠금 해제
// 브라우저에 들어 있는 암호화 기능(Web Crypto)만 씁니다. 외부 라이브러리 없음.
//
// 잠금 비밀번호 → PBKDF2(SHA-256, 31만 번 반복)로 열쇠를 만들고 → AES-GCM으로 키를 암호화합니다.
// 저장되는 것은 암호문뿐이고, 비밀번호와 원래 키는 어디에도 저장하지 않습니다.

const ITERATIONS = 310000;
const VAULT_VERSION = 1;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
  let text = '';
  new Uint8Array(bytes).forEach((byte) => { text += String.fromCharCode(byte); });
  return btoa(text);
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// 이 브라우저에서 암호화를 쓸 수 있는지 (https 또는 localhost에서만 가능)
export function canEncrypt() {
  return Boolean(window.isSecureContext && window.crypto && window.crypto.subtle);
}

// API 키 → 저장해도 되는 암호문 묶음
export async function lockKey(apiKey, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(apiKey));
  return { version: VAULT_VERSION, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(data) };
}

// 암호문 묶음 + 비밀번호 → API 키 (비밀번호가 틀리면 null)
export async function unlockKey(record, passphrase) {
  if (!record || record.version !== VAULT_VERSION) return null;
  try {
    const key = await deriveKey(passphrase, fromBase64(record.salt));
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(record.iv) }, key, fromBase64(record.data));
    return decoder.decode(data);
  } catch (error) {
    return null; // AES-GCM은 비밀번호가 틀리면 복호화 자체가 실패해요
  }
}

// 화면에 보여 줄 때: 앞 3글자와 끝 4글자만
export function maskKey(apiKey) {
  if (apiKey.length <= 8) return '••••';
  return `${apiKey.slice(0, 3)}…${apiKey.slice(-4)}`;
}
