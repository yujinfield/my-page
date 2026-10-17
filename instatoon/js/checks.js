// 컷 최종 검토 규칙 (지침 3·4·6·9번)
// DOM을 쓰지 않는 순수 함수만 둡니다.
// 결과: [{ cutIndex: 숫자 또는 null(전체), message: '...' }]

import {
  TEMPLATES, MAX_LINE_LENGTH, MIN_CUTS, MAX_CUTS, findOption,
} from './guide.js';

// 가격·시기처럼 바뀔 수 있는 정보 (지침 9번)
const CHANGING_INFO_WORDS = ['가격', '할인', '혜택', '운영시간', '영업시간', '성수기', '비수기', '예약'];

// 소품에 넣으면 안 되는 브랜드 로고 (지침 2번)
const LOGO_WORDS = ['로고', '사과', '애플', '아이폰', '맥북', '갤럭시', '스타벅스', 'apple', 'logo'];

function splitLines(text) {
  return text.split('\n').map((line) => line.trim()).filter((line) => line !== '');
}

// 컷에 들어간 모든 문구
function allTexts(cut) {
  return Object.values(cut.texts).join('\n');
}

// 입력폼 전체 글 (실제 수치 확인용)
function formText(form) {
  const texts = [
    form.title, form.question, form.topic, form.startStory, form.feeling, form.result,
    form.extraInfo, form.keyword, form.commentLine,
  ];
  form.points.forEach((point) => texts.push(point.main, point.case, point.oneLine));
  return texts.join('\n');
}

function checkTextLength(cut, index, warnings) {
  const template = findOption(TEMPLATES, cut.template);

  template.texts.forEach((field) => {
    const lines = splitLines(cut.texts[field.key] || '');

    if (lines.length > field.lines) {
      warnings.push({ cutIndex: index, message: `${field.label}: ${field.lines}줄 이내로 줄여 주세요 (지금 ${lines.length}줄).` });
    }

    // 대사 칸은 줄 수(lines)가 이미 MAX_DIALOGUE_LINES라서 글자 수만 따로 봅니다.
    if (field.dialogue) {
      lines.forEach((line) => {
        if (line.length > MAX_LINE_LENGTH) {
          warnings.push({ cutIndex: index, message: `${field.label}: "${line}" 한 줄이 ${line.length}자예요. ${MAX_LINE_LENGTH}자 내외로 줄바꿈해 주세요.` });
        }
      });
    }
  });

  if (cut.template === 'compare') {
    const left = splitLines(cut.texts.leftItems || '').length;
    const right = splitLines(cut.texts.rightItems || '').length;
    if (left !== right) {
      warnings.push({ cutIndex: index, message: `비교형은 좌우 체크 항목 수를 같게 맞춰요 (A ${left}개, B ${right}개).` });
    }
  }
}

function checkFacts(cut, index, sourceText, warnings) {
  const text = allTexts(cut);

  // 입력폼에 없는 숫자 (지침 3번: 숫자 후킹은 실제 수치만)
  const numbers = text.match(/\d+(?:[.,]\d+)?/g) || [];
  const unknown = numbers.filter((number) => !sourceText.includes(number));
  if (unknown.length > 0) {
    warnings.push({ cutIndex: index, message: `입력폼에 없는 숫자가 있어요: ${[...new Set(unknown)].join(', ')}. 실제 수치인지 확인해 주세요.` });
  }

  const changing = CHANGING_INFO_WORDS.filter((word) => text.includes(word));
  if (changing.length > 0) {
    warnings.push({ cutIndex: index, message: `바뀔 수 있는 정보(${changing.join(', ')})예요. 콘티에 "검증 필요"로 표시해 주세요.` });
  }

  const visual = `${cut.scene}\n${cut.direction}`.toLowerCase();
  const logos = LOGO_WORDS.filter((word) => visual.includes(word));
  if (logos.length > 0) {
    warnings.push({ cutIndex: index, message: `장면에 브랜드가 보일 수 있어요(${logos.join(', ')}). 로고 없는 소품으로 바꿔 주세요.` });
  }
}

export function checkCuts(cuts, form) {
  const warnings = [];
  const sourceText = formText(form);

  if (cuts.length === 0) return warnings;

  if (cuts.length < MIN_CUTS || cuts.length > MAX_CUTS) {
    warnings.push({ cutIndex: null, message: `지금 ${cuts.length}컷이에요. 보통 ${MIN_CUTS}~12컷, 항목이 많으면 ${MAX_CUTS}컷까지 써요.` });
  }
  if (cuts[0].template !== 'cover') {
    warnings.push({ cutIndex: 0, message: '1번 컷은 표지형으로 시작해요.' });
  }

  cuts.forEach((cut, index) => {
    if (cut.message.trim() === '') {
      warnings.push({ cutIndex: index, message: '핵심 메시지가 비어 있어요. 한 컷에 하나만 적어 주세요.' });
    }
    if (allTexts(cut).trim() === '') {
      warnings.push({ cutIndex: index, message: '화면에 들어갈 문구가 비어 있어요.' });
    }

    checkTextLength(cut, index, warnings);
    checkFacts(cut, index, sourceText, warnings);

    // 기본 배경은 꼼쥐 + 사물 1개만
    if (cut.background === 'simple' && (cut.characters.length !== 1 || cut.characters[0] !== 'kkomjwi')) {
      warnings.push({ cutIndex: index, message: '기본 배경은 꼼쥐 + 사물 1개만 그려요. 다른 캐릭터가 나오면 배경을 화이트나 상세 배경으로 바꿔 주세요.' });
    }

    if (index === 0) return;
    const previous = cuts[index - 1];

    // 연속된 컷에서 같은 문장 반복 (지침 6번)
    const previousLines = splitLines(allTexts(previous));
    const repeated = splitLines(allTexts(cut)).filter((line) => previousLines.includes(line));
    if (repeated.length > 0) {
      warnings.push({ cutIndex: index, message: `바로 앞 컷과 같은 문장이 있어요: "${repeated[0]}"` });
    }

    // 연속된 스토리형은 표정·배경을 다양하게 (지침 7번)
    if (cut.template === 'story' && previous.template === 'story' &&
        cut.expression === previous.expression && cut.background === previous.background) {
      warnings.push({ cutIndex: index, message: '바로 앞 스토리형 컷과 표정·배경이 같아요. 표정, 카메라 거리, 말풍선 위치를 바꿔 주세요.' });
    }
  });

  return warnings;
}
