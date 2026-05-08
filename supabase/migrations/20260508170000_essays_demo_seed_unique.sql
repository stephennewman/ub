-- Class 101 Ai Hub — Essay Editor demo-seed safety net.
-- Prevents duplicate seeded essays per (franchise, student) under races,
-- mirroring the sessions_demo_seed_unique partial index.

create unique index if not exists essays_demo_seed_unique
  on public.essays (franchise_id, student_id)
  where model = 'demo-seed';
