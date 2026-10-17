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
  {
    value: 'simple',
    label: '기본 배경 (꼼쥐 + 사물 1개)',
    prompt: 'plain cream background with no scenery. Draw ONLY the squirrel and exactly ONE everyday object '
      + '(such as a phone, laptop, notepad, cup or pencil). If the scene mentions several objects, draw only the single most important one. '
      + 'No other props, furniture, walls, windows, plants, decorations or extra characters',
  },
  { value: 'detailed', label: '상세 배경', prompt: 'detailed background scene of the place' },
];

// 기본 배경 규칙: 콘티를 쓰는 AI에게도 알려 줌 (editor-format.js)
export const SIMPLE_BACKGROUND_RULE = '배경 "simple"(기본 배경)은 꼼쥐 + 사물 1개(핸드폰·노트북·메모장·컵·연필 등)만 그린다. '
  + 'characters는 ["kkomjwi"]만, scene에는 꼼쥐의 포즈와 사물 1개만 적는다. 남편·친구나 장소가 꼭 필요하면 "white"나 "detailed"를 고른다.';

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

// 사이트에서 Claude에게 콘티를 맡길 때 함께 보내는 꼼쥐 핵심 규칙 (지침 1·3·4·6·7·9번 요약)
// claude.ai 프로젝트 밖에서 부르므로 지침을 직접 담아 보냅니다.
// 콘티 판매 원칙: 콘티를 쓰는 AI에게 항상 보냄 (ai-conti.js, prompt.js)
// 마스터 프롬프트와 부딪치면 이 원칙이 먼저예요. 단, 숫자·남편 이야기는 사용자 입력에 있는 것만 씁니다.
export const SALES_RULES = `[반드시 지킬 판매 원칙] (마스터 프롬프트와 겹치면 이 원칙을 우선한다)
1. 1컷(표지): 낯선 언어 조합이나 통념 깨기로 시작. 숫자 하나 포함
2. 2컷: 독자가 걱정하는 것('언폭')을 먼저 짚기
3. 중간: 꼼쥐와 남편의 대조로 정보 전달. 꼼쥐가 '기준'을 제시
4. 추상적 표현 금지. 숫자·구체 상황으로 (도보 4분, 1박 12만원 등)
5. 정보를 다 주지 말고 독자가 유추하게 하는 컷 1개 이상
6. 마지막 컷: 공백 남기기("그래서 결국…") → 캡션/댓글로 이어지게
- 숫자와 남편의 말·행동은 [사용자 입력]에 있는 것만 쓴다. 없으면 지어내지 말고 그 자리를 [입력 필요]로 두고 review에 "확인 필요"로 적는다.

[판매 화법 도구] (책 「잘 파는 사람은 이렇게 말합니다」 1부)
컷마다 어울리는 화법을 하나씩 골라 쓰고, 같은 화법을 연달아 쓰지 않는다.
- '언폭'(독자가 걱정하는 것)부터 해결한다
- 프레임을 바꿔 말한다 (같은 사실을 다른 관점으로)
- 독자의 입을 여는 질문을 던진다
- 제안의 순서를 정리한다 (순서만 바꿔도 더 매력적으로 보인다)
- 공백을 만들어 궁금하게 한다
- 낯선 언어를 붙여 주목을 끈다
- 은유·비유로 쉽게 그려지게 한다
- 독자를 특정한다 (예: "결혼 D-100 예비신부라면")
- 숫자를 넣는다
- 통념을 깬다
- 기준을 제시한다
- 상식을 짚어 준다
- 걱정을 짚고 해결책을 준다 (겁주기·과장 없이)
- 고개가 끄덕여지게 공감부터 한다
- 쉬운 말만 쓴다
- 독자가 유추하게 말한다
- 그림이 그려지게 구체적으로 말한다
- 약점을 먼저 내세운다 (솔직함으로 돋보이게)
- 라임(말맛)을 살린다`;

export const CONTI_RULES = `[꼼쥐 캐릭터]
- 꼼쥐: 주인공·화자인 다람쥐. 현실적이고 솔직함. 실수도 숨기지 않고 "저도 몰랐어요"라고 공유하는 타입.
- 남편: 갈색 곰. 느긋하고 순함. 꼼쥐가 정보를 챙기면 옆에서 따라가는 역할. 호칭은 항상 '남편'.
- 친구: 하얀 곰. 지인 역할로 실패담·질문 담당.

[말투]
- 해요체, 친구한테 말하듯 가볍게. 경험담은 1인칭("저는", "남편은").
- 컷당 대사는 2줄 이내, 한 줄 15자 내외.
- 겁주기·과장 대신 "저도 몰랐어요" 톤의 공감형.
- 숫자 후킹은 사용자가 제공한 실제 수치만 쓴다.

[스토리 흐름]
- HOOK(관심) → CONTEXT(공감) → VALUE(핵심 정보) → DECISION(판단) → CTA(행동).
- 한 컷에는 핵심 메시지 하나. 연속된 컷에서 같은 문장을 반복하지 않는다.
- 첫 컷에서 결론을 모두 공개하지 않는다.
- 연속된 스토리형 컷은 표정·카메라 거리·구도·말풍선 위치를 바꾼다. 모든 컷에 캐릭터를 크게 넣을 필요는 없다.
- CTA는 저장·공유·댓글 중 가장 적합한 하나. 댓글 키워드는 실제로 보낼 자료가 있을 때만.

[정보의 신뢰성]
- 사용자가 제공하지 않은 경험·대화·감정·가격·제품명은 지어내지 않는다. 빈칸이면 그 내용 없이 구성하거나 review에 "확인 필요"로 적는다.
- 가격·시기·혜택·운영시간처럼 바뀔 수 있는 정보는 review에 "검증 필요"로 적는다.
- 개인 경험·의견과 일반 정보를 구분한다. 특정 업체를 비방하지 않는다.
- 소품에 실제 브랜드 로고를 넣지 않는다.`;
