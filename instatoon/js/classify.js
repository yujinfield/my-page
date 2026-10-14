// 입력 내용을 보고 스토리형인지 정보형인지 판단합니다.
// DOM을 쓰지 않는 순수 함수만 둡니다.

// 스토리형(경험담)에서 자주 나오는 표현
const STORY_WORDS = ['이유', '다시', '결국', '후회', '처음', '그때', '느꼈', '남편', '친구', '왜'];

// 정보형(꿀팁)에서 자주 나오는 표현
const INFO_WORDS = ['팁', '방법', '체크', '준비물', '필수', '추천', '비교', '차이', '정리', '주의', '기준', '리스트', '가지', '하세요'];

// 어떤 단어들이 글에 들어 있는지 찾기
function findWords(text, words) {
  return words.filter((word) => text.includes(word));
}

function joinTexts(texts) {
  return texts.join(' ').trim();
}

// 판단 결과: { type: 'story' | 'info', storyScore, infoScore, reasons: [] }
export function classifyForm(form) {
  let storyScore = 0;
  let infoScore = 0;
  const reasons = [];

  // 1) 제목·주제·핵심 내용에 쓰인 표현
  //    (경험 칸에는 원래 "고민", "했는데" 같은 말이 많아서 여기서는 빼고 봅니다)
  const framingText = joinTexts([
    form.title,
    form.question,
    form.topic,
    form.result,
    ...form.points.map((point) => point.main),
    ...form.points.map((point) => point.oneLine),
  ]);

  const storyHits = findWords(framingText, STORY_WORDS);
  const infoHits = findWords(framingText, INFO_WORDS);
  storyScore += storyHits.length;
  infoScore += infoHits.length;
  if (storyHits.length > 0) {
    reasons.push(`경험담 표현이 보여요: ${storyHits.join(', ')}`);
  }
  if (infoHits.length > 0) {
    reasons.push(`정보·꿀팁 표현이 보여요: ${infoHits.join(', ')}`);
  }

  // 2) 경험 글과 정보 글의 분량 비교
  const experienceLength = joinTexts([
    form.startStory,
    form.feeling,
    ...form.points.map((point) => point.case),
  ]).length;
  const infoLength = joinTexts([
    ...form.points.map((point) => point.main),
    ...form.points.map((point) => point.oneLine),
    form.extraInfo,
  ]).length;

  if (experienceLength > 0 && experienceLength >= infoLength * 1.5) {
    storyScore += 2;
    reasons.push('실제 경험 이야기가 정보 설명보다 훨씬 길어요');
  } else if (infoLength > 0 && infoLength >= experienceLength * 1.5) {
    infoScore += 2;
    reasons.push('정보 설명이 실제 경험 이야기보다 훨씬 길어요');
  }

  // 3) 한 줄 핵심을 3개 모두 적었다면 정보 전달에 무게가 있어요
  const oneLineCount = form.points.filter((point) => point.oneLine.trim() !== '').length;
  if (oneLineCount === form.points.length) {
    infoScore += 1;
    reasons.push('독자에게 전할 한 줄 핵심이 모두 있어요');
  }

  // 4) 댓글로 보낼 자료가 있으면 정보형에 가까워요
  if (form.keyword.trim() !== '' && form.extraInfo.trim() !== '') {
    infoScore += 2;
    reasons.push('댓글 키워드와 보낼 자료가 있어요');
  }

  let type = 'info';
  if (storyScore > infoScore) {
    type = 'story';
  }

  if (storyScore === 0 && infoScore === 0) {
    reasons.push('판단할 내용이 거의 없어서 기본값(정보형)으로 골랐어요');
  } else if (storyScore === infoScore) {
    reasons.push('점수가 같아서 기본값(정보형)으로 골랐어요. 필요하면 직접 바꿔 주세요');
  }

  return { type, storyScore, infoScore, reasons };
}

// 콘티를 만들기 전에 알려 줄 주의사항
export function checkForm(form) {
  const warnings = [];

  if (form.title.trim() === '' && form.question.trim() === '') {
    warnings.push('제목과 독자 질문이 모두 비어 있어요. 표지 훅을 만들기 어려워요.');
  }

  const emptyCases = form.points.filter((point) => point.main.trim() !== '' && point.case.trim() === '').length;
  if (emptyCases > 0) {
    warnings.push(`실제 사례가 빈 핵심 정보가 ${emptyCases}개 있어요. 해당 컷은 "확인 필요"로 표시돼요.`);
  }

  if (form.ctaType === 'comment' && (form.keyword.trim() === '' || form.extraInfo.trim() === '')) {
    warnings.push('댓글 키워드 유도를 골랐지만 키워드나 보낼 자료가 비어 있어요. 보낼 자료가 없다면 다른 CTA를 골라 주세요.');
  }

  return warnings;
}
