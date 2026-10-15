// 투어·액티비티 상세 폼 질문
// 핵심 질문: 일정에 넣을 가치가 있고, 취소·안전 리스크는 없는가?

const CHOOSE = '선택해 주세요';

export const TOUR_GROUPS = [
  {
    title: '투어 정보',
    fields: [
      { key: 'tourName', label: '투어명', type: 'text', required: true, placeholder: '예) 세부 호핑투어 (점심 포함)' },
      { key: 'operator', label: '운영사', type: 'text', placeholder: '예) ○○ 다이브' },
      { key: 'platform', label: '예약 플랫폼', type: 'text', placeholder: '예) 마이리얼트립' },
      { key: 'startTime', label: '시작 시간', type: 'text', placeholder: '예) 08:00 호텔 픽업' },
      { key: 'duration', label: '총 소요 시간', type: 'text', placeholder: '예) 약 7시간 (픽업~복귀)' },
    ],
  },
  {
    title: '포함·불포함',
    note: '장비, 팁, 입장료, 식사, 사진 추가 구매가 별도일 수 있어요. 꼭 나눠서 적어요.',
    fields: [
      { key: 'included', label: '포함 사항', type: 'textarea', volatile: true, help: '한 줄에 하나씩', placeholder: '예)\n왕복 픽업\n스노클 장비\n점심 뷔페' },
      { key: 'excluded', label: '불포함 사항', type: 'textarea', required: true, volatile: true, help: '한 줄에 하나씩', placeholder: '예)\n해양공원 입장료 1인 300페소\n가이드팁\n수중 사진' },
      { key: 'extraPaid', label: '현장에서 따로 낸 것', type: 'checks', options: ['장비', '팁', '입장료', '식사', '사진·영상 구매', '픽업'] },
    ],
  },
  {
    title: '집결·픽업·준비',
    fields: [
      { key: 'meetingPoint', label: '집결 장소와 이동 난이도', type: 'textarea', placeholder: '예) 막탄 선착장. 택시 기사에게 이름만 말하면 됨' },
      { key: 'pickup', label: '픽업', type: 'select', placeholder: CHOOSE, options: ['무료 픽업', '유료 픽업', '픽업 없음'] },
      { key: 'pickupArea', label: '픽업 가능 지역·추가 비용', type: 'text', volatile: true, placeholder: '예) 막탄 지역 무료, 세부 시티 1인 500페소' },
      { key: 'preparation', label: '준비물·복장', type: 'textarea', placeholder: '예) 래시가드, 아쿠아슈즈, 선크림, 갈아입을 옷, 방수팩' },
      { key: 'lockers', label: '보관함·탈의실·샤워', type: 'text', placeholder: '예) 배 위에 화장실 1개, 탈의실·샤워 없음' },
    ],
  },
  {
    title: '취소·날씨',
    note: '날씨로 취소될 때 환불·일정 변경 기준은 결제 전 불안을 줄이는 핵심 정보예요.',
    fields: [
      { key: 'weather', label: '날씨 영향', type: 'textarea', placeholder: '예) 파도 높으면 당일 아침 취소 연락. 우리 때는 흐렸지만 진행' },
      { key: 'cancelPolicy', label: '취소 기준·환불 규정', type: 'textarea', required: true, volatile: true, placeholder: '예) 이용 2일 전까지 무료 취소, 기상 악화로 업체 취소 시 전액 환불' },
    ],
  },
  {
    title: '현장 경험',
    note: '사진이 예쁘다는 말보다 이동·대기·화장실·젖은 옷 처리 같은 현실 정보가 도움이 돼요.',
    fields: [
      { key: 'schedule', label: '실제 일정 흐름', type: 'textarea', help: '한 줄에 하나씩, 시간과 함께 적어요.', placeholder: '예)\n08:00 호텔 픽업\n09:00 출항 (대기 30분)\n10:00 첫 번째 포인트' },
      { key: 'waiting', label: '대기 시간', type: 'text', placeholder: '예) 선착장에서 30분, 포인트 이동 중 각 20분' },
      { key: 'guide', label: '가이드·안전 관리·언어', type: 'textarea', placeholder: '예) 한국어 가능한 가이드 1명, 구명조끼 필수 착용, 인원 체크 2번' },
      { key: 'photoGearMeal', label: '사진 촬영·장비 대여·식사', type: 'textarea', placeholder: '예) 수중 사진은 USB 1개 1,500페소. 점심은 배 위 뷔페' },
    ],
  },
  {
    title: '누가 할 수 있나요?',
    note: '“누구나 가능”은 위험한 표현이에요. 제한사항을 명확히 적어요.',
    fields: [
      { key: 'difficulty', label: '체력 난이도', type: 'select', placeholder: CHOOSE, options: ['쉬움', '보통', '힘듦'] },
      { key: 'restrictions', label: '제한사항', type: 'textarea', required: true, help: '수영 실력, 연령, 임산부, 멀미, 건강 상태 등', placeholder: '예)\n수영 못해도 구명조끼로 가능\n만 4세 이상\n임산부 참여 불가\n배 멀미 심하면 멀미약 필수' },
    ],
  },
  {
    title: '후기',
    fields: [
      { key: 'highlight', label: '직접 느낀 하이라이트', type: 'textarea', placeholder: '예) 거북이를 바로 옆에서 봄' },
      { key: 'downsides', label: '아쉬운 점', type: 'textarea', required: true, placeholder: '예) 포인트마다 배가 많아 사람 반, 물고기 반' },
    ],
  },
];
