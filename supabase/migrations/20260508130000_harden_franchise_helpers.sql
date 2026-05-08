-- Tighten security advisor findings from the franchise tenancy rollout:
--   1. `franchises_update_owner` had `with check (true)`, letting an owner
--      change a row to a different franchise. Mirror the USING clause.
--   2. `is_member_of` / `is_super_admin` are SECURITY DEFINER policy helpers
--      and were callable as PostgREST RPC by anon + authenticated. Revoke
--      EXECUTE so they can only be invoked from inside RLS policies.

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
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.memberships m
       where m.user_id = auth.uid()
         and m.franchise_id = public.franchises.id
         and m.role = 'owner'
    )
  );

revoke execute on function public.is_member_of(uuid) from public, anon, authenticated;
revoke execute on function public.is_super_admin()    from public, anon, authenticated;
