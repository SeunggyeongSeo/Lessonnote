-- =====================================================================
--  레슨노트 베타 · Supabase 스키마 (1단계: 공유 저장 + 실시간)
--  Supabase 대시보드 → 왼쪽 메뉴 "SQL Editor" → New query → 아래 전체 붙여넣고 Run
-- =====================================================================

-- 1) 앱 전체 데이터(JSON 한 덩어리)를 담는 단일 테이블
create table if not exists public.app_state (
  id          text primary key,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) 시작용 빈 행 1개 (앱이 처음 켜질 때 SEED를 여기에 채웁니다)
insert into public.app_state (id, data)
values ('ln:data:v1', '{}'::jsonb)
on conflict (id) do nothing;

-- 3) 실시간(Realtime) 켜기 — 한 명이 입력하면 다른 폰에 바로 반영
alter publication supabase_realtime add table public.app_state;

-- 4) 보안 규칙 (RLS)
--    ⚠️ 베타용: 링크+anon키만 있으면 누구나 읽기/쓰기 가능 (가장 단순)
--    실제 가정 데이터(실명·연락처)를 넣기 전에는 반드시 5)의 "조이기" 버전으로 교체하세요.
alter table public.app_state enable row level security;

drop policy if exists "beta_read"   on public.app_state;
drop policy if exists "beta_insert" on public.app_state;
drop policy if exists "beta_update" on public.app_state;

create policy "beta_read"   on public.app_state for select using (true);
create policy "beta_insert" on public.app_state for insert with check (true);
create policy "beta_update" on public.app_state for update using (true) with check (true);

-- =====================================================================
-- 5) (나중에) 보안 조이기 — 로그인한 사용자만 읽기/쓰기로 바꾸는 예시
--    위 beta_* 정책을 지우고 아래를 적용 (Supabase Auth 로그인 연동 후)
-- ---------------------------------------------------------------------
-- drop policy if exists "beta_read"   on public.app_state;
-- drop policy if exists "beta_insert" on public.app_state;
-- drop policy if exists "beta_update" on public.app_state;
-- create policy "auth_read"   on public.app_state for select using (auth.role() = 'authenticated');
-- create policy "auth_write"  on public.app_state for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- =====================================================================
