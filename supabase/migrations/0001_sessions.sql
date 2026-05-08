-- Class 101 AI Hub — Notes Synthesizer
-- Stores transcript + AI summary per session.
-- Audio is intentionally NEVER persisted.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  student_first_name text,
  grade_level text,
  meeting_date date,
  transcript text not null,
  summary text not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_created_at_idx
  on public.sessions (user_id, created_at desc);

alter table public.sessions enable row level security;

-- A counselor can only see their own sessions.
drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
  on public.sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
  on public.sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own"
  on public.sessions
  for delete
  using (auth.uid() = user_id);
