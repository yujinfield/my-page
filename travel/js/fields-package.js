// 여행 패키지 상세 폼 질문
// 핵심 질문: 광고 가격 말고 최종적으로 얼마가 드는가?
// 패키지 유형은 1단계(글 종류)에서 고릅니다.

const CHOOSE = '선택해 주세요';

export const PACKAGE_GROUPS = [
  {
    title: '상품 정보',
    fields: [
      { key: 'agency', label: '여행사', type: 'text', placeholder: '예) ○○투어' },
      { key: 'productName', label: '상품명', type: 'text', required: true, placeholder: '예) 다낭 4박 5일 세미패키지' },
      { key: 'departDate', label: '출발일', type: 'date' },
      { key: 'duration', label: '여행 기간', type: 'text', placeholder: '예) 3박 5일 (기내 1박)' },
      { key: 'departFrom', label: '출발지', type: 'text', placeholder: '예) 인천' },
      { key: 'flight', label: '항공편', type: 'text', placeholder: '예) 저비용항공 오전 출발 / 새벽 도착' },
      { key: 'baggage', label: '수하물 조건', type: 'text', volatile: true, placeholder: '예) 위탁 15kg, 기내 7kg' },
    ],
  },
  {
    title: '가격과 추가 비용',
    note: '광고 최저가만 쓰면 안 돼요. 유류할증료, 팁, 옵션, 쇼핑, 1인 객실 추가비까지 더해야 실제 가격이에요.',
    fields: [
      { key: 'adPrice', label: '광고(표시) 가격', type: 'text', volatile: true, placeholder: '예) 1인 499,000원~' },
      { key: 'totalPrice', label: '총 결제 금액', type: 'text', required: true, volatile: true, placeholder: '예) 2인 1,380,000원' },
      { key: 'perPerson', label: '1인당 금액', type: 'text', volatile: true, placeholder: '예) 690,000원' },
      { key: 'fuelSurcharge', label: '유류할증료', type: 'text', volatile: true, placeholder: '예) 포함 / 1인 120,000원 별도' },
      { key: 'guideTip', label: '가이드팁', type: 'text', volatile: true, placeholder: '예) 1인 40달러, 현지 지불' },
      { key: 'optionalTours', label: '선택관광', type: 'textarea', volatile: true, help: '한 줄에 하나씩: 이름 / 가격 / 했는지', placeholder: '예)\n바나힐 / 1인 60달러 / 함\n마사지 / 1인 30달러 / 안 함' },
      { key: 'singleCharge', label: '싱글차지 (1인 객실 추가비)', type: 'text', volatile: true, placeholder: '예) 해당 없음 / 1인 150,000원' },
      { key: 'otherCosts', label: '그 밖의 추가 비용', type: 'text', volatile: true, placeholder: '예) 여행자보험 별도, 공항 픽업 추가' },
    ],
  },
  {
    title: '포함·불포함',
    fields: [
      { key: 'included', label: '포함 내역', type: 'textarea', help: '한 줄에 하나씩', placeholder: '예)\n왕복 항공\n호텔 3박\n조식 3회\n전용 차량' },
      { key: 'excluded', label: '불포함 내역', type: 'textarea', required: true, help: '한 줄에 하나씩', placeholder: '예)\n중식·석식 2회\n가이드팁\n개인 경비' },
    ],
  },
  {
    title: '숙소·식사',
    fields: [
      { key: 'hotels', label: '호텔명', type: 'textarea', help: '한 줄에 하나씩, 박수와 함께', placeholder: '예)\n○○ 리조트 2박\n○○ 호텔 1박' },
      { key: 'roomSetup', label: '객실 구성', type: 'text', placeholder: '예) 더블 1실 (2인)' },
      { key: 'meals', label: '식사 제공', type: 'text', placeholder: '예) 조식 3, 중식 2, 석식 1' },
    ],
  },
  {
    title: '일정',
    note: '“노쇼핑” “자유여행” 같은 표현은 상품 상세 조건을 다시 확인하고 써요.',
    fields: [
      { key: 'shopping', label: '필수 쇼핑', type: 'text', volatile: true, placeholder: '예) 2회 (침향, 커피) 각 40분 / 없음 (상품 상세에서 확인함)' },
      { key: 'freeTime', label: '자유시간', type: 'text', placeholder: '예) 3일째 오후 반나절' },
      { key: 'intensity', label: '일정 강도', type: 'select', placeholder: CHOOSE, options: ['여유', '보통', '빡빡'] },
      { key: 'confirmTiming', label: '항공·호텔 확정 시점', type: 'text', help: '출발 임박해서 확정되는 상품인지 적어요.', placeholder: '예) 출발 7일 전 호텔 확정 문자' },
    ],
  },
  {
    title: '현장 경험',
    note: '부모님 동반이면 일정 강도·이동시간, 신혼여행이면 호텔·자유시간 비중을 따로 평가해요.',
    fields: [
      { key: 'guideRating', label: '현지 가이드·인솔자 만족도', type: 'textarea', placeholder: '예) 설명은 자세했지만 쇼핑 권유가 잦았음' },
      { key: 'gapFromDescription', label: '실제 일정과 상품 설명의 차이', type: 'textarea', placeholder: '예) 일정표엔 없던 쇼핑센터 1곳 추가' },
      { key: 'vsFreeTravel', label: '자유여행 대비 절약·손해 본 지점', type: 'textarea', placeholder: '예) 항공+호텔은 싸게 샀지만, 이동 대기와 쇼핑 시간이 아까웠음' },
    ],
  },
  {
    title: '취소·예약 전 체크',
    fields: [
      { key: 'cancelFee', label: '취소·변경 수수료 조건', type: 'textarea', required: true, volatile: true, placeholder: '예) 출발 30일 전까지 무료, 20일 전 10%, 7일 전 30%' },
      { key: 'checklist', label: '예약 전 체크할 항목', type: 'textarea', help: '한 줄에 하나씩', placeholder: '예)\n가이드팁 현지 지불 금액\n쇼핑 횟수\n호텔 확정 시점' },
    ],
  },
];
