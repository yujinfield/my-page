// 도트 그림 그리기 (캔버스 1칸 = 도트 1개)
// 도트 그림의 색은 CSS 변수가 아니라 여기 팔레트에 모아 둡니다. (캔버스는 CSS 변수를 바로 못 씀)

export const SCENE_WIDTH = 224;
export const SCENE_HEIGHT = 126;
export const WALL_HEIGHT = 34;
const WAINSCOT_TOP = 21; // 벽 아래쪽 나무판이 시작하는 높이

const COLORS = {
  wall: "#efe2c6",
  wallLine: "#e2d1ad",
  wainscot: "#c99a62",
  wainscotDark: "#a97b45",
  floor: "#d9b27c",
  floorLine: "#c49a62",
  rugBlog: "#cdd3d8",
  rugInsta: "#e8cfc8",
  window: "#a9d4ef",
  windowShine: "#d8eefb",
  frame: "#f7f4ee",
  sign: "#fbf8f1",
  signEdge: "#8a6a45",
  deskTop: "#f2f2f0",
  deskFront: "#c9cbcd",
  deskLeg: "#8d9094",
  monitor: "#ebe6da",
  monitorDark: "#c4bdad",
  screen: "#7cc3e8",
  screenOn: "#b6f0c4",
  keyboard: "#d5d7d9",
  chair: "#8e2c34",
  chairLight: "#b5434b",
  potBrown: "#9b6a3c",
  leaf: "#5aa548",
  leafDark: "#3f7f35",
  cooler: "#e6eef4",
  water: "#7fb8e6",
  eye: "#2b2522",
  mouth: "#d9776e",
  collar: "#ffffff",
};

export const HAIR_COLORS = ["#2f2622", "#5b3a29", "#8a5a36", "#c9893f", "#3b3f5c", "#a23b3b"];
export const SKIN_COLORS = ["#f6d7b8", "#efc7a1", "#e2b088", "#c98f66"];
export const SHIRT_COLORS = ["#4a7bd0", "#56a37c", "#d9a43a", "#c45a8c", "#6a5acd", "#e07a4f", "#7d8792"];

// 사람 모양 (가로 10칸, 세로 13칸). h 머리, f 피부, e 눈, m 입, w 옷깃, s 옷
const SHORT_HAIR = [
  "...hhhh...",
  "..hhhhhh..",
  ".hhhhhhhh.",
  ".hhffffhh.",
  ".hfeffefh.",
  "..ffffff..",
  "..ffmmff..",
  "...ffff...",
  "..sswwss..",
  ".ssssssss.",
  "fssssssssf",
  "fssssssssf",
  ".ssssssss.",
];

const LONG_HAIR = [
  "...hhhh...",
  "..hhhhhh..",
  ".hhhhhhhh.",
  "hhhffffhhh",
  "hhfeffefhh",
  "hhffffffhh",
  "hhffmmffhh",
  "hh.ffff.hh",
  "h.sswwss.h",
  ".ssssssss.",
  "fssssssssf",
  "fssssssssf",
  ".ssssssss.",
];

export const PERSON_WIDTH = 10;
export const PERSON_HEIGHT = 13;

function drawPixels(ctx, rows, x, y, colors) {
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const color = colors[row[dx]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  });
}

function rect(ctx, color, x, y, width, height) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

// look: { hair, hairStyle: "short" | "long", skin, shirt }
export function drawPerson(ctx, look, x, y, blink = false) {
  const rows = look.hairStyle === "long" ? LONG_HAIR : SHORT_HAIR;
  drawPixels(ctx, rows, x, y, {
    h: look.hair,
    f: look.skin,
    e: blink ? look.skin : COLORS.eye,
    m: COLORS.mouth,
    w: COLORS.collar,
    s: look.shirt,
  });
}

// 의자 등받이 (사람보다 먼저 그려서 뒤에 보이게)
export function drawChair(ctx, x, y) {
  rect(ctx, COLORS.chair, x - 1, y + 5, 12, 10);
  rect(ctx, COLORS.chairLight, x, y + 6, 10, 2);
}

// 책상, 모니터, 키보드 (사람보다 나중에 그려서 앞에 보이게)
export function drawDesk(ctx, x, y, working) {
  const top = y + 11;
  rect(ctx, COLORS.deskTop, x - 10, top, 30, 4);
  rect(ctx, COLORS.deskFront, x - 10, top + 4, 30, 4);
  rect(ctx, COLORS.deskLeg, x - 9, top + 8, 2, 4);
  rect(ctx, COLORS.deskLeg, x + 17, top + 8, 2, 4);
  rect(ctx, COLORS.keyboard, x + 1, top + 1, 8, 2);
  // 모니터 (일하는 중이면 화면이 초록빛)
  rect(ctx, COLORS.monitor, x - 9, top - 9, 9, 9);
  rect(ctx, COLORS.monitorDark, x - 9, top - 1, 9, 1);
  rect(ctx, working ? COLORS.screenOn : COLORS.screen, x - 8, top - 8, 7, 5);
  rect(ctx, COLORS.monitorDark, x - 6, top, 3, 1);
}

function drawWindow(ctx, x, y) {
  rect(ctx, COLORS.frame, x, y, 30, 17);
  rect(ctx, COLORS.window, x + 2, y + 2, 12, 13);
  rect(ctx, COLORS.window, x + 16, y + 2, 12, 13);
  rect(ctx, COLORS.windowShine, x + 4, y + 4, 3, 8);
  rect(ctx, COLORS.windowShine, x + 18, y + 4, 3, 8);
}

function drawPlant(ctx, x, y) {
  rect(ctx, COLORS.leafDark, x + 1, y + 2, 8, 6);
  rect(ctx, COLORS.leaf, x, y, 6, 5);
  rect(ctx, COLORS.leaf, x + 4, y + 1, 6, 5);
  rect(ctx, COLORS.leaf, x + 2, y - 3, 5, 5);
  rect(ctx, COLORS.potBrown, x + 2, y + 8, 6, 6);
}

function drawCooler(ctx, x, y) {
  rect(ctx, COLORS.water, x + 1, y, 6, 6);
  rect(ctx, COLORS.cooler, x, y + 6, 8, 14);
  rect(ctx, COLORS.monitorDark, x + 2, y + 10, 4, 1);
}

// 팀 이름 표지판 자리 (글자는 HTML로 위에 올림)
export const SIGNS = [
  { team: "blog", x: 40, y: 5, width: 48, height: 11 },
  { team: "insta", x: 136, y: 5, width: 48, height: 11 },
];

export function drawOffice(ctx) {
  // 벽
  rect(ctx, COLORS.wall, 0, 0, SCENE_WIDTH, WALL_HEIGHT);
  for (let x = 6; x < SCENE_WIDTH; x += 12) rect(ctx, COLORS.wallLine, x, 0, 1, WAINSCOT_TOP);
  rect(ctx, COLORS.wainscot, 0, WAINSCOT_TOP, SCENE_WIDTH, WALL_HEIGHT - WAINSCOT_TOP);
  rect(ctx, COLORS.wainscotDark, 0, WAINSCOT_TOP, SCENE_WIDTH, 2);
  rect(ctx, COLORS.wainscotDark, 0, WALL_HEIGHT - 2, SCENE_WIDTH, 2);
  drawWindow(ctx, 4, 2);
  drawWindow(ctx, 97, 2);
  drawWindow(ctx, 190, 2);
  SIGNS.forEach((sign) => {
    rect(ctx, COLORS.signEdge, sign.x - 1, sign.y - 1, sign.width + 2, sign.height + 2);
    rect(ctx, COLORS.sign, sign.x, sign.y, sign.width, sign.height);
  });

  // 나무 바닥
  rect(ctx, COLORS.floor, 0, WALL_HEIGHT, SCENE_WIDTH, SCENE_HEIGHT - WALL_HEIGHT);
  for (let y = WALL_HEIGHT + 7; y < SCENE_HEIGHT; y += 8) {
    rect(ctx, COLORS.floorLine, 0, y, SCENE_WIDTH, 1);
    const shift = (y / 8) % 2 === 0 ? 0 : 20;
    for (let x = shift; x < SCENE_WIDTH; x += 40) rect(ctx, COLORS.floorLine, x, y - 7, 1, 7);
  }

  // 팀마다 다른 색 카펫
  rect(ctx, COLORS.rugBlog, 4, 40, 96, 82);
  rect(ctx, COLORS.rugInsta, 124, 40, 96, 82);

  // 가운데 통로 소품
  drawPlant(ctx, 107, 40);
  drawCooler(ctx, 108, 74);
  drawPlant(ctx, 107, 106);
}

// 지원자·메신저에 쓰는 작은 얼굴 그림
export function makeAvatar(look) {
  const canvas = document.createElement("canvas");
  canvas.width = PERSON_WIDTH + 2;
  canvas.height = 10;
  canvas.className = "avatar";
  canvas.setAttribute("aria-hidden", "true");
  drawPerson(canvas.getContext("2d"), look, 1, 1);
  return canvas;
}
