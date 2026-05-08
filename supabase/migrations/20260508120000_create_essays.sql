-- Class 101 AI Hub — Essay Editor
-- Stores the original draft, prompt, and AI-revised output for each essay
-- review. Scoped by franchise (matches students/sessions tenancy model).

create table if not exists public.essays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  franchise_id uuid not null references public.franchises (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null,
  title text,
  prompt text not null,
  audience_context text,
  original_draft text not null,
  revised_draft text not null,
  summary_of_changes text,
  comments_json jsonb,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists essays_franchise_id_created_at_idx
  on public.essays (franchise_id, created_at desc);
create index if not exists essays_student_id_idx
  on public.essays (student_id);

alter table public.essays enable row level security;

drop policy if exists "essays_select_franchise" on public.essays;
create policy "essays_select_franchise"
  on public.essays for select
  to authenticated
  using (public.is_member_of(franchise_id) or public.is_super_admin());

drop policy if exists "essays_insert_franchise" on public.essays;
create policy "essays_insert_franchise"
  on public.essays for insert
  to authenticated
  with check (
    public.is_member_of(franchise_id)
    and user_id = auth.uid()
  );

drop policy if exists "essays_update_franchise" on public.essays;
create policy "essays_update_franchise"
  on public.essays for update
  to authenticated
  using (public.is_member_of(franchise_id) or public.is_super_admin())
  with check (public.is_member_of(franchise_id) or public.is_super_admin());

drop policy if exists "essays_delete_franchise" on public.essays;
create policy "essays_delete_franchise"
  on public.essays for delete
  to authenticated
  using (public.is_member_of(franchise_id) or public.is_super_admin());
