// claude.ai에서 받은 답을 붙여 넣으면 컷 목록으로 바꾸기, 컷 구성 분석
// DOM을 쓰지 않는 순수 함수만 둡니다.

import { TEMPLATES, MIN_CUTS, MAX_CUTS } from './guide.js';
import { readContiAnswer } from './ai-conti.js';

// 글 속에서 JSON 찾기: 마지막 ```json 코드블록 → 아무 ``` 코드블록 → 첫 { 부터 마지막 } 까지
export function extractJson(text) {
  const blocks = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)].map((match) => match[1].trim());
  const candidates = [...blocks.reverse()];

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(text.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === 'object') return value;
    } catch (error) {
      // 다음 후보로
    }
  }
  return null;
}

// 붙여 넣은 글 → { result } 또는 { error }
export function importContiText(text) {
  if (text.trim() === '') return { error: 'Claude의 답을 붙여 넣어 주세요.' };

  const data = extractJson(text);
  if (!data) {
    return { error: '답에서 컷 편집기용 JSON을 찾지 못했어요. 요청문을 새로 복사해 다시 물어보거나, 답의 맨 끝 ```json 부분까지 모두 붙여 넣어 주세요.' };
  }
  const result = readContiAnswer(data);
  if (!result) return { error: 'JSON은 찾았지만 컷("cuts")이 없어요. 답의 마지막 JSON 부분을 확인해 주세요.' };
  return { result };
}

// 컷 구성 분석: 총 컷 수, 템플릿별 개수, 권장 범위
export function analyzeCuts(cuts) {
  const counts = TEMPLATES.map((template) => ({
    label: template.label,
    count: cuts.filter((cut) => cut.template === template.value).length,
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
