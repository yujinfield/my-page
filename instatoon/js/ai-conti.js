// Claude에게 콘티를 맡길 요청문 만들기와 답 정리
// DOM을 쓰지 않는 순수 함수만 둡니다. 실제 호출은 cuts.js에서 합니다.

import { CONTI_RULES } from './guide.js';
import { editorValues, EDITOR_JSON_SHAPE } from './editor-format.js';
import { STORY_V1, INFO_V2 } from './master-prompts.js';
import { buildUserInputs } from './prompt.js';
import { normalizeCut } from './cut-plan.js';

// 한 번에 받을 최대 컷 수 (지침: 많으면 14컷 이상도 허용)
const MAX_AI_CUTS = 20;

const OUTPUT_FORMAT = `[답하는 방법]
마스터 프롬프트의 "최종 출력 순서"와 "이미지 생성 프롬프트" 대신, 이 사이트의 컷 편집기에 바로 들어갈 JSON 하나로만 답한다.
컷 구성·연출·검토 기준은 그대로 따른다. 이미지 생성 프롬프트는 쓰지 않는다 (사이트가 컷 내용으로 조립함).

${EDITOR_JSON_SHAPE}`;

// type: 'story'(스토리형 V1) | 'info'(정보형 V2)
export function buildContiRequest(form, type) {
  const master = type === 'story' ? STORY_V1 : INFO_V2;

  return [
    '너는 인스타그램 \'@꼼쥐\'의 전담 콘텐츠 기획자이자 스토리 작가다.',
    '아래 [꼼쥐 규칙]과 [마스터 프롬프트]를 따르고, [사용자 입력]에 있는 내용만 근거로 컷별 콘티를 작성한다.',
    CONTI_RULES,
    `[마스터 프롬프트]\n${master}`,
    `[사용자 입력]\n${buildUserInputs(form, type)}`,
    editorValues(),
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
