// 입력칸 그리기
// categories.js의 항목 목록을 보고 입력칸을 만듭니다.

// 항목 하나 = 제목 + 설명 + 입력칸
function createField(field, values, onChange) {
  const id = `field-${field.key}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'field';

  const label = document.createElement('label');
  label.className = 'field-label';
  label.htmlFor = id;
  label.textContent = field.label;
  wrapper.append(label);

  let input;
  if (field.type === 'select') {
    input = document.createElement('select');
    field.options.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = field.key === 'rating' ? `${option}점` : option;
      input.append(optionElement);
    });
  } else if (field.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = field.lines ? 4 : 3;
  } else {
    input = document.createElement('input');
    input.type = field.type === 'url' ? 'url' : 'text';
  }

  input.id = id;
  input.className = 'field-input';
  input.value = values[field.key];
  if (field.placeholder) input.placeholder = field.placeholder;

  if (field.help) {
    const help = document.createElement('p');
    help.className = 'field-help';
    help.id = `${id}-help`;
    help.textContent = field.help;
    input.setAttribute('aria-describedby', help.id);
    wrapper.append(help);
  }

  // select는 change, 나머지는 input 이벤트로 바로 반영
  const eventName = field.type === 'select' ? 'change' : 'input';
  input.addEventListener(eventName, () => {
    values[field.key] = input.value;
    onChange();
  });

  wrapper.append(input);
  return wrapper;
}

// fields 목록을 container 안에 그립니다.
// 입력하면 values[key]가 바뀌고 onChange()가 불립니다.
export function renderFields(container, fields, values, onChange) {
  container.replaceChildren();
  fields.forEach((field) => {
    container.append(createField(field, values, onChange));
  });
}
