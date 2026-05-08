import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EssayComment } from "@/app/api/essay-edit/route";

export const runtime = "nodejs";

export type EssayDetail = {
  id: string;
  title: string | null;
  prompt: string;
  audienceContext: string | null;
  originalDraft: string;
  revisedDraft: string;
  summaryOfChanges: string;
  comments: EssayComment[];
  studentId: string | null;
  studentFirstName: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
};

type EssayRow = {
  id: string;
  title: string | null;
  prompt: string;
  audience_context: string | null;
  original_draft: string;
  revised_draft: string;
  summary_of_changes: string | null;
  comments_json: EssayComment[] | null;
  student_id: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS already scopes by franchise membership. We additionally join the
  // student's first name for display.
  const { data, error } = await supabase
    .from("essays")
    .select(
      "id, title, prompt, audience_context, original_draft, revised_draft, summary_of_changes, comments_json, student_id, model, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = data as EssayRow;

  let studentFirstName: string | null = null;
  if (row.student_id) {
    const { data: stu } = await supabase
      .from("students")
      .select("first_name")
      .eq("id", row.student_id)
      .maybeSingle();
    studentFirstName =
      (stu as { first_name?: string | null } | null)?.first_name ?? null;
  }

  const payload: EssayDetail = {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    audienceContext: row.audience_context,
    originalDraft: row.original_draft,
    revisedDraft: row.revised_draft,
    summaryOfChanges: row.summary_of_changes ?? "",
    comments: row.comments_json ?? [],
    studentId: row.student_id,
    studentFirstName,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return NextResponse.json(payload);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { error } = await supabase.from("essays").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
