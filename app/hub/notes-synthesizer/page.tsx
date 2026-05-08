import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudent } from "@/lib/students/queries";
import { getActiveFranchiseId } from "@/lib/franchises/queries";
import {
  NewSessionButton,
  SessionsView,
  type SessionRow,
} from "./sessions-view";
import { PageHeader } from "@/components/page-header";
import { NotesIcon } from "@/components/module-icons";

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
      <PageHeader
        icon={<NotesIcon size={22} />}
        title="Notes Synthesizer"
        subtitle="Record or paste a session transcript, and get a Class 101–style summary with analysis."
        actions={
          <Suspense fallback={null}>
            <NewSessionButton className="cta-primary">
              + New session
            </NewSessionButton>
          </Suspense>
        }
      />

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
