// GitHub Gist API (☁️ 동기화에서 씀, DOM 사용 안 함)
// 비공개(secret) Gist 하나에 잠긴 가계부 파일 하나(budget.json)를 둡니다.
// token: GitHub 토큰 (gist 권한). 문서: https://docs.github.com/rest/gists

const API = 'https://api.github.com/gists';
const FILE_NAME = 'budget.json';

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// 실패하면 사람이 읽을 수 있는 이유로 에러
async function request(url, token, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, headers: headers(token), cache: 'no-store' });
  } catch (error) {
    throw new Error('인터넷에 연결되지 않았어요.');
  }
  if (response.status === 401) throw new Error('GitHub 토큰이 틀렸거나 만료됐어요.');
  if (response.status === 403) throw new Error('GitHub 토큰에 gist 권한이 없거나 요청이 너무 많아요.');
  if (response.status === 404) throw new Error('연결 코드에 맞는 Gist를 찾을 수 없어요. (토큰 주인의 Gist여야 해요)');
  if (!response.ok) throw new Error(`GitHub 오류 (${response.status})`);
  return response.json();
}

// 새 비공개 Gist 만들기 → gist id (연결 코드)
export async function createGist(token, content) {
  const gist = await request(API, token, {
    method: 'POST',
    body: JSON.stringify({
      description: '우리집 가계부 (잠긴 데이터)',
      public: false,
      files: { [FILE_NAME]: { content } },
    }),
  });
  return gist.id;
}

// Gist의 파일 내용 (글자). 큰 파일은 잘려서 오므로 raw_url로 다시 받음
export async function readGist(token, gistId) {
  const gist = await request(`${API}/${gistId}`, token);
  const file = gist.files && gist.files[FILE_NAME];
  if (!file) throw new Error('이 Gist에는 가계부 파일이 없어요.');
  if (!file.truncated) return file.content;
  const response = await fetch(file.raw_url, { cache: 'no-store' });
  return response.text();
}

export async function writeGist(token, gistId, content) {
  await request(`${API}/${gistId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [FILE_NAME]: { content } } }),
  });
}
