// 교통패스 상세 폼 질문
// 핵심 질문: 내 동선에서 개별 결제보다 정말 이득인가?

const CHOOSE = '선택해 주세요';

export const PASS_GROUPS = [
  {
    title: '패스 정보',
    fields: [
      { key: 'passName', label: '패스 이름', type: 'text', required: true, placeholder: '예) 간사이 레일패스 3일권' },
      { key: 'passKind', label: '종류', type: 'select', placeholder: CHOOSE, options: ['철도', '지하철', '버스', '공항 이동', '관광패스', '여러 가지 묶음'] },
      { key: 'passPrice', label: '가격', type: 'text', required: true, volatile: true, placeholder: '예) 성인 2,800엔 (구매가 26,500원)' },
      { key: 'shop', label: '구매처', type: 'text', placeholder: '예) 클룩' },
      { key: 'format', label: '사용 방식', type: 'select', placeholder: CHOOSE, options: ['앱', 'QR 코드', '실물권'] },
    ],
  },
  {
    title: '유효기간',
    note: '유효기간이 ‘구매일 기준’인지 ‘첫 사용일 기준’인지 꼭 구분해요.',
    fields: [
      { key: 'validity', label: '유효 기간', type: 'text', required: true, volatile: true, placeholder: '예) 연속 3일 / 72시간' },
      { key: 'validityBasis', label: '기간 계산 기준', type: 'select', required: true, placeholder: CHOOSE, options: ['구매일 기준', '첫 사용일 기준 (달력일)', '첫 개시 시각부터 24시간 단위', '지정한 날짜'] },
    ],
  },
  {
    title: '노선',
    note: '공항철도, 특급열차, 지정석, 사철은 제외인 경우가 많아요. 가장 중요한 정보예요.',
    fields: [
      { key: 'coveredLines', label: '사용 가능 노선', type: 'textarea', volatile: true, placeholder: '예) JR 간사이 지역 보통·쾌속, 하루카 자유석' },
      { key: 'excludedLines', label: '사용 불가 노선', type: 'textarea', required: true, volatile: true, placeholder: '예) 신칸센, 사철(한큐·한신·난카이), 지하철' },
      { key: 'excludedKinds', label: '제외되는 것', type: 'checks', options: ['공항철도', '특급열차', '지정석', '사철', '지하철', '버스'] },
      { key: 'seatReservation', label: '좌석 지정·예약 필요 여부', type: 'text', placeholder: '예) 하루카 지정석은 역 창구에서 무료 예약' },
    ],
  },
  {
    title: '받는 방법',
    note: '실물 교환이 필요하면 공항 줄, 수령 장소, 운영시간까지 적어야 실제로 도움이 돼요.',
    fields: [
      { key: 'exchangeNeeded', label: '실물 교환', type: 'select', placeholder: CHOOSE, options: ['필요 없음 (바로 사용)', '필요함'] },
      { key: 'exchangePlace', label: '수령 장소·운영시간·대기', type: 'textarea', volatile: true, placeholder: '예) 간사이공항역 JR 매표소, 05:30~23:00, 줄 20분' },
      { key: 'airportUsable', label: '공항 도착 직후 사용', type: 'select', placeholder: CHOOSE, options: ['바로 사용 가능', '교환 후 사용 가능', '공항 구간은 불가'] },
    ],
  },
  {
    title: '실제 이용과 손익',
    note: '“싸다”가 아니라 몇 번 타야 본전인지가 핵심이에요. 이용 기록은 4단계 계산 도우미에서 씁니다.',
    fields: [
      { key: 'rides', label: '실제 이용 기록', type: 'textarea', required: true, help: '한 줄에 하나씩: 날짜 / 구간 / 개별 요금', placeholder: '예)\n9/3 / 간사이공항 → 교토 / 3,640엔\n9/4 / 교토 → 나라 / 760엔' },
      { key: 'compareNote', label: '카드·현금·개별권 대비 손익 메모', type: 'textarea', placeholder: '예) 교통카드로 다녔다면 총 6,100엔 → 3,300엔 절약' },
      { key: 'route', label: '여행 동선', type: 'textarea', help: '동선이 느슨하면 패스가 손해일 수 있어요.', placeholder: '예) 1일차 공항→교토, 2일차 나라 당일치기, 3일차 교토→오사카' },
    ],
  },
  {
    title: '규정',
    fields: [
      { key: 'refundPolicy', label: '분실·환불·변경 규정', type: 'textarea', volatile: true, placeholder: '예) 교환 전 미사용 시 환불 가능, 분실 시 재발급 불가' },
    ],
  },
];
