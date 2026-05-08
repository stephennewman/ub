import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudent } from "@/lib/students/queries";
import { getActiveFranchiseId } from "@/lib/franchises/queries";
import { EssaysView, NewEssayButton, type EssayRow } from "./essays-view";

export const metadata = {
  title: "Essay Editor — Class 101 AI Hub",
};

type EssayRowFromDb = {
  id: string;
  title: string | null;
  prompt: string;
  audience_context: string | null;
  student_id: string | null;
  original_draft: string;
  updated_at: string;
};

type StudentNameRow = { id: string; first_name: string | null };

export default async function EssayEditorListPage() {
  const supabase = await createClient();
  const [activeStudent, franchiseId] = await Promise.all([
    getActiveStudent(),
    getActiveFranchiseId(),
  ]);

  let query = supabase
    .from("essays")
    .select(
      "id, title, prompt, audience_context, student_id, original_draft, updated_at",
    )
    .order("updated_at", { ascending: false })
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

  const essays = (data ?? []) as EssayRowFromDb[];

  // One small follow-up query to attach student first names, since RLS on
  // the join would require a view. Keep it simple while volumes are small.
  const studentIds = Array.from(
    new Set(essays.map((e) => e.student_id).filter((x): x is string => !!x)),
  );
  const studentNames = new Map<string, string | null>();
  if (studentIds.length) {
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name")
      .in("id", studentIds);
    for (const s of (students ?? []) as StudentNameRow[]) {
      studentNames.set(s.id, s.first_name);
    }
  }

  const rows: EssayRow[] = essays.map((e) => ({
    id: e.id,
    title: e.title,
    prompt: e.prompt,
    audience_context: e.audience_context,
    student_first_name: e.student_id
      ? (studentNames.get(e.student_id) ?? null)
      : null,
    word_count: countWords(e.original_draft),
    updated_at: e.updated_at,
  }));

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-4 sm:px-8 sm:py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl tracking-tight text-ink sm:text-3xl">
            Polish a student&rsquo;s essay.
          </h1>
          <p className="max-w-4xl text-sm text-ink-soft sm:text-base">
            Paste a draft and the prompt. The AI returns a house-style revision
            with teaching comments side-by-side.
          </p>
        </div>
        <Suspense fallback={null}>
          <NewEssayButton className="cta-primary">
            + New essay polish
          </NewEssayButton>
        </Suspense>
      </header>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn&rsquo;t load essays: {error.message}
        </p>
      ) : null}

      <div className="mt-4">
        <Suspense fallback={null}>
          <EssaysView rows={rows} />
        </Suspense>
      </div>
    </div>
  );
}

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}
