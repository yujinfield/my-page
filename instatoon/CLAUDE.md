# CLAUDE.md — 꼼쥐툰 메이커

이 파일은 Claude(AI)가 `instatoon/` 폴더에서 작업할 때 따르는 가이드입니다.

## 프로젝트 개요

인스타그램 **@꼼쥐** 계정의 인스타툰·릴스 기획을 돕는 웹사이트입니다.
입력한 주제·경험을 [꼼쥐 프로젝트 지침](./guidelines.md)에 맞춰 컷 구성표, 콘티, 이미지 생성 프롬프트, 캡션 텍스트로 만들어 줍니다.
서버·빌드 없이 정적 파일만으로 동작합니다.
저장소는 **공개**이고 GitHub Pages(`https://yujinfield.github.io/my-page/instatoon/`)로 배포합니다. 지침·프롬프트·이미지가 공개된다는 점을 염두에 둡니다.
지침·프롬프트를 외부에 공개하는 기능(공개 배포, 외부 서비스로 전송 등)은 사용자 확인 없이 추가하지 않습니다. 기능과 로드맵은 `README.md`를 기준으로 합니다.

- 이 앱의 코드는 모두 `instatoon/` 폴더 안에 둡니다.
- 저장소 루트의 `index.html`(버킷리스트)과 `memo/`(메모 앱)는 **요청이 없으면 수정하지 마세요.**

## 기준 문서

- **`guidelines.md`가 콘텐츠 규칙의 유일한 원본입니다.** 캐릭터 설정, 말투, 스토리 구조, 템플릿, 프롬프트 문구는 여기서 가져옵니다.
- 지침 내용을 코드에 옮길 때는 `js/guide.js` 한 곳에만 상수로 둡니다. 다른 파일에서 같은 문구를 다시 쓰지 않습니다.
- `guidelines.md`를 고칠 일이 생기면 사용자에게 먼저 확인합니다.
- 레퍼런스 이미지는 `references/`에 있습니다. 파일 이름은 지침에 적힌 이름과 같게 유지합니다.

| 파일 | 용도 |
| --- | --- |
| `references/꼼쥐_턴어라운드.png` | 꼼쥐 외형·비율 기준 (정면 → 측면 → 뒷모습) |
| `references/표지형_레퍼런스.png` | 1번 컷: 큰 제목 + 형광펜 강조 + 하단 꼼쥐 + 속마음 말풍선 |
| `references/스토리형_레퍼런스.png` | 상단 구름 말풍선(상황) + 캐릭터 + 작은 말풍선(대사) |
| `references/정보형_레퍼런스.png` | "첫째," 라벨 + 소제목 + 설명 + 그림 + 하단 요약 박스 |
| `references/비교형_레퍼런스.png` | 질문형 제목 + 좌우 카드 + 칸마다 속마음 + 하단 결론 띠 |

## 원칙

1. **빌드 도구·프레임워크 금지** — React, Vue, npm 번들러, TypeScript를 도입하지 않습니다. 순수 HTML/CSS/JavaScript만 사용합니다.
2. **외부 라이브러리 금지** — CDN 포함 어떠한 외부 라이브러리도 사용하지 않습니다. 필요한 기능은 직접 구현합니다.
3. **파일 분리 필수** — HTML, CSS, JavaScript는 반드시 별도 파일로 작성합니다. `<style>` 태그나 `<script>` 인라인 코드는 작성하지 않습니다.
4. **기존 기능 보존** — 요청받지 않은 기존 기능은 임의로 삭제하거나 변경하지 않습니다. 수정 시 요청받은 범위만 변경합니다.
5. **단순하게** — 사용자는 웹 개발을 배우는 중입니다. 짧고 읽기 쉬운 코드, 명확한 이름을 우선합니다.
6. **한국어** — UI 문구, 주석, 커밋 메시지 본문은 한국어로 작성합니다. (변수·함수 이름은 영어)
7. **지어내지 않기** — 사이트가 만드는 텍스트에 사용자가 입력하지 않은 경험·대화·수치를 채워 넣지 않습니다. 빈 칸은 `[입력 필요]`처럼 표시합니다. (지침 9번)

## 코드 구조

| 파일 | 역할 |
| --- | --- |
| `index.html` | 마크업 뼈대, CSS/JS 불러오기 |
| `css/base.css` | CSS 변수(색상·간격·폰트), 리셋, 다크 모드 |
| `css/layout.css` | 머리말 / 단계 탭 / 진행률 / 본문 배치, 반응형 |
| `css/form.css` | 입력칸, 카드, 버튼, 결과 화면 |
| `css/cuts.css` | 컷 편집기: 컷 카드, 도구 막대, 복사 대체 상자 |
| `js/guide.js` | 지침 상수: 공통 프롬프트 문구, 캐릭터, 표정 세트, 배경, 템플릿 4종, 대사·컷 수 규칙 |
| `js/fields.js` | 통합 입력폼 질문 목록(제목·설명·예시), 빈 폼, 진행률 계산 |
| `js/form.js` | `fields.js`를 보고 입력칸을 그림 |
| `js/classify.js` | 스토리형/정보형 자동 판단, 입력 주의사항 (순수 함수) |
| `js/master-prompts.js` | 스토리형 V1 / 정보형 V2 마스터 프롬프트 원문 |
| `js/prompt.js` | 요청문 조립, 컷별 이미지 프롬프트 조립 (순수 함수) |
| `js/cut-plan.js` | 컷 만들기, 템플릿 변경, 입력폼 → 기본 컷 구성 (순수 함수) |
| `js/checks.js` | 컷 최종 검토 규칙 (순수 함수, 경고 목록 반환) |
| `js/cuts.js` | 컷 편집기 화면 (추가·삭제·순서 변경, 템플릿별 입력 칸, 프롬프트 복사) |
| `js/ai-conti.js` | Claude 콘티 요청문 만들기, Claude 답(JSON) → 컷 목록 (순수 함수) |
| `js/gpt-conti.js` | GPT(OpenAI Chat Completions, JSON 모드)로 콘티 쓰기. 요청문·JSON 형식은 `ai-conti.js`와 같음, 키는 그림 생성과 같은 OpenAI 키 |
| `js/ai-panel.js` | Claude 자동 작성 버튼, 진행 상황·멈추기, 캡션·검토 메모 |
| `js/notion-material.js` | 댓글 자료 요청문, 노션 페이지 입력 만들기, 응답에서 페이지 주소 찾기 (순수 함수) |
| `js/material-panel.js` | PART 3 노션 자료 패널 (초안 쓰기 → 고치기 → 노션에 저장, 요청문 복사) |
| `js/image-gen.js` | GPT 이미지 API 호출(참고 이미지 있으면 /edits, 없으면 /generations), 모델·크기·품질 목록과 기본값 |
| `js/image-panel.js` | 그림 생성 카드, 컷별 그림 만들기·전체 만들기·내려받기, 수정 요청(지금 보는 그림을 첫 번째 참고 이미지로 /edits에 보냄), 컷마다 그린 그림을 모두 쌓아 이전·다음 그림으로 오가기 |
| `js/image-settings.js` | ⚙️ 설정의 콘티 작성 모델·그림 설정 화면과 값(`settings`), `getTextModelName()` |
| `js/image-revise.js` | 컷 그림 아래 ◀ 이전·다음 ▶ 그림 버튼과 ✏️ 수정 요청 칸 화면 조립 (적다 만 글 기억) |
| `js/key-vault.js` | API 키 암호화·복호화 (Web Crypto: PBKDF2 → AES-GCM), 화면용 가리기 |
| `js/modal.js` | 창(모달) 여닫기 공통: Esc, 바깥 클릭, Tab이 창 안에서만 돌기, 닫으면 연 버튼으로 포커스 복귀. 새 창은 `.modal` + `.modal-close`로 만들고 `setupModal()` |
| `js/settings-dialog.js` | 오른쪽 위 ⚙️ 설정 창 |
| `js/errors.js` | 오류를 한국어로: `makeError({problem, fix, detail, settingsFocus})`, OpenAI 오류 응답 풀이 `describeOpenAiError` (순수 함수) |
| `js/error-dialog.js` | ⚠️ 오류 알림 창 `showError(error, title)`. 실패를 사용자에게 알릴 때는 상태 문구와 함께 이 창을 띄움 (멈추기는 제외) |
| `js/editor-format.js` | 컷 편집기용 JSON 형식 설명. 자동 작성(`ai-conti.js`)과 복사 요청문(`prompt.js`)이 함께 씀 |
| `js/conti-import.js` | 붙여 넣은 Claude 답 → 컷 목록 (JSON 관대하게 읽기·잘린 JSON 살리기·콘티 글 직접 읽기·요청문 감지), 컷 구성 분석 (순수 함수) |
| `js/paste-panel.js` | 컷 편집의 📋 Claude 답 붙여넣기 |
| `js/history.js` | 작업 기록과 콘티 스냅샷 저장 (`addLog`, 최근 100개·스냅샷 10개) |
| `js/history-panel.js` | 오른쪽 위 📜 기록 창: 목록, 되돌리기, 내려받기, 지우기 |
| `js/key-panel.js` | API 키 화면 (새 키 / 잠김 / 사용 중), 30분 자동 잠금, 예전 평문 키 정리 |
| `js/store.js` | 데이터 계층. `localStorage` 읽기/쓰기는 **이 파일에서만** |
| `js/app.js` | 진입점. 상태를 들고 각 모듈을 연결 |

새 기능은 가능하면 기존 파일에 맞춰 넣고, 파일이 너무 커질 때만(약 300줄 이상) 분리합니다.
`classify.js`, `prompt.js`, `cut-plan.js`, `checks.js`, `ai-conti.js`, `notion-material.js`는 나중에 테스트를 붙이기 쉽도록 **DOM에 의존하지 않게** 작성합니다.

## 통합 입력폼과 유형 판단

- 스토리형 V1과 정보형 V2의 입력 항목을 하나로 합친 폼입니다. 질문을 바꾸려면 `fields.js`만 고칩니다.
- 판단 규칙(`classify.js`)은 점수 방식입니다. 제목·주제·핵심 내용의 표현, 경험 글과 정보 글의 분량, 한 줄 핵심 개수, 댓글 자료 유무를 봅니다. 점수가 같으면 정보형입니다.
- 판단 이유는 항상 화면에 보여 주고, 사용자가 직접 유형을 바꿀 수 있게 둡니다.
- 마스터 프롬프트 원문은 `master-prompts.js` 한 곳에만 둡니다. 정보형 V2는 "입력폼 생성" 부분을 빼고 "폼 제출 후 콘티 생성 규칙"부터 둡니다 (입력폼은 이 사이트가 대신함).
- 빈 칸은 요청문에서 `(입력 없음 — 지어내지 말고 확인 필요로 표시)`로 바뀝니다.

## 데이터 모델

작성 중인 입력폼과 컷 목록을 하나로 저장합니다.

```js
// localStorage 키: "kkomjwi-draft"
{
  version: 2,   // 1: 입력폼만 / 2: cuts 추가 (1번 데이터는 cuts: []로 채워 그대로 씀)
  form: {
    title, question, topic, startStory, feeling, result,   // PART 1 (문자열)
    points: [{ main, case, oneLine }, ...],                // PART 2 (항상 3개)
    extraInfo, keyword, commentLine,                       // PART 3 (문자열)
    ctaType: "comment",   // "comment" | "save" | "share" | "natural"
    typeChoice: "auto",   // "auto" | "story" | "info"
    caption: "",          // Claude가 써 준 캡션 + 해시태그 (직접 수정 가능)
    review: "",           // Claude가 남긴 콘티 요약·검토 사항
    materialType: "none", // 댓글 자료 종류: "none" | "checklist" | "cost" | "list" | "timeline" | "other"
    materialDraft: "",    // 자료 초안 (첫 줄: 노션 페이지 제목, 나머지: 본문)
    notionUrl: "",        // 노션에 만든 자료 페이지 주소
    cuts: [
      {
        id: "c_<timestamp>_<n>",
        template: "cover",     // "cover" | "story" | "info" | "compare" 또는 구도 템플릿 ("story-closeup" 등, guide.js의 LAYOUT_TEMPLATES)
        message: "",           // 핵심 메시지 1개
        texts: {},             // 템플릿별 문구 (guide.js의 TEMPLATES[].texts 키)
        expression: "basic",   // "basic" | "surprised" | "thinking" | "proud" | "heart"
        characters: ["kkomjwi"], // "kkomjwi" | "husband" | "friend"
        scene: "",             // 그림 장면·소품·포즈
        background: "white",   // "white" | "simple" | "detailed"
        direction: ""          // 카메라 거리, 말풍선 위치 등
      }
    ]
  }
}
// 테마: localStorage 키 "kkomjwi-theme" ("light" | "dark")
```

- 데이터 형식을 바꾸면 `version`을 올리고 `store.js`에 마이그레이션을 추가해 **기존 프로젝트가 사라지지 않게** 합니다.

## 컷 편집기

- 기본 컷 구성(`cut-plan.js`)은 입력폼 문장을 그대로 옮겨 담기만 합니다. 실제 사례가 빈 정보는 사례 컷을 만들지 않습니다.
- 구성: 표지형 → 도입 스토리형(경험, 고민) → 핵심 ①②③마다 사례(스토리형) + 핵심(정보형) → 결과 → CTA
- **구도 템플릿**: 같은 틀 반복을 막으려고 기본 템플릿 4종 말고도 `guide.js`의 `LAYOUT_TEMPLATES`(예: `story-closeup`, `cover-number`)를 템플릿 목록에 함께 둡니다. 기본 템플릿과 문구 칸(texts)이 같고 화면 배치(prompt)만 다르며, 레퍼런스 그림이 없어서 그림 생성 때 턴어라운드만 보냅니다. "표지형인가?"처럼 계열을 볼 때는 `templateFamily()`를 씁니다. 기본 구성은 스토리형 컷에 구도 템플릿을 돌아가며 씁니다.
- 글자만 바뀌면 입력칸은 다시 그리지 않고 프롬프트·경고만 갱신합니다 (포커스 유지). 템플릿 변경·추가·삭제·순서 변경 때만 전체를 다시 그립니다.

## Claude 콘티 자동 작성

- 페이지 안에서 Claude를 부르는 claude.ai 아티팩트 기능(`window.claude.use('sample')`)을 씁니다. **API 키가 필요 없고**, 쓰는 사람의 claude.ai 사용량을 씁니다.
- claude.ai 링크로 열었을 때만 동작합니다. 아티팩트로 올릴 때 `capabilities: {sample: {}}`를 꼭 선언합니다. 공용 링크(github.io)나 내 컴퓨터에서 열면 `window.claude`가 없으므로 버튼을 숨기고 안내 문구만 보여 줍니다.
- 요청문(`ai-conti.js`) = 꼼쥐 핵심 규칙(`guide.js`의 `CONTI_RULES`) + 판매 원칙(`SALES_RULES`) + 유형별 마스터 프롬프트 + 사용자 입력 + 컷 편집기 값 목록 + JSON 답 형식. 이미지 프롬프트는 Claude에게 받지 않고 사이트가 조립합니다.
- 답은 `sample.json`으로 받고, `readContiAnswer`가 모르는 값을 기본값으로 바꿉니다 (`normalizeCut`). 화면에 넣을 때는 항상 `textContent`/`value`를 씁니다.
- 버튼을 누를 때만 부르고, 자동 재시도는 하지 않습니다. 권한 거절(`not_granted` 등)이면 버튼을 숨깁니다.

- **판매 원칙**(`guide.js`의 `SALES_RULES`): 1컷 통념 깨기+숫자, 2컷 독자 걱정, 중간 꼼쥐·남편 대조(꼼쥐가 기준 제시), 추상 표현 금지, 유추 컷 1개 이상, 마지막 컷 공백 → 캡션·댓글. 책 「잘 파는 사람은 이렇게 말합니다」 1부의 **판매 화법 도구** 목록(컷마다 하나씩, 연달아 같은 화법 금지)도 함께 있습니다. GPT·Claude 자동 작성과 복사용 요청문 모두에 들어가고, 마스터 프롬프트와 겹치면 판매 원칙이 우선입니다. 숫자·남편 이야기는 사용자 입력에 있는 것만 쓰고, 없으면 `[입력 필요]` + review로 남깁니다.

## 댓글 자료 → 노션

- 아티팩트의 `mcp` 기능으로 사용자의 claude.ai **Notion 커넥터**(`notion-create-pages`)를 부릅니다. 아티팩트로 올릴 때 `capabilities: {sample: {}, mcp: {servers: [{server: "Notion", tools: ["notion-create-pages"]}]}}`를 선언합니다.
- 페이지는 항상 `creation_mode: "draft"`(비공개)로 만듭니다. 공유 범위는 사용자가 노션에서 직접 정합니다.
- 노션 저장은 쓰기 작업이라 버튼을 누를 때 한 번만 부르고, 자동 재시도하지 않습니다. 응답이 없으면(`server_unavailable` 등) 이미 만들어졌을 수 있으니 노션을 먼저 확인하라고 안내합니다.
- 초안은 반드시 사용자가 보고 고친 뒤 저장합니다 (Claude 초안 → 글상자 → "노션에 저장").

## 작업 기록

- 사용자가 한 일은 `history.js`의 `addLog(행동, 설명, 스냅샷?)`으로 남깁니다. 콘티(컷 목록)가 통째로 바뀌는 작업은 `makeSnapshot(form)`을 함께 넘겨 되돌릴 수 있게 합니다.
- **API 키·잠금 비밀번호·키 일부도 절대 기록하지 않습니다.**
- 기록은 localStorage(`kkomjwi-history`)에 최근 100개, 스냅샷은 최근 10개만 둡니다. 저장 공간이 모자라면 오래된 스냅샷부터 버립니다.

## 그림 생성 (GPT)

- **API 키는 절대 코드·저장소에 넣지 않습니다.** 채팅으로 키를 받지 않습니다.
- **API 키를 평문으로 저장하지 않습니다.** 사용자가 정한 잠금 비밀번호로 암호화한 암호문만 localStorage(`kkomjwi-image-key-locked`)에 둡니다. 풀린 키는 메모리에만 있고, 새로고침·30분 미사용이면 사라집니다. 화면에는 `maskKey()`로 일부만 보여 줍니다.
- API 키와 그림 설정 화면은 오른쪽 위 ⚙️ 설정 창(`settings-dialog.js`) 안에 있습니다. 오래된 Safari 지원을 위해 `<dialog>` 대신 직접 만든 창을 씁니다.
- 설정(`kkomjwi-image-settings`)에는 모델·크기 등만 둡니다. 예전 버전이 넣어 둔 `apiKey`는 `key-panel.js`가 지웁니다.
- `index.html`의 CSP(`script-src 'self'`, `connect-src 'self' https://api.openai.com`)를 유지합니다. 외부 스크립트·인라인 스크립트를 추가하지 않고, 새 외부 연결이 필요하면 CSP에 그 주소만 더합니다. claude.ai 아티팩트로 다시 올릴 때는 CSP 때문에 기능이 막히지 않는지 먼저 확인합니다.
- 브라우저만으로는 키를 완벽히 숨길 수 없습니다(키가 풀린 동안 페이지 코드는 키를 씀). 사용자에게 OpenAI 사용 한도·이미지 전용 키를 권합니다.
- OpenAI는 브라우저에서 바로 부릅니다(서버 없음). claude.ai 아티팩트 안에서는 외부 인터넷이 막혀 있으므로 버튼을 끄고 "공용 링크나 내 컴퓨터에서 열기" 안내를 보여 줍니다.
- 모델 이름·크기는 바뀔 수 있어서 고정하지 않고 선택지 + "직접 입력"으로 둡니다. OpenAI가 거절하면 그 오류 메시지를 그대로 보여 줍니다.
- 그림은 비용이 드므로 버튼을 누를 때만, 전체 생성은 시작 전에 확인하고 한 장씩 차례로 만듭니다. 만든 그림은 메모리에만 두고 내려받기로 저장합니다.

## 프롬프트 조립 규칙

이미지 프롬프트는 아래 순서로 이어 붙입니다. 문구 원본은 지침 11번입니다.

1. 공통 문구 (스타일 + 손그림 발전 규칙)
2. 등장 캐릭터별 추가 문구 (남편 / 친구)
3. 템플릿 구성 설명 (지침 6-1)
4. 컷 내용: 화면에 들어갈 한글 문구, 표정, 포즈, 소품, 말풍선 위치
5. 고정 조건: 4:5 (1080×1350), 아이보리 배경, 상단 중앙 '@꼼쥐', 브랜드 로고 없음, 턴어라운드 외형 유지

- 기본 배경(`simple`)은 **꼼쥐 + 사물 1개**(핸드폰·노트북·메모장·컵·연필 등)만 그립니다. 장면에 사물이 여러 개 적혀 있어도 가장 중요한 하나만 그리라고 프롬프트에 넣고, 콘티를 쓰는 AI에게도 `SIMPLE_BACKGROUND_RULE`(`guide.js`)로 알려 줍니다. 남편·친구가 나오는 컷은 화이트/상세 배경을 씁니다.

## 디자인 가이드 (사이트 화면)

- 꼼쥐툰의 느낌을 따릅니다: 아이보리 크림 배경, 파스텔 핑크·노랑·연두·하늘 포인트.
- 형광펜 밑줄처럼 강조하고, 테두리보다 배경색 차이로 영역을 나눕니다.
- 색상·간격은 `base.css`의 CSS 변수로만 지정하고, 하드코딩하지 않습니다.
- 다크 모드: `@media (prefers-color-scheme: dark)` + `[data-theme="dark"]`로 수동 전환 지원.
- 본문 폰트 크기는 16px 이상 (아이폰 Safari 입력 시 자동 확대 방지).
- 모바일(약 768px 이하)에서는 한 번에 한 패널만 보이고, 뒤로 가기 버튼으로 이동합니다.
- 버튼에는 `aria-label`, 키보드로도 모든 기능을 쓸 수 있게 합니다.

## 보안

- 사용자가 입력한 문구를 화면에 넣을 때는 항상 `textContent`를 사용합니다. `innerHTML`에 사용자 텍스트를 넣지 않습니다.
- API 키 등 비밀 값은 저장소에 커밋하지 않습니다. (3차 목표 AI 연동은 방식이 정해진 뒤 진행)

## 실행 & 확인

```bash
python3 -m http.server 8000   # 저장소 루트에서 → http://localhost:8000/instatoon/
```

자동 테스트는 아직 없습니다. 변경 후에는 다음을 직접 확인합니다.

- [ ] 폼 입력 → 새로고침해도 남아 있는가
- [ ] 경험담 위주 입력은 스토리형, 꿀팁 위주 입력은 정보형으로 판단되는가
- [ ] 결과 화면에서 유형을 직접 바꾸면 "🤖 GPT로 콘티 만들기"에 쓰는 마스터 프롬프트 이름이 바뀌는가
- [ ] Claude 답을 붙여 넣으면 컷이 채워지고, 📜 기록에서 되돌릴 수 있는가
- [ ] 템플릿을 바꾸면 입력 칸이 바뀌고, 프롬프트가 지침 11번 문구로 시작하는가
- [ ] 남편·친구를 선택하면 해당 추가 문구가 붙는가
- [ ] 대사 15자 초과, 입력하지 않은 숫자 등에서 검토 경고가 뜨는가
- [ ] 복사 버튼이 동작하는가
- [ ] 다크 모드와 모바일 폭(375px)에서 레이아웃이 깨지지 않는가
- [ ] 브라우저 콘솔에 에러가 없는가

## Git

- 커밋은 기능 단위로 작게. 메시지 예: `컷 편집기에 템플릿 선택 추가`
- `README.md`의 로드맵 체크박스를 작업 완료 시 함께 갱신합니다.
