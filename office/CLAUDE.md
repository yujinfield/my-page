# CLAUDE.md — AI 사무실

이 파일은 Claude(AI)가 `office/` 폴더에서 작업할 때 따르는 가이드입니다.
기능과 로드맵은 `README.md`를 기준으로 합니다.

- 이 앱의 코드는 모두 `office/` 폴더 안에 둡니다. 다른 앱은 요청이 없으면 수정하지 않고, 다른 앱의 JS를 `import` 하지 않습니다.

## 원칙

1. **빌드 도구·프레임워크·외부 라이브러리 금지** — 순수 HTML/CSS/JavaScript(ES Modules)만 사용합니다.
2. **파일 분리 필수** — `<style>` 태그나 인라인 `<script>`를 쓰지 않습니다. 스타일은 CSS 파일이나 `el.style.left = …` 같은 JS 속성으로만 바꿉니다.
3. **기존 기능 보존** — 요청받은 범위만 변경합니다.
4. **단순하게** — 짧고 읽기 쉬운 코드, 명확한 이름.
5. **한국어** — UI 문구, 주석, 커밋 메시지 본문은 한국어. (변수·함수 이름은 영어)
6. GPT 답, 직원 이름 등 바깥에서 온 글자는 **`textContent`로만** 넣습니다. `innerHTML` 금지.
7. 바깥 연결은 OpenAI API만 허용합니다 (`index.html`의 CSP `connect-src`). 새 서비스를 붙이면 CSP에도 추가합니다.

## 코드 구조

| 파일 | 역할 |
| --- | --- |
| `index.html` | 사무실 화면(캔버스 + 겹친 버튼), 메신저·채용·회의실 탭, 설정 창 |
| `css/base.css` | CSS 변수(색상·간격·폰트), 리셋, 다크 모드 |
| `css/layout.css` | 사무실 │ 패널 배치, 휴대폰(768px 이하)에서는 위아래 |
| `css/office.css` | 도트 화면, 직원 버튼, 말풍선, 팀 표지판 |
| `css/panels.css` | 탭, 폼, 지원자 카드, 메신저, 회의록, 알림, 설정 창 |
| `js/store.js` | 데이터 계층. `localStorage` 읽기/쓰기는 **이 파일에서만** |
| `js/gpt.js` | OpenAI Chat Completions 호출 (`askGpt`) |
| `js/employees.js` | 팀 정보, 자리, 외모, GPT에 보낼 말 만들기 (DOM 사용 안 함) |
| `js/sprites.js` | 도트 그림(사람·책상·사무실). 도트 색은 여기 팔레트에 모음 |
| `js/scene.js` | 사무실 캔버스 그리기, 직원 버튼·말풍선(`say`) |
| `js/hire.js` | 채용 공고, 지원자 카드, 채용 |
| `js/meeting.js` | 회의 진행, 회의록, 지난 회의 |
| `js/messenger.js` | 대화, 업무 지시 → 완료 보고, 읽음 표시, 퇴사 |
| `js/app.js` | 진입점. 상태(`state`)와 `app` 기능 모음을 각 모듈에 넘김, 탭·알림·설정·테마 |

파일이 약 300줄을 넘으면 나눕니다.

## 데이터 모델

```js
// localStorage 키: "ai-office-data"
{
  version: 1,
  employees: [{ id, name, team: "blog" | "insta", role, personality, speech, strengths,
                look: { hair, hairStyle, skin, shirt }, seat: 0~3, status: "idle" | "working", hiredAt }],
  messages: [{ id, employeeId, from: "me" | "employee", text, kind: "chat" | "task" | "report", time, read, done }], // done은 업무 지시에만
  meetings: [{ id, team: "blog" | "insta" | "all", topic, material, lines: [{ speakerId, text, summary }], time }],
  posting: { team, role, details, applicants: [...] } // 마지막 채용 공고
}
// "ai-office-settings": { apiKey, model, about }
```

- 형식을 바꾸면 `store.js`의 `migrate`에 옮기는 코드를 넣어 기존 데이터가 사라지지 않게 합니다.
- 끝나지 않은 업무(`done: false`)는 새로고침하면 다시 시작합니다.

## 디자인

- 사무실은 게임처럼 도트 그림, 패널은 Bear 느낌(조용한 바탕, 강조색 `--accent` 하나).
- 캔버스는 224×126칸이고 CSS로 키움(`image-rendering: pixelated`). 글자는 캔버스에 쓰지 않고 HTML로 올립니다.
- 본문 16px 이상, 버튼에 `aria-label`, 키보드로 모든 기능 사용 가능.

## 확인

자동 테스트는 없습니다. 실제 키 없이 볼 때는 Playwright로 `api.openai.com`을 가짜 응답으로 바꿔 확인합니다.

- [ ] 공고 → 지원자 3명 → 채용하면 자리에 앉고 메신저에 인사가 오는가, 새로고침해도 남는가
- [ ] 대화, 업무 지시("Work!" → 완료 보고 알림·안 읽음 표시)가 동작하는가
- [ ] 회의 시작 → 돌아가며 발언 → 한 번 더 토론 → 결론 정리가 동작하는가
- [ ] 다크 모드와 휴대폰 폭(375px)에서 깨지지 않는가, 콘솔 에러가 없는가

## Git

- 커밋은 기능 단위로 작게. 메시지 예: `AI 사무실에 면접 기능 추가`
- `README.md`의 로드맵 체크박스를 작업 완료 시 함께 갱신합니다.
