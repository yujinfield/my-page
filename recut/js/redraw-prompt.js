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

const TURNAROUND_RULE = `The second reference image is the official character sheet (꼼쥐_턴어라운드.png).
Keep the squirrel exactly like it (same face shape, ears, eyes, blush, body and swirl tail proportions); change only the expression and pose.`;

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
// 참고 이미지: ① 잘라 낸 원본 컷 ② (꼼쥐툰 스타일 + useTurnaround면) 꼼쥐 턴어라운드
export function buildRedrawPrompt({
  index, total, text = '', memo = '', style = 'original', watermark = '', useTurnaround = false,
}) {
  const isKkomjwi = style === 'kkomjwi';
  const parts = [
    isKkomjwi ? KKOMJWI_STYLE : ORIGINAL_STYLE,
    `This is cut ${index + 1} of ${total} of one Instagram comic series.
The first reference image is the original cut, cropped from a multi-panel image (it may be small and not 4:5).
Redraw it as a clean, high-resolution single 4:5 portrait page.
Keep the same content, scene, props, characters, expressions and reading order. Rearrange the layout to fit the taller 4:5 frame with generous margins; make the title text large and readable.`,
    textPart(text),
    memoPart(memo),
    isKkomjwi && useTurnaround ? TURNAROUND_RULE : '',
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
