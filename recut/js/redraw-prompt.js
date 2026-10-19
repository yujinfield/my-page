// 다시 그리기 프롬프트 조립 (순수 함수, DOM 없음)
// 어떤 컷 묶음 이미지든 쓸 수 있게 기본은 "원본 그림체 유지"이고,
// 꼼쥐 인스타툰일 때만 "꼼쥐툰 스타일"(지침 11번 문구 + 턴어라운드)을 고릅니다.

export const STYLES = [
  { value: 'original', label: '원본 그림체 그대로 (어떤 그림이든)' },
  { value: 'kkomjwi', label: '꼼쥐툰 스타일 (@꼼쥐 지침 + 턴어라운드)' },
];

const ORIGINAL_STYLE = `Keep the art style of the first reference image exactly: same drawing technique, line quality, color palette, character designs and text lettering style.`;

// 꼼쥐툰 스타일: ../instatoon/guidelines.md 11번 [공통] 문구를 그대로 옮김 (지침이 바뀌면 함께 고침)
const KKOMJWI_STYLE = `cute hand-drawn Korean instatoon style, round squirrel character with beige-peach fur,
three brown stripes on forehead, round ears, pink blush cheeks, curly tail,
thick black outline, simple dot eyes, cream background, pastel pink/yellow/green
highlights, handwritten Korean text, '@꼼쥐' watermark at top center, 4:5 ratio,
no brand logos

slightly wobbly hand-drawn pen lines with uneven line weight, colored pencil and
crayon texture, coloring slightly outside the lines, subtle paper grain,
imperfect handwritten lettering with natural tilt, not vector, not glossy,
not perfectly symmetric

The squirrel has NO mouth: keep the black dot eyes, pink blush cheeks, round ears, swirl tail and hand-drawn outline.`;

// 캐릭터 참고 이미지(올린 캐릭터 시트 또는 기본 꼼쥐 턴어라운드)를 보낼 때
const CHARACTER_RULE = `The second reference image is the official character sheet.
Keep every character that appears in it exactly like it (same face shape, ears, eyes, colors, body and tail proportions, outline style); change only the expression and pose.`;

// 공통 고정 조건 (한 장짜리 4:5)
function fixedRules(watermark) {
  const lines = [
    'One single panel only, 4:5 portrait. Do not combine multiple panels.',
    'Remove any cut number badge (like ① ② or 1 2 in a circle) from the original; do not draw any cut number.',
    'Do not put any real brand logo on props.',
  ];
  if (watermark.trim()) lines.push(`Small '${watermark.trim()}' watermark at the top center.`);
  return lines.join('\n');
}

// 템플릿별 배치·여백 (1080×1350 기준)
// @꼼쥐 레퍼런스 5장(1122×1402)에서 잉크(선·글자)가 닿는 범위를 재서 1080×1350으로 줄인 값입니다.
// 퍼센트는 그림 높이(세로)·폭(가로) 기준. 꼼쥐가 아닌 그림에도 같은 여백을 씁니다.
export const LAYOUTS = [
  { value: 'auto', label: '자동 (컷 내용의 "컷 유형:" 줄을 보고 고름)' },
  {
    value: 'cover',
    label: '표지형',
    prompt: `Cover page layout (spacing measured from our cover reference, 1080x1350):
- Watermark line at 7-10% height (about y 95-135px). Empty space below it until 20%.
- Big title block of 2-3 short lines from 20% to 55% height, centered, about 80% of the width (side margins about 90px). Highlight 1-2 key words with a pastel marker.
- Small gap 55-59%.
- Character (and one short speech line) from 59% to 94% height, centered.
- Keep at least 80px empty margin at left, right and bottom. Lots of calm empty space; nothing touches the edges.`,
  },
  {
    value: 'info',
    label: '정보형',
    prompt: `Information page layout (spacing measured from our info reference, 1080x1350):
- Watermark at 4-6.5% height (about y 55-90px).
- Small label chip (like "첫째,") and a big bold title from 8% to 22% height.
- 1-2 lines of explanation from 24% to 31% height, centered.
- Main illustration from 33% to 69% height.
- Bottom summary box from 72% to 95% height: rounded pale box, almost full width (side margins about 35px), containing a one-line summary and 2-3 small items.
- Text and drawings keep about 50px from the left and right edges, and at least 50px from the bottom edge.`,
  },
  {
    value: 'story',
    label: '스토리형',
    prompt: `Story page layout (spacing measured from our story references, 1080x1350):
- Watermark at 4-7% height (about y 57-93px).
- Large cloud-shaped narration bubble from 10% to 47% height, centered, about 75% of the width, with the situation text inside in 2-3 lines.
- Character(s) from 50% to 94% height on a soft ground shadow; short dialogue in a small speech bubble beside the character (about 60-75% height).
- Keep about 50px empty margin at left and right (up to 95px on the side without a bubble) and 40-70px at the bottom.`,
  },
  {
    value: 'compare',
    label: '비교형',
    prompt: `Comparison page layout (spacing measured from our comparison reference, 1080x1350):
- Watermark at 4-6.5% height (about y 53-90px).
- Question title from 10% to 17% height with a pastel underline, then a one-line subtitle at 20-23%.
- Two side-by-side rounded cards from 25% to 80% height, each about 46% of the width, about 20px gap between them, about 45px outer side margins. Each card: header chip, drawing, 3-4 short check items, character with a small thought bubble at the bottom.
- Conclusion band from 81% to 97% height, full width minus about 40px margins.
- Keep at least 30px empty margin at the bottom.`,
  },
  { value: 'none', label: '배치 지정 안 함' },
];

// "컷 유형: 표지형" 같은 줄에서 배치 고르기 (CTA형은 스토리형 배치)
const TYPE_WORDS = [
  { word: '표지', layout: 'cover' },
  { word: '정보', layout: 'info' },
  { word: '비교', layout: 'compare' },
  { word: '스토리', layout: 'story' },
  { word: 'CTA', layout: 'story' },
];

// 컷에 쓸 배치 값: 직접 고른 값, 자동이면 컷 내용의 "컷 유형:" 줄, 그것도 없으면 'none'
export function resolveLayout(layout, text) {
  if (layout && layout !== 'auto') return layout;
  const typeLine = text.split('\n').find((line) => line.trim().startsWith('컷 유형:'));
  if (!typeLine) return 'none';
  const found = TYPE_WORDS.find((item) => typeLine.includes(item.word));
  return found ? found.layout : 'none';
}

function layoutPart(layout) {
  const found = LAYOUTS.find((item) => item.value === layout);
  return found && found.prompt ? found.prompt : '';
}

function textPart(text) {
  const trimmed = text.trim();
  if (!trimmed) return 'Text: copy every word written in the original cut exactly as written. Do not add new text.';
  return `Cut content from the original (lines starting with "그림:" or "컷 유형:" describe the drawing; draw the words in every other line exactly as written, without the label before the colon, and do not add new text):\n${trimmed}`;
}

function memoPart(memo) {
  const trimmed = memo.trim();
  return trimmed ? `Changes requested by the author (apply only these):\n${trimmed}` : '';
}

// 원본 컷 → 4:5 한 장으로 다시 그리기
// 참고 이미지: ① 잘라 낸 원본 컷 ② (useCharacterImage면) 캐릭터 참고 이미지
export function buildRedrawPrompt({
  index, total, text = '', memo = '', layout = 'auto', style = 'original', watermark = '', useCharacterImage = false,
}) {
  const isKkomjwi = style === 'kkomjwi';
  const parts = [
    isKkomjwi ? KKOMJWI_STYLE : ORIGINAL_STYLE,
    `This is cut ${index + 1} of ${total} of one Instagram comic series.
The first reference image is the original cut, cropped from a multi-panel image (it may be small and not 4:5).
Redraw it as a clean, high-resolution single 4:5 portrait page.
Keep the same content, scene, props, characters, expressions and reading order. Rearrange the layout to fit the taller 4:5 frame with generous margins; make the title text large and readable.`,
    layoutPart(resolveLayout(layout, text)),
    textPart(text),
    memoPart(memo),
    useCharacterImage ? CHARACTER_RULE : '',
    fixedRules(isKkomjwi ? '@꼼쥐' : watermark),
  ];
  return parts.filter(Boolean).join('\n\n');
}

// 다시 그린 그림 고치기: 참고 이미지 ① 지금 보고 있는 다시 그린 그림
export function buildRevisePrompt({ index, total, memo = '' }) {
  const parts = [
    `Edit the first reference image (cut ${index + 1} of ${total} of an Instagram comic).
Keep everything the same except the changes below: same style, characters, text, layout and 4:5 size.`,
    memo.trim() ? `Changes:\n${memo.trim()}` : 'Changes: make it cleaner and more polished, nothing else.',
    'One single panel only. Do not draw any cut number. Do not put any real brand logo on props.',
  ];
  return parts.join('\n\n');
}
