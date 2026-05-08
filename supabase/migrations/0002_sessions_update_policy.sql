-- Allow counselors to update their own sessions (for after-the-fact
-- metadata edits like student name, grade, date on the result screen).

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
  on public.sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
