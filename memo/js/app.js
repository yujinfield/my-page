const KEY        = 'bear-notes';
const FOLDER_KEY = 'bear-folders';
const MARK_COLORS = {
  yellow: 'rgba(255,215,0,0.4)',
  green:  'rgba(93,222,122,0.4)',
  red:    'rgba(255,112,112,0.4)',
  blue:   'rgba(112,168,255,0.4)',
  orange: 'rgba(255,160,64,0.4)',
};
let notes   = [];
let folders = [];
let currentTag = 'all';
let currentId  = null;
let saveTimer  = null;

/* ── 스토리지 ── */
function loadNotes() {
  try { const r = localStorage.getItem(KEY); notes = r ? JSON.parse(r) : []; if (!Array.isArray(notes)) notes = []; } catch(e) { notes = []; }
}
function saveNotes() { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch(e) {} }
function loadFolders() {
  try { const r = localStorage.getItem(FOLDER_KEY); folders = r ? JSON.parse(r) : []; if (!Array.isArray(folders)) folders = []; } catch(e) { folders = []; }
}
function saveFolders() { try { localStorage.setItem(FOLDER_KEY, JSON.stringify(folders)); } catch(e) {} }

/* ── 메모 분석 ── */
function getTitle(c) {
  for (const line of (c||'').split('\n')) {
    const t = line.replace(/^#+\s*/, '').trim();
    if (t) return t;
  }
  return '제목 없음';
}
function getBody(c) {
  const lines = (c||'').split('\n');
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].replace(/^#+\s*/, '').trim()) { idx = i; break; }
  }
  return idx < 0 ? '' : lines.slice(idx+1).join('\n').replace(/^\n+/, '');
}
function joinContent(title, body) {
  const t = title.trim();
  if (!t && !body.trim()) return '';
  if (!t) return body;
  if (!body.trim()) return t;
  return t + '\n\n' + body;
}
function getPreview(c) {
  const lines = (c||'').split('\n').filter(l => l.trim());
  return lines.slice(1).join(' ').replace(/^#+\s*/gm, '').replace(/^[-*]\s+/gm, '').trim().slice(0, 80) || '내용 없음';
}
function getTags(c) {
  const noCode = (c||'').replace(/```[\s\S]*?```/g, '');
  const m = noCode.match(/#([^\s#`~!@$%^&*()\-+=[\]{}|;':",.<>?\\]+)/g);
  return m ? [...new Set(m.map(x => x.slice(1)))] : [];
}
function getAllFolders() {
  const s = new Set(folders);
  notes.filter(n=>!n.trashed).forEach(n => getTags(n.content).forEach(t => s.add(t)));
  return [...s].sort();
}

/* ── 날짜 ── */
function fmtFull(ts) {
  if (!ts) return '';
  const d = new Date(ts), h = d.getHours();
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${h<12?'오전':'오후'} ${h%12||12}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtShort(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) {
    const h = d.getHours();
    return `${h<12?'오전':'오후'} ${h%12||12}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  return `${d.getMonth()+1}월 ${d.getDate()}일`;
}
function updateDate(note) {
  document.getElementById('editor-date').textContent = note ? `작성 ${fmtFull(note.createdAt)}` : '';
}

/* ── 이스케이프 ── */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── 마크다운 → HTML (에디터 표시용) ── */
function markdownToHtml(md) {
  if (!md) return '';
  const codeBlocks = [];
  let s = md.replace(/```([\s\S]*?)```/g, (_, c) => { codeBlocks.push(c); return '\x00CODE' + (codeBlocks.length-1) + '\x00'; });
  const icodes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { icodes.push(c); return '\x00IC' + (icodes.length-1) + '\x00'; });

  const lines = s.split('\n'), out = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.startsWith('\x00CODE')) {
      const idx = parseInt(ln.match(/\d+/)[0]);
      out.push('<pre><code>' + esc(codeBlocks[idx]) + '</code></pre>');
      i++; continue;
    }
    if (ln.startsWith('### ')) { out.push('<h3>' + inlineMd(ln.slice(4)) + '</h3>'); i++; continue; }
    if (ln.startsWith('## '))  { out.push('<h2>' + inlineMd(ln.slice(3)) + '</h2>'); i++; continue; }
    if (ln.startsWith('# '))   { out.push('<h2>' + inlineMd(ln.slice(2)) + '</h2>'); i++; continue; }
    if (/^- \[([ x])\] /.test(ln)) {
      const items = [];
      while (i < lines.length && /^- \[([ x])\] /.test(lines[i])) {
        const checked = lines[i][3] === 'x';
        const text = inlineMd(lines[i].slice(6));
        items.push(`<li class="todo-item"><input type="checkbox"${checked?' checked':''}><span class="${checked?'todo-done':''}">${text}</span></li>`);
        i++;
      }
      out.push('<ul class="todo-list">' + items.join('') + '</ul>'); continue;
    }
    if (/^[-*] /.test(ln)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push('<li>' + inlineMd(lines[i].slice(2)) + '</li>'); i++; }
      out.push('<ul>' + items.join('') + '</ul>'); continue;
    }
    if (/^\d+\. /.test(ln)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push('<li>' + inlineMd(lines[i].replace(/^\d+\. /,'')) + '</li>'); i++; }
      out.push('<ol>' + items.join('') + '</ol>'); continue;
    }
    if (ln.trim() === '') { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !/^[-*] /.test(lines[i]) && !/^\d+\. /.test(lines[i]) && !lines[i].startsWith('\x00CODE')) { para.push(lines[i]); i++; }
    if (para.length) out.push('<p>' + inlineMd(para.join('<br>')) + '</p>');
  }
  let html = out.join('\n');
  html = html.replace(/\x00IC(\d+)\x00/g, (_, idx) => '<code>' + esc(icodes[parseInt(idx)]) + '</code>');
  return html;
}
function inlineMd(s) {
  s = esc(s);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/==\[(\w+)\](.+?)==/g, (_, c, t) => `<mark data-color="${esc(c)}" style="background:${MARK_COLORS[c]||MARK_COLORS.yellow}">${t}</mark>`);
  s = s.replace(/==(.+?)==/g, `<mark data-color="yellow" style="background:${MARK_COLORS.yellow}">$1</mark>`);
  s = s.replace(/_(.+?)_/g, '<em>$1</em>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return s;
}

/* ── HTML(div) → 마크다운 (저장용) ── */
function divToMarkdown(div) {
  function walk(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    const ch = () => Array.from(node.childNodes).map(walk).join('');
    if (tag === 'br') return '\n';
    if (tag === 'ul') {
      return Array.from(node.querySelectorAll(':scope > li')).map(li => '- ' + walk(li)).join('\n') + '\n';
    }
    if (tag === 'ol') {
      return Array.from(node.querySelectorAll(':scope > li')).map((li, i) => `${i+1}. ` + walk(li)).join('\n') + '\n';
    }
    if (tag === 'li') {
      const cb = node.querySelector(':scope > input[type=checkbox]');
      if (cb) {
        const text = Array.from(node.childNodes).filter(n => n !== cb).map(walk).join('').replace(/^\s/, '');
        return (cb.checked ? '[x] ' : '[ ] ') + text;
      }
      return ch();
    }
    if (tag === 'h1' || tag === 'h2') return '# ' + ch() + '\n';
    if (tag === 'h3') return '### ' + ch() + '\n';
    if (tag === 'strong' || tag === 'b') return '**' + ch() + '**';
    if (tag === 'em' || tag === 'i') return '_' + ch() + '_';
    if (tag === 'mark') {
      const c = node.dataset.color;
      return (c && c !== 'yellow' ? `==[${c}]` : '==') + ch() + '==';
    }
    if (tag === 'code' && node.closest('pre')) return ch();
    if (tag === 'code') return '`' + ch() + '`';
    if (tag === 'pre') {
      const code = node.querySelector('code');
      return '```\n' + (code ? code.textContent : ch()) + '\n```\n';
    }
    if (tag === 'p' || tag === 'div') return ch() + '\n';
    return ch();
  }
  return walk(div).replace(/\n{3,}/g, '\n\n').trim();
}

/* ── 서랍 ── */
function openDrawer()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.add('open'); }
function closeDrawer() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('open'); }

/* ── 폴더 만들기 ── */
function showFolderForm() { document.getElementById('new-folder-form').hidden = false; const inp = document.getElementById('new-folder-input'); inp.value = ''; inp.focus(); }
function hideFolderForm() { document.getElementById('new-folder-form').hidden = true; }
function createFolder() {
  const name = document.getElementById('new-folder-input').value.trim();
  hideFolderForm();
  if (!name || folders.includes(name)) return;
  folders.push(name); saveFolders(); renderSidebar();
}

/* ── 태그 조작 ── */
function addTagToNote(tag, note) {
  if (getTags(note.content).includes(tag)) return;
  note.content = (note.content.trim() + '\n\n#' + tag).trimStart();
  note.updatedAt = Date.now();
}
function removeTagFromNote(tag, note) {
  const safe = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('#' + safe + '(?![^\\s#`~!@$%^&*()\\-+=\\[\\]{}|;\':",.<>?\\\\])', 'g');
  note.content = note.content.replace(re, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  note.updatedAt = Date.now();
}

/* ── 태그 폼 ── */
function showTagForm() { document.getElementById('add-tag-area').hidden = false; const inp = document.getElementById('tag-input'); inp.value = ''; inp.focus(); renderTagSuggestions(''); }
function hideTagForm()  { document.getElementById('add-tag-area').hidden = true; }
function renderTagSuggestions(query) {
  const note = notes.find(n => n.id === currentId);
  const noteTags = note ? getTags(note.content) : [];
  const all = getAllFolders().filter(t => !noteTags.includes(t) && t.toLowerCase().includes(query.toLowerCase()));
  document.getElementById('tag-suggestions').innerHTML = all.map(t => `<button class="tag-sug" data-sug="${esc(t)}">#${esc(t)}</button>`).join('');
}
function doAddTag() {
  const name = document.getElementById('tag-input').value.trim().replace(/^#+/, '');
  hideTagForm();
  if (!name) return;
  const note = notes.find(n => n.id === currentId); if (!note) return;
  addTagToNote(name, note);
  refreshAfterTagChange(note);
}
function refreshAfterTagChange(note) {
  const body = document.getElementById('editor-body');
  body.innerHTML = markdownToHtml(getBody(note.content));
  document.getElementById('char-count').textContent = `${note.content.length}자`;
  renderEditorTags(note);
  scheduleAutoSave(note);
}

/* ── 에디터 태그 렌더링 ── */
function renderEditorTags(note) {
  const chipsEl = document.getElementById('tags-chips');
  const btnAdd  = document.getElementById('btn-add-tag');
  if (!note) { chipsEl.innerHTML = ''; btnAdd.hidden = true; return; }
  btnAdd.hidden = false;
  const tags = getTags(note.content);
  chipsEl.innerHTML = tags.map(tag => `
    <span class="tag-chip">
      <span class="tag-chip-text">#${esc(tag)}</span>
      <button class="tag-chip-remove" data-remove="${esc(tag)}" aria-label="태그 제거">×</button>
    </span>`).join('');
}

/* ── 렌더링 ── */
function renderSidebar() {
  const allCount   = notes.filter(n=>!n.trashed).length;
  const allFolders = getAllFolders();
  let html = `
    <li class="${currentTag==='all'?'active':''}">
      <button data-tag="all"><span class="folder-icon">📋</span><span class="folder-name">전체</span><span class="tag-count">${allCount}</span><span class="chevron">›</span></button></li>
    ${allFolders.length ? '<li><div class="tag-divider"></div></li>' : ''}`;
  allFolders.forEach(tag => {
    const cnt = notes.filter(n=>!n.trashed && getTags(n.content).includes(tag)).length;
    html += `<li class="${currentTag===tag?'active':''}"><button data-tag="${esc(tag)}"><span class="folder-icon">📁</span><span class="folder-name">${esc(tag)}</span><span class="tag-count">${cnt}</span><span class="chevron">›</span></button></li>`;
  });
  document.getElementById('tag-list').innerHTML = html;
}

function renderList() {
  const active   = notes.filter(n=>!n.trashed);
  const filtered = (currentTag==='all' ? active : active.filter(n=>getTags(n.content).includes(currentTag))).sort((a,b) => b.updatedAt - a.updatedAt);
  document.getElementById('list-header').textContent = currentTag==='all' ? `메모 (${filtered.length})` : `#${currentTag} (${filtered.length})`;
  if (!filtered.length) {
    document.getElementById('memo-list').innerHTML = '<li class="list-empty">메모가 없습니다.<br><small style="font-size:11px">상단 + 버튼으로 새 메모를 만드세요</small></li>';
    return;
  }
  document.getElementById('memo-list').innerHTML = filtered.map(note => `
    <li class="memo-item ${note.id===currentId?'active':''}">
      <button data-id="${note.id}">
        <span class="memo-title">${esc(getTitle(note.content))}</span>
        <span class="memo-date">${fmtShort(note.updatedAt)}</span>
        <span class="memo-preview">${esc(getPreview(note.content))}</span>
      </button></li>`).join('');
}

function renderEditor() {
  const titleEl = document.getElementById('editor-title');
  const bodyEl  = document.getElementById('editor-body');
  const delBtn  = document.getElementById('btn-delete');
  const tagsEl  = document.getElementById('editor-tags');
  const cnt     = document.getElementById('char-count');
  const note    = notes.find(n => n.id === currentId);

  hideDeleteConfirm();
  hideTagForm();

  if (!note) {
    titleEl.value = ''; titleEl.disabled = true;
    bodyEl.innerHTML = ''; bodyEl.contentEditable = 'false';
    delBtn.hidden = true; tagsEl.hidden = true;
    document.getElementById('format-bar').hidden = true;
    cnt.textContent = '';
    updateDate(null); renderEditorTags(null);
    return;
  }
  titleEl.disabled = false;
  bodyEl.contentEditable = 'true';
  delBtn.hidden = false; tagsEl.hidden = false;
  document.getElementById('format-bar').hidden = false;

  if (titleEl.dataset.noteId !== note.id) {
    titleEl.value = getTitle(note.content);
    bodyEl.innerHTML = markdownToHtml(getBody(note.content));
    titleEl.dataset.noteId = note.id;
    titleEl.focus();
  }
  updateDate(note);
  renderEditorTags(note);
  cnt.textContent = `${note.content.length}자`;
}

function render() {
  renderSidebar(); renderList(); renderEditor();
  document.body.classList.toggle('show-editor', !!currentId);
}

/* ── 삭제 확인 ── */
function showDeleteConfirm() { document.getElementById('editor-actions').hidden = true; document.getElementById('delete-confirm').hidden = false; }
function hideDeleteConfirm() { document.getElementById('editor-actions').hidden = false; document.getElementById('delete-confirm').hidden = true; }
function doDelete() {
  const idx = notes.findIndex(n => n.id === currentId);
  if (idx >= 0) notes.splice(idx, 1);
  saveNotes(); currentId = null; hideDeleteConfirm(); render();
}

/* ── 자동 저장 ── */
function scheduleAutoSave(note) {
  const ss = document.getElementById('save-status');
  ss.textContent = '저장 중…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveNotes(); renderSidebar(); renderList(); updateDate(note);
    ss.textContent = '저장됨';
    setTimeout(() => { ss.textContent = ''; }, 1500);
  }, 500);
}

function onTitleInput() {
  const note = notes.find(n => n.id === currentId); if (!note) return;
  const body = divToMarkdown(document.getElementById('editor-body'));
  note.content   = joinContent(document.getElementById('editor-title').value, body);
  note.updatedAt = Date.now();
  scheduleAutoSave(note);
}

function onBodyInput() {
  const note = notes.find(n => n.id === currentId); if (!note) return;
  const body = divToMarkdown(document.getElementById('editor-body'));
  note.content   = joinContent(document.getElementById('editor-title').value, body);
  note.updatedAt = Date.now();
  document.getElementById('char-count').textContent = `${note.content.length}자`;
  scheduleAutoSave(note);
}

/* ── 서식 툴바 ── */
function applyInlineWrap(tag) {
  const bodyEl = document.getElementById('editor-body');
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (!bodyEl.contains(range.commonAncestorContainer)) return;

  if (range.collapsed) {
    const el = document.createElement(tag);
    el.innerHTML = '​';
    range.insertNode(el);
    const nr = document.createRange();
    nr.setStart(el.firstChild, 1);
    nr.collapse(true);
    sel.removeAllRanges(); sel.addRange(nr);
  } else {
    const parent = sel.anchorNode.parentElement;
    if (parent.tagName.toLowerCase() === tag) {
      const text = document.createTextNode(parent.textContent);
      parent.replaceWith(text);
    } else {
      try {
        const el = document.createElement(tag);
        range.surroundContents(el);
      } catch(e) {
        document.execCommand(tag === 'strong' ? 'bold' : tag === 'em' ? 'italic' : 'bold', false, null);
      }
    }
  }
  onBodyInput();
}

function toggleHighlightPicker() {
  const picker = document.getElementById('highlight-picker');
  picker.hidden = !picker.hidden;
}
function applyHighlight(color) {
  const bodyEl = document.getElementById('editor-body');
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (!bodyEl.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) return;
  try {
    const parent = sel.anchorNode.parentElement;
    if (parent.tagName === 'MARK') {
      if (parent.dataset.color === color) {
        parent.replaceWith(document.createTextNode(parent.textContent));
      } else {
        parent.dataset.color = color;
        parent.style.background = MARK_COLORS[color] || MARK_COLORS.yellow;
      }
    } else {
      const mark = document.createElement('mark');
      mark.dataset.color = color;
      mark.style.background = MARK_COLORS[color] || MARK_COLORS.yellow;
      range.surroundContents(mark);
    }
    onBodyInput();
  } catch(e) {}
}

function insertBulletItem() {
  const bodyEl = document.getElementById('editor-body');
  const sel = window.getSelection();
  let inserted = false;

  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    let block = range.startContainer;
    if (block.nodeType === 3) block = block.parentNode;
    while (block && block !== bodyEl && !['P','DIV','H1','H2','H3'].includes(block.tagName)) {
      block = block.parentNode;
    }
    if (block && block !== bodyEl) {
      const ul = document.createElement('ul');
      const li = document.createElement('li'); li.innerHTML = '<br>';
      ul.appendChild(li);
      block.replaceWith(ul);
      const nr = document.createRange();
      nr.setStart(li, 0); nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
      inserted = true;
    }
  }
  if (!inserted) {
    const ul = document.createElement('ul');
    const li = document.createElement('li'); li.innerHTML = '<br>';
    ul.appendChild(li);
    bodyEl.appendChild(ul);
    const nr = document.createRange();
    nr.setStart(li, 0); nr.collapse(true);
    sel.removeAllRanges(); sel.addRange(nr);
  }
  bodyEl.focus();
  onBodyInput();
}

function insertCheckboxItem() {
  const bodyEl = document.getElementById('editor-body');
  const sel = window.getSelection();
  let inserted = false;

  const makeList = () => {
    const ul = document.createElement('ul'); ul.className = 'todo-list';
    const li = document.createElement('li'); li.className = 'todo-item';
    const cb = document.createElement('input'); cb.type = 'checkbox';
    const span = document.createElement('span');
    li.appendChild(cb); li.appendChild(span);
    ul.appendChild(li);
    return { ul, li, span };
  };

  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    let block = range.startContainer;
    if (block.nodeType === 3) block = block.parentNode;
    while (block && block !== bodyEl && !['P','DIV','H1','H2','H3'].includes(block.tagName)) {
      block = block.parentNode;
    }
    if (block && block !== bodyEl) {
      const { ul, li, span } = makeList();
      block.replaceWith(ul);
      const tn = document.createTextNode('');
      span.appendChild(tn);
      const nr = document.createRange();
      nr.setStart(tn, 0); nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
      inserted = true;
    }
  }
  if (!inserted) {
    const { ul, li, span } = makeList();
    bodyEl.appendChild(ul);
    const tn = document.createTextNode('');
    span.appendChild(tn);
    const nr = document.createRange();
    nr.setStart(tn, 0); nr.collapse(true);
    sel.removeAllRanges(); sel.addRange(nr);
  }
  bodyEl.focus();
  onBodyInput();
}

/* ── contenteditable 키 처리 ── */
function onBodyKeydown(e) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);

  if (e.key === ' ' && range.collapsed) {
    const node = range.startContainer;
    if (node.nodeType !== 3) return;

    let block = node.parentNode;
    const bodyEl = document.getElementById('editor-body');
    while (block && block !== bodyEl && !['P','DIV','LI'].includes(block.tagName)) {
      block = block.parentNode;
    }
    if (!block || block === bodyEl) return;

    const blockText = block.textContent;

    if (block.tagName === 'LI' && blockText.trim() === '[]') {
      e.preventDefault();
      block.innerHTML = '<input type="checkbox"><span></span>';
      block.classList.add('todo-item');
      const span = block.querySelector('span');
      const tn = document.createTextNode('');
      span.appendChild(tn);
      const newRange = document.createRange();
      newRange.setStart(tn, 0); newRange.collapse(true);
      sel.removeAllRanges(); sel.addRange(newRange);
      onBodyInput(); return;
    }
    if (block.tagName === 'LI') return;

    if (blockText !== '-') return;

    e.preventDefault();
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.innerHTML = '<br>';
    ul.appendChild(li);
    block.replaceWith(ul);

    const newRange = document.createRange();
    newRange.setStart(li, 0); newRange.collapse(true);
    sel.removeAllRanges(); sel.addRange(newRange);
    onBodyInput();
    return;
  }

  if (e.key === 'Enter' && range.collapsed) {
    let li = range.startContainer;
    if (li.nodeType === 3) li = li.parentNode;
    while (li && li.tagName !== 'LI') li = li.parentNode;
    if (!li) return;

    const isTodo = li.classList.contains('todo-item');
    const isEmpty = isTodo
      ? (li.querySelector(':scope > span') || {textContent: ''}).textContent.trim() === ''
      : li.textContent.trim() === '';

    if (isEmpty) {
      e.preventDefault();
      const list = li.closest('ul, ol');
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      if (list.querySelectorAll('li').length <= 1) {
        list.replaceWith(p);
      } else {
        li.remove();
        list.insertAdjacentElement('afterend', p);
      }
      const newRange = document.createRange();
      newRange.setStart(p, 0); newRange.collapse(true);
      sel.removeAllRanges(); sel.addRange(newRange);
      onBodyInput();
    } else if (isTodo) {
      e.preventDefault();
      const newLi = document.createElement('li');
      newLi.className = 'todo-item';
      const cb = document.createElement('input'); cb.type = 'checkbox';
      const span = document.createElement('span');
      const tn = document.createTextNode('');
      span.appendChild(tn);
      newLi.appendChild(cb); newLi.appendChild(span);
      li.after(newLi);
      const newRange = document.createRange();
      newRange.setStart(tn, 0); newRange.collapse(true);
      sel.removeAllRanges(); sel.addRange(newRange);
      onBodyInput();
    }
  }
}

/* ── 초기화 ── */
document.addEventListener('DOMContentLoaded', () => {
  loadNotes(); loadFolders(); render();

  document.getElementById('btn-menu').addEventListener('click', () => {
    document.getElementById('sidebar').classList.contains('open') ? closeDrawer() : openDrawer();
  });
  document.getElementById('sidebar-overlay').addEventListener('click', closeDrawer);

  document.getElementById('tag-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-tag]'); if (!btn) return;
    currentTag = btn.dataset.tag; closeDrawer(); render();
  });
  document.getElementById('memo-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-id]'); if (!btn) return;
    currentId = btn.dataset.id; render();
  });

  document.getElementById('btn-new').addEventListener('click', () => {
    closeDrawer();
    const note = { id: 'n_' + Date.now(), content: '', pinned: false, trashed: false, createdAt: Date.now(), updatedAt: Date.now() };
    notes.unshift(note); saveNotes(); currentId = note.id; render();
  });

  document.getElementById('btn-back').addEventListener('click', () => { currentId = null; render(); });
  document.getElementById('btn-delete').addEventListener('click', showDeleteConfirm);
  document.getElementById('btn-delete-cancel').addEventListener('click', hideDeleteConfirm);
  document.getElementById('btn-delete-ok').addEventListener('click', doDelete);

  document.getElementById('btn-new-folder').addEventListener('click', showFolderForm);
  document.getElementById('btn-folder-ok').addEventListener('click', createFolder);
  document.getElementById('btn-folder-cancel').addEventListener('click', hideFolderForm);
  document.getElementById('new-folder-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') createFolder();
    if (e.key === 'Escape') hideFolderForm();
  });

  document.getElementById('btn-add-tag').addEventListener('click', showTagForm);
  document.getElementById('btn-tag-cancel').addEventListener('click', hideTagForm);
  document.getElementById('btn-tag-ok').addEventListener('click', doAddTag);
  document.getElementById('tag-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doAddTag();
    if (e.key === 'Escape') hideTagForm();
  });
  document.getElementById('tag-input').addEventListener('input', e => renderTagSuggestions(e.target.value));
  document.getElementById('tag-suggestions').addEventListener('click', e => {
    const btn = e.target.closest('[data-sug]'); if (!btn) return;
    const note = notes.find(n => n.id === currentId); if (!note) return;
    addTagToNote(btn.dataset.sug, note);
    refreshAfterTagChange(note);
    hideTagForm();
  });
  document.getElementById('tags-chips').addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]'); if (!btn) return;
    const note = notes.find(n => n.id === currentId); if (!note) return;
    removeTagFromNote(btn.dataset.remove, note);
    refreshAfterTagChange(note);
  });

  document.getElementById('editor-title').addEventListener('input', onTitleInput);
  document.getElementById('editor-body').addEventListener('input', onBodyInput);
  document.getElementById('editor-body').addEventListener('keydown', onBodyKeydown);

  // todo-item 안에서 커서가 체크박스 왼쪽에 위치하면 span 안으로 교정
  let fixingCursor = false;
  const bodyEl2 = document.getElementById('editor-body');
  document.addEventListener('selectionchange', () => {
    if (fixingCursor) return;
    const sel2 = window.getSelection();
    if (!sel2 || !sel2.rangeCount) return;
    const r = sel2.getRangeAt(0);
    if (!r.collapsed) return;
    if (!bodyEl2.contains(r.startContainer)) return;
    const node = r.startContainer;
    if (node.nodeType !== 1) return;
    if (!node.classList.contains('todo-item')) return;
    const span = node.querySelector(':scope > span');
    if (!span) return;
    if (!span.firstChild) span.appendChild(document.createTextNode(''));
    const tn = span.firstChild.nodeType === 3 ? span.firstChild : span;
    fixingCursor = true;
    const nr = document.createRange();
    nr.setStart(tn, 0); nr.collapse(true);
    sel2.removeAllRanges(); sel2.addRange(nr);
    fixingCursor = false;
  });

  document.getElementById('fmt-bold').addEventListener('click', () => applyInlineWrap('strong'));
  document.getElementById('fmt-italic').addEventListener('click', () => applyInlineWrap('em'));
  document.getElementById('fmt-highlight').addEventListener('click', toggleHighlightPicker);
  document.getElementById('fmt-bullet').addEventListener('click', insertBulletItem);
  document.getElementById('fmt-checkbox').addEventListener('click', insertCheckboxItem);

  document.getElementById('highlight-picker').addEventListener('click', e => {
    const btn = e.target.closest('[data-mark-color]'); if (!btn) return;
    applyHighlight(btn.dataset.markColor);
    document.getElementById('highlight-picker').hidden = true;
  });

  document.addEventListener('click', e => {
    const picker = document.getElementById('highlight-picker');
    if (picker.hidden) return;
    if (!picker.contains(e.target) && e.target.id !== 'fmt-highlight') {
      picker.hidden = true;
    }
  });
  document.getElementById('editor-body').addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    const span = e.target.nextElementSibling;
    if (span) span.classList.toggle('todo-done', e.target.checked);
    onBodyInput();
  });
});
