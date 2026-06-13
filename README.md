# 레슨노트 베타 — 설치 · 배포 가이드 (랩뮤직연세)

선생님들이 **각자 폰에서 같은 데이터를 공유하며** 테스트할 수 있게 만드는 단계입니다.
구성: **React(Vite) 앱 + Supabase(저장·실시간) + Vercel(배포)**.

> 한 줄 요약: ① Supabase 만들고 SQL 한 번 실행 → ② 키 2개를 복사 → ③ Vercel에 올리면서 키 넣기 → ④ 나온 링크를 선생님들께 전달.

---

## 0. 미리 준비 (무료 가입)

- GitHub 계정 (코드 보관)
- Supabase 계정 — https://supabase.com
- Vercel 계정 — https://vercel.com  (GitHub로 로그인하면 편함)
- (선택) 내 컴퓨터에서 미리 돌려보려면 Node.js 18+ — https://nodejs.org

이 폴더 전체가 "앱 프로젝트"입니다. 그대로 GitHub에 올리면 됩니다.

---

## 1. Supabase 만들기 (데이터 저장소)

1. supabase.com → **New project** → 이름(예: `lessonnote`), 비밀번호 아무거나 설정, 지역은 **Northeast Asia (Seoul)** 권장.
2. 1~2분 기다려 생성 완료.
3. 왼쪽 메뉴 **SQL Editor → New query** → 같은 폴더의 **`supabase_schema.sql`** 내용을 전부 붙여넣고 **Run**.
   - "Success. No rows returned" 이 나오면 정상.
4. 왼쪽 메뉴 **Project Settings → API** 에서 두 값을 복사해 둡니다:
   - **Project URL** (예: `https://abcd1234.supabase.co`)
   - **anon public** 키 (`anon` `public` 이라고 적힌 긴 문자열)

> 이 두 값이 다음 단계의 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 입니다.

---

## 2. (선택) 내 컴퓨터에서 먼저 확인

건너뛰고 바로 3번(배포)로 가도 됩니다.

```bash
# 이 폴더 안에서
npm install
cp .env.example .env        # 그리고 .env 파일을 열어 위에서 복사한 값 2개를 채웁니다
npm run dev                 # http://localhost:5173 접속
```

- 로그인: 원장 `director@demo.kr` / 강사 `teacher1~6@demo.kr` / 학부모 `parent1~11@demo.kr`, 비밀번호 전부 **1234**
- 한 브라우저에서 글을 쓰고, 다른 브라우저(또는 폰)에서 같은 주소로 접속하면 **같은 내용이 보이면 성공**입니다.

> `.env`를 안 채우면 "인메모리 데모"로 떠서 저장·공유가 안 됩니다(정상). 공유하려면 키를 꼭 넣으세요.

---

## 3. Vercel로 배포 (링크 발급)

### 3-1. GitHub에 올리기
1. github.com 에서 새 저장소(repository) 생성 (예: `lessonnote`).
2. 이 폴더를 그 저장소에 올립니다.
   ```bash
   git init
   git add .
   git commit -m "lessonnote beta"
   git branch -M main
   git remote add origin https://github.com/내계정/lessonnote.git
   git push -u origin main
   ```
   (GitHub 데스크톱 앱으로 드래그해서 올려도 됩니다.)

### 3-2. Vercel에 연결
1. vercel.com → **Add New → Project** → 방금 만든 GitHub 저장소 **Import**.
2. Framework는 자동으로 **Vite**로 인식됩니다. 그대로 둡니다.
3. **Environment Variables** 에 2개 추가:
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | 1단계에서 복사한 Project URL |
   | `VITE_SUPABASE_ANON_KEY` | 1단계에서 복사한 anon public 키 |
4. **Deploy** 클릭 → 1분 내 `https://lessonnote-xxxx.vercel.app` 같은 링크 발급.

### 3-3. 선생님들께 전달
- 발급된 링크를 단톡방에 공유.
- 각자 폰에서 열고 **홈 화면에 추가**:
  - 아이폰(사파리): 공유 버튼 → "홈 화면에 추가"
  - 안드로이드(크롬): ⋮ → "홈 화면에 추가"
- 이제 누가 입력하든 **모두에게 실시간으로 같이** 보입니다.

---

## 4. 테스트 시나리오 (선생님용)

- 강사 A로 로그인 → 알림장 작성 → 학부모 폰에서 바로 보이는지
- 명단 탭에서 출석 체크 → 다른 선생님 폰에 반영되는지
- 결제 탭에서 수납 확인(원장만 "원장확인") → 동기화 확인
- "관리 탭 → 베타 데이터 초기화" 로 언제든 처음 상태로 되돌리기 가능

---

## 5. ⚠️ 보안 — 실제 데이터 넣기 전 필독

지금 베타는 **편의상 권한을 느슨하게**(링크+키만 있으면 읽기/쓰기) 열어둔 상태입니다.
지금 들어있는 명단은 **익명(마스킹)** 이라 괜찮지만, **실명·연락처 등 실제 가정 데이터를 넣으려면** 그 전에:

1. Supabase **Auth(이메일 로그인)** 연동
2. `supabase_schema.sql` 5)번의 "조이기" 정책으로 교체 (로그인 사용자만 접근)
3. 항목별 테이블 분리 + 학원·역할별 권한(RLS)

이 "정식판" 작업은 다음 단계로 잡아두면 됩니다. (베타로 앱을 충분히 검증한 뒤 진행 권장)

---

## 6. 자주 막히는 곳

- **저장이 안 돼요** → Vercel 환경변수 2개가 정확한지, SQL을 실행했는지 확인. 브라우저 콘솔에 `[saveState]` 오류가 찍히면 키/정책 문제입니다.
- **다른 폰에 반영이 느려요** → 실시간은 보통 1~2초. 안 되면 SQL의 3)번(`supabase_realtime`) 줄이 실행됐는지 확인.
- **빌드 실패** → Node 18+ 인지, `npm install` 이 끝났는지 확인.

---

## 폴더 구성

```
lessonnote-vercel/
├─ README.md              ← (이 문서)
├─ supabase_schema.sql    ← Supabase에 한 번 실행할 SQL
├─ .env.example           ← 환경변수 양식 (복사해서 .env로)
├─ package.json / vite.config.ts / tsconfig.json / index.html
└─ src/
   ├─ App.tsx             ← 레슨노트 앱 (랩뮤직연세 · 익명 · v2 디자인)
   ├─ supabaseClient.ts   ← Supabase 연결 + 저장/실시간
   └─ main.tsx            ← 진입점
```
