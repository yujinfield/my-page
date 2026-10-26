// 주제 글자·화살표 라벨을 그 자리에서 고치기 (contenteditable)
//
// onDone(글자, 끝낸 방법)  끝낸 방법: "enter" | "tab" | "escape" | "blur"
// onInput()               글자가 바뀔 때마다 (크기가 바뀌니 선을 다시 그리려고)

export function startEditing(el, text, onDone, onInput) {
  el.textContent = text;
  // 붙여넣기에 서식이 섞이지 않게 글자만 받음 (지원하지 않는 브라우저는 일반 편집)
  el.contentEditable = "plaintext-only";
  if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
  el.classList.add("editing");
  el.focus();
  selectAll(el);

  let finished = false;

  function finish(how) {
    if (finished) return;
    finished = true;
    el.removeEventListener("keydown", handleKey);
    el.removeEventListener("blur", handleBlur);
    el.removeEventListener("input", handleInput);
    const newText = el.innerText.trim();
    el.contentEditable = "false";
    el.classList.remove("editing");
    onDone(newText, how);
  }

  function handleKey(event) {
    event.stopPropagation(); // 편집 중에는 캔버스 단축키가 동작하지 않게
    // 한글 조합 중에 누른 Enter는 글자 확정용이므로 무시
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      finish("enter");
    } else if (event.key === "Tab") {
      event.preventDefault();
      finish("tab");
    } else if (event.key === "Escape") {
      finish("escape");
    }
  }

  function handleBlur() {
    finish("blur");
  }

  function handleInput() {
    if (onInput) onInput();
  }

  el.addEventListener("keydown", handleKey);
  el.addEventListener("blur", handleBlur);
  el.addEventListener("input", handleInput);
}

function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}
