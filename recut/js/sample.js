// 예시 원본(samples/) 불러오기, cuts.md 대본 읽기

export const SAMPLES = [
  {
    id: 'wedding-nail',
    label: '웨딩 촬영 네일 (12컷)',
    grid: { rows: 3, cols: 4, margin: 0, gap: 6 },
  },
];

// cuts.md → [{ text, memo }, ...] (순수 함수)
// "## 01컷 | 스토리형" 제목마다 한 컷. "- " 줄은 문구로, "- 수정 메모:" 줄은 메모로 읽습니다.
export function parseCutsMarkdown(markdown) {
  const cuts = [];
  let current = null;
  markdown.split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (/^##\s*\d+\s*컷/.test(line)) {
      current = { text: '', memo: '' };
      const type = line.split('|')[1];
      if (type) current.text = `컷 유형: ${type.trim()}`;
      cuts.push(current);
      return;
    }
    if (!current || !line.startsWith('- ')) return;
    const body = line.slice(2);
    if (body.startsWith('수정 메모:')) {
      current.memo = body.slice('수정 메모:'.length).trim();
      return;
    }
    current.text += `${current.text ? '\n' : ''}${body.replace(/\*\*/g, '')}`;
  });
  return cuts;
}

// 예시 원본 주소와 대본 읽기
export async function fetchSampleCuts(sample) {
  const response = await fetch(`samples/${sample.id}/cuts.md`);
  if (!response.ok) throw new Error('예시 대본(cuts.md)을 열 수 없어요.');
  return parseCutsMarkdown(await response.text());
}

export function sampleImageUrl(sample) {
  return `samples/${sample.id}/original.jpg`;
}
