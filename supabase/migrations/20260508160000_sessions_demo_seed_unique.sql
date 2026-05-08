-- Prevent duplicate demo-seed sessions at the database level. The seeder
-- has historically depended on application-level idempotency checks; if
-- those misfire (e.g. a flaky count() result), we still cannot insert
-- duplicate seeded rows for the same (franchise, student, meeting_date).

create unique index if not exists sessions_demo_seed_unique
  on public.sessions (franchise_id, student_id, meeting_date)
  where model = 'demo-seed';
