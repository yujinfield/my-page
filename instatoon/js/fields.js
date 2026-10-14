// 통합 입력폼의 질문 목록
// 스토리형 V1과 정보형 V2에 공통으로 필요한 질문을 하나로 합쳤습니다.

import { normalizeCut } from './cut-plan.js';

// 핵심 정보(이유)는 항상 3개
export const POINT_COUNT = 3;

// PART 1. 기본 정보
export const BASIC_FIELDS = [
  {
    key: 'title',
    label: '인스타툰 제목',
    help: '표지(1컷)에 들어갈 제목이에요.',
    placeholder: '예) 웨딩 촬영 네일, 10만원 주고 해야 하나요?',
    multiline: false,
  },
  {
    key: 'question',
    label: '독자가 가장 궁금해할 질문',
    help: '첫 컷의 훅이 돼요. 비워 두면 제목을 대신 써요.',
    placeholder: '예) 그냥 예쁜 거 고르면 되는 거 아니었어?',
    multiline: false,
  },
  {
    key: 'topic',
    label: '다루고 싶은 주제',
    help: '이 툰으로 결국 하고 싶은 말을 적어요.',
    placeholder: '예) 웨딩 네일을 셀프로 준비해도 충분한 이유',
    multiline: true,
  },
  {
    key: 'startStory',
    label: '이야기가 시작된 실제 경험',
    help: '처음 이 일을 겪었을 때의 이야기예요.',
    placeholder: '예) 웨딩 카페에서 촬영 전 네일을 해야 한다는 글을 많이 봤어요.',
    multiline: true,
  },
  {
    key: 'feeling',
    label: '당시 감정·고민·주변 반응',
    help: '그때 어떤 마음이었는지, 주변에서는 뭐라고 했는지 적어요.',
    placeholder: '예) 하루 촬영하는데 굳이 10만원을 써야 하나 고민했어요.',
    multiline: true,
  },
  {
    key: 'result',
    label: '결과·최종 결정·느낀 점',
    help: '결국 어떻게 했고, 독자에게 전하고 싶은 이야기는 무엇인지 적어요.',
    placeholder: '예) 붙이는 네일을 사용했는데 생각보다 만족스러웠어요.',
    multiline: true,
  },
];

// PART 2. 핵심 정보 ①②③ (각각 아래 3칸)
export const POINT_FIELDS = [
  {
    key: 'main',
    label: '핵심 내용 (선택한 이유 또는 꿀팁)',
    help: '경험담이면 "이걸 선택한 이유", 정보툰이면 "알려주고 싶은 꿀팁"을 적어요.',
    placeholder: '예) 평소 네일아트를 하지 않는다면 촬영용 젤네일은 필수가 아니에요.',
    multiline: true,
  },
  {
    key: 'case',
    label: '나의 실제 사례·실수·경험',
    help: '없으면 비워 두세요. 없는 경험은 지어내지 않아요.',
    placeholder: '예) 젤네일은 나중에 제거도 해야 하고 손톱 손상이 걱정됐어요.',
    multiline: true,
  },
  {
    key: 'oneLine',
    label: '독자에게 전할 한 줄 핵심',
    help: '이 정보를 한 문장으로 줄이면? (선택)',
    placeholder: '예) 딱 하루를 위한 네일, 꼭 비싸게 할 필요는 없어요!',
    multiline: false,
  },
];

// PART 3. 마무리 및 CTA
export const CTA_FIELDS = [
  {
    key: 'extraInfo',
    label: '댓글로 제공할 추가 정보',
    help: '실제로 보낼 자료가 있을 때만 적어요.',
    placeholder: '예) 제가 실제 사용한 붙이는 네일 제품 정보',
    multiline: true,
  },
  {
    key: 'keyword',
    label: '댓글 유도 키워드',
    help: '짧은 한 단어가 좋아요.',
    placeholder: '예) 네일',
    multiline: false,
  },
  {
    key: 'commentLine',
    label: '댓글 유도 문구',
    help: '마지막 컷에서 독자에게 건넬 질문이에요. (선택)',
    placeholder: '예) 여러분은 촬영 네일 어떻게 하셨어요?',
    multiline: false,
  },
];

export const CTA_TYPES = [
  { value: 'comment', label: '댓글 키워드 유도' },
  { value: 'save', label: '저장 유도' },
  { value: 'share', label: '공유 유도' },
  { value: 'natural', label: '자연스러운 결론' },
];

// 빈 입력폼 만들기
export function createEmptyForm() {
  const form = {};
  BASIC_FIELDS.forEach((field) => { form[field.key] = ''; });
  CTA_FIELDS.forEach((field) => { form[field.key] = ''; });

  form.points = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    form.points.push({ main: '', case: '', oneLine: '' });
  }

  form.ctaType = 'comment';  // 기본값: 댓글 키워드 유도
  form.typeChoice = 'auto';  // 'auto' | 'story' | 'info'
  form.cuts = [];            // 컷 편집기의 컷 목록
  return form;
}

// 저장된 폼에 빠진 칸이 있으면 빈 값으로 채워서 돌려줍니다.
export function fillMissing(saved) {
  const form = createEmptyForm();
  if (!saved) return form;

  Object.keys(form).forEach((key) => {
    if (typeof form[key] === 'string' && typeof saved[key] === 'string') {
      form[key] = saved[key];
    }
  });

  if (Array.isArray(saved.points)) {
    form.points.forEach((point, i) => {
      const savedPoint = saved.points[i] || {};
      POINT_FIELDS.forEach((field) => {
        if (typeof savedPoint[field.key] === 'string') {
          point[field.key] = savedPoint[field.key];
        }
      });
    });
  }

  if (Array.isArray(saved.cuts)) {
    form.cuts = saved.cuts.map((cut) => normalizeCut(cut));
  }
  return form;
}

// 입력 진행률 (0~100)
export function getProgress(form) {
  const values = [];
  BASIC_FIELDS.forEach((field) => values.push(form[field.key]));
  form.points.forEach((point) => {
    POINT_FIELDS.forEach((field) => values.push(point[field.key]));
  });
  CTA_FIELDS.forEach((field) => values.push(form[field.key]));

  const filled = values.filter((text) => text.trim() !== '').length;
  return Math.round((filled / values.length) * 100);
}
