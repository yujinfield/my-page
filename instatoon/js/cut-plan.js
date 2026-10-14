// 컷 데이터 만들기와 기본 컷 구성
// DOM을 쓰지 않는 순수 함수만 둡니다.

import { TEMPLATES, CHARACTERS, EXPRESSIONS, BACKGROUNDS, findOption } from './guide.js';

const ORDER_LABELS = ['첫째,', '둘째,', '셋째,'];
const CIRCLES = ['①', '②', '③'];

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `c_${Date.now()}_${idCounter}`;
}

// 빈 컷 하나
export function createCut(template = 'story') {
  const templateInfo = findOption(TEMPLATES, template);
  const texts = {};
  templateInfo.texts.forEach((field) => { texts[field.key] = ''; });

  return {
    id: makeId(),
    template: templateInfo.value,
    message: '',          // 이 컷의 핵심 메시지 1개
    texts,                // 템플릿별 문구
    expression: 'basic',
    characters: ['kkomjwi'],
    scene: '',            // 그림 장면·소품·포즈
    background: 'white',
    direction: '',        // 카메라 거리, 말풍선 위치 등 연출 메모
  };
}

// 템플릿을 바꿀 때: 같은 이름의 문구 칸은 살리고 나머지는 새로 만듭니다.
export function changeTemplate(cut, template) {
  const fresh = createCut(template);
  Object.keys(fresh.texts).forEach((key) => {
    if (typeof cut.texts[key] === 'string') fresh.texts[key] = cut.texts[key];
  });
  return { ...cut, template: fresh.template, texts: fresh.texts };
}

// 저장된 컷에 빠진 값이 있으면 기본값으로 채웁니다.
export function normalizeCut(saved) {
  const cut = createCut(saved && saved.template);
  if (!saved) return cut;

  ['id', 'message', 'scene', 'direction'].forEach((key) => {
    if (typeof saved[key] === 'string') cut[key] = saved[key];
  });
  cut.expression = findOption(EXPRESSIONS, saved.expression).value;
  cut.background = findOption(BACKGROUNDS, saved.background).value;

  if (Array.isArray(saved.characters)) {
    const known = CHARACTERS.map((character) => character.value);
    cut.characters = saved.characters.filter((value) => known.includes(value));
  }
  if (saved.texts) {
    Object.keys(cut.texts).forEach((key) => {
      if (typeof saved.texts[key] === 'string') cut.texts[key] = saved.texts[key];
    });
  }
  return cut;
}

// 문구에 남편·친구가 나오면 등장 캐릭터에 넣어 줍니다.
function guessCharacters(text) {
  const characters = ['kkomjwi'];
  if (text.includes('남편')) characters.push('husband');
  if (text.includes('친구')) characters.push('friend');
  return characters;
}

function storyCut(message, situation, expression, background = 'simple') {
  const cut = createCut('story');
  cut.message = message;
  cut.texts.situation = situation.trim();
  cut.expression = expression;
  cut.background = background;
  cut.characters = guessCharacters(situation);
  return cut;
}

// 입력폼 → 기본 컷 구성
// 사용자가 입력한 문장만 옮겨 담고, 비어 있는 경험은 컷을 만들지 않습니다.
// type: 'story'(스토리형 V1) | 'info'(정보형 V2)
export function buildDefaultCuts(form, type) {
  const cuts = [];

  // 1컷: 표지형
  const cover = createCut('cover');
  cover.message = '궁금증을 유발하는 제목';
  cover.texts.title = form.title.trim();
  cover.texts.bubble = form.question.trim();
  cover.expression = 'surprised';
  cuts.push(cover);

  // 도입 스토리형: 실제 경험, 고민·주변 반응
  if (form.startStory.trim() !== '') {
    cuts.push(storyCut('이야기가 시작된 실제 경험', form.startStory, 'basic'));
  }
  if (form.feeling.trim() !== '') {
    cuts.push(storyCut('당시 감정·고민·주변 반응', form.feeling, 'thinking'));
  }

  // 핵심 ①②③: 실제 사례(스토리형) + 핵심 메시지(정보형)
  form.points.forEach((point, i) => {
    if (point.main.trim() === '' && point.case.trim() === '') return;

    const name = type === 'story' ? `이유 ${CIRCLES[i]}` : `정보 ${CIRCLES[i]}`;

    if (point.case.trim() !== '') {
      const expression = i % 2 === 0 ? 'surprised' : 'thinking';
      cuts.push(storyCut(`${name} 실제 사례`, point.case, expression));
    }

    const infoCut = createCut('info');
    infoCut.message = type === 'story' ? `${name} 핵심 메시지` : `${name} 해결책`;
    infoCut.texts.label = type === 'story' ? `이유 ${CIRCLES[i]}` : ORDER_LABELS[i];
    infoCut.texts.subtitle = point.main.trim();
    infoCut.texts.summary = point.oneLine.trim();
    cuts.push(infoCut);
  });

  // 결과·느낀 점
  if (form.result.trim() !== '') {
    cuts.push(storyCut(type === 'story' ? '최종 선택과 느낀 점' : '결과·느낀 점', form.result, 'proud'));
  }

  // CTA: 자연스러운 결론이 아니면 마지막 컷을 따로 둡니다.
  if (form.ctaType !== 'natural') {
    const cta = createCut('story');
    const goals = { comment: '댓글 키워드 유도', save: '저장 유도', share: '공유 유도' };
    cta.message = `CTA — ${goals[form.ctaType]}`;
    cta.texts.dialogue = form.commentLine.trim();
    // 댓글 키워드는 실제로 보낼 자료가 있을 때만 넣습니다 (지침 4번 CTA)
    if (form.ctaType === 'comment' && form.keyword.trim() !== '' && form.extraInfo.trim() !== '') {
      cta.texts.situation = `댓글에 '${form.keyword.trim()}' 남겨 주세요`;
    }
    cta.expression = 'heart';
    cta.background = 'white';
    cuts.push(cta);
  }

  return cuts;
}
