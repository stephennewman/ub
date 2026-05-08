-- Fix infinite recursion in `memberships_select_self_or_owner`.
--
-- The previous policy referenced `public.memberships` from inside a SELECT
-- policy on `public.memberships`, which re-evaluated the same policy and
-- recursed. The "owner can see coworkers' memberships" branch isn't used by
-- any current UI; it'll come back via a SECURITY DEFINER helper when the
-- admin dashboard is built.
--
-- Net effect: a user can read their OWN membership rows. Super admins can
-- read all (via the SECURITY DEFINER helper, no recursion).

drop policy if exists "memberships_select_self_or_owner" on public.memberships;

create policy "memberships_select_self"
  on public.memberships for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_super_admin()
  );
