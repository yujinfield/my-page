// 입력값 → 블로그 글 (순수 함수, DOM을 쓰지 않습니다)
//
// 글은 먼저 "블록" 목록으로 만들고, 그다음 HTML 또는 텍스트로 바꿉니다.
// 블록 모양: { type: 'notice' | 'p' | 'h2' | 'list' | 'steps' | 'table' | 'cta' | 'tags', ... }

import { CATEGORIES } from './categories.js';

export const MISSING = '[입력 필요]';

const COUPANG_NOTICE = '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

// ---------- 작은 도우미 ----------

// 비어 있으면 [입력 필요]
function valueOf(values, key) {
  const text = (values[key] || '').trim();
  return text || MISSING;
}

// 한 줄에 하나씩 적은 값 → 배열
function linesOf(values, key) {
  const lines = (values[key] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return lines.length > 0 ? lines : [MISSING];
}

// 받침이 있으면 withFinal, 없으면 withoutFinal (예: 을/를)
// 한글로 끝나지 않으면 "을(를)"처럼 둘 다 붙입니다.
export function josa(word, withFinal, withoutFinal) {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  if (!isHangul) return `${word}${withFinal}(${withoutFinal})`;
  const hasFinal = (last - 0xac00) % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}

function stars(rating) {
  const count = Number(rating) || 0;
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

// http(s) 링크만 허용합니다. (javascript: 같은 위험한 링크 차단)
export function safeLink(link) {
  const text = (link || '').trim();
  return /^https?:\/\/\S+$/i.test(text) ? text : '';
}

export function getNotice(program) {
  if (program === '쿠팡 파트너스') return COUPANG_NOTICE;
  const name = program === '기타' ? '제휴' : program;
  return `이 포스팅은 ${name} 제휴 마케팅 활동의 일환으로, 링크를 통해 구매하시면 일정액의 수수료를 받을 수 있습니다. 구매하시는 분이 추가로 내는 비용은 없습니다.`;
}

// ---------- 제목 후보 ----------

export function buildTitles(categoryKey, values) {
  const category = CATEGORIES[categoryKey];
  const keyword = valueOf(values, 'keyword');
  const product = valueOf(values, 'productName');
  const destination = valueOf(values, 'destination');

  return [
    `${keyword} | ${product} 솔직 후기 (${category.titleSuffix})`,
    `${destination} ${category.label} 추천, ${product} 직접 써 본 장단점`,
    `${product} 후기 | 가격부터 ${category.titleSuffix}까지 총정리`,
  ];
}

// ---------- 해시태그 ----------

export function buildHashtags(categoryKey, values) {
  const category = CATEGORIES[categoryKey];
  const words = [];

  const keyword = (values.keyword || '').replace(/\s/g, '');
  if (keyword) words.push(keyword);

  const product = (values.productName || '').replace(/\s/g, '');
  if (product) words.push(product);

  (values.destination || '').split(/\s+/).forEach((place) => {
    if (place) {
      words.push(`${place}여행`);
      words.push(`${place}${category.word}`);
    }
  });

  words.push(...category.tags);

  // 중복 빼고 # 붙이기
  return [...new Set(words)].map((word) => `#${word}`);
}

// ---------- 본문 블록 ----------

export function buildBlocks(categoryKey, values) {
  const category = CATEGORIES[categoryKey];
  const product = valueOf(values, 'productName');
  const destination = valueOf(values, 'destination');
  const ctaText = (values.ctaText || '').trim() || '최저가 확인하기';
  const link = safeLink(values.partnerLink);
  const cta = { type: 'cta', text: `👉 ${product} ${ctaText}`, link };

  const blocks = [];

  // 1. 대가성 표시 (글 맨 위)
  blocks.push({ type: 'notice', text: getNotice(values.program) });

  // 2. 들어가는 말
  blocks.push({ type: 'p', text: `${valueOf(values, 'travelDate')}, ${values.companion} ${destination} 여행을 다녀왔어요.` });
  blocks.push({ type: 'p', text: category.hook });
  blocks.push({
    type: 'p',
    text: `오늘은 직접 이용해 본 ${product}의 가격, 장단점, 꿀팁까지 솔직하게 정리해 볼게요.`,
  });

  // 3. 한눈에 보기
  blocks.push({ type: 'h2', text: '한눈에 보기' });
  blocks.push({
    type: 'table',
    rows: category.summary.map(([label, key]) => [label, valueOf(values, key)]),
  });
  blocks.push(cta);

  // 4. 고른 이유
  blocks.push({ type: 'h2', text: `${josa(product, '을', '를')} 고른 이유` });
  blocks.push({ type: 'p', text: valueOf(values, 'reason') });

  // 5. 글 종류별 본문
  category.sections.forEach((section) => {
    blocks.push({ type: 'h2', text: section.title });
    if (section.kind === 'p') {
      blocks.push({ type: 'p', text: valueOf(values, section.key) });
    } else {
      blocks.push({ type: section.kind, items: linesOf(values, section.key) });
    }
  });

  // 6. 장단점, 추천, 꿀팁
  blocks.push({ type: 'h2', text: '좋았던 점' });
  blocks.push({ type: 'list', items: linesOf(values, 'pros') });
  blocks.push({ type: 'h2', text: '아쉬운 점' });
  blocks.push({ type: 'list', items: linesOf(values, 'cons') });
  blocks.push({ type: 'h2', text: '이런 분께 추천해요' });
  blocks.push({ type: 'list', items: linesOf(values, 'recommendFor') });
  blocks.push({ type: 'h2', text: '꿀팁' });
  blocks.push({ type: 'list', items: linesOf(values, 'tips') });

  // 7. 총평
  blocks.push({ type: 'h2', text: '총평' });
  blocks.push({ type: 'p', text: `별점 ${stars(values.rating)} (${values.rating}/5)` });
  blocks.push({ type: 'p', text: valueOf(values, 'verdict') });
  blocks.push({
    type: 'p',
    text: `${destination} 여행에서 ${category.label} 고민하시는 분들께 도움이 되었으면 좋겠어요. 궁금한 점은 댓글로 남겨 주세요!`,
  });
  blocks.push(cta);

  // 8. 해시태그
  blocks.push({ type: 'tags', items: buildHashtags(categoryKey, values) });

  return blocks;
}

// 비어 있는 칸 개수 ([입력 필요] 개수)
export function countMissing(blocks) {
  const text = JSON.stringify(blocks);
  return text.split(MISSING).length - 1;
}

// ---------- HTML로 바꾸기 ----------

// 사용자 글자를 HTML에 넣기 전에 특수문자를 바꿉니다. (XSS 방지)
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 블로그 편집기에 붙여 넣어도 모양이 남도록 스타일을 태그 안에 직접 적습니다.
const STYLE = {
  notice: 'padding:12px 16px;background:#f3f4f6;border-radius:8px;color:#555;font-size:14px;',
  table: 'width:100%;border-collapse:collapse;',
  th: 'padding:8px 12px;background:#eef6fb;border:1px solid #d9e2ea;text-align:left;width:30%;',
  td: 'padding:8px 12px;border:1px solid #d9e2ea;',
  cta: 'display:block;margin:24px 0;padding:14px 20px;background:#1f8bd6;color:#ffffff;text-align:center;font-weight:bold;border-radius:10px;text-decoration:none;',
  tags: 'color:#1f8bd6;',
};

function blockToHtml(block) {
  const items = (block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');

  switch (block.type) {
    case 'notice':
      return `<p style="${STYLE.notice}">${escapeHtml(block.text)}</p>`;
    case 'h2':
      return `<h2>${escapeHtml(block.text)}</h2>`;
    case 'p':
      return `<p>${escapeHtml(block.text).replace(/\n/g, '<br>')}</p>`;
    case 'list':
      return `<ul>${items}</ul>`;
    case 'steps':
      return `<ol>${items}</ol>`;
    case 'table': {
      const rows = block.rows
        .map(([label, value]) => `<tr><th style="${STYLE.th}">${escapeHtml(label)}</th><td style="${STYLE.td}">${escapeHtml(value)}</td></tr>`)
        .join('');
      return `<table style="${STYLE.table}"><tbody>${rows}</tbody></table>`;
    }
    case 'cta': {
      const href = block.link ? escapeHtml(block.link) : '#';
      return `<p><a href="${href}" target="_blank" rel="sponsored nofollow noopener" style="${STYLE.cta}">${escapeHtml(block.text)}</a></p>`;
    }
    case 'tags':
      return `<p style="${STYLE.tags}">${escapeHtml(block.items.join(' '))}</p>`;
    default:
      return '';
  }
}

export function renderHtml(blocks) {
  return blocks.map(blockToHtml).join('\n');
}

// ---------- 텍스트로 바꾸기 (네이버 블로그 등에 그대로 붙여 넣기용) ----------

function blockToText(block) {
  switch (block.type) {
    case 'notice':
      return `※ ${block.text}`;
    case 'h2':
      return `■ ${block.text}`;
    case 'p':
      return block.text;
    case 'list':
      return block.items.map((item) => `- ${item}`).join('\n');
    case 'steps':
      return block.items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    case 'table':
      return block.rows.map(([label, value]) => `· ${label}: ${value}`).join('\n');
    case 'cta':
      return `${block.text}\n${block.link || MISSING}`;
    case 'tags':
      return block.items.join(' ');
    default:
      return '';
  }
}

export function renderText(blocks) {
  return blocks.map(blockToText).join('\n\n');
}
