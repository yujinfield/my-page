// 컷 그림 아래 "✏️ 수정 요청" 칸 (화면 조립만, 그리기는 image-panel.js가 함)

// 적다 만 수정 요청 (컷 카드가 다시 그려져도 남게)
const drafts = new Map(); // cut.id → 글

// label: 'CUT 01', onSubmit(request), onPrevious(), onNext(): image-panel.js에서 넘겨줌
export function renderRevisePart(cut, label, { onSubmit, onPrevious, onNext }) {
  const part = document.createElement('div');
  part.className = 'cut-revise';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'button button-small';
  toggle.textContent = '✏️ 수정 요청';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', `cut-revise-box-${cut.id}`);

  // ◀ 이전 그림 · 1 / 2 · 다음 그림 ▶ (보이기·끄기는 image-panel.js가 함)
  const versionRow = document.createElement('div');
  versionRow.id = `cut-version-row-${cut.id}`;
  versionRow.className = 'action-row cut-version-row';
  versionRow.hidden = true;
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.id = `cut-version-prev-${cut.id}`;
  previous.className = 'button button-small';
  previous.textContent = '◀ 이전 그림';
  previous.setAttribute('aria-label', `${label} 이전 그림 보기`);
  previous.addEventListener('click', onPrevious);
  const count = document.createElement('span');
  count.id = `cut-version-count-${cut.id}`;
  count.className = 'cut-version-count';
  count.setAttribute('aria-live', 'polite');
  const next = document.createElement('button');
  next.type = 'button';
  next.id = `cut-version-next-${cut.id}`;
  next.className = 'button button-small';
  next.textContent = '다음 그림 ▶';
  next.setAttribute('aria-label', `${label} 다음 그림 보기`);
  next.addEventListener('click', onNext);
  versionRow.append(previous, count, next);

  const box = document.createElement('div');
  box.id = `cut-revise-box-${cut.id}`;
  box.className = 'cut-revise-box';
  box.hidden = true;

  const textLabel = document.createElement('label');
  textLabel.className = 'field-label';
  textLabel.htmlFor = `cut-revise-text-${cut.id}`;
  textLabel.textContent = '위 그림에서 어떤 부분을 고칠까요?';
  const text = document.createElement('textarea');
  text.id = `cut-revise-text-${cut.id}`;
  text.className = 'field-input';
  text.rows = 3;
  text.placeholder = '예: 꼼쥐가 더 활짝 웃게, 말풍선 글씨를 더 크게, 배경의 달력은 빼 주세요';
  text.value = drafts.get(cut.id) || '';
  text.addEventListener('input', () => drafts.set(cut.id, text.value));

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'button button-primary button-small image-button';
  submit.textContent = '🎨 이렇게 다시 그리기';
  submit.setAttribute('aria-label', `${label} 수정 요청대로 다시 그리기`);
  submit.addEventListener('click', () => {
    if (text.value.trim() === '') {
      text.focus();
      return;
    }
    onSubmit(text.value);
  });

  const note = document.createElement('p');
  note.className = 'field-help';
  note.textContent = '지금 그림을 바탕으로 적은 부분만 고쳐요. 한 번 고칠 때마다 OpenAI 비용이 들어요.';

  const actions = document.createElement('div');
  actions.className = 'action-row';
  actions.append(submit);
  box.append(textLabel, text, note, actions);

  toggle.addEventListener('click', () => {
    box.hidden = !box.hidden;
    toggle.setAttribute('aria-expanded', String(!box.hidden));
    if (!box.hidden) text.focus();
  });

  const row = document.createElement('div');
  row.className = 'action-row';
  row.append(toggle);
  part.append(versionRow, row, box);
  return part;
}

// 다 고친 뒤: 적은 요청 지우기
export function clearReviseDraft(cutId) {
  drafts.delete(cutId);
  const text = document.getElementById(`cut-revise-text-${cutId}`);
  if (text) text.value = '';
}
