-- Class 101 AI Hub — Student profiles.
-- Each counselor (auth.users row) owns their student records.
-- Sessions can optionally link to a student via sessions.student_id.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text,
  grade_level text,
  gpa numeric(3, 2),
  sat_total integer,
  act_composite integer,
  major_interest text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists students_user_id_created_at_idx
  on public.students (user_id, created_at desc);

alter table public.students enable row level security;

drop policy if exists "students_select_own" on public.students;
create policy "students_select_own"
  on public.students
  for select
  using (auth.uid() = user_id);

drop policy if exists "students_insert_own" on public.students;
create policy "students_insert_own"
  on public.students
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "students_update_own" on public.students;
create policy "students_update_own"
  on public.students
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "students_delete_own" on public.students;
create policy "students_delete_own"
  on public.students
  for delete
  using (auth.uid() = user_id);

-- Link sessions to students (optional / additive — old rows keep null).
alter table public.sessions
  add column if not exists student_id uuid references public.students (id) on delete set null;

create index if not exists sessions_student_id_idx
  on public.sessions (student_id);
