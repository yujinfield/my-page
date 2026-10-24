# CLAUDE.md — 우리집 가계부

이 파일은 Claude(AI)가 `budget/` 폴더에서 작업할 때 따르는 가이드입니다.
기능과 로드맵은 `README.md`를 기준으로 합니다.

- 이 앱의 코드는 모두 `budget/` 폴더 안에 둡니다. 다른 앱(`memo/`, `recut/`, `instatoon/`, 루트 `index.html`)은 요청이 없으면 수정하지 않습니다.
- 저장소는 **공개**입니다. 실제 금액은 코드(기본값)에 넣지 않고 사용자가 화면에서 입력합니다.

## 원칙

1. **빌드 도구·프레임워크·외부 라이브러리 금지** — 순수 HTML/CSS/JavaScript(ES Modules)만 사용합니다.
2. **파일 분리 필수** — `<style>` 태그나 인라인 `<script>`를 쓰지 않습니다.
3. **기존 기능 보존** — 요청받은 범위만 변경합니다.
4. **단순하게** — 짧고 읽기 쉬운 코드, 명확한 이름.
5. **한국어** — UI 문구, 주석, 커밋 메시지 본문은 한국어. (변수·함수 이름은 영어)

## 코드 구조

| 파일 | 역할 |
| --- | --- |
| `index.html` | 마크업 뼈대 (달 이동, 탭 5개, 설정) |
| `css/base.css` | CSS 변수(색상·간격·폰트), 리셋, 다크 모드 |
| `css/layout.css` | 머리말, 탭, 카드, 요약 카드, 버튼, 반응형 |
| `css/table.css` | 가계부 표, 입력칸, 합계 줄 |
| `css/charts.css` | 원형·막대 그래프, 범례 |
| `js/calc.js` | 금액 계산·월 계산·연간 합계 (순수 함수, DOM 사용 안 함) |
| `js/forecast.js` | "이대로 가면 N년 뒤 M억" 계산·코멘트, 억 단위 표시 (순수 함수) |
| `js/charts.js` | 원형(SVG)·가로 막대(HTML) 그래프. 색은 `--series-*` 변수 |
| `js/history.js` | 변경 이력 남기기 (`addHistory`, 칸을 벗어날 때 기록하는 `watchEdits`) |
| `js/store.js` | 데이터 계층. `localStorage` 읽기/쓰기는 **이 파일에서만** |
| `js/cells.js` | 표 칸·입력칸 만드는 도우미 |
| `js/plan.js` | ① 월 가계부 |
| `js/joint.js` | ② 공동통장 |
| `js/events.js` | ③ 큰돈 캘린더 |
| `js/annual.js` | ④ 연간 요약, 목표·예측 |
| `js/backup.js` | ⑤ 백업 파일 내려받기·불러오기, 이력 보기 |
| `js/theme.js` | 라이트·다크 전환 |
| `js/app.js` | 진입점. 상태(데이터, 보고 있는 달, 탭)를 들고 화면을 연결 |

## 데이터 모델

```js
// localStorage 키: "budget-data" (금액 단위: 만원, 빈칸은 null)
{
  version: 2,
  names: { a: "유진", b: "남편" },
  items: [{ id, group, name, a, b, joint, amount, note }],   // 예산 (모든 달 공통)
  months: { "2026-11": { actual: { [itemId]: 금액 }, depositA, depositB } },
  events: [{ id, month, name, expected, confirmed, method, note }],
  goal: { current, target, rate },      // 현재 자산·목표(만원), 연 수익률(%)
  history: [{ time, text }],            // 변경 이력, 최근 300개
  lastBackupAt: null                    // 마지막 백업 시각(ms)
}
```

- 월 예상액은 저장하지 않고 계산합니다: 공동이면 `amount`, 아니면 `a + b`.
- 버전 1 → 2: `goal`·`history`·`lastBackupAt`이 없으면 기본값을 채웁니다 (`normalizeData`). 백업 파일을 불러올 때도 같은 함수를 씁니다.
- 그래프 색 `--series-1~7`은 색약 검증을 거친 순서입니다. 순서를 바꾸지 말고, 원형 그래프 구분마다 고정 색을 씁니다.
- 데이터 형식을 바꾸면 `version`을 올리고 `store.js`의 `loadData()`에 옮기는 코드를 추가해 **기존 기록이 사라지지 않게** 합니다.

## 실행 & 확인

```bash
python3 -m http.server 8000   # http://localhost:8000/budget/
```

- [ ] 금액 입력 → 새로고침해도 남아 있는가
- [ ] 요약 카드·합계 줄·차이 색(지출은 적을수록, 수입·저축은 많을수록 초록)이 맞는가
- [ ] 달을 바꾸면 실제액이 그 달 것으로 바뀌는가
- [ ] 다크 모드와 모바일 폭(375px)에서 화면 전체가 옆으로 밀리지 않는가 (표만 가로 스크롤)
- [ ] 브라우저 콘솔에 에러가 없는가
