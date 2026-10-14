// 꼼쥐 프로젝트 지침(guidelines.md)에서 옮겨 온 상수
// 지침 문구는 이 파일 한 곳에만 둡니다.

// 지침 11번 [공통] + 손그림 발전 규칙
export const BASE_STYLE = `cute hand-drawn Korean instatoon style, round squirrel character with beige-peach fur,
three brown stripes on forehead, round ears, pink blush cheeks, curly tail,
thick black outline, simple dot eyes, cream background, pastel pink/yellow/green
highlights, handwritten Korean text, '@꼼쥐' watermark at top center, 4:5 ratio,
no brand logos

slightly wobbly hand-drawn pen lines with uneven line weight, colored pencil and
crayon texture, coloring slightly outside the lines, subtle paper grain,
imperfect handwritten lettering with natural tilt, not vector, not glossy,
not perfectly symmetric`;

// 모든 컷에 붙는 고정 조건 (지침 1·2·6번, 마스터 프롬프트 금지 사항)
export const FIXED_RULES = `Keep the squirrel exactly like the official reference 꼼쥐_턴어라운드.png (same face shape, ears, eyes, blush, body and swirl tail proportions); change only the expression and pose.
One single panel only, 4:5 portrait, 1080x1350px. Do not combine multiple panels, do not add captions or tables under the image.
Do not put any real brand logo on props (e.g. no apple logo on laptops).`;

// 등장 캐릭터 (지침 1번)
export const CHARACTERS = [
  { value: 'kkomjwi', label: '꼼쥐', prompt: '' },
  {
    value: 'husband',
    label: '남편 (갈색 곰)',
    prompt: `with a big round brown bear husband character, small round ears,
light beige muzzle, much taller than the squirrel, same thick-outline style,
one eye squints smaller when smiling`,
  },
  {
    value: 'friend',
    label: '친구 (흰 곰)',
    prompt: 'with a small round white bear friend character, same thick-outline style',
  },
];

// 꼼쥐 표정 세트 (지침 1번)
export const EXPRESSIONS = [
  { value: 'basic', label: '기본', prompt: 'calm neutral expression' },
  { value: 'surprised', label: '깜짝(눈물)', prompt: 'surprised expression with big tears streaming down' },
  { value: 'thinking', label: '고민(손가락 턱)', prompt: 'worried thinking pose with one finger on the chin' },
  { value: 'proud', label: '뿌듯', prompt: 'proud happy expression with smiling eyes' },
  { value: 'heart', label: '하트', prompt: 'happy expression surrounded by small hearts' },
];

// 배경 (마스터 프롬프트: 화이트 / 간단한 배경 / 상세 배경)
export const BACKGROUNDS = [
  { value: 'white', label: '화이트', prompt: 'plain cream background' },
  { value: 'simple', label: '간단한 배경', prompt: 'simple background with only a few props' },
  { value: 'detailed', label: '상세 배경', prompt: 'detailed background scene of the place' },
];

// 대사 규칙 (지침 3번): 컷당 2줄 이내, 한 줄 15자 내외
export const MAX_DIALOGUE_LINES = 2;
export const MAX_LINE_LENGTH = 15;

// 템플릿 4종 (지침 6-1번)
// texts: 이 템플릿에서 입력받는 문구 칸
//   lines: 화면에 들어갈 최대 줄 수 / dialogue: 대사라서 한 줄 15자 규칙을 적용할지
export const TEMPLATES = [
  {
    value: 'cover',
    label: '표지형',
    reference: '표지형_레퍼런스.png',
    help: '1번 컷. 큰 제목 3줄 이내 + 핵심 키워드 형광펜 강조 + 하단 꼼쥐 + 독자 속마음 말풍선 1개',
    prompt: 'Cover panel: a big bold handwritten title (3 lines max) in the upper-middle, key words emphasized with pastel highlighter strokes, the squirrel at the bottom, one small speech bubble with the reader\'s inner thought.',
    texts: [
      { key: 'title', label: '큰 제목', lines: 3, placeholder: '예) 촬영 드레스 가봉\n모르고 가면 손해!\n3가지 꿀팁' },
      { key: 'highlight', label: '형광펜 강조 단어', lines: 1, placeholder: '예) 촬영, 손해' },
      { key: 'bubble', label: '독자 속마음 말풍선', lines: MAX_DIALOGUE_LINES, dialogue: true, placeholder: '예) 그냥 예쁜 거 고르면\n되는 거 아니었어?' },
    ],
  },
  {
    value: 'story',
    label: '스토리형',
    reference: '스토리형_레퍼런스.png',
    help: '경험·감정·대화 컷. 상단 큰 구름 말풍선(상황 설명) + 캐릭터 + 작은 말풍선(대사)',
    prompt: 'Story panel: a big cloud-shaped bubble at the top for the situation narration, the character(s) below, a smaller speech bubble for the dialogue placed along the character\'s gaze. Leave enough space so text and characters do not overlap.',
    texts: [
      { key: 'situation', label: '상황 설명 (구름 말풍선)', lines: 3, placeholder: '예) 웨딩 카페에서\n촬영 전 네일 필수라는 글을 봤어요' },
      { key: 'dialogue', label: '캐릭터 대사', lines: MAX_DIALOGUE_LINES, dialogue: true, placeholder: '예) 하루 촬영에\n10만원이라니..!' },
    ],
  },
  {
    value: 'info',
    label: '정보형',
    reference: '정보형_레퍼런스.png',
    help: '팁 1개당 1장. "첫째," 라벨 + 소제목 + 설명 2줄 + 설명 그림 + 하단 요약 박스(체크 아이콘)',
    prompt: 'Info panel: a small rounded label at the top left, a bold subtitle with a highlighter stroke, two short description lines, an explanatory illustration in the middle, a summary box with a check icon at the bottom. Readability first.',
    texts: [
      { key: 'label', label: '라벨', lines: 1, placeholder: '예) 첫째,' },
      { key: 'subtitle', label: '소제목', lines: 1, placeholder: '예) 드레스 미리 알아가기' },
      { key: 'description', label: '설명 (2줄)', lines: 2, placeholder: '예) 가봉 전에 드레스샵 후기부터 검색하고\n마음에 드는 드레스를 미리 저장해두세요!' },
      { key: 'summary', label: '하단 요약 박스', lines: 1, placeholder: '예) 취향별로 미리 찾아두면 가봉이 훨씬 수월해요!' },
    ],
  },
  {
    value: 'compare',
    label: '비교형',
    reference: '비교형_레퍼런스.png',
    help: 'A vs B 판단 컷. 상단 질문형 제목 + 좌우 2칸 카드(같은 개수의 체크 항목) + 칸마다 꼼쥐 속마음 + 하단 결론 띠',
    prompt: 'Comparison panel: a question-style title at the top, two side-by-side cards (A on the left in pastel pink, B on the right in pastel green) with the same number of check items, the squirrel\'s inner-thought bubble in each card, a conclusion strip at the bottom.',
    texts: [
      { key: 'question', label: '질문형 제목', lines: 1, placeholder: '예) A랑 B 중 뭐가 좋을까?' },
      { key: 'leftTitle', label: 'A 카드 제목', lines: 1, placeholder: '예) A. 풍성 드레스' },
      { key: 'leftItems', label: 'A 체크 항목 (한 줄에 하나)', lines: 4, placeholder: '예) 화려하고 사진이 예쁨\n체형 커버에 좋음' },
      { key: 'leftThought', label: 'A 꼼쥐 속마음', lines: MAX_DIALOGUE_LINES, dialogue: true, placeholder: '예) 움직이기 불편할까?' },
      { key: 'rightTitle', label: 'B 카드 제목', lines: 1, placeholder: '예) B. 슬림 드레스' },
      { key: 'rightItems', label: 'B 체크 항목 (한 줄에 하나)', lines: 4, placeholder: '예) 세련된 실루엣\n움직이기 편함' },
      { key: 'rightThought', label: 'B 꼼쥐 속마음', lines: MAX_DIALOGUE_LINES, dialogue: true, placeholder: '예) 부담스럽지 않을까?' },
      { key: 'conclusion', label: '하단 결론 띠', lines: 2, placeholder: '예) 촬영 컨셉과 취향에 맞춰\n최종 3~4벌을 셀렉했어요!' },
    ],
  },
];

// 컷 수 (지침 6번): 기본 8~12컷, 항목이 많으면 14컷 이상 허용
export const MIN_CUTS = 8;
export const MAX_CUTS = 14;

export function findOption(list, value) {
  return list.find((item) => item.value === value) || list[0];
}
