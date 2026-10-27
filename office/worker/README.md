# AI 사무실 서버 (Cloudflare Workers)

사이트 창을 닫아도 직원들이 일을 계속하게 해 주는 작은 서버입니다. 코드는 [`office-server.js`](office-server.js) 하나입니다.

- **업무 처리:** 업무 지시를 받아 저장하고 GPT에 물어 결과를 저장합니다. 사이트를 다시 열면 완료 보고가 와 있습니다.
  - 받자마자 시작하고, 1분마다 도는 크론이 남은 업무나 멈춘 업무를 다시 처리합니다. 실패하면 3번까지 다시 시도합니다.
  - 사이트가 결과를 받아 가면 지우고, 7일이 지난 업무도 지웁니다.
- **Uplika 승인 중계:** Uplika는 github.io에서 브라우저로 직접 오는 승인 요청을 막아서, 승인할 때만 이 서버를 거칩니다.
- 회의와 대화는 지금처럼 브라우저에서 처리합니다. 서버로 가는 건 **업무 지시**뿐입니다.
- Cloudflare 무료 요금제로 충분합니다.

## 만들기 (PC에서 15분 정도)

### 1. Worker 만들기
1. https://dash.cloudflare.com 에 로그인합니다. 처음이면 가입합니다.
2. 왼쪽 메뉴 **Workers & Pages** (또는 **Compute → Workers**) → **Create** → **Create Worker**(Hello World)를 고릅니다.
   - 예전에 `uplika-proxy`를 만들었다면 새로 만들지 말고 그 Worker를 열어도 됩니다.
3. 이름을 `office-server`로 정하고 **Deploy**를 누릅니다.
4. **Edit code**를 누르고 기존 코드를 모두 지운 뒤 [`office-server.js`](office-server.js) 내용을 통째로 붙여 넣고, 오른쪽 위 **Deploy**를 누릅니다.

### 2. 데이터베이스(D1) 연결
1. 왼쪽 메뉴 **Storage & Databases → D1** → **Create** → 이름 `ai-office` → 만들기.
2. 다시 Worker(`office-server`) → **Settings → Bindings → Add → D1 database**
   - Variable name: **`DB`** (대문자 그대로)
   - D1 database: `ai-office`
3. 저장합니다. 표는 서버가 처음 쓸 때 스스로 만듭니다.

### 3. 비밀 변수 두 개
Worker → **Settings → Variables and Secrets → Add**에서 Type을 **Secret**으로 두고 두 개를 넣습니다.

| 이름 | 값 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API 키 (`sk-…`) |
| `OFFICE_TOKEN` | 내가 정하는 서버 비밀번호. 길고 아무도 모르는 글자로 정하세요 (예: 20자 이상) |

### 4. 1분마다 도는 크론
Worker → **Settings → Triggers(Trigger Events) → Cron Triggers → Add** → `* * * * *` (1분마다) → 저장.

### 5. 사이트에 넣기
1. Worker 화면에 나온 주소(`https://office-server.<내 아이디>.workers.dev`)를 복사합니다.
2. AI 사무실 → ⚙︎ 설정 → **🖥️ 사무실 서버**
   - 서버 주소: 복사한 주소
   - 서버 비밀번호: `OFFICE_TOKEN`에 넣은 값
3. **연결 확인**을 눌러 "✅ 연결됐어요"가 나오면 **저장**합니다.

이제 업무 지시를 하고 창을 닫아도 됩니다. 다시 열면 완료 보고가 와 있습니다. Uplika 연결도 이 서버를 거칩니다.

## 잘 안 될 때

| 안내 문구 | 할 일 |
| --- | --- |
| "사무실 서버 비밀번호가 달라요" | 사이트의 서버 비밀번호와 Cloudflare의 `OFFICE_TOKEN`이 같은지 확인하세요. |
| "Cloudflare 설정이 빠졌어요: OPENAI_API_KEY" 또는 "D1 데이터베이스(DB)" | 3단계 비밀 변수나 2단계 D1 연결을 확인하세요. 변수 이름은 대소문자까지 같아야 합니다. |
| "사무실 서버에 연결하지 못했어요" | 서버 주소를 확인하세요. 브라우저로 서버 주소를 직접 열면 "허락되지 않은 사이트예요"가 나오는 게 정상입니다. |
| 업무가 오래 "Work!"로 남음 | 4단계 크론이 있는지 확인하세요. Worker → **Logs**에서 오류를 볼 수 있습니다. |

사이트 주소가 `https://yujinfield.github.io`가 아니면 코드 맨 위 `ALLOWED_ORIGINS`에 추가하고 다시 Deploy 하세요.
