// 주제 색 고르는 작은 창
//
// canOpen(): 창을 열어도 되는지 (주제를 골랐는지)
// currentColor(): 고른 주제의 지금 색 (표시용)
// onPick(색 또는 null)

import { NODE_COLORS } from "./model.js";

const COLOR_NAMES = {
  red: "빨강",
  orange: "주황",
  yellow: "노랑",
  green: "초록",
  blue: "파랑",
  purple: "보라",
};

export function setupPalette(button, panel, { canOpen, currentColor, onPick }) {
  const choices = [null, ...NODE_COLORS];
  const swatches = choices.map((color) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = color ? `swatch color-${color}` : "swatch";
    swatch.textContent = color ? "" : "✕";
    swatch.setAttribute("aria-label", color ? COLOR_NAMES[color] : "색 없음");
    swatch.title = swatch.getAttribute("aria-label");
    swatch.addEventListener("click", () => {
      close();
      onPick(color);
    });
    panel.append(swatch);
    return { color, swatch };
  });

  function open() {
    const rect = button.getBoundingClientRect();
    panel.hidden = false;
    // 화면 오른쪽을 넘지 않게
    const left = Math.min(rect.left, window.innerWidth - panel.offsetWidth - 8);
    panel.style.left = `${Math.max(8, left)}px`;
    panel.style.top = `${rect.bottom + 6}px`;
    button.setAttribute("aria-expanded", "true");
    const now = currentColor();
    for (const { color, swatch } of swatches) {
      swatch.setAttribute("aria-pressed", String(color === now));
    }
    swatches[0].swatch.focus();
  }

  function close() {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }

  button.addEventListener("click", () => {
    if (!panel.hidden) close();
    else if (canOpen()) open();
  });

  // 창 밖을 누르거나 Esc를 누르면 닫음
  document.addEventListener("pointerdown", (event) => {
    if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) close();
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      button.focus();
    }
  });
}
