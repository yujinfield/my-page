// 글 종류(이심·숙소·투어·패키지)와 입력 항목 목록
// 화면(form.js)과 글 작성(writer.js)이 모두 이 파일을 보고 동작합니다.
//
// 입력 항목 하나의 모양:
//   key: 저장할 이름, label: 제목, help: 설명, placeholder: 예시
//   type: 'text' | 'textarea' | 'select' | 'url'
//   lines: true 이면 "한 줄에 하나씩" 적는 목록 항목

export const PROGRAMS = [
  '마이리얼트립',
  '클룩',
  'KKday',
  '트립닷컴',
  '아고다',
  '쿠팡 파트너스',
  '링크프라이스',
  '기타',
];

export const COMPANIONS = ['혼자', '친구와', '연인과', '가족과', '아이와 함께', '부모님과'];

// 모든 글 종류에 공통으로 들어가는 기본 정보
export const BASIC_FIELDS = [
  { key: 'keyword', label: '메인 키워드', help: '검색에 걸리고 싶은 말. 제목 맨 앞에 들어가요.', placeholder: '예: 일본 이심 추천', type: 'text' },
  { key: 'destination', label: '여행지', help: '나라와 도시', placeholder: '예: 일본 오사카', type: 'text' },
  { key: 'travelDate', label: '여행 시기', help: '언제, 며칠 동안 다녀왔나요?', placeholder: '예: 2026년 9월, 4박 5일', type: 'text' },
  { key: 'companion', label: '누구와', help: '', placeholder: '', type: 'select', options: COMPANIONS },
  { key: 'productName', label: '상품 이름', help: '리뷰할 상품·숙소·투어 이름', placeholder: '예: 도시락 이심 매일 2GB', type: 'text' },
  { key: 'price', label: '가격', help: '내가 실제로 낸 금액', placeholder: '예: 5일 12,900원', type: 'text' },
  { key: 'reason', label: '고른 이유', help: '여러 선택지 중 이 상품을 고른 이유', placeholder: '예: 후기가 많고 가격이 로밍의 1/3이라서', type: 'textarea' },
];

// 글 종류별 상세 항목
// sections: 본문에 들어갈 소제목과 내용 (kind: 'p' 문단, 'list' 목록, 'steps' 순서 목록)
// summary: "한눈에 보기" 표에 넣을 항목
export const CATEGORIES = {
  esim: {
    label: '이심',
    emoji: '📶',
    word: '이심',
    titleSuffix: '설치 방법·속도',
    hook: '해외여행 준비할 때 제일 먼저 챙기는 게 데이터죠. 로밍, 유심, 포켓와이파이, 이심 중에 이번에는 이심을 선택했어요.',
    tags: ['이심', 'eSIM', '해외이심', '해외데이터'],
    fields: [
      { key: 'network', label: '사용 통신망', help: '현지에서 잡힌 통신사', placeholder: '예: 소프트뱅크', type: 'text' },
      { key: 'dataPlan', label: '요금제', help: '데이터 용량과 기간', placeholder: '예: 매일 2GB, 5일', type: 'text' },
      { key: 'hotspot', label: '테더링(핫스팟)', help: '', placeholder: '', type: 'select', options: ['가능', '불가', '확인 안 함'] },
      { key: 'install', label: '설치·개통 순서', help: '한 줄에 한 단계씩', placeholder: '예: 구매 후 메일로 QR코드 받기\n설정 > 셀룰러 > eSIM 추가\n현지 도착 후 데이터 로밍 켜기', type: 'textarea', lines: true },
      { key: 'speed', label: '실제 속도·연결 후기', help: '어디서 어떻게 써 봤는지', placeholder: '예: 지하철에서도 유튜브가 끊기지 않았어요', type: 'textarea' },
    ],
    sections: [
      { title: '설치·개통 방법', key: 'install', kind: 'steps' },
      { title: '실제 사용 후기 (속도·연결)', key: 'speed', kind: 'p' },
    ],
    summary: [
      ['상품', 'productName'],
      ['여행지', 'destination'],
      ['통신망', 'network'],
      ['요금제', 'dataPlan'],
      ['테더링', 'hotspot'],
      ['가격', 'price'],
    ],
  },

  stay: {
    label: '숙소',
    emoji: '🏨',
    word: '숙소',
    titleSuffix: '위치·객실·조식',
    hook: '여행 만족도를 크게 좌우하는 게 숙소라서, 이번에도 위치와 후기를 꼼꼼히 비교해 보고 예약했어요.',
    tags: ['숙소추천', '호텔후기', '숙소후기'],
    fields: [
      { key: 'location', label: '위치', help: '역·명소에서 얼마나 걸리나요?', placeholder: '예: 난바역 도보 5분', type: 'text' },
      { key: 'roomType', label: '객실 타입', help: '', placeholder: '예: 스탠다드 트윈', type: 'text' },
      { key: 'checkInOut', label: '체크인 / 체크아웃', help: '', placeholder: '예: 15:00 / 11:00', type: 'text' },
      { key: 'locationReview', label: '위치·교통 후기', help: '주변에 뭐가 있었고 이동은 편했나요?', placeholder: '예: 1층에 편의점이 있고 공항버스 정류장이 가까웠어요', type: 'textarea' },
      { key: 'roomReview', label: '객실·청결 후기', help: '', placeholder: '예: 캐리어 두 개를 펼쳐도 될 만큼 넓었어요', type: 'textarea' },
      { key: 'facilities', label: '부대시설·조식 후기', help: '', placeholder: '예: 조식은 일식 위주, 대욕탕은 밤 11시까지', type: 'textarea' },
    ],
    sections: [
      { title: '위치와 교통', key: 'locationReview', kind: 'p' },
      { title: '객실 후기', key: 'roomReview', kind: 'p' },
      { title: '부대시설·조식', key: 'facilities', kind: 'p' },
    ],
    summary: [
      ['숙소', 'productName'],
      ['위치', 'location'],
      ['객실', 'roomType'],
      ['체크인/아웃', 'checkInOut'],
      ['가격', 'price'],
    ],
  },

  tour: {
    label: '투어',
    emoji: '🚌',
    word: '투어',
    titleSuffix: '코스·가격',
    hook: '자유여행이라도 이동이 번거로운 곳은 투어로 다녀오면 훨씬 편하더라고요. 그래서 이번 일정에 투어를 하나 넣었어요.',
    tags: ['투어추천', '현지투어', '투어후기'],
    fields: [
      { key: 'duration', label: '소요 시간', help: '', placeholder: '예: 약 10시간 (08:30~18:30)', type: 'text' },
      { key: 'meetingPoint', label: '집결 장소', help: '', placeholder: '예: 난바역 OCAT 앞', type: 'text' },
      { key: 'course', label: '투어 코스', help: '한 줄에 한 곳씩', placeholder: '예: 교토 아라시야마\n금각사\n나라 사슴공원', type: 'textarea', lines: true },
      { key: 'highlight', label: '가장 좋았던 순간', help: '', placeholder: '예: 아라시야마 대나무숲을 사람 적을 때 걸을 수 있었어요', type: 'textarea' },
      { key: 'guideReview', label: '가이드·진행 후기', help: '', placeholder: '예: 이동 중에 역사 이야기를 들려줘서 지루하지 않았어요', type: 'textarea' },
      { key: 'included', label: '포함 / 불포함', help: '한 줄에 하나씩', placeholder: '예: 포함: 왕복 버스, 한국어 가이드\n불포함: 입장료, 점심', type: 'textarea', lines: true },
    ],
    sections: [
      { title: '투어 코스', key: 'course', kind: 'steps' },
      { title: '가장 좋았던 순간', key: 'highlight', kind: 'p' },
      { title: '가이드·진행', key: 'guideReview', kind: 'p' },
      { title: '포함 / 불포함 사항', key: 'included', kind: 'list' },
    ],
    summary: [
      ['투어', 'productName'],
      ['여행지', 'destination'],
      ['소요 시간', 'duration'],
      ['집결 장소', 'meetingPoint'],
      ['가격', 'price'],
    ],
  },

  package: {
    label: '패키지',
    emoji: '🧳',
    word: '패키지여행',
    titleSuffix: '일정·포함사항',
    hook: '일정 짜고 하나하나 예약할 시간이 부족해서, 이번 여행은 패키지로 다녀왔어요.',
    tags: ['패키지여행', '패키지후기', '해외여행'],
    fields: [
      { key: 'schedule', label: '일정', help: '', placeholder: '예: 3박 5일', type: 'text' },
      { key: 'airline', label: '항공', help: '', placeholder: '예: 대한항공 직항', type: 'text' },
      { key: 'hotels', label: '숙소', help: '등급이나 호텔 이름', placeholder: '예: 4성급 시내 호텔', type: 'text' },
      { key: 'itinerary', label: '일자별 일정', help: '한 줄에 하루씩', placeholder: '예: 1일차: 인천 출발, 시내 야경\n2일차: 시티투어\n3일차: 자유일정', type: 'textarea', lines: true },
      { key: 'included', label: '포함 사항', help: '한 줄에 하나씩', placeholder: '예: 왕복 항공권\n호텔 3박\n전 일정 식사', type: 'textarea', lines: true },
      { key: 'extras', label: '선택관광·쇼핑', help: '추가 비용이나 쇼핑 일정이 있었나요?', placeholder: '예: 선택관광 2개(각 50달러), 쇼핑 1회', type: 'textarea' },
      { key: 'guideReview', label: '가이드·인솔 후기', help: '', placeholder: '예: 시간 약속을 잘 지켜 줘서 일정이 늘어지지 않았어요', type: 'textarea' },
    ],
    sections: [
      { title: '일자별 일정', key: 'itinerary', kind: 'list' },
      { title: '포함 사항', key: 'included', kind: 'list' },
      { title: '선택관광·쇼핑', key: 'extras', kind: 'p' },
      { title: '가이드·인솔', key: 'guideReview', kind: 'p' },
    ],
    summary: [
      ['상품', 'productName'],
      ['여행지', 'destination'],
      ['일정', 'schedule'],
      ['항공', 'airline'],
      ['숙소', 'hotels'],
      ['가격', 'price'],
    ],
  },
};

// 장단점·마무리 (모든 글 종류 공통)
export const REVIEW_FIELDS = [
  { key: 'pros', label: '좋았던 점', help: '한 줄에 하나씩', placeholder: '예: 가격이 저렴해요\n설치가 5분이면 끝나요', type: 'textarea', lines: true },
  { key: 'cons', label: '아쉬운 점', help: '한 줄에 하나씩. 솔직한 단점이 신뢰를 만들어요.', placeholder: '예: 전화·문자는 안 돼요', type: 'textarea', lines: true },
  { key: 'recommendFor', label: '이런 분께 추천', help: '한 줄에 하나씩', placeholder: '예: 짧은 일정으로 가는 분\n유심 갈아 끼우기 귀찮은 분', type: 'textarea', lines: true },
  { key: 'tips', label: '꿀팁', help: '한 줄에 하나씩', placeholder: '예: 출국 전에 한국에서 미리 설치해 두세요', type: 'textarea', lines: true },
  { key: 'rating', label: '별점', help: '', placeholder: '', type: 'select', options: ['5', '4', '3', '2', '1'] },
  { key: 'verdict', label: '한 줄 총평', help: '', placeholder: '예: 짧은 여행이라면 고민 없이 추천해요', type: 'textarea' },
];

// 제휴(파트너스) 링크
export const PARTNER_FIELDS = [
  { key: 'program', label: '제휴 프로그램', help: '대가성 문구(공정위 표시)가 자동으로 들어가요.', placeholder: '', type: 'select', options: PROGRAMS },
  { key: 'partnerLink', label: '파트너스 링크', help: '제휴 사이트에서 만든 내 링크 (https://로 시작)', placeholder: 'https://', type: 'url' },
  { key: 'ctaText', label: '버튼 문구', help: '비워 두면 "최저가 확인하기"', placeholder: '최저가 확인하기', type: 'text' },
];

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

// 빈 입력값 만들기. select는 첫 번째 선택지로 시작합니다.
function emptyValues(fields) {
  const values = {};
  fields.forEach((field) => {
    values[field.key] = field.type === 'select' ? field.options[0] : '';
  });
  return values;
}

export function createEmptyCommon() {
  return emptyValues([...BASIC_FIELDS, ...REVIEW_FIELDS, ...PARTNER_FIELDS]);
}

export function createEmptyDetail(categoryKey) {
  return emptyValues(CATEGORIES[categoryKey].fields);
}
