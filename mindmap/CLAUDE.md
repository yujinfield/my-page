# CLAUDE.md — 무한 마인드맵

이 파일은 Claude(AI)가 `mindmap/` 폴더에서 작업할 때 따르는 가이드입니다.
기능과 로드맵은 `README.md`를 기준으로 합니다.

- 이 앱의 코드는 모두 `mindmap/` 폴더 안에 둡니다. 다른 앱(루트 `index.html`, `memo/`, `budget/`, `recut/`, `instatoon/`, `turtle-club/`)은 요청이 없으면 수정하지 않습니다.
- 다른 앱의 JS를 `import` 하지 않습니다.

## 원칙

1. **빌드 도구·프레임워크·외부 라이브러리 금지** — 순수 HTML/CSS/JavaScript(ES Modules)만 사용합니다.
2. **파일 분리 필수** — `<style>` 태그나 인라인 `<script>`를 쓰지 않습니다. CSP 때문에 `style` 속성 문자열도 쓰지 않고, 스타일은 `el.style.left = …`처럼 JS 속성으로만 바꿉니다.
3. **기존 기능 보존** — 요청받은 범위만 변경합니다.
4. **단순하게** — 짧고 읽기 쉬운 코드, 명확한 이름.
5. **한국어** — UI 문구, 주석, 커밋 메시지 본문은 한국어. (변수·함수 이름은 영어)
6. 사용자 글자(주제, 라벨)는 **`textContent`로만** 넣습니다. `innerHTML` 금지.

## 코드 구조

| 파일 | 역할 |
| --- | --- |
| `index.html` | 도구 막대, 캔버스(`#world` 안에 `<svg>` 연결선 + `#nodes` 주제), 단축키 안내 |
| `css/base.css` | CSS 변수(색상·간격·폰트), 리셋, 다크 모드 |
| `css/layout.css` | 도구 막대·캔버스·안내줄 배치, 휴대폰(768px 이하) |
| `css/canvas.css` | 캔버스 바탕, 주제, 손잡이, 연결선, 화살표 라벨 |
| `js/store.js` | 데이터 계층. `localStorage` 읽기/쓰기는 **이 파일에서만** (형식이 바뀌면 `migrate`에 추가) |
| `js/model.js` | 주제·연결선 추가/삭제/이동, 부모·자식·자손 찾기 (DOM 사용 안 함) |
| `js/geometry.js` | 화면↔캔버스 좌표, 확대, 전체 보기, 새 주제 자리, 연결선 모양, 방향키 이웃 찾기 (DOM 사용 안 함) |
| `js/render.js` | 주제·연결선·라벨 그리기. 그린 뒤 주제 크기를 재서 `getBoxes`로 알려 줌 |
| `js/edit.js` | 주제·라벨을 그 자리에서 고치기 (contenteditable, 한글 조합 중 Enter 무시) |
| `js/canvas.js` | 포인터 조작: 화면 이동, 휠·핀치 확대, 주제 끌기, 손잡이로 화살표 잇기, 두 번 누르기 |
| `js/history.js` | 실행 취소/다시 실행. 지도를 바꾸기 **직전에** `remember(map)`을 부름 (DOM 사용 안 함) |
| `js/viewport.js` | 화면 이동·확대 (`setView`, `zoomBy`, `fitAll`, `ensureVisible`) |
| `js/linking.js` | 화살표 잇기 (연결 모드, 점선 미리보기, 결정 주제의 예/아니오 라벨) |
| `js/palette.js` | 주제 색 고르는 작은 창 |
| `js/theme.js` | 라이트/다크 전환 |
| `js/keyboard.js` | 키보드 단축키 (편집 중·버튼 초점일 때는 기본 동작 유지) |
| `js/app.js` | 진입점. 상태(`state`)와 동작 함수를 들고 도구 막대·각 모듈을 연결 |

파일이 약 300줄을 넘으면 나눕니다.

## 그리기 방식

- `#world` 하나에 `transform: translate() scale()`을 걸어 끝없는 캔버스를 만듭니다. 화면 좌표 = 캔버스 좌표 × zoom + (view.x, view.y)
- 데이터가 바뀌면 `renderAll`로 전부 다시 그리고, 끌기 중에는 `refreshPositions`로 자리와 선만 고칩니다.
- 고르기만 바꿀 때는 `markSelection`만 부릅니다. (다시 그리면 두 번 클릭이 끊김)

## 데이터 모델

```js
// localStorage 키: "mindmap-data"
{
  version: 1,
  nodes: [{ id: "n_<timestamp>_<n>", text: "...", x: 0, y: 0, shape: "decision", color: "blue" }], // shape·color는 없어도 됨
  edges: [{ id: "e_...", from: "n_...", to: "n_...", type: "branch" | "flow", label: "" }],
  view: { x: 0, y: 0, zoom: 1 } // 마지막 화면 위치
}
```

- 데이터를 바꾸는 동작을 새로 만들면 바꾸기 전에 `history.remember(state.map)`을 불러 되돌릴 수 있게 합니다.
- 부모는 `branch` 연결선으로 알아냅니다. 주제마다 부모는 하나뿐(나무 구조)이어야 합니다.
- 읽을 수 없는 저장 데이터는 `mindmap-data-broken` 키에 보관한 뒤 새 지도로 시작합니다.

## 디자인

- Bear 느낌: 조용한 바탕, 테두리보다 배경색·그림자 차이. 강조색은 `--accent` 하나. 가지는 회색, 화살표는 강조색.
- 주제 색은 사용자가 고르는 옅은 바탕색(`--node-*`)이고, `.color-*` 클래스가 `--node-bg`를 바꿉니다.
- 색상·간격은 `base.css` 변수로만. 다크 모드는 `prefers-color-scheme` + `[data-theme]`.
- 본문 16px 이상, 버튼에 `aria-label`, 키보드로 모든 기능 사용 가능.

## 확인

자동 테스트는 없습니다. 변경 후 직접 확인합니다.

- [ ] Tab/Enter로 주제 추가, Space로 편집(한글 입력 후 Enter), 새로고침해도 남아 있는가
- [ ] 손잡이 끌기와 `L`로 화살표가 생기고, 라벨을 달 수 있는가
- [ ] `D` 결정 주제(예/아니오 갈래), `C`·● 색, `Ctrl+Z`/`Ctrl+Shift+Z`가 동작하는가
- [ ] 화면 끌기·휠·`Ctrl`+휠·전체 보기가 동작하는가
- [ ] 다크 모드와 휴대폰 폭(375px)에서 깨지지 않는가, 콘솔 에러가 없는가

## Git

- 커밋은 기능 단위로 작게. 메시지 예: `마인드맵에 실행 취소 추가`
- `README.md`의 로드맵 체크박스를 작업 완료 시 함께 갱신합니다.
