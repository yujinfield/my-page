// eSIM 상세 폼 질문
// 핵심 질문: 내 폰에서 잘 터지고, 진짜 데이터가 충분한가?

const CHOOSE = '선택해 주세요';

export const ESIM_GROUPS = [
  {
    title: '상품 정보',
    fields: [
      { key: 'country', label: '국가·도시', type: 'text', required: true, placeholder: '예) 일본 (오사카·교토)' },
      { key: 'period', label: '이용 기간', type: 'text', placeholder: '예) 5일 (9월 3일 ~ 9월 7일)' },
      { key: 'productName', label: '구매한 eSIM 상품명', type: 'text', required: true, placeholder: '예) ○○ 일본 eSIM 데일리 2GB' },
      { key: 'network', label: '통신망', type: 'text', help: '현지 어느 통신사 망을 쓰는지 적어요.', placeholder: '예) 소프트뱅크' },
      { key: 'dataAmount', label: '데이터 용량', type: 'text', required: true, placeholder: '예) 매일 2GB / 총 10GB' },
      { key: 'price', label: '가격', type: 'text', required: true, volatile: true, placeholder: '예) 정가 17,900원' },
      { key: 'benefit', label: '할인코드·제휴 혜택', type: 'text', volatile: true, placeholder: '예) 제휴 링크로 구매 시 10% 할인' },
    ],
  },
  {
    title: '데이터 조건',
    note: '‘무제한’이라도 하루 몇 GB 뒤 느려지는지 꼭 확인해요.',
    fields: [
      {
        key: 'dataType',
        label: '데이터 제공 방식',
        type: 'select',
        placeholder: CHOOSE,
        options: ['총량제 (다 쓰면 끝)', '일일 제공량 후 저속 무제한', '속도 제한 없는 무제한 (상품 상세에서 확인함)'],
      },
      {
        key: 'throttle',
        label: '일일 제공량 이후 속도',
        type: 'text',
        required: true,
        volatile: true,
        help: '상품 상세에 적힌 저속 속도를 그대로 적어요.',
        placeholder: '예) 하루 2GB 이후 384kbps',
      },
      { key: 'tethering', label: '테더링(핫스팟)', type: 'select', placeholder: CHOOSE, options: ['가능 (직접 써봄)', '가능 (상품 설명 기준)', '불가', '확인 못 함'] },
      { key: 'phoneSms', label: '전화번호·SMS', type: 'select', placeholder: CHOOSE, options: ['데이터 전용 (번호 없음)', 'SMS 수신만 가능', '현지 전화번호 제공', '확인 못 함'] },
    ],
  },
  {
    title: '설치·개통',
    note: '기종·통신사 잠금·듀얼심 설정에 따라 결과가 달라요. “모든 폰에서 된다”고 쓰지 않아요.',
    fields: [
      { key: 'device', label: '사용 기기', type: 'text', required: true, help: '모델명과 자급제/통신사 폰 여부까지 적어요.', placeholder: '예) 아이폰 15 (자급제, 듀얼심)' },
      { key: 'installTiming', label: '설치 시점', type: 'select', placeholder: CHOOSE, options: ['출국 전 한국에서 설치', '현지 도착 후 설치'] },
      { key: 'activation', label: '개통 방식', type: 'select', placeholder: CHOOSE, options: ['QR 코드 스캔', '전용 앱', '수동 입력 (SM-DP+ 주소·코드)'] },
      { key: 'installIssue', label: '설치·개통에서 막힌 부분', type: 'textarea', help: '없었다면 “없음”이라고 적어요.', placeholder: '예) 데이터 로밍을 켜야 잡힌다는 걸 몰라서 10분 헤맸어요.' },
      { key: 'qrTip', label: 'QR 재사용·보관 팁', type: 'textarea', help: '현지에서 QR을 다시 열어야 하는 상품인지, 미리 캡처·메일 보관했는지 적어요.', placeholder: '예) QR은 한 번만 스캔 가능. 메일과 캡처를 둘 다 저장해 둠.' },
    ],
  },
  {
    title: '실제 사용',
    note: '“빨랐어요”보다 무엇이 실제로 됐는지가 설득력 있어요.',
    fields: [
      { key: 'triedApps', label: '실제로 해 본 것', type: 'checks', options: ['유튜브', '지도·길찾기', '카카오톡', '영상통화', '테더링', '번역 앱'] },
      { key: 'speed', label: '실제 속도와 끊김', type: 'textarea', required: true, placeholder: '예) 시내에서 유튜브 1080p 끊김 없음. 지하철 이동 중 1~2번 잠깐 끊김.' },
      { key: 'signalByPlace', label: '장소별 체감 신호', type: 'textarea', help: '공항·호텔·관광지별로 적어요.', placeholder: '예)\n간사이공항: 도착 직후 바로 잡힘\n호텔 방 안: 조금 느림\n후시미이나리 정상: 신호 약함' },
      { key: 'whyNotRoaming', label: '기존 유심·로밍 대신 고른 이유', type: 'textarea', placeholder: '예) 로밍은 하루 11,000원, 유심은 한국 번호 문자를 못 받아서.' },
    ],
  },
];
