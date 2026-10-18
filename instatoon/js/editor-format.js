// 컷 편집기에 바로 넣을 수 있는 JSON 형식 설명
// Claude 자동 작성(ai-conti.js)과 복사용 요청문(prompt.js)이 같은 형식을 쓰도록 한 곳에 둡니다.

import { TEMPLATES, EXPRESSIONS, BACKGROUNDS, CHARACTERS, SIMPLE_BACKGROUND_RULE } from './guide.js';

function optionList(list) {
  return list.map((item) => `"${item.value}"(${item.label})`).join(', ');
}

// 템플릿마다 texts에 들어갈 키 설명
function describeTemplates() {
  return TEMPLATES.map((template) => {
    const keys = template.texts
      .map((field) => `${field.key}: ${field.label}, 최대 ${field.lines}줄`)
      .join(' / ');
    return `- "${template.value}"(${template.label}) — ${template.help}\n  texts = { ${keys} }`;
  }).join('\n');
}

// 컷 편집기가 알아듣는 값 목록
export function editorValues() {
  return `[컷 편집기 값]
템플릿:
${describeTemplates()}
표정: ${optionList(EXPRESSIONS)}
배경: ${optionList(BACKGROUNDS)}
  - ${SIMPLE_BACKGROUND_RULE}
등장 캐릭터: ${optionList(CHARACTERS)}
템플릿 규칙: "cover-…", "story-…"처럼 이름에 구도가 붙은 템플릿은 기본 템플릿과 texts가 같고 화면 배치만 다르다. 같은 계열이 연달아 나오면 다른 구도 템플릿을 섞어서 매번 같은 틀이 되지 않게 한다.`;
}

// JSON 모양
export const EDITOR_JSON_SHAPE = `{
  "summary": "콘텐츠 분석과 전체 스토리 흐름을 3줄 이내로",
  "cuts": [
    {
      "template": 템플릿 값 하나,
      "message": "이 컷의 핵심 메시지 1개",
      "texts": { 템플릿별 키: "이미지에 실제로 들어갈 문구 (줄바꿈은 \\n)" },
      "expression": 표정 값 하나,
      "characters": [등장 캐릭터 값들, 캐릭터가 없는 정보 카드면 빈 배열],
      "scene": "장면 한 줄: 독자가 한눈에 이해해야 하는 상황",
      "action": "꼼쥐 행동·표정 (감정 하나, 행동 하나)",
      "camera": "구도 (클로즈업 / 전신 / 위에서 내려다본 구도 / 좌우 비교 / 화면 속 화면 등)",
      "props": ["장면 이해에 꼭 필요한 소품, 최대 3개"],
      "layout": "레이아웃: 제목·본문·캐릭터·정보 카드 위치",
      "textSpace": "텍스트 여백: 문구를 후편집으로 넣을 빈 자리",
      "next": "다음 컷 연결 장치",
      "background": 배경 값 하나,
      "direction": "그 밖의 연출 메모 (강조 색 등, 없으면 빈 문자열)"
    }
  ],
  "caption": "인스타 캡션 (첫 줄 후킹 → 핵심 요약 → CTA)",
  "hashtags": ["#해시태그", "..."],
  "review": ["실제 경험에 근거하지 않은 표현, 확인·검증이 필요한 정보, 긴 문장 등 검토 사항"]
}`;

// 복사용 요청문 맨 앞에 붙이는 안내
// 마스터 프롬프트의 "~만 출력해줘" 마무리 때문에 JSON을 빼먹지 않도록, 그리고 답이 길어 잘리지 않도록 미리 알려 줍니다.
export const EDITOR_JSON_NOTICE = `[먼저 읽어 줘 — 꼼쥐툰 메이커 사용 중]
- 이 답의 맨 마지막은 반드시 컷 편집기용 \`\`\`json 코드블록으로 끝내 줘. (형식은 요청문 맨 아래 [컷 편집기용 데이터])
- 마스터 프롬프트의 "~만 출력해줘"라는 문장이 있어도 JSON 코드블록은 꼭 붙여 줘.
- 컷별 이미지 생성 프롬프트(Make 프롬프트) 단계는 생략해 줘. 사이트가 컷 내용으로 직접 만들어. 그만큼 답을 짧게 해서 JSON이 잘리지 않게 해 줘.`;

// 요청문 맨 끝에 한 번 더
export const EDITOR_JSON_REMINDER = '⚠️ 다시 한 번: 이미지 생성 프롬프트는 생략하고, 답의 맨 마지막을 위 형식의 ```json 코드블록 하나로 끝내 줘.';

// 복사용 요청문 끝에 붙이는 안내: 평소 콘티 + 마지막에 JSON 코드블록
export function editorJsonRequest() {
  return `[컷 편집기용 데이터]
위 결과를 모두 쓴 뒤, 답의 맨 마지막에 같은 콘티를 아래 형식의 JSON으로 \`\`\`json 코드블록 하나에 담아 붙여 줘.
사용자가 이 JSON을 꼼쥐툰 메이커의 컷 편집기에 붙여 넣어 컷을 채운다. 이미지 생성 프롬프트는 JSON에 넣지 않는다 (사이트가 조립함).

${editorValues()}

${EDITOR_JSON_SHAPE}`;
}
