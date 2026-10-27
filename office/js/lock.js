// 비밀번호로 잠그고 풀기 (PBKDF2로 열쇠를 만들고 AES-GCM으로 잠금, DOM 사용 안 함)

const ROUNDS = 200000;

function toBase64(bytes) {
  let text = "";
  bytes.forEach((byte) => {
    text += String.fromCharCode(byte);
  });
  return btoa(text);
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

export function newSalt() {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

// 비밀번호 + 소금(salt) → 열쇠
export async function makeKey(password, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromBase64(salt), iterations: ROUNDS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

// 글자 → 잠긴 상자 { salt, iv, data }
export async function seal(key, salt, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { salt, iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

// 잠긴 상자 → 글자 (열쇠가 틀리면 에러)
export async function unseal(key, box) {
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(box.iv) }, key, fromBase64(box.data));
  return new TextDecoder().decode(data);
}

// 기기에 열쇠를 저장하려고 글자로 바꿈 (비밀번호를 매번 묻지 않게)
export async function exportKey(key) {
  return toBase64(new Uint8Array(await crypto.subtle.exportKey("raw", key)));
}

export function importKey(text) {
  return crypto.subtle.importKey("raw", fromBase64(text), "AES-GCM", true, ["encrypt", "decrypt"]);
}
