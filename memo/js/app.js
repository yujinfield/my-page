/* ============================================================
   MEMO 앱 — 외부 라이브러리 없이 순수 JS로 구현
   ============================================================ */

// ===== 스토리지 =====
const STORAGE_KEY = 'bear-notes';

let notes = [];

/** localStorage에서 메모 불러오기 */
function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    notes = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(notes)) notes = [];
  } catch (e) {
    notes = [];
  }
}

/** localStorage에 메모 저장 */
function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('저장 실패:', e);
  }
}

// ===== 메모 분석 =====

/** content에서 제목 추출 (첫 번째 비어있지 않은 줄, # 제거) */
function getTitle(content) {
  const lines = (content || '').split('\n');
  for (const line of lines) {
    const t = line.replace(/^#+\s*/, '').trim();
    if (t) return t;
  }
  return '제목 없음';
}

/** content에서 본문 추출 (제목 줄 다음 내용) */
function getBody(content) {
  const lines = (content || '').split('\n');
  // 제목(첫 번째 비어있지 않은 줄) 위치 찾기
  let titleIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].replace(/^#+\s*/, '').trim()) {
      titleIdx = i;
      break;
    }
  }
  if (titleIdx === -1) return '';
  // 제목 다음 줄부터, 맨 앞 빈 줄 제거
  return lines.slice(titleIdx + 1).join('\n').replace(/^\n+/, '');
}

/** 제목 + 본문을 하나의 content 문자열로 합치기 */
function joinContent(title, body) {
  const t = title.trim();
  if (!t && !body.trim()) return '';
  if (!t) return body;
  if (!body.trim()) return t;
  return t + '\n\n' + body;
}

/** 제목 다음 줄부터 미리보기 텍스트 추출 */
function getPreview(content) {
  const lines = (content || '').split('\n').filter(l => l.trim());
  const after = lines.slice(1).join(' ').replace(/^#+\s*/gm, '').trim();
  return after.slice(0, 80) || '내용 없음';
}

/**
 * content에서 #해시태그 추출
 * - # 뒤 공백이 없어야 태그로 인식 (# 제목 형식 제외)
 * - 코드 블록(``` ```) 안의 # 무시
 * - 슬래시(/)로 중첩 태그 지원: #여행/일본
 */
function getTags(content) {
  const noCode = (content || '').replace(/```[\s\S]*?```/g, '');
  const matches = noCode.match(/#([^\s#`~!@$%^&*()\-+=[\]{}|;':",.<>?\\]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1)))];
}

/** 전체 메모에서 고유 태그 목록 반환 (삭제되지 않은 메모 기준) */
function getAllTags() {
  const tagSet = new Set();
  notes
    .filter(n => !n.trashed)
    .forEach(n => getTags(n.content).forEach(t => tagSet.add(t)));
  return [...tagSet].sort();
}

// ===== 날짜 포맷 =====

/** 타임스탬프 → 한국어 날짜/시간 문자열 */
function formatDateKo(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const year  = d.getFullYear();
  const month = d.getMonth() + 1;
  const day   = d.getDate();
  const hours = d.getHours();
  const mins  = String(d.getMinutes()).padStart(2, '0');
  const ampm  = hours < 12 ? '오전' : '오후';
  const h     = hours % 12 || 12;
  return `${year}년 ${month}월 ${day}일 ${ampm} ${h}:${mins}`;
}

/** 에디터 날짜/시간 영역 업데이트 */
function updateEditorDate(note) {
  const el = document.getElementById('editor-date');
  if (!note) { el.textContent = ''; return; }

  const created = formatDateKo(note.createdAt);
  // 수정일이 작성일과 다를 때만 수정 시간 표시
  const updatedPart = (note.updatedAt && note.updatedAt !== note.createdAt)
    ? `  ·  수정 ${formatDateKo(note.updatedAt)}`
    : '';
  el.textContent = `작성 ${created}${updatedPart}`;
}

// ===== URL 해시 라우팅 =====
// 형식: #tag=여행&id=n_1234567890

/** 현재 URL 해시를 { tag, id } 객체로 파싱 */
function parseHash() {
  const hash = location.hash.slice(1);
  const params = {};
  hash.split('&').forEach(part => {
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      params[part.slice(0, eqIdx)] = decodeURIComponent(part.slice(eqIdx + 1));
    }
  });
  return params;
}

/** URL 해시 업데이트 */
function updateHash(tag, id) {
  const parts = [];
  if (tag && tag !== 'all') parts.push('tag=' + encodeURIComponent(tag));
  if (id) parts.push('id=' + encodeURIComponent(id));
  location.hash = parts.join('&');
}

// ===== HTML 이스케이프 =====
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== 서랍 메뉴 =====

/** 태그 서랍 열기 */
function openDrawer() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}

/** 태그 서랍 닫기 */
function closeDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

/** 태그 서랍 토글 */
function toggleDrawer() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.contains('open') ? closeDrawer() : openDrawer();
}

// ===== 렌더링 =====

/** 왼쪽 해시태그 사이드바 렌더링 */
function renderSidebar() {
  const tagList = document.getElementById('tag-list');
  const { tag: currentTag } = parseHash();

  const allCount = notes.filter(n => !n.trashed).length;
  const isAll = !currentTag || currentTag === 'all';

  let html = `
    <li class="${isAll ? 'active' : ''}">
      <a href="#tag=all">
        <span>전체</span>
        <span class="tag-count">${allCount}</span>
      </a>
    </li>
    <li><div class="tag-divider"></div></li>
  `;

  const tags = getAllTags();
  tags.forEach(tag => {
    const count = notes.filter(
      n => !n.trashed && getTags(n.content).includes(tag)
    ).length;
    const isActive = currentTag === tag;

    html += `
      <li class="${isActive ? 'active' : ''}">
        <a href="#tag=${encodeURIComponent(tag)}">
          <span>#${escapeHtml(tag)}</span>
          <span class="tag-count">${count}</span>
        </a>
      </li>
    `;
  });

  tagList.innerHTML = html;
}

/** 현재 태그 필터에 맞는 메모 목록 반환 (수정일 최신순) */
function getFilteredNotes() {
  const { tag } = parseHash();
  const active = notes.filter(n => !n.trashed);
  const filtered = (!tag || tag === 'all')
    ? active
    : active.filter(n => getTags(n.content).includes(tag));
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 가운데 메모 목록 렌더링 */
function renderList() {
  const memoList = document.getElementById('memo-list');
  const { id: currentId, tag } = parseHash();
  const filtered = getFilteredNotes();

  if (!filtered.length) {
    memoList.innerHTML = '<li class="list-empty">메모가 없습니다.</li>';
    return;
  }

  const tagPart = tag && tag !== 'all' ? `tag=${encodeURIComponent(tag)}&` : '';

  let html = '';
  filtered.forEach(note => {
    const title   = escapeHtml(getTitle(note.content));
    const preview = escapeHtml(getPreview(note.content));
    const date    = new Date(note.updatedAt).toLocaleDateString('ko-KR', {
      month: 'short', day: 'numeric'
    });
    const isActive = note.id === currentId;
    const href = `#${tagPart}id=${encodeURIComponent(note.id)}`;

    html += `
      <li class="memo-item ${isActive ? 'active' : ''}">
        <a href="${href}">
          <span class="memo-title">${title}</span>
          <span class="memo-meta">${date}</span>
          <span class="memo-preview">${preview}</span>
        </a>
      </li>
    `;
  });

  memoList.innerHTML = html;
}

/** 오른쪽 에디터에 선택된 메모 로드 */
function renderEditor() {
  const editorTitle = document.getElementById('editor-title');
  const editorBody  = document.getElementById('editor-body');
  const btnDelete   = document.getElementById('btn-delete');
  const charCount   = document.getElementById('char-count');
  const { id: currentId } = parseHash();

  const note = notes.find(n => n.id === currentId);

  if (!note) {
    editorTitle.value    = '';
    editorTitle.disabled = true;
    editorBody.value     = '';
    editorBody.disabled  = true;
    btnDelete.style.display = 'none';
    charCount.textContent   = '';
    updateEditorDate(null);
    return;
  }

  editorTitle.disabled = false;
  editorBody.disabled  = false;
  btnDelete.style.display = '';

  // 같은 메모면 값 덮어쓰지 않음 (커서 위치 보존)
  if (editorTitle.dataset.noteId !== note.id) {
    editorTitle.value = getTitle(note.content);
    editorBody.value  = getBody(note.content);
    editorTitle.dataset.noteId = note.id;
    editorBody.dataset.noteId  = note.id;
    // 새 메모 열면 제목 입력 칸에 포커스
    editorTitle.focus();
  }

  updateEditorDate(note);
  charCount.textContent = `${note.content.length}자`;
}

/** 모바일 패널 전환용 클래스 업데이트 */
function updateMobileClass() {
  const { id } = parseHash();
  document.body.classList.remove('show-editor');
  if (id) document.body.classList.add('show-editor');
}

/** 전체 화면 다시 그리기 */
function render() {
  renderSidebar();
  renderList();
  renderEditor();
  updateMobileClass();
}

// ===== 액션 =====

/** 새 메모 생성 */
function createNote() {
  closeDrawer();
  const { tag } = parseHash();
  const note = {
    id:        'n_' + Date.now(),
    content:   '',
    pinned:    false,
    trashed:   false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  notes.unshift(note);
  saveNotes();
  updateHash(tag, note.id);
}

/** 현재 선택된 메모 삭제 */
function deleteNote() {
  const { id: currentId, tag } = parseHash();
  const idx = notes.findIndex(n => n.id === currentId);
  if (idx < 0) return;
  if (!confirm('이 메모를 삭제할까요?')) return;

  notes.splice(idx, 1);
  saveNotes();
  updateHash(tag, '');
}

// 자동 저장 타이머
let saveTimer = null;

/** 자동 저장 예약 (0.5초 디바운스) */
function scheduleAutoSave(note) {
  const saveStatus = document.getElementById('save-status');
  saveStatus.textContent = '저장 중…';

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveNotes();
    renderSidebar();
    renderList();
    updateEditorDate(note);
    saveStatus.textContent = '저장됨';
    setTimeout(() => { saveStatus.textContent = ''; }, 1500);
  }, 500);
}

/** 제목 입력 처리 */
function onTitleInput() {
  const editorTitle = document.getElementById('editor-title');
  const editorBody  = document.getElementById('editor-body');
  const { id: currentId } = parseHash();
  const note = notes.find(n => n.id === currentId);
  if (!note) return;

  note.content   = joinContent(editorTitle.value, editorBody.value);
  note.updatedAt = Date.now();
  scheduleAutoSave(note);
}

/** 본문 입력 처리 */
function onBodyInput() {
  const editorTitle = document.getElementById('editor-title');
  const editorBody  = document.getElementById('editor-body');
  const charCount   = document.getElementById('char-count');
  const { id: currentId } = parseHash();
  const note = notes.find(n => n.id === currentId);
  if (!note) return;

  note.content   = joinContent(editorTitle.value, editorBody.value);
  note.updatedAt = Date.now();
  charCount.textContent = `${note.content.length}자`;
  scheduleAutoSave(note);
}

// ===== 초기화 =====
function init() {
  loadNotes();
  render();

  document.getElementById('btn-new')
    .addEventListener('click', createNote);

  document.getElementById('btn-delete')
    .addEventListener('click', deleteNote);

  // ☰ 메뉴 버튼: 서랍 열기/닫기
  document.getElementById('btn-menu')
    .addEventListener('click', toggleDrawer);

  // 오버레이 클릭: 서랍 닫기
  document.getElementById('sidebar-overlay')
    .addEventListener('click', closeDrawer);

  // 태그 클릭 시 서랍 자동 닫기
  document.getElementById('sidebar')
    .addEventListener('click', function (e) {
      if (e.target.closest('#tag-list a')) closeDrawer();
    });

  document.getElementById('editor-title')
    .addEventListener('input', onTitleInput);

  document.getElementById('editor-body')
    .addEventListener('input', onBodyInput);

  // URL 해시가 바뀔 때마다 화면 갱신
  window.addEventListener('hashchange', render);
}

document.addEventListener('DOMContentLoaded', init);
