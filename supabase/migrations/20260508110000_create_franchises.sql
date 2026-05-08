-- Class 101 Ai Hub — Franchise tenancy.
--
-- Introduces multi-tenant scoping so a single counselor can belong to one or
-- more franchise locations, and content (students, sessions, future essays)
-- is shared within a franchise rather than locked to the user who created it.
--
-- Design:
--   - `franchises` is the tenant boundary.
--   - `memberships` is many-to-many user <-> franchise with a role.
--   - All content tables get `franchise_id`. The pre-existing `user_id`
--     column is retained as `created_by` (attribution), not the access key.
--   - RLS now checks franchise membership instead of `auth.uid() = user_id`.
--   - Roles: 'counselor' (default), 'owner' (franchise admin), 'super_admin'
--     (Class 101 corporate — bypasses franchise scoping). Super admin gets
--     no UI yet but the policy hook is in place.
--
-- Backfill strategy: every existing user with content gets their own
-- single-seat franchise (named after their email local part) and is added
-- as `owner`. Existing rows are stamped with that franchise_id. Once a real
-- invite flow exists, owners can be invited into a shared franchise and
-- their personal one decommissioned.

-- 1. Tables ---------------------------------------------------------------

create table if not exists public.franchises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  franchise_id uuid not null references public.franchises (id) on delete cascade,
  role text not null default 'counselor'
    check (role in ('counselor', 'owner', 'super_admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, franchise_id)
);

create index if not exists memberships_franchise_id_idx
  on public.memberships (franchise_id);

-- 2. Helper functions -----------------------------------------------------
-- SECURITY DEFINER so RLS policies on `memberships` itself don't recurse.

create or replace function public.is_member_of(target_franchise uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.memberships m
     where m.user_id = auth.uid()
       and m.franchise_id = target_franchise
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.memberships m
     where m.user_id = auth.uid()
       and m.role = 'super_admin'
  );
$$;

-- 3. Add franchise_id to existing content tables --------------------------

alter table public.students
  add column if not exists franchise_id uuid references public.franchises (id) on delete cascade;

alter table public.sessions
  add column if not exists franchise_id uuid references public.franchises (id) on delete cascade;

-- 4. Backfill -------------------------------------------------------------
-- For every user that has at least one content row but no membership yet,
-- create a personal franchise, add them as owner, and stamp their rows.

do $backfill$
declare
  rec record;
  new_franchise_id uuid;
  user_email text;
begin
  for rec in
    select distinct user_id
      from (
        select user_id from public.students
        union
        select user_id from public.sessions
      ) src
     where not exists (
       select 1 from public.memberships m where m.user_id = src.user_id
     )
  loop
    select email into user_email from auth.users where id = rec.user_id;

    insert into public.franchises (name, slug)
    values (
      coalesce(split_part(user_email, '@', 1), 'Class 101 user') || ' (legacy)',
      'legacy-' || rec.user_id::text
    )
    returning id into new_franchise_id;

    insert into public.memberships (user_id, franchise_id, role)
    values (rec.user_id, new_franchise_id, 'owner');
  end loop;
end
$backfill$;

-- Stamp existing students with their owner's franchise.
update public.students s
   set franchise_id = m.franchise_id
  from public.memberships m
 where s.user_id = m.user_id
   and s.franchise_id is null;

update public.sessions ss
   set franchise_id = m.franchise_id
  from public.memberships m
 where ss.user_id = m.user_id
   and ss.franchise_id is null;

-- 5. Make franchise_id required going forward -----------------------------

alter table public.students   alter column franchise_id set not null;
alter table public.sessions   alter column franchise_id set not null;

create index if not exists students_franchise_id_idx
  on public.students (franchise_id);
create index if not exists sessions_franchise_id_idx
  on public.sessions (franchise_id);

-- 6. RLS: franchises + memberships ---------------------------------------

alter table public.franchises  enable row level security;
alter table public.memberships enable row level security;

drop policy if exists "franchises_select_member" on public.franchises;
create policy "franchises_select_member"
  on public.franchises for select
  to authenticated
  using (public.is_member_of(id) or public.is_super_admin());

-- Owners (and super admins) can rename their franchise.
drop policy if exists "franchises_update_owner" on public.franchises;
create policy "franchises_update_owner"
  on public.franchises for update
  to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.memberships m
       where m.user_id = auth.uid()
         and m.franchise_id = public.franchises.id
         and m.role = 'owner'
    )
  )
  with check (true);

-- Memberships: users can see their own membership rows; owners can see all
-- rows in franchises they own (so the future admin dashboard can list staff).
drop policy if exists "memberships_select_self_or_owner" on public.memberships;
create policy "memberships_select_self_or_owner"
  on public.memberships for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.memberships own
       where own.user_id = auth.uid()
         and own.franchise_id = public.memberships.franchise_id
         and own.role = 'owner'
    )
  );

-- Bootstrap policy: a brand-new user with zero memberships may create a
-- personal franchise and add themselves as owner. Once an invite system
-- exists this is replaced by service-role driven inserts.

drop policy if exists "franchises_insert_bootstrap" on public.franchises;
create policy "franchises_insert_bootstrap"
  on public.franchises for insert
  to authenticated
  with check (
    not exists (
      select 1 from public.memberships m where m.user_id = auth.uid()
    )
  );

drop policy if exists "memberships_insert_bootstrap" on public.memberships;
create policy "memberships_insert_bootstrap"
  on public.memberships for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and not exists (
      select 1 from public.memberships m where m.user_id = auth.uid()
    )
  );

-- 7. Re-scope content RLS to franchise membership ------------------------
-- Replace the per-user policies. `user_id` stays as the `created_by`
-- attribution column.

-- Students
drop policy if exists "students_select_own"   on public.students;
drop policy if exists "students_insert_own"   on public.students;
drop policy if exists "students_update_own"   on public.students;
drop policy if exists "students_delete_own"   on public.students;

create policy "students_select_franchise"
  on public.students for select
  to authenticated
  using (public.is_member_of(franchise_id) or public.is_super_admin());

create policy "students_insert_franchise"
  on public.students for insert
  to authenticated
  with check (
    public.is_member_of(franchise_id)
    and user_id = auth.uid()
  );

create policy "students_update_franchise"
  on public.students for update
  to authenticated
  using (public.is_member_of(franchise_id) or public.is_super_admin())
  with check (public.is_member_of(franchise_id) or public.is_super_admin());

create policy "students_delete_franchise"
  on public.students for delete
  to authenticated
  using (public.is_member_of(franchise_id) or public.is_super_admin());

-- Sessions
drop policy if exists "sessions_select_own"   on public.sessions;
drop policy if exists "sessions_insert_own"   on public.sessions;
drop policy if exists "sessions_update_own"   on public.sessions;
drop policy if exists "sessions_delete_own"   on public.sessions;

create policy "sessions_select_franchise"
  on public.sessions for select
  to authenticated
  using (public.is_member_of(franchise_id) or public.is_super_admin());

create policy "sessions_insert_franchise"
  on public.sessions for insert
  to authenticated
  with check (
    public.is_member_of(franchise_id)
    and user_id = auth.uid()
  );

create policy "sessions_update_franchise"
  on public.sessions for update
  to authenticated
  using (public.is_member_of(franchise_id) or public.is_super_admin())
  with check (public.is_member_of(franchise_id) or public.is_super_admin());

create policy "sessions_delete_franchise"
  on public.sessions for delete
  to authenticated
  using (public.is_member_of(franchise_id) or public.is_super_admin());
