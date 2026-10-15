// 숙소 상세 폼 질문
// 핵심 질문: 이 가격에 위치·객실·시설이 실제로 괜찮은가?

const CHOOSE = '선택해 주세요';

export const STAY_GROUPS = [
  {
    title: '숙소와 위치',
    note: '위치는 “좋아요” 대신 역 도보 몇 분, 공항 택시 몇 분처럼 이동 시간으로 써요.',
    fields: [
      { key: 'stayName', label: '숙소명', type: 'text', required: true, placeholder: '예) ○○ 호텔 난바' },
      { key: 'address', label: '정확한 위치', type: 'text', placeholder: '예) 오사카 난바역 5번 출구 근처' },
      { key: 'access', label: '공항·역·관광지 접근성', type: 'textarea', required: true, help: '한 줄에 하나씩, 이동 수단과 시간까지 적어요.', placeholder: '예)\n난바역 도보 5분\n간사이공항 라피트 + 도보 45분\n도톤보리 도보 8분' },
      { key: 'nights', label: '숙박일', type: 'text', placeholder: '예) 9월 3일 ~ 9월 6일 (3박)' },
      { key: 'roomType', label: '객실 타입', type: 'text', required: true, placeholder: '예) 디럭스 트윈, 금연' },
    ],
  },
  {
    title: '가격과 숨은 비용',
    note: '최저가라고 단정하지 않아요. 날짜·환율·회원등급에 따라 달라지니 “내 예약일 기준”으로 써요. 숨은 비용은 글 앞쪽에 들어가요.',
    fields: [
      { key: 'roomPrice', label: '객실 요금 (세금 전)', type: 'text', volatile: true, placeholder: '예) 1박 120,000원' },
      { key: 'taxes', label: '세금·봉사료', type: 'text', volatile: true, placeholder: '예) 결제가에 포함 / 1박 12,000원 별도' },
      { key: 'resortFee', label: '리조트피·도시세', type: 'text', volatile: true, help: '현장 결제였는지도 적어요.', placeholder: '예) 숙박세 1인 1박 200엔 현장 결제' },
      { key: 'deposit', label: '보증금(디파짓)', type: 'text', volatile: true, placeholder: '예) 1박 1만 엔, 카드 가승인 후 체크아웃 시 취소' },
      { key: 'extraCosts', label: '그 밖의 추가 비용', type: 'text', volatile: true, help: '조식, 주차, 추가 인원 등', placeholder: '예) 조식 1인 2,500엔 별도, 주차 1박 2,000엔' },
      { key: 'platformPrices', label: '예약 플랫폼별 비교 가격', type: 'textarea', volatile: true, help: '한 줄에 하나씩: 플랫폼 / 가격 / 확인한 날짜', placeholder: '예)\n아고다 / 1박 118,000원 / 10월 15일\n호텔 공식 / 1박 125,000원 / 10월 15일' },
      { key: 'couponUsed', label: '예약 당시 쓴 쿠폰·회원 혜택', type: 'text', placeholder: '예) 앱 첫 예약 8% 쿠폰' },
    ],
  },
  {
    title: '객실',
    note: '공식 사진과 실제 사진을 구분해요. 실제 방 크기·뷰·욕실 상태가 더 중요해요.',
    fields: [
      { key: 'roomLayout', label: '객실 구조', type: 'textarea', help: '침실·욕실·침대·거실·주방', placeholder: '예) 약 18㎡, 싱글 침대 2개, 욕조 있는 일체형 욕실, 주방 없음' },
      { key: 'checkInOut', label: '체크인·체크아웃 시간', type: 'text', volatile: true, placeholder: '예) 15:00 / 11:00' },
      { key: 'earlyCheckIn', label: '얼리체크인', type: 'select', placeholder: CHOOSE, options: ['무료로 됐어요', '유료로 가능', '안 됐어요', '물어보지 않았어요'] },
      { key: 'cleanliness', label: '청결', type: 'text', placeholder: '예) 깨끗함. 카펫에 얼룩 조금' },
      { key: 'noise', label: '소음', type: 'text', placeholder: '예) 도로 쪽 방이라 새벽 차 소리 들림' },
      { key: 'view', label: '뷰', type: 'text', placeholder: '예) 옆 건물 벽 뷰 (요청 안 함)' },
      { key: 'bedding', label: '침구', type: 'text', placeholder: '예) 매트리스 단단한 편, 베개 2종' },
      { key: 'waterPressure', label: '수압·온수', type: 'text', placeholder: '예) 수압 좋음, 온수 바로 나옴' },
      { key: 'smell', label: '냄새', type: 'text', placeholder: '예) 담배 냄새 없음' },
      { key: 'amenities', label: '어메니티·비치 물품', type: 'textarea', placeholder: '예) 칫솔·면도기는 로비에서 가져가는 방식, 잠옷·슬리퍼 있음, 드라이기 있음' },
    ],
  },
  {
    title: '부대시설',
    fields: [
      { key: 'facilities', label: '부대시설', type: 'textarea', help: '수영장·사우나·조식·주차·짐보관 등', placeholder: '예) 대욕장, 코인 세탁실, 체크아웃 후 짐보관 무료' },
      { key: 'facilityHours', label: '운영시간·예약 필요·추가 비용', type: 'textarea', volatile: true, placeholder: '예) 대욕장 15:00~01:00, 05:00~10:00 / 예약 불필요 / 무료' },
    ],
  },
  {
    title: '아쉬웠던 점',
    fields: [
      { key: 'downsides', label: '아쉬웠던 점', type: 'textarea', required: true, help: '아쉬운 점이 있어야 글이 광고처럼 보이지 않아요.', placeholder: '예) 엘리베이터가 2대뿐이라 체크아웃 시간에 10분 기다림' },
    ],
  },
];
