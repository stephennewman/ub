-- Reverses part of 20260508130000_harden_franchise_helpers.sql.
--
-- Revoking EXECUTE from `authenticated` on `is_member_of` / `is_super_admin`
-- also disabled them inside RLS policies (which evaluate as the calling role),
-- so every franchise-scoped table started returning zero rows for signed-in
-- users.
--
-- The advisor warning about these being exposed via /rest/v1/rpc is accepted:
-- both helpers only reveal whether the *calling* user is a member of a given
-- franchise, which is already inferable from RLS behavior. We do keep `anon`
-- locked out so unauthenticated probes can't enumerate.

grant execute on function public.is_member_of(uuid) to authenticated;
grant execute on function public.is_super_admin()    to authenticated;
