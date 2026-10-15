// Claude에게 콘티를 맡길 요청문 만들기와 답 정리
// DOM을 쓰지 않는 순수 함수만 둡니다. 실제 호출은 cuts.js에서 합니다.

import { CONTI_RULES, TEMPLATES, EXPRESSIONS, BACKGROUNDS, CHARACTERS } from './guide.js';
import { STORY_V1, INFO_V2 } from './master-prompts.js';
import { buildUserInputs } from './prompt.js';
import { normalizeCut } from './cut-plan.js';

// 한 번에 받을 최대 컷 수 (지침: 많으면 14컷 이상도 허용)
const MAX_AI_CUTS = 20;

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

const OUTPUT_FORMAT = `[답하는 방법]
마스터 프롬프트의 "최종 출력 순서"와 "이미지 생성 프롬프트" 대신, 이 사이트의 컷 편집기에 바로 들어갈 JSON 하나로만 답한다.
컷 구성·연출·검토 기준은 그대로 따른다. 이미지 생성 프롬프트는 쓰지 않는다 (사이트가 컷 내용으로 조립함).

{
  "summary": "콘텐츠 분석과 전체 스토리 흐름을 3줄 이내로",
  "cuts": [
    {
      "template": 템플릿 값 하나,
      "message": "이 컷의 핵심 메시지 1개",
      "texts": { 템플릿별 키: "이미지에 실제로 들어갈 문구 (줄바꿈은 \\n)" },
      "expression": 표정 값 하나,
      "characters": [등장 캐릭터 값들, 캐릭터가 없는 정보 카드면 빈 배열],
      "scene": "그림 장면·주요 소품·포즈",
      "background": 배경 값 하나,
      "direction": "카메라 거리, 글씨·말풍선 위치, 강조 색, 다음 컷 연결"
    }
  ],
  "caption": "인스타 캡션 (첫 줄 후킹 → 핵심 요약 → CTA)",
  "hashtags": ["#해시태그", "..."],
  "review": ["실제 경험에 근거하지 않은 표현, 확인·검증이 필요한 정보, 긴 문장 등 검토 사항"]
}`;

// type: 'story'(스토리형 V1) | 'info'(정보형 V2)
export function buildContiRequest(form, type) {
  const master = type === 'story' ? STORY_V1 : INFO_V2;

  return [
    '너는 인스타그램 \'@꼼쥐\'의 전담 콘텐츠 기획자이자 스토리 작가다.',
    '아래 [꼼쥐 규칙]과 [마스터 프롬프트]를 따르고, [사용자 입력]에 있는 내용만 근거로 컷별 콘티를 작성한다.',
    CONTI_RULES,
    `[마스터 프롬프트]\n${master}`,
    `[사용자 입력]\n${buildUserInputs(form, type)}`,
    `[컷 편집기 값]\n템플릿:\n${describeTemplates()}\n표정: ${optionList(EXPRESSIONS)}\n배경: ${optionList(BACKGROUNDS)}\n등장 캐릭터: ${optionList(CHARACTERS)}`,
    OUTPUT_FORMAT,
  ].join('\n\n');
}

function toText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Claude의 답(JSON) → { cuts, caption, review }
// 모르는 값은 normalizeCut이 기본값으로 바꿉니다. 컷이 하나도 없으면 null.
export function readContiAnswer(answer) {
  if (!answer || !Array.isArray(answer.cuts)) return null;

  const cuts = answer.cuts
    .slice(0, MAX_AI_CUTS)
    .filter((cut) => cut && typeof cut === 'object')
    .map((cut) => normalizeCut(cut));
  if (cuts.length === 0) return null;

  const hashtags = Array.isArray(answer.hashtags)
    ? answer.hashtags.map(toText).filter((tag) => tag !== '').join(' ')
    : '';
  const caption = [toText(answer.caption), hashtags].filter((part) => part !== '').join('\n\n');

  const reviewItems = Array.isArray(answer.review) ? answer.review.map(toText) : [];
  const review = [toText(answer.summary), ...reviewItems.map((item) => (item ? `- ${item}` : ''))]
    .filter((line) => line !== '')
    .join('\n');

  return { cuts, caption, review };
}
