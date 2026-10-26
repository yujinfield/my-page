// 주제 글자·화살표 라벨을 그 자리에서 고치기
//
// 휴대폰에서도 키보드가 잘 뜨도록 진짜 입력칸(<textarea>)을 글자 위에 겹쳐 씁니다.
// 글자 요소에는 같은 글자를 투명하게 넣어 두어, 주제 크기가 입력에 맞춰 늘어나게 합니다.
//
// onDone(글자, 끝낸 방법)  끝낸 방법: "enter" | "tab" | "escape" | "blur"
// onInput()               글자가 바뀔 때마다 (크기가 바뀌니 선을 다시 그리려고)

export function startEditing(el, text, onDone, onInput) {
  const mirror = document.createTextNode("");
  const input = document.createElement("textarea");
  input.className = "inline-editor";
  input.value = text;
  input.rows = 1;
  input.placeholder = "글자 입력";
  input.setAttribute("aria-label", "글자 고치기");
  input.spellcheck = false;

  el.replaceChildren(mirror, input);
  el.classList.add("editing");
  syncMirror();
  input.focus();
  input.select();

  let finished = false;

  // 투명한 글자를 입력칸과 똑같이 맞춤 (끝이 줄바꿈이면 빈 줄도 자리를 차지하게)
  function syncMirror() {
    mirror.data = input.value.endsWith("\n") || input.value === "" ? `${input.value} ` : input.value;
  }

  function finish(how) {
    if (finished) return;
    finished = true;
    const newText = input.value.trim();
    el.classList.remove("editing");
    el.textContent = newText;
    onDone(newText, how);
  }

  input.addEventListener("keydown", (event) => {
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
  });

  input.addEventListener("input", () => {
    syncMirror();
    if (onInput) onInput();
  });

  input.addEventListener("blur", () => finish("blur"));
}

// 지금 글자를 고치는 중인지 (단축키·끌기를 막을 때 씀)
export function isEditing(target) {
  return Boolean(target && target.closest && target.closest(".inline-editor"));
}
