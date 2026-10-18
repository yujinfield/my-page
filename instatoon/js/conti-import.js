// claude.ai에서 받은 답을 붙여 넣으면 컷 목록으로 바꾸기, 컷 구성 분석
// DOM을 쓰지 않는 순수 함수만 둡니다.
//
// 읽는 순서
//  1) 답 속 JSON (코드블록 → 본문 속 { … }) — 줄바꿈·끝 쉼표 같은 흔한 실수는 고쳐서 읽고,
//     답이 길어 중간에 잘렸으면 끝까지 온 컷만이라도 살립니다.
//  2) JSON이 없으면 콘티 글("CUT 01 | 표지형", "핵심 메시지:", "이미지에 들어갈 문구:" …)을 직접 읽습니다.

import { TEMPLATES, MIN_CUTS, MAX_CUTS, templateFamily } from './guide.js';
import { readContiAnswer } from './ai-conti.js';
import { normalizeCut } from './cut-plan.js';

const MAX_CUTS_READ = 20;

// ---------- JSON 읽기 ----------

// 문자열 안의 진짜 줄바꿈을 \n 으로 (Claude가 JSON 문자열 안에서 줄을 바꿔 쓰는 경우)
function escapeNewlinesInStrings(text) {
  let result = '';
  let inString = false;
  let escaped = false;
  for (const char of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      else if (char === '\n') { result += '\\n'; continue; }
      else if (char === '\r') continue;
    } else if (char === '"') {
      inString = true;
    }
    result += char;
  }
  return result;
}

// 그대로 → 줄바꿈 고쳐서 → 끝 쉼표까지 지워서, 차례로 시도
function parseLoose(text) {
  const attempts = [
    text,
    escapeNewlinesInStrings(text),
    escapeNewlinesInStrings(text).replace(/,\s*([}\]])/g, '$1'),
  ];
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (error) {
      // 다음 방법으로
    }
  }
  return null;
}

// start 위치의 { 와 짝이 맞는 } 까지 (문자열 안의 괄호는 무시). 끝까지 안 닫히면 -1
function findClosingBrace(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// 글 속에서 "cuts"가 들어 있는 JSON 객체 찾기
function findJsonObject(text) {
  const candidates = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)]
    .map((match) => match[1].trim())
    .reverse();

  // 코드블록 표시(```)가 복사하다 빠진 경우: "cuts"를 품은 가장 바깥 { … }
  for (let i = text.indexOf('{'); i !== -1; i = text.indexOf('{', i + 1)) {
    const end = findClosingBrace(text, i);
    if (end === -1) continue;
    const candidate = text.slice(i, end + 1);
    if (candidate.includes('"cuts"')) {
      candidates.push(candidate);
      i = end;
    }
  }

  for (const candidate of candidates) {
    const value = parseLoose(candidate);
    if (value && typeof value === 'object' && Array.isArray(value.cuts)) return value;
  }
  return null;
}

// 답이 길어서 JSON이 중간에 끊긴 경우: "cuts": [ 뒤에서 끝까지 온 컷만 꺼냄
function salvageCuts(text) {
  const key = text.lastIndexOf('"cuts"');
  if (key === -1) return [];
  const listStart = text.indexOf('[', key);
  if (listStart === -1) return [];

  const cuts = [];
  let i = text.indexOf('{', listStart);
  while (i !== -1 && cuts.length < MAX_CUTS_READ) {
    const end = findClosingBrace(text, i);
    if (end === -1) break; // 여기서부터 잘림
    const cut = parseLoose(text.slice(i, end + 1));
    if (cut && typeof cut === 'object') cuts.push(cut);
    i = text.indexOf('{', end + 1);
  }
  return cuts;
}

// 예전 이름 그대로 남겨 둠 (다른 곳에서 씀)
export function extractJson(text) {
  return findJsonObject(text);
}

// ---------- 콘티 글 읽기 (JSON이 없을 때) ----------

const TEMPLATE_NAMES = { 표지형: 'cover', 스토리형: 'story', 정보형: 'info', 비교형: 'compare', CTA형: 'cta' };
const TEMPLATE_PATTERN = /표지형|스토리형|정보형|비교형|CTA형/;
// "CUT 01 | 표지형", "### CUT 1 — 스토리형", "**컷 3 (정보형)**", "4컷: 비교형"
const HEADER_PATTERNS = [
  /^(?:#{1,6}\s*)?[*_\s]*(?:CUT|컷)\s*0*(\d{1,2})(?!\d)/i,
  /^(?:#{1,6}\s*)?[*_\s]*0*(\d{1,2})\s*컷(?![가-힣])/,
];
const LABEL_LINE = /^([^:：]{1,30})[:：]\s*(.*)$/;

function cleanLine(line) {
  return line
    .replace(/^\s*(?:[-*•·]|\d{1,2}[.)])\s+/, '') // 글머리표·번호
    .replace(/\*\*|__|`/g, '')
    .trim();
}

function stripQuotes(text) {
  return text.replace(/^["“'‘「『]+|["”'’」』]+$/g, '').trim();
}

// 항목 이름 → 칸
function fieldFor(label) {
  if (/프롬프트|이미지 생성/.test(label)) return 'prompt';
  if (/핵심/.test(label)) return 'message';
  if (/대사|말풍선 내용/.test(label)) return 'dialogue';
  if (/문구|제목|부제/.test(label)) return 'text';
  if (/장면|소품/.test(label)) return 'scene';
  if (/배경/.test(label)) return 'background';
  if (/캐릭터|표정|포즈/.test(label)) return 'character';
  if (/배치|강조|연결|연출|구도|레이아웃|여백/.test(label)) return 'direction';
  if (/템플릿|유형/.test(label)) return 'template';
  return null;
}

function headerNumber(line) {
  const cleaned = line.replace(/\*\*|__/g, '').trim();
  if (cleaned.startsWith('|')) return null; // 표의 한 줄은 컷 머리말이 아님
  for (const pattern of HEADER_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

// 글을 컷 덩어리로 나눔: [{ number, header, lines }]
function splitByCut(text) {
  const blocks = [];
  let current = null;
  text.split('\n').forEach((line) => {
    const number = headerNumber(line);
    if (number !== null && number >= 1 && number <= 30) {
      current = { number, header: line, lines: [] };
      blocks.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  });
  return blocks;
}

// 컷 덩어리 → 항목별 글
function readFields(block) {
  const fields = {};
  let currentField = null;
  block.lines.forEach((raw) => {
    const line = cleanLine(raw);
    if (line === '' || /^STEP\s*\d/i.test(line) || /^#{1,6}\s/.test(raw.trim())) {
      if (/^STEP\s*\d/i.test(line) || /^#{1,6}\s/.test(raw.trim())) currentField = null;
      return;
    }
    const match = line.match(LABEL_LINE);
    const field = match ? fieldFor(match[1]) : null;
    if (match && field) {
      currentField = field;
      // 연출 항목은 "구도: 클로즈업"처럼 이름을 붙여 남겨요.
      const raw = stripQuotes(match[2]);
      const value = field === 'direction' && raw ? `${match[1].trim()}: ${raw}` : raw;
      if (value) fields[field] = fields[field] ? `${fields[field]}\n${value}` : value;
      return;
    }
    if (currentField && currentField !== 'prompt') {
      const value = stripQuotes(line);
      fields[currentField] = fields[currentField] ? `${fields[currentField]}\n${value}` : value;
    }
  });
  return fields;
}

function guessExpression(text) {
  if (/눈물|깜짝|놀라|당황/.test(text)) return 'surprised';
  if (/고민|턱|갸웃|생각/.test(text)) return 'thinking';
  if (/하트|설레|행복|사랑/.test(text)) return 'heart';
  if (/뿌듯|자신|웃|미소|만족/.test(text)) return 'proud';
  return 'basic';
}

function guessBackground(text) {
  if (/상세/.test(text)) return 'detailed';
  if (/간단/.test(text)) return 'simple';
  return 'white';
}

function guessCharacters(text) {
  if (/캐릭터\s*없|없음|0명/.test(text)) return [];
  const characters = ['kkomjwi'];
  if (text.includes('남편')) characters.push('husband');
  if (text.includes('친구')) characters.push('friend');
  return characters;
}

function splitLines(text) {
  return (text || '').split('\n').map((line) => line.trim()).filter((line) => line !== '');
}

// 항목별 글 → 컷 데이터
function cutFromFields(block, fields) {
  const templateName = (block.header.match(TEMPLATE_PATTERN) || (fields.template || '').match(TEMPLATE_PATTERN) || [])[0];
  const template = TEMPLATE_NAMES[templateName] || 'story';
  const textLines = splitLines(fields.text);
  const dialogue = (fields.dialogue || '').trim();
  const texts = {};
  const notes = [];

  if (template === 'cover') {
    texts.title = textLines.slice(0, 3).join('\n');
    texts.bubble = dialogue;
  } else if (template === 'story' || template === 'cta') {
    texts.situation = textLines.join('\n');
    texts.dialogue = dialogue;
  } else if (template === 'info') {
    let lines = textLines;
    if (lines.length > 1 && lines[0].length <= 10 && /^(첫|둘|셋|넷|다섯)째|^(이유|정보|팁|TIP)/i.test(lines[0])) {
      texts.label = lines[0];
      lines = lines.slice(1);
    }
    texts.subtitle = lines[0] || '';
    texts.description = lines.slice(1).join('\n');
    if (dialogue) notes.push(`대사: ${dialogue}`);
  } else {
    texts.question = textLines[0] || '';
    texts.conclusion = textLines.slice(1).join('\n');
    if (dialogue) notes.push(`대사: ${dialogue}`);
  }

  if (fields.character) notes.push(`캐릭터: ${fields.character}`);
  if (fields.direction) notes.push(fields.direction);

  return normalizeCut({
    template,
    message: fields.message || '',
    texts,
    expression: guessExpression(fields.character || ''),
    characters: guessCharacters(fields.character || ''),
    scene: fields.scene || '',
    background: guessBackground(fields.background || ''),
    direction: notes.join('\n'),
  });
}

// 콘티 글 → 컷 목록 (같은 번호가 여러 번 나오면 내용이 가장 많은 것)
export function readContiText(text) {
  const best = new Map();
  splitByCut(text).forEach((block) => {
    const fields = readFields(block);
    const score = ['message', 'text', 'dialogue', 'scene', 'character', 'background', 'direction']
      .filter((key) => fields[key]).length;
    if (score === 0) return;
    const previous = best.get(block.number);
    if (!previous || score > previous.score) best.set(block.number, { score, block, fields });
  });

  return [...best.keys()]
    .sort((a, b) => a - b)
    .slice(0, MAX_CUTS_READ)
    .map((number) => {
      const { block, fields } = best.get(number);
      return cutFromFields(block, fields);
    });
}

// ---------- 붙여 넣은 글 → 결과 ----------

// 사이트가 만든 "요청문"을 그대로 붙여 넣은 경우
function looksLikeRequest(text) {
  return text.includes('[컷 편집기용 데이터]') || text.includes('[먼저 읽어 줘 — 꼼쥐툰 메이커 사용 중]')
    || (text.includes('[컷 편집기 값]') && text.includes('템플릿 값 하나'));
}

// 붙여 넣은 글 → { result, source, notice } 또는 { error }
export function importContiText(text) {
  if (text.trim() === '') return { error: 'Claude의 답을 붙여 넣어 주세요.' };

  const data = findJsonObject(text);
  const fromJson = data ? readContiAnswer(data) : null;
  if (fromJson) return { result: fromJson, source: 'json' };

  if (looksLikeRequest(text)) {
    return { error: '이건 Claude에게 보낼 "요청문"이에요. claude.ai 꼼쥐 프로젝트에 이 요청문을 보내고, Claude가 쓴 "답"을 받아서 붙여 넣어 주세요.' };
  }

  const salvaged = salvageCuts(text);
  if (salvaged.length > 0) {
    const result = readContiAnswer({ cuts: salvaged });
    if (result) {
      return {
        result,
        source: 'partial',
        notice: `답이 길어서 JSON이 중간에 끊겼어요. 끝까지 온 ${result.cuts.length}컷만 넣었어요. 나머지는 Claude에게 "JSON만 다시 보내 줘"라고 해 주세요.`,
      };
    }
  }

  const textCuts = readContiText(text);
  if (textCuts.length > 0) {
    return {
      result: { cuts: textCuts, caption: '', review: '' },
      source: 'text',
      notice: `JSON이 없어서 콘티 글에서 ${textCuts.length}컷을 읽었어요. 문구가 알맞은 칸에 들어갔는지 한 번 확인해 주세요.`,
    };
  }

  return { error: '답에서 컷을 찾지 못했어요. 아래 "JSON만 다시 요청하는 문구 복사"를 눌러 Claude에게 보내고, 받은 답을 다시 붙여 넣어 주세요.' };
}

// Claude에게 JSON만 다시 받는 짧은 요청
export function buildJsonOnlyRequest(editorValuesText, shape) {
  return `방금 쓴 꼼쥐 콘티를 아래 형식의 JSON으로만 다시 보내 줘. 설명 없이 \`\`\`json 코드블록 하나만. 이미지 생성 프롬프트는 빼 줘.

${editorValuesText}

${shape}`;
}

// ---------- 컷 구성 분석 ----------

// 총 컷 수, 템플릿별 개수, 권장 범위
export function analyzeCuts(cuts) {
  // 구도 템플릿은 기본 템플릿(표지형·스토리형·정보형·비교형)에 합쳐서 셉니다.
  const counts = TEMPLATES.filter((template) => template.family === template.value).map((template) => ({
    label: template.label,
    count: cuts.filter((cut) => templateFamily(cut.template) === template.value).length,
  }));

  let advice = '알맞은 분량이에요';
  if (cuts.length < MIN_CUTS) advice = `${MIN_CUTS}컷보다 적어요`;
  else if (cuts.length > MAX_CUTS) advice = `${MAX_CUTS}컷보다 많아요`;
  else if (cuts.length > 12) advice = '항목이 많은 콘텐츠면 괜찮아요';

  return { total: cuts.length, counts, advice };
}

// 화면 한 줄용: "10컷 (권장 8~12, 알맞은 분량이에요) · 표지형 1 · 스토리형 5 · …"
export function describeAnalysis(cuts) {
  const { total, counts, advice } = analyzeCuts(cuts);
  const parts = counts.filter((item) => item.count > 0).map((item) => `${item.label} ${item.count}`);
  return `${total}컷 (권장 ${MIN_CUTS}~12, ${advice})${parts.length ? ` · ${parts.join(' · ')}` : ''}`;
}
