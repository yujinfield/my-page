// 데이터 시트: 구글 시트를 읽어서 직원이 읽기 쉬운 글로 바꿉니다. (DOM 사용 안 함)
// 시트는 "링크가 있는 모든 사용자" 보기 권한이어야 합니다. 로그인 없이 CSV로 받습니다.
// settings.dataSheets: [{ id, name, url, tabs: ["상품 데이터", ...] }]

const MAX_CHARS = 12000; // GPT에 넘기는 시트 글자 수 상한 (너무 길면 뒤를 자름)
const MIN_FILLED = 3;    // 칸이 이만큼 이상 차 있어야 머리글·데이터 줄로 봄 (자동 계산 칸만 찬 빈 줄 거르기)

// 시트 주소에서 문서 id를 꺼냄
export function sheetIdOf(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function csvUrl(id, tab) {
  // headers=0: 머리글을 구글이 추측하지 않게 하고, 모든 줄을 그대로 받음
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(tab)}`;
}

// CSV 글자 → 줄 목록 (따옴표 안의 쉼표·줄바꿈 처리)
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function filledCount(row) {
  return row.filter(Boolean).length;
}

// 줄 목록 → { intro: 제목·설명, header: 칸 이름, records: ["칸: 값 / 칸: 값", ...] }
// 맨 위 제목·설명 줄은 건너뛰고, 처음으로 칸이 여러 개 찬 줄을 머리글로 봅니다.
export function tidyTable(rows) {
  const cleaned = rows.map((row) => row.map((cell) => cell.trim())).filter((row) => filledCount(row) > 0);
  const headerIndex = cleaned.findIndex((row) => filledCount(row) >= MIN_FILLED);
  if (headerIndex < 0) {
    return { intro: cleaned.map((row) => row.filter(Boolean).join(" ")).join(" "), header: [], records: [] };
  }
  const header = cleaned[headerIndex];
  const records = cleaned
    .slice(headerIndex + 1)
    .filter((row) => filledCount(row) >= MIN_FILLED)
    .map((row) => row
      .map((value, index) => (value && header[index] ? `${header[index]}: ${value}` : value))
      .filter(Boolean)
      .join(" / "));
  const intro = cleaned.slice(0, headerIndex).map((row) => row.filter(Boolean).join(" ")).join(" ");
  return { intro, header: header.filter(Boolean), records };
}

async function readTab(id, tab) {
  let response;
  try {
    response = await fetch(csvUrl(id, tab), { cache: "no-store" });
  } catch (error) {
    throw new Error(`"${tab}" 탭을 읽지 못했어요. 시트가 "링크가 있는 모든 사용자" 보기 권한인지 확인해 주세요.`);
  }
  if (!response.ok) throw new Error(`"${tab}" 탭을 읽지 못했어요 (${response.status}). 탭 이름과 공유 설정을 확인해 주세요.`);
  const text = await response.text();
  // 공유가 안 돼 있으면 CSV 대신 로그인 화면(HTML)이 옴
  if (text.trimStart().startsWith("<")) throw new Error(`"${tab}" 탭 대신 로그인 화면이 왔어요. 공유를 "링크가 있는 모든 사용자"로 바꿔 주세요.`);
  return tidyTable(parseCsv(text));
}

// 시트 하나의 모든 탭을 읽음 → [{ tab, table }]
export async function readSheet(sheet) {
  const id = sheetIdOf(sheet.url);
  if (!id) throw new Error("구글 시트 주소가 아니에요.");
  const results = [];
  for (const tab of sheet.tabs) {
    results.push({ tab, table: await readTab(id, tab) });
  }
  return results;
}

// 읽은 결과 → GPT에 넘길 글
function tabText(sheetName, { tab, table }) {
  const lines = [`[${sheetName} › ${tab}]`];
  if (table.intro) lines.push(`설명: ${table.intro}`);
  if (table.header.length) lines.push(`칸: ${table.header.join(", ")}`);
  if (table.records.length === 0) lines.push("(아직 데이터가 없습니다)");
  table.records.forEach((record) => lines.push(`- ${record}`));
  return lines.join("\n");
}

// 고른 시트들을 읽어서 하나의 글로 만듦. 고른 게 없으면 ""
export async function sheetsText(sheets, ids) {
  const chosen = sheets.filter((sheet) => ids.includes(sheet.id));
  const parts = [];
  for (const sheet of chosen) {
    const tabs = await readSheet(sheet);
    tabs.forEach((result) => parts.push(tabText(sheet.name, result)));
  }
  const text = parts.join("\n\n");
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n(시트가 길어서 여기까지만 넘겼어요)`;
}
