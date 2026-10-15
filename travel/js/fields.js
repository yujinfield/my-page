// 공통 정보 폼의 질문 목록, 빈 폼, 진행률
// 질문을 바꾸려면 이 파일만 고칩니다.

// type: 'text' | 'textarea' | 'date' | 'select'
// volatile: true → 🔄 작성일 기준으로 다시 확인해야 하는 정보
// required: true → 글 품질에 꼭 필요한 정보
export const COMMON_GROUPS = [
  {
    title: '글 방향',
    fields: [
      {
        key: 'purpose',
        label: '글 목적',
        help: '목적에 따라 글 구조가 달라져요.',
        type: 'select',
        options: [
          { value: 'search', label: '검색 유입' },
          { value: 'conversion', label: '제휴 전환' },
          { value: 'review', label: '실제 후기' },
          { value: 'compare', label: '비교 정보' },
        ],
      },
      {
        key: 'mainKeyword',
        label: '메인 키워드',
        help: '제목과 첫 문단에 들어갈 검색어예요.',
        placeholder: '예) 일본 eSIM 추천',
        type: 'text',
        required: true,
      },
      {
        key: 'subKeywords',
        label: '서브 키워드',
        help: '한 줄에 하나씩 적어요.',
        placeholder: '예)\n일본 eSIM 설치 방법\n일본 eSIM 테더링',
        type: 'textarea',
      },
      {
        key: 'readerQuestion',
        label: '독자가 가장 궁금해할 한 가지',
        help: '비워 두면 카테고리 핵심 질문을 써요.',
        placeholder: '', // 카테고리 핵심 질문으로 채움 (form.js)
        type: 'text',
      },
      {
        key: 'cta',
        label: 'CTA (글 끝에서 독자에게 바라는 행동)',
        help: '',
        type: 'select',
        options: [
          { value: 'price', label: '가격 조회' },
          { value: 'discount', label: '할인 확인' },
          { value: 'book', label: '예약하기' },
          { value: 'comment', label: '댓글 유도' },
        ],
      },
    ],
  },
  {
    title: '여행 정보',
    fields: [
      {
        key: 'destination',
        label: '여행지',
        help: '나라와 도시까지 적어요.',
        placeholder: '예) 일본 오사카·교토',
        type: 'text',
        required: true,
      },
      {
        key: 'travelDate',
        label: '여행 시기',
        help: '',
        placeholder: '예) 2026년 9월, 4박 5일',
        type: 'text',
      },
      {
        key: 'people',
        label: '인원',
        help: '',
        placeholder: '예) 성인 2명 + 아이 1명(6세)',
        type: 'text',
      },
      {
        key: 'travelStyle',
        label: '여행 스타일',
        help: '누구와, 어떤 여행이었는지 적어요.',
        placeholder: '예) 부모님 동반, 쉬엄쉬엄 / 신혼여행 / 혼자 빡빡하게',
        type: 'text',
      },
    ],
  },
  {
    title: '실제 경험',
    fields: [
      {
        key: 'usedMyself',
        label: '직접 이용 여부',
        help: '이용하지 않았다면 후기 표현 없이 정보 정리 글로 써요.',
        type: 'select',
        options: [
          { value: 'yes', label: '직접 이용했어요' },
          { value: 'no', label: '이용하지 않았어요 (정보 정리)' },
        ],
      },
      {
        key: 'experience',
        label: '실제 경험',
        help: '좋았던 점, 막혔던 점, 예상과 달랐던 점을 그대로 적어요.',
        placeholder: '예) 출국 전날 밤 설치했는데, 간사이공항 도착하자마자 바로 잡혔어요.',
        type: 'textarea',
        required: true,
      },
      {
        key: 'paidPrice',
        label: '실제 결제 금액',
        help: '쿠폰·할인 적용 후 실제로 낸 금액이에요.',
        placeholder: '예) 15,900원 (5일, 쿠폰 2,000원 적용)',
        type: 'text',
        volatile: true,
      },
      {
        key: 'usedDate',
        label: '이용일',
        help: '',
        type: 'date',
      },
    ],
  },
  {
    title: '제휴 정보',
    fields: [
      {
        key: 'affiliateLinks',
        label: '제휴 링크',
        help: '한 줄에 하나씩 적어요. 링크가 있으면 글 맨 앞에 제휴 표시 문구가 들어가요.',
        placeholder: 'https://...',
        type: 'textarea',
        volatile: true,
      },
      {
        key: 'discountCode',
        label: '할인코드·쿠폰',
        help: '없으면 비워 두세요.',
        placeholder: '예) TRAVEL10 (10% 할인, 2026년 12월까지)',
        type: 'text',
        volatile: true,
      },
    ],
  },
  {
    title: '누구에게 맞나요?',
    fields: [
      {
        key: 'recommendFor',
        label: '추천 대상',
        help: '한 줄에 하나씩 적어요.',
        placeholder: '예)\n일정 내내 지도·번역 앱을 많이 쓰는 사람\n노트북 테더링이 필요한 사람',
        type: 'textarea',
        required: true,
      },
      {
        key: 'notRecommendFor',
        label: '비추천 대상',
        help: '비추천 대상이 있어야 글이 광고처럼 보이지 않아요. 한 줄에 하나씩 적어요.',
        placeholder: '예)\n현지 전화번호가 꼭 필요한 사람\n통신사 잠금이 걸린 폰을 쓰는 사람',
        type: 'textarea',
        required: true,
      },
    ],
  },
  {
    title: '자료와 작성일',
    fields: [
      {
        key: 'media',
        label: '꼭 넣을 사진·영상·캡처',
        help: '한 줄에 하나씩. 공식 사진이면 (공식), 직접 찍었으면 (실제)를 붙여요.',
        placeholder: '예)\n설치 화면 캡처 (실제)\n공항 속도 측정 결과 (실제)',
        type: 'textarea',
      },
      {
        key: 'checkedDate',
        label: '작성일 (가격·조건 확인일)',
        help: '🔄 표시 정보는 이 날짜 기준으로 다시 확인해요. 글 맨 위에 “○월 ○일 기준”으로 들어가요.',
        type: 'date',
      },
    ],
  },
];

// 모든 공통 필드를 한 줄로 펼친 목록
export const COMMON_FIELDS = COMMON_GROUPS.flatMap((group) => group.fields);

// 오늘 날짜 (YYYY-MM-DD, 내 컴퓨터 시간 기준)
export function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function createEmptyCommon() {
  const common = {};
  COMMON_FIELDS.forEach((field) => {
    common[field.key] = field.type === 'select' ? field.options[0].value : '';
  });
  common.checkedDate = today();
  return common;
}

export function createEmptyDraft() {
  const now = Date.now();
  return {
    id: `t_${now}`,
    category: '',
    common: createEmptyCommon(),
    details: { esim: {}, stay: {}, tour: {}, package: {}, pass: {} },
    createdAt: now,
    updatedAt: now,
  };
}

// 저장된 데이터에 빠진 칸이 있으면 기본값으로 채웁니다.
export function fillMissing(saved) {
  const draft = createEmptyDraft();
  if (!saved) return draft;

  const common = { ...draft.common, ...(saved.common || {}) };
  const details = { ...draft.details, ...(saved.details || {}) };
  return { ...draft, ...saved, common, details };
}

// 진행률(%): 글 종류 선택 + 공통 필드 중 채운 칸 비율
// 기본값이 있는 선택 칸(select)은 세지 않습니다.
export function getProgress(draft) {
  const countable = COMMON_FIELDS.filter((field) => field.type !== 'select');
  const total = countable.length + 1;
  let filled = draft.category ? 1 : 0;
  countable.forEach((field) => {
    if (String(draft.common[field.key]).trim() !== '') filled += 1;
  });
  return Math.round((filled / total) * 100);
}
