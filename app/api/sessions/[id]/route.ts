import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  // RLS scopes the row to the owner; missing row → 404 either way.
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, student_first_name, grade_level, meeting_date, transcript, summary, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    studentFirstName: data.student_first_name ?? "",
    gradeLevel: data.grade_level ?? "",
    meetingDate: data.meeting_date ?? "",
    transcript: data.transcript ?? "",
    summary: data.summary ?? "",
    createdAt: data.created_at,
  });
}

type Patch = {
  studentFirstName?: string | null;
  gradeLevel?: string | null;
  meetingDate?: string | null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Patch | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Build the update payload, mapping camelCase → snake_case columns.
  const update: Record<string, string | null> = {};
  if ("studentFirstName" in body) {
    update.student_first_name = body.studentFirstName ?? null;
  }
  if ("gradeLevel" in body) {
    update.grade_level = body.gradeLevel ?? null;
  }
  if ("meetingDate" in body) {
    update.meeting_date = body.meetingDate ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  // RLS restricts updates to the row owner.
  const { error } = await supabase.from("sessions").update(update).eq("id", id);
  if (error) {
    console.warn("sessions PATCH failed:", error.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
