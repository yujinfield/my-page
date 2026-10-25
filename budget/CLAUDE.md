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
| `index.html` | 마크업 뼈대 (달 이동, 탭 5개, 📝 메모 창, ⚙️ 설정 창) |
| `css/base.css` | CSS 변수(색상·간격·폰트), 리셋, 다크 모드 |
| `css/layout.css` | 머리말, 탭, 카드, 요약 카드, 버튼, 반응형 |
| `css/table.css` | 가계부 표, 입력칸, 합계 줄, 휴대폰(768px 이하) 카드 배치 |
| `css/charts.css` | 원형·막대 그래프, 범례 |
| `css/actual.css` | ② 실제 사용 목록 |
| `css/memo.css` | 📝 메모 창, 포스트잇 |
| `css/wealth.css` | 저금액·부채 (연간 요약 보기, 설정 창 부채 카드) |
| `js/calc.js` | 금액 계산·월 계산·연간 합계·큰돈 합계 `eventTotals`·`assetSpendByMonth`·달마다 저금액 `savingsTrack`·지금 저금액 `currentSavings` (순수 함수, DOM 사용 안 함) |
| `js/forecast.js` | "이대로 가면 N년 뒤 M억" 계산·코멘트, 부채 상환 `debtPayoff`·지금 남은 부채 `debtBalanceNow`·코멘트 `debtLines`, 억 단위 표시 (순수 함수) |
| `js/charts.js` | 원형(SVG)·가로 막대·세로 막대(HTML) 그래프. 색은 `--series-*` 변수 |
| `js/history.js` | 변경 이력 남기기 (`addHistory`, 칸을 벗어날 때 기록하는 `watchEdits`) |
| `js/store.js` | 데이터 계층. `localStorage` 읽기/쓰기는 **이 파일에서만** |
| `js/cells.js` | 표 칸·입력칸·고르는 칸 만드는 도우미. `areaCell`은 휴대폰 카드용 자리 이름·이름표, `showDiff`는 차이 색 |
| `js/plan.js` | ① 월 가계부 표 (예산 입력, 실제액은 보기만, 항목 세부 항목) |
| `js/plan-summary.js` | ① 월 가계부 위쪽 요약 카드·"이대로 가면?"·그래프 |
| `js/item-details.js` | ① 월 가계부 항목의 세부 항목 줄 만들기 |
| `js/payment-select.js` | ① 월 가계부의 사람별 결제 수단 고르는 칸 |
| `js/month-memo.js` | ① 월 가계부 표 위 이번 달 메모 |
| `js/actual.js` | ② 실제 사용 (그 달 실제액 입력) |
| `js/events.js` | ③ 큰돈 캘린더 |
| `js/event-details.js` | ③ 큰돈 캘린더의 세부 항목 줄, "세부 ▾" 버튼·세부 항목 찾기(월 가계부도 같이 씀) |
| `js/annual.js` | ④ 연간 요약, 목표·예측 |
| `js/wealth.js` | ④ 연간 요약의 지금 저금액·지금 남은 부채(보기만), 빚 빨리 갚기 코멘트 |
| `js/debt-editor.js` | ⚙️ 설정 창의 부채 목록 (이름·남은 금액·이율·매달 갚는 돈·상환 기한·중도 상환) |
| `js/backup.js` | ⑤ 백업 파일 내려받기·불러오기, 이력 보기 |
| `js/settings.js` | ⚙️ 설정 창: 두 사람 이름, 사람마다 결제 수단 목록, 시작 저금액, 부채(`debt-editor.js`) |
| `js/memo.js` | 📝 메모: 쓰고 Enter → 날짜와 함께 포스트잇이 쌓임 (Shift+Enter 줄 바꿈, 한글 조합 중 Enter 무시) |
| `js/theme.js` | 라이트·다크 전환 |
| `js/app.js` | 진입점. 상태(데이터, 보고 있는 달, 탭)를 들고 화면을 연결 |

## 데이터 모델

```js
// localStorage 키: "budget-data" (금액 단위: 만원, 빈칸은 null)
{
  version: 8,
  names: { a: "유진", b: "남편" },
  payments: { a: ["신한카드", …], b: ["삼성카드", …] },      // 사람마다 결제 수단 목록 (⚙️ 설정에서 고침)
  cardGoals: { a: { 신한카드: 30 }, b: {} },                 // 예전 카드 실적 화면의 목표(화면 없음, 보존만)
  items: [{ id, group, name, a, b, joint, amount, paymentA, paymentB, note,   // 예산 (모든 달 공통), paymentA·B는 사람마다 결제 수단 이름
             details: [{ id, name, amount, a, b }] }],                     // 세부 항목: 공동이면 amount, 개인이면 a·b
  months: { "2026-11": { actual: { [itemId]: 금액 }, memo, depositA, depositB } },  // memo: 그 달 메모(① 표 위), deposit은 예전 공동통장 기록(화면 없음, 보존만)
  events: [{ id, month, owner, name, expected, confirmed, source, note, done,   // owner: joint·a·b, done: 완료해서 숨김
             details: [{ id, name, expected, confirmed }] }],   // source: special(특별비 적립금)·savings(비상금·저축)·bonus(성과급), details: 세부 항목
  goal: { target, rate },               // 목표(만원), 연 수익률(%)
  wealth: { savings, savingsAsOf,                // 시작 저금액과 그 기준 달(⚙️ 설정에서 적은 달)
            debts: [{ id, name, balance, balanceAsOf, rate, payment, dueMonth, prepay, prepayFee }] },
            // 부채: 남은 금액(balanceAsOf 달 기준)·이율 %·매달 갚는 돈·상환 기한("2030.08")·중도 상환(yes/fee/no)·수수료 %
  memos: [{ id, text, time }],          // 📝 메모(포스트잇), time은 쓴 시각(ms)
  history: [{ time, text }],            // 변경 이력, 최근 300개
  lastBackupAt: null                    // 마지막 백업 시각(ms)
}
```

- 월 예상액은 저장하지 않고 계산합니다: 공동이면 `amount`, 아니면 `a + b` (세부 항목이 있으면 세부 항목 합).
- 버전 1 → 2: `goal`·`history`·`lastBackupAt`이 없으면 기본값을 채웁니다 (`normalizeData`). 백업 파일을 불러올 때도 같은 함수를 씁니다.
- 버전 2 → 3: `payments`가 없으면 두 사람 모두 기본 목록, `paymentA·B`는 빈칸(선택 안 함), `event.done`은 false, `cardGoals`는 빈 목표로 채웁니다.
- 버전 3 → 4: `event.details`가 없으면 빈 목록으로 채웁니다.
- 버전 4 → 5: `event.owner`는 공통(joint), 글로 적던 `method`는 `source`로 바꿉니다 ("성과급"→bonus, "적립·특별비"→special, "비상금·저축"→savings, 알아볼 수 없는 글은 비고 앞에 붙임).
- 버전 5 → 6: `goal.current`(현재 자산)는 `wealth.savings`(저금액)로 옮기고 기준 달은 옮긴 달로 합니다. `memos`는 빈 목록으로 채웁니다.
- 버전 6 → 7: 달마다 `memo`가 없으면 빈 글로 채웁니다.
- 버전 7 → 8: 항목의 `details`가 없으면 빈 목록으로 채웁니다.
- 월 가계부 항목에 세부 항목이 있으면 예상액(공동)·두 사람 금액(개인)은 세부 항목 합계입니다 (`planAmount`·`personAmounts`). 처음 세부 항목을 넣을 때 항목에 적힌 금액은 "기존 금액" 세부 항목으로 옮깁니다. 실제액은 ② 실제 사용에서 항목 단위로만 적습니다.
- 저금액: ⚙️ 설정에 한 번 적은 시작 저금액(기준 달 말)에서 그 뒤 달마다 (자산으로 쌓인 돈 − 자산에서 나간 큰돈)을 더해 계산합니다. 연간 요약 표의 "저금액" 칸, "이대로 가면" 예측, 순자산 모두 지금 저금액 기준입니다.
- 부채: ⚙️ 설정에 적은 남은 금액(적은 달 기준)에서 매달 갚는 돈만큼 줄어든 걸로 지금 남은 금액을 계산합니다. 코멘트는 상환 기한(못 맞추면 필요한 금액, 만기 일시 상환이면 모아 둘 돈), 중도 상환 불가면 더 갚기 권하지 않음, 수수료가 있으면 수수료와 아끼는 이자를 비교합니다.
- 연간 요약: 큰돈 중 돈 나가는 곳이 비상금·저축·성과급인 확정 지출은 그 달 자산에서 뺍니다 (성과급은 월 가계부에 수입으로 적어 이미 자산에 쌓였기 때문). 특별비 적립금은 매달 지출로 이미 빠져서 빼지 않습니다.
- 큰돈 이벤트에 세부 항목이 있으면 예상·확정 지출은 세부 항목 합계입니다 (`eventTotals`). 처음 세부 항목을 넣을 때 이벤트에 적힌 금액은 "기존 금액" 세부 항목으로 옮깁니다.
- 큰돈 캘린더는 "상시"처럼 날짜가 아닌 것이 맨 위, 그 아래는 날짜순입니다.
- 그래프 색 `--series-1~7`은 색약 검증을 거친 순서입니다. 순서를 바꾸지 말고, 원형 그래프 구분마다 고정 색을 씁니다.
- 데이터 형식을 바꾸면 `version`을 올리고 `store.js`의 `loadData()`에 옮기는 코드를 추가해 **기존 기록이 사라지지 않게** 합니다.

## 실행 & 확인

```bash
python3 -m http.server 8000   # http://localhost:8000/budget/
```

- [ ] 금액 입력 → 새로고침해도 남아 있는가
- [ ] 요약 카드·합계 줄·차이 색(지출은 적을수록, 수입·저축은 많을수록 초록)이 맞는가
- [ ] 달을 바꾸면 실제액이 그 달 것으로 바뀌는가
- [ ] 다크 모드와 모바일 폭(375px)에서 화면 전체가 옆으로 밀리지 않는가 (월 가계부·큰돈 캘린더는 카드, 연간 요약 표만 가로 스크롤)
- [ ] 브라우저 콘솔에 에러가 없는가
