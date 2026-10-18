// 입력폼 + 마스터 프롬프트 → Claude에 붙여 넣을 요청문
// DOM을 쓰지 않는 순수 함수만 둡니다.

import { CTA_TYPES, MATERIAL_TYPES } from './fields.js';
import { STORY_V1, STORY_V1_CLOSING, INFO_V2, INFO_V2_CLOSING } from './master-prompts.js';
import { editorJsonRequest, EDITOR_JSON_NOTICE, EDITOR_JSON_REMINDER } from './editor-format.js';
import {
  SALES_RULES, DIRECTION_RULES, DIRECTION_TEXT_FORMAT, BASE_STYLE, FIXED_RULES, TEMPLATES, CHARACTERS, EXPRESSIONS, BACKGROUNDS, findOption,
} from './guide.js';

const EMPTY_REQUIRED = '(입력 없음 — 지어내지 말고 확인 필요로 표시)';
const EMPTY_OPTIONAL = '(입력 없음)';
const CIRCLES = ['①', '②', '③'];
// ①(일)과, ②(이)와, ③(삼)과 — 읽는 소리에 맞춘 조사
const AND_PARTICLES = ['과', '와', '과'];

// 빈 칸이면 안내 문구로 바꿔 줍니다.
function show(text, required = true) {
  const value = text.trim();
  if (value !== '') return value;
  return required ? EMPTY_REQUIRED : EMPTY_OPTIONAL;
}

function ctaLabel(value) {
  const found = CTA_TYPES.find((cta) => cta.value === value);
  return found ? found.label : '';
}

function materialLine(form) {
  const type = MATERIAL_TYPES.find((item) => item.value === form.materialType);
  if (!type || type.value === 'none') return '없음';
  return form.notionUrl ? `${type.label} (노션에 준비 완료)` : `${type.label} (준비 예정)`;
}

// 스토리형 V1의 "7. 사용자 입력" 형식
function buildStoryInputs(form) {
  const lines = [
    `제목(참고): ${show(form.title, false)}`,
    `주제: ${show(form.topic)}`,
    `독자가 가장 궁금해할 질문: ${show(form.question || form.title)}`,
    `처음 경험했을 때의 이야기: ${show(form.startStory)}`,
    `주변 반응 또는 나의 고민: ${show(form.feeling)}`,
    '',
  ];

  form.points.forEach((point, i) => {
    const circle = CIRCLES[i];
    lines.push(`다시 선택한 이유 ${circle}: ${show(point.main)}`);
    lines.push(`이유 ${circle}${AND_PARTICLES[i]} 관련된 실제 경험: ${show(point.case)}`);
    lines.push(`이유 ${circle} 한 줄 핵심(선택): ${show(point.oneLine, false)}`);
    lines.push('');
  });

  lines.push(`최종 결정과 전하고 싶은 이야기: ${show(form.result)}`);
  lines.push(`댓글 유도 문구(선택): ${show(form.commentLine, false)}`);
  lines.push(`CTA 방식: ${ctaLabel(form.ctaType)}`);
  lines.push(`댓글 유도 키워드(선택): ${show(form.keyword, false)}`);
  lines.push(`댓글로 제공할 추가 정보(선택): ${show(form.extraInfo, false)}`);
  lines.push(`댓글로 보낼 자료: ${materialLine(form)}`);

  return lines.join('\n');
}

// 정보형 V2의 PART 1~3 형식
function buildInfoInputs(form) {
  const lines = [
    '[PART 1. 콘텐츠 기본 정보]',
    `1. 인스타툰 제목: ${show(form.title)}`,
    `2. 다루고 싶은 주제: ${show(form.topic)}`,
    `3. 이야기가 시작된 실제 경험: ${show(form.startStory)}`,
    `4. 당시 감정과 행동: ${show(form.feeling)}`,
    `5. 결과와 느낀 점: ${show(form.result)}`,
    `(참고) 독자가 가장 궁금해할 질문: ${show(form.question, false)}`,
    '',
    '[PART 2. 핵심 정보 3개]',
  ];

  form.points.forEach((point, i) => {
    lines.push(`핵심 정보 ${CIRCLES[i]}`);
    lines.push(`① 알려주고 싶은 정보·꿀팁: ${show(point.main)}`);
    lines.push(`② 나의 실제 사례·실수·경험: ${show(point.case)}`);
    lines.push(`③ 독자에게 전할 한 줄 핵심: ${show(point.oneLine)}`);
    lines.push('');
  });

  lines.push('[PART 3. 마무리 및 CTA]');
  lines.push(`1. 댓글로 제공할 추가 정보: ${show(form.extraInfo, false)}`);
  lines.push(`   댓글로 보낼 자료: ${materialLine(form)}`);
  lines.push(`2. 댓글 유도 키워드: ${show(form.keyword, false)}`);
  lines.push(`3. CTA 방식: ${ctaLabel(form.ctaType)}`);
  lines.push(`(참고) 댓글 유도 문구: ${show(form.commentLine, false)}`);

  return lines.join('\n');
}

// 유형에 맞는 형식으로 사용자 입력만 정리 (사이트 안 자동 작성에서도 씀)
export function buildUserInputs(form, type) {
  return type === 'story' ? buildStoryInputs(form) : buildInfoInputs(form);
}

// type: 'story' | 'info'
export function buildPrompt(form, type) {
  if (type === 'story') {
    return [
      EDITOR_JSON_NOTICE,
      STORY_V1,
      '7. 사용자 입력',
      buildStoryInputs(form),
      '⸻',
      STORY_V1_CLOSING,
      SALES_RULES,
      DIRECTION_RULES,
      DIRECTION_TEXT_FORMAT,
      editorJsonRequest(),
      EDITOR_JSON_REMINDER,
    ].join('\n\n');
  }

  return [
    EDITOR_JSON_NOTICE,
    INFO_V2,
    '사용자 입력폼 제출 내용',
    buildInfoInputs(form),
    '⸻',
    INFO_V2_CLOSING,
    SALES_RULES,
    DIRECTION_RULES,
    DIRECTION_TEXT_FORMAT,
    editorJsonRequest(),
    EDITOR_JSON_REMINDER,
  ].join('\n\n');
}

// ---------- 컷별 이미지 생성 프롬프트 ----------

function cutNumber(index) {
  return String(index + 1).padStart(2, '0');
}

// 컷 하나 → Make에 붙여 넣을 이미지 프롬프트
// 순서: 공통 문구 → 추가 캐릭터 → 템플릿 구성 → 컷 내용 → 고정 조건 (CLAUDE.md "프롬프트 조립 규칙")
// drawText: true면 한글 문구를 그림에 직접 넣고, false면 문구 자리만 비워 둬요 (후편집용, 기본)
export function buildImagePrompt(cut, index, drawText = false) {
  const template = findOption(TEMPLATES, cut.template);
  const parts = [BASE_STYLE];

  CHARACTERS.forEach((character) => {
    if (character.prompt !== '' && cut.characters.includes(character.value)) {
      parts.push(character.prompt);
    }
  });

  // 구도 템플릿은 레퍼런스 그림이 없어요. 기본 틀을 따라 하지 않게 한 줄 더 적어요.
  if (template.reference) {
    parts.push(`Layout reference: ${template.reference}\n${template.prompt}`);
  } else if (template.value === template.family) {
    parts.push(`Layout: ${template.prompt}`);
  } else {
    parts.push(`Layout: ${template.prompt}\nDo not copy the usual ${template.family} template composition; follow this layout instead.`);
  }

  const details = [];
  if (cut.characters.length === 0) {
    details.push('Characters: none in this panel (text and illustration only).');
  } else if (!cut.characters.includes('kkomjwi')) {
    details.push('Do not draw the squirrel in this panel.');
  } else {
    details.push(`Squirrel expression and pose: ${findOption(EXPRESSIONS, cut.expression).prompt}.`);
  }
  details.push(`Background: ${findOption(BACKGROUNDS, cut.background).prompt}.`);
  if (cut.scene.trim() !== '') details.push(`Scene, props and pose (Korean): ${cut.scene.trim()}`);
  if (cut.direction.trim() !== '') details.push(`Direction notes (Korean): ${cut.direction.trim()}`);
  parts.push(details.join('\n'));

  // 화면에 들어갈 한글 문구: 입력한 칸만, 줄바꿈 그대로
  const textLines = [];
  const textSpaces = [];
  template.texts.forEach((field) => {
    const value = (cut.texts[field.key] || '').trim();
    if (value === '') return;
    textLines.push(`[${field.label}]\n${value}`);
    textSpaces.push(`- ${field.label}: about ${value.split('\n').length} line(s)`);
  });
  if (textLines.length > 0 && drawText) {
    parts.push(`Write exactly this Korean text, keeping the line breaks (the [labels] only tell where each text goes; do not draw them):\n${textLines.join('\n\n')}`);
  } else if (textLines.length > 0) {
    // 연출 규칙 9번: 한글은 후편집으로 넣으니 깨끗한 빈 자리만 (말풍선·카드는 비워서)
    parts.push(`Do NOT draw any letters, words or numbers (Korean or English) anywhere except the '@꼼쥐' watermark; this overrides any instruction above about handwritten text.
Instead leave clean, plain empty space for these texts, which will be added later in editing. Draw speech bubbles, cards and boxes EMPTY:
${textSpaces.join('\n')}`);
  } else {
    parts.push('No text in this panel except the \'@꼼쥐\' watermark.');
  }

  parts.push(FIXED_RULES);

  return `CUT ${cutNumber(index)} | ${template.label}\n\n${parts.join('\n\n')}`;
}

// 수정 요청: 첫 번째 첨부 그림(지금 그림)을 바탕으로, 적은 부분만 고치기
export function buildRevisePrompt(cut, index, request, drawText = false) {
  return [
    'Edit the FIRST attached image (the current version of this panel).',
    'Keep everything exactly the same — layout, characters, art style, colors, Korean text and the \'@꼼쥐\' watermark — and change ONLY what is asked below.',
    'Other attached images are character/layout references only.',
    `Change request (Korean):\n${request.trim()}`,
    `Original panel instructions, for reference:\n${buildImagePrompt(cut, index, drawText)}`,
  ].join('\n\n');
}

// 전체 컷 프롬프트를 한 번에
export function buildAllImagePrompts(cuts, drawText = false) {
  return cuts.map((cut, index) => buildImagePrompt(cut, index, drawText)).join('\n\n━━━━━━━━━━━━━━━━━━\n\n');
}
