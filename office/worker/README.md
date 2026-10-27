# Uplika 중계 서버 (Cloudflare Workers)

Uplika는 다른 웹사이트(github.io)에서 브라우저로 직접 오는 **승인 요청**을 받지 않습니다.
그래서 승인할 때만 이 작은 중계 서버를 거칩니다. 승인이 끝난 뒤 실제 조회는 OpenAI 서버가 Uplika에 직접 하므로 중계 서버를 쓰지 않습니다.

- Uplika 주소(`uplika.com`, `*.uplika.com`)로만 전달하고, `ALLOWED_ORIGINS`에 있는 사이트의 요청만 받습니다.
- 아무것도 저장하지 않습니다.
- Cloudflare 무료 요금제로 충분합니다. (하루 10만 번 요청)

## 배포 (PC에서 10분 정도)

1. https://dash.cloudflare.com/sign-up 에서 가입하고 로그인합니다.
2. 왼쪽 메뉴 **Workers & Pages** (또는 **Compute → Workers**) → **Create** → **Create Worker**(Hello World)를 고릅니다.
3. 이름을 `uplika-proxy`로 바꾸고 **Deploy**를 누릅니다.
4. **Edit code**를 누르고, 왼쪽 `worker.js` 내용을 모두 지운 뒤 이 폴더의 [`uplika-proxy.js`](uplika-proxy.js) 내용을 통째로 붙여 넣습니다.
5. 오른쪽 위 **Deploy**를 누릅니다.
6. 화면에 나온 주소(`https://uplika-proxy.<내 아이디>.workers.dev`)를 복사합니다.

## 사이트에 넣기

1. AI 사무실 → ⚙︎ 설정 → **Uplika 연결**
2. Uplika 서버 주소: `https://api.uplika.com/mcp`
3. **중계 서버 주소**: 6번에서 복사한 주소
4. **Uplika 연결** → Uplika 화면에서 허용 → 사무실로 돌아와 "✅ 연결됨"이 보이면 끝

## 잘 안 될 때

- "허락되지 않은 사이트예요": 사이트 주소가 `ALLOWED_ORIGINS`에 없습니다. 코드 맨 위 목록에 추가하고 다시 Deploy 하세요.
- "Uplika 주소만 전달해요": Uplika 승인 서버가 다른 도메인에 있습니다. 설정 창의 안내 문구를 캡처해 주세요.
- 중계 서버 주소를 브라우저로 직접 열면 "허락되지 않은 사이트예요"가 나오는 게 정상입니다.
