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
7. 바깥 연결은 OpenAI API, Uplika, GitHub Gist(동기화), 사무실 서버(`*.workers.dev`), 구글 시트(`docs.google.com`)만 허용합니다 (`index.html`의 CSP `connect-src`). 새 서비스를 붙이면 CSP에도 추가합니다.
8. Uplika 도구는 **읽기 전용만** GPT에 넘깁니다 (`uplika.js`의 `READ_ONLY_TOOLS`). 발행·댓글·DM 도구를 넣으려면 대표가 승인하는 단계를 먼저 만듭니다.

## 코드 구조

| 파일 | 역할 |
| --- | --- |
| `index.html` | 사무실 화면(캔버스 + 겹친 버튼), 메신저·채용·회의실 탭, 설정 창 |
| `css/base.css` | CSS 변수(색상·간격·폰트), 리셋, 다크 모드 |
| `css/layout.css` | 사무실 │ 패널 배치, 휴대폰(768px 이하)에서는 위아래 |
| `css/office.css` | 도트 화면, 직원 버튼, 말풍선, 팀 표지판 |
| `css/panels.css` | 탭, 폼, 지원자 카드, 메신저, 회의록, 알림, 설정 창 |
| `js/store.js` | 데이터 계층. `localStorage` 읽기/쓰기는 **이 파일에서만** |
| `js/gpt.js` | GPT 호출 (`askGpt`). 보통은 Chat Completions, 도구를 넘기면 Responses API |
| `js/uplika.js` | Uplika MCP 연결: 승인(OAuth + PKCE, 앱 자동 등록), 출입증 갱신, GPT에 넘길 도구 설정. 승인 요청은 사무실 서버를 거침 |
| `worker/office-server.js` | Cloudflare Workers에 붙여 넣는 사무실 서버 (사이트에서는 안 씀, 배포법은 `worker/README.md`). 업무 지시를 D1에 저장하고 GPT로 처리(크론 1분마다 재시도, 최대 3번), Uplika 승인 중계(`?url=`). 비밀 변수 `OPENAI_API_KEY`·`OFFICE_TOKEN`, D1 바인딩 `DB` |
| `js/server.js` | 사무실 서버와 주고받기: 연결 확인, 업무 맡기기, 결과 받기, 받은 업무 지우기 (DOM 사용 안 함) |
| `js/tasks.js` | 업무 처리: 서버를 설정했으면 서버에 맡기고 8초마다 결과 확인, 아니면 브라우저에서 바로 처리. 완료 보고·실패 메시지, 끊긴 업무 이어 하기 |
| `js/employees.js` | 팀 정보, 자리, 외모, 직원별 모델(`settingsFor`), 기억(`[기억]` 줄 떼기·추가), GPT에 보낼 말 만들기 (DOM 사용 안 함) |
| `js/sheets.js` | 데이터 시트: 구글 시트 탭을 CSV로 읽고(공유: 링크가 있는 모든 사용자), 제목 줄·빈 줄을 걸러 "칸: 값" 글로 바꿈 (DOM 사용 안 함) |
| `js/sheet-panel.js` | 설정 창의 데이터 시트 추가·읽어 보기·지우기, 회의실 체크 칸과 업무 지시용 고르기 |
| `js/profile.js` | 대화방의 "직원 설정 · 기억": 직원별 GPT 모델, 기억 보기·추가·지우기 |
| `js/sync.js` | ☁️ 다른 기기에서도 보기: 연결 코드(토큰 + Gist id), 올리기·받기, 충돌 시 물어보기 |
| `js/gist.js` | GitHub Gist API (비공개 Gist 하나에 `office.json`) |
| `js/lock.js` | 비밀번호로 잠그기·풀기 (PBKDF2 + AES-GCM) |
| `js/sprites.js` | 도트 그림(사람·책상·사무실). 도트 색은 여기 팔레트에 모음 |
| `js/scene.js` | 사무실 캔버스 그리기, 직원 버튼·말풍선(`say`) |
| `js/hire.js` | 채용 공고, 지원자 카드, 채용 |
| `js/meeting.js` | 회의 진행, 회의록, 지난 회의 |
| `js/messenger.js` | 대화, 업무 지시(처리는 `tasks.js`), 읽음 표시, 퇴사 |
| `js/app.js` | 진입점. 상태(`state`)와 `app` 기능 모음을 각 모듈에 넘김, 탭·알림·설정·테마 |

파일이 약 300줄을 넘으면 나눕니다.

## 데이터 모델

```js
// localStorage 키: "ai-office-data"
{
  version: 1,
  employees: [{ id, name, team: "blog" | "insta", role, personality, speech, strengths,
                look: { hair, hairStyle, skin, shirt }, seat: 0~3, status: "idle" | "working", hiredAt,
                model,                      // 비어 있으면 설정의 기본 모델 (없어도 됨)
                memory: [{ text, time }] }], // 최대 30개, 없어도 됨
  messages: [{ id, employeeId, from: "me" | "employee", text, kind: "chat" | "task" | "report", time, read, done, sheetId, onServer }], // done·sheetId·onServer는 업무 지시에만
  meetings: [{ id, team: "blog" | "insta" | "all", topic, material, sheetIds, lines: [{ speakerId, text, summary }], time }],
  posting: { team, role, details, applicants: [...] } // 마지막 채용 공고
}
// "ai-office-settings": { apiKey, model, about, uplikaUrl, serverUrl, serverToken, dataSheets: [{ id, name, url, tabs }] }  (예전 uplikaProxy는 serverUrl로 옮김)
// "ai-office-uplika": { serverUrl, clientId, tokenEndpoint, accessToken, refreshToken, expiresAt }
// "ai-office-uplika-pending": 승인 화면에 다녀오는 동안 기억할 값 (PKCE verifier, state)
// "ai-office-sync": { token, gistId, key, salt, remoteSavedAt, dirty } (이 기기에만)
```

- 형식을 바꾸면 `store.js`의 `migrate`에 옮기는 코드를 넣어 기존 데이터가 사라지지 않게 합니다.
- 끝나지 않은 업무(`done: false`): 서버에 맡긴 업무(`onServer`)는 결과를 받아 오고, 브라우저 업무는 새로고침하면 처음부터 다시 시작합니다. 서버 업무 id는 업무 지시 메시지 id와 같습니다.
- 기억: 대화·업무 답 끝의 `[기억] …` 줄을 떼어 직원 기억에 넣고, 회의 결론은 참석자 모두가 기억합니다. 기억은 직원 프롬프트에 들어갑니다.
- 데이터 시트: 회의 한 바퀴·결론 정리·업무마다 고른 시트를 새로 읽어 참고 자료 뒤에 붙입니다(최대 12,000자). 시트 내용은 저장하지 않습니다.
- 동기화: `{ data, settings }`를 비밀번호로 잠가 Gist에 올립니다. 직원이 일하는 중(`app.isBusy()`)에는 받은 데이터로 바꾸지 않고 나중에 다시 받습니다.

## 디자인

- 사무실은 게임처럼 도트 그림, 패널은 Bear 느낌(조용한 바탕, 강조색 `--accent` 하나).
- 캔버스는 224×126칸이고 CSS로 키움(`image-rendering: pixelated`). 글자는 캔버스에 쓰지 않고 HTML로 올립니다.
- 머리 위 말풍선 순서: 일하는 중이면 초록 "Work!" → 하던 말 → 안 읽은 완료 보고가 있으면 빨간 "!" (메신저에서 읽으면 사라짐). `scene.js`의 `bubbleFor`
- 본문 16px 이상, 버튼에 `aria-label`, 키보드로 모든 기능 사용 가능.

## 확인

자동 테스트는 없습니다. 실제 키 없이 볼 때는 Playwright로 `api.openai.com`을 가짜 응답으로 바꿔 확인합니다.

- [ ] 공고 → 지원자 3명 → 채용하면 자리에 앉고 메신저에 인사가 오는가, 새로고침해도 남는가
- [ ] 대화, 업무 지시("Work!" → 완료 보고 알림·안 읽음 표시)가 동작하는가
- [ ] 회의 시작 → 돌아가며 발언 → 한 번 더 토론 → 결론 정리가 동작하는가
- [ ] Uplika 연결 → 승인 → 돌아오면 "연결됨", 회의·업무가 Responses API에 Uplika 도구를 넘기는가
- [ ] 대화 중 `[기억]`이 기억 목록에 들어가고 답에는 안 보이는가, 직원별 모델이 GPT 요청에 쓰이는가
- [ ] 기기 A에서 처음 만들기 → 연결 코드 → 기기 B에서 연결하기, 틀린 비밀번호 안내, 한쪽 변경이 다른 쪽에 오는가
- [ ] 설정에서 데이터 시트 추가 → 읽어 보기(탭별 칸·줄 수) → 회의·업무 지시에서 고르면 GPT 요청에 시트 내용이 들어가는가
- [ ] 사무실 서버: 연결 확인(틀린 비밀번호 안내) → 업무 지시 후 창 닫기 → 다시 열면 완료 보고, 실패하면 크론이 다시 시도하는가 (worker를 Node에서 돌리고 D1은 `node:sqlite`로 대신해 확인)
- [ ] 다크 모드와 휴대폰 폭(375px)에서 깨지지 않는가, 콘솔 에러가 없는가

## Git

- 커밋은 기능 단위로 작게. 메시지 예: `AI 사무실에 면접 기능 추가`
- `README.md`의 로드맵 체크박스를 작업 완료 시 함께 갱신합니다.
