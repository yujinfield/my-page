// 댓글로 보낼 자료(체크리스트, 비용 정리 등)를 Claude가 쓰고 노션 페이지로 만들기
// DOM을 쓰지 않는 순수 함수만 둡니다. 실제 호출은 material-panel.js에서 합니다.

import { MATERIAL_TYPES } from './fields.js';

// 노션 커넥터 이름과 도구 이름 (claude.ai에 연결된 Notion)
export const NOTION_SERVER = 'Notion';
export const NOTION_CREATE_TOOL = 'notion-create-pages';

// 자료 종류별로 Claude에게 알려 줄 구성
const MATERIAL_GUIDES = {
  checklist: '체크박스 목록(- [ ] 항목)으로, 단계나 주제별 소제목(##) 아래 묶는다.',
  cost: '항목별 비용을 목록으로 정리한다. 금액은 사용자가 준 실제 금액만 쓰고, 없으면 "금액 확인 필요"로 둔다. 표는 쓰지 않는다.',
  list: '제품·장소마다 소제목(###)을 두고, 같은 순서(특징 / 내가 써 본 느낌 / 참고)로 정리한다.',
  timeline: '시기·순서별 소제목(##) 아래 할 일을 체크박스 목록으로 정리한다.',
  other: '내용에 맞게 소제목(##)과 목록으로 정리한다.',
};

function typeLabel(value) {
  const found = MATERIAL_TYPES.find((type) => type.value === value);
  return found ? found.label : '자료';
}

function line(label, value) {
  return `${label}: ${value.trim() || '(입력 없음)'}`;
}

// 사용자가 준 사실만 모아서 보냅니다.
function collectFacts(form) {
  const lines = [
    line('인스타툰 제목', form.title),
    line('주제', form.topic),
    line('댓글 키워드', form.keyword),
    line('자료에 넣을 내용', form.extraInfo),
    line('실제 경험', form.startStory),
    line('결과·느낀 점', form.result),
  ];
  form.points.forEach((point, i) => {
    if (point.main.trim() === '' && point.case.trim() === '') return;
    lines.push(line(`핵심 정보 ${i + 1}`, point.main));
    lines.push(line(`핵심 정보 ${i + 1}의 실제 사례`, point.case));
  });
  return lines.join('\n');
}

// Claude에게 자료 초안을 부탁하는 요청문 (사이트 안에서 부를 때)
export function buildMaterialRequest(form) {
  return `너는 인스타그램 '@꼼쥐'의 콘텐츠 기획자다.
인스타툰 댓글에 키워드를 남긴 독자에게 DM으로 보낼 "${typeLabel(form.materialType)}" 자료를 노션 페이지 본문으로 쓴다.

[규칙]
- 아래 [사용자 정보]에 있는 내용만 근거로 쓴다. 사용자가 주지 않은 경험·제품명·가격·장소는 지어내지 않는다.
- 일반적으로 알려진 정보를 보탤 때는 그 줄 끝에 "(검증 필요)"를 붙인다. 가격·시기·혜택·운영시간도 "(검증 필요)".
- 말투는 해요체, 친구한테 말하듯 가볍게. 경험은 1인칭("저는", "남편은").
- 특정 업체를 비방하지 않는다.
- 구성: ${MATERIAL_GUIDES[form.materialType] || MATERIAL_GUIDES.other}
- 본문 맨 위에 제목(#)을 쓰지 않는다 (제목은 따로 받음). 소제목은 ##, ###만. 표·이미지·HTML은 쓰지 않는다.
- 맨 아래에 "## 참고" 소제목을 두고, 확인이 필요한 항목을 정리한다.

[사용자 정보]
${collectFacts(form)}

[답하는 방법]
JSON 하나로만 답한다: {"title": "노션 페이지 제목 (40자 이내)", "content": "노션 마크다운 본문"}`;
}

// 사이트 밖(claude.ai 대화, Claude Code)에서 Claude에게 붙여 넣을 요청문
export function buildMaterialChatRequest(form) {
  return `@꼼쥐 인스타툰 댓글 자료를 노션에 정리해 줘.
자료 종류: ${typeLabel(form.materialType)}
노션에 새 비공개 페이지로 만들고, 만든 페이지 링크를 알려 줘.

${buildMaterialRequest(form).split('[답하는 방법]')[0].trim()}`;
}

// Claude 답 → { title, content } (모자라면 null)
export function readMaterialAnswer(answer) {
  if (!answer || typeof answer.content !== 'string' || answer.content.trim() === '') return null;
  const title = typeof answer.title === 'string' && answer.title.trim() !== ''
    ? answer.title.trim().slice(0, 100)
    : '';
  return { title, content: answer.content.trim() };
}

// 초안(첫 줄: 제목, 나머지: 본문) ↔ 화면 글상자
export function draftToText(title, content) {
  return `${title}\n\n${content}`;
}

export function textToDraft(text) {
  const lines = text.split('\n');
  const title = lines[0].replace(/^#+\s*/, '').trim();
  const content = lines.slice(1).join('\n').trim();
  return { title, content };
}

// notion-create-pages에 보낼 입력: 비공개 초안 페이지 하나
export function buildNotionPageInput(title, content) {
  return {
    creation_mode: 'draft',
    pages: [
      {
        properties: { title: title || '@꼼쥐 댓글 자료' },
        icon: '🐿️',
        content,
      },
    ],
  };
}

// 노션 응답 어딘가에 있는 페이지 주소 찾기 (응답 모양이 바뀌어도 주소만 찾음)
export function findNotionUrl(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload || '');
  const match = text.match(/https:\/\/(?:www\.|app\.)?notion\.(?:so|com|site)\/[^\s"'\\)]+/);
  return match ? match[0] : '';
}
