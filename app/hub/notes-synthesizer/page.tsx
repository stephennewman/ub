import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudent } from "@/lib/students/queries";
import { getActiveFranchiseId } from "@/lib/franchises/queries";
import {
  NewSessionButton,
  SessionsView,
  type SessionRow,
} from "./sessions-view";

export default async function NotesSynthesizerListPage() {
  const supabase = await createClient();
  const [activeStudent, franchiseId] = await Promise.all([
    getActiveStudent(),
    getActiveFranchiseId(),
  ]);

  // Always scope to the active franchise (RLS would otherwise allow seeing
  // sessions from any franchise the user belongs to). Further narrow to a
  // single student when one is selected.
  let query = supabase
    .from("sessions")
    .select(
      "id, student_first_name, grade_level, meeting_date, summary, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (franchiseId) {
    query = query.eq("franchise_id", franchiseId);
  }
  if (activeStudent) {
    query = query.eq("student_id", activeStudent.id);
  }
  const { data, error } = franchiseId
    ? await query
    : { data: [], error: null };

  const rows = (data ?? []) as SessionRow[];

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-4 sm:px-8 sm:py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl tracking-tight text-ink sm:text-3xl">
            Synthesize a student meeting.
          </h1>
          <p className="max-w-4xl text-sm text-ink-soft sm:text-base">
            Record or paste a session transcript, and get a Class 101–style
            summary with analysis.
          </p>
        </div>
        <Suspense fallback={null}>
          <NewSessionButton className="cta-primary">
            + New session
          </NewSessionButton>
        </Suspense>
      </header>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn’t load sessions: {error.message}
        </p>
      ) : null}

      <div className="mt-4">
        <Suspense fallback={null}>
          <SessionsView rows={rows} />
        </Suspense>
      </div>
    </div>
  );
}
