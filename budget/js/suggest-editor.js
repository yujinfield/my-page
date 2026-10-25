// ⚙️ 설정 창의 "큰돈 추천 세부 항목": 분류마다 펼치는 목록, 한 줄씩 [이름] [✕] + "＋ 추가"
// ③ 큰돈 캘린더에서 분류를 고르면 이 목록에서 골라 세부 항목으로 넣습니다. (data.categoryDetails)

import { textInput, deleteButton } from './cells.js';
import { addHistory } from './history.js';

const box = document.getElementById('suggest-editor');
const openCategories = new Set(); // 펼친 분류 (다시 그려도 펼친 채로)

let state = null;
let save = null;

export function setupSuggestEditor(appState, onSave) {
  state = appState;
  save = onSave;
  box.addEventListener('change', handleChange);
  box.addEventListener('click', handleClick);
}

export function renderSuggestEditor() {
  box.replaceChildren(...state.data.eventCategories.map(categoryBlock));
}

function categoryBlock(category) {
  const names = state.data.categoryDetails[category] || [];
  const details = document.createElement('details');
  details.className = 'suggest-category';
  details.dataset.category = category;
  details.open = openCategories.has(category);
  details.addEventListener('toggle', () => {
    if (details.open) openCategories.add(category);
    else openCategories.delete(category);
  });
  const summary = document.createElement('summary');
  summary.textContent = `${category} · ${names.length}개`;

  const list = document.createElement('ul');
  list.className = 'suggest-rows';
  list.append(...names.map(suggestRow));

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button payment-add';
  add.dataset.action = 'add';
  add.textContent = '＋ 추가';
  details.append(summary, list, add);
  return details;
}

// name: 저장된 이름 (새로 추가한 줄은 빈 글, 이름을 적고 칸을 벗어나면 목록에 들어감)
function suggestRow(name) {
  const li = document.createElement('li');
  li.className = 'suggest-row';
  li.dataset.name = name;
  li.append(textInput('suggestName', name, '추천 세부 항목 이름', '예: 숙소'), deleteButton('추천 세부 항목 지우기'));
  return li;
}

function categoryOf(element) {
  return element.closest('[data-category]').dataset.category;
}

function listOf(category) {
  if (!state.data.categoryDetails[category]) state.data.categoryDetails[category] = [];
  return state.data.categoryDetails[category];
}

// 이름 고치기·새 줄에 이름 적기 (칸을 벗어날 때). 비우면 지움
function handleChange(event) {
  if (event.target.dataset.field !== 'suggestName') return;
  const category = categoryOf(event.target);
  const list = listOf(category);
  const oldName = event.target.closest('li').dataset.name;
  const newName = event.target.value.trim();
  if (newName === oldName) return;
  if (newName && list.includes(newName)) {
    window.alert(`"${newName}"은(는) 이미 있어요.`);
    event.target.value = oldName;
    return;
  }
  if (!newName) {
    if (oldName) list.splice(list.indexOf(oldName), 1);
  } else if (oldName) {
    list[list.indexOf(oldName)] = newName;
  } else {
    list.push(newName);
  }
  addHistory(state.data, `[설정] 큰돈 추천 세부 항목 (${category}): ${oldName || '(새 줄)'} → ${newName || '(지움)'}`);
  save();
  renderSuggestEditor();
}

function handleClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const category = categoryOf(button);

  if (button.dataset.action === 'add') {
    const row = suggestRow('');
    button.parentElement.querySelector('.suggest-rows').append(row);
    row.querySelector('input').focus();
    return;
  }
  if (button.dataset.action === 'delete') {
    const row = button.closest('li');
    const name = row.dataset.name;
    if (name) {
      const list = listOf(category);
      list.splice(list.indexOf(name), 1);
      addHistory(state.data, `[설정] 큰돈 추천 세부 항목 (${category}) 지움: ${name}`);
      save();
      renderSuggestEditor();
    } else {
      row.remove();
    }
  }
}
