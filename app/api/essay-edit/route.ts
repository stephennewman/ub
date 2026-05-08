import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildEssaySystemPrompt,
  DEFAULT_ESSAY_EDIT_MODE,
  type EssayEditMode,
} from "@/lib/ai/house-style";
import { getActiveFranchiseId } from "@/lib/franchises/queries";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "anthropic/claude-sonnet-4.5";

type Body = {
  prompt: string;
  draft: string;
  // Structured audience context. All optional, but when provided the Ai
  // gets concrete signals instead of freeform notes.
  schoolOrScholarship?: string;
  applicationType?: string; // "common-app" | "supplement" | "scholarship" | "other"
  wordLimit?: number | null;
  notes?: string;
  studentId?: string;
  studentFirstName?: string;
  title?: string;
  // When present, updates an existing essay row in place.
  essayId?: string;
  editMode?: EssayEditMode;
};

const VALID_MODES: ReadonlySet<EssayEditMode> = new Set([
  "proofread",
  "line-edit",
  "developmental",
  "house-style",
]);

type StudentProfileRow = {
  first_name: string | null;
  grade_level: string | null;
  gpa: number | null;
  sat_total: number | null;
  act_composite: number | null;
  major_interest: string | null;
};

export type EssayComment = {
  kind: "strength" | "fix" | "consider";
  title: string;
  detail: string;
};

export type EssayEditResponse = {
  essayId: string | null;
  revisedDraft: string;
  summaryOfChanges: string;
  comments: EssayComment[];
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing OPENROUTER_API_KEY." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const prompt = (body?.prompt ?? "").trim();
  const draft = (body?.draft ?? "").trim();
  const editMode: EssayEditMode =
    body?.editMode && VALID_MODES.has(body.editMode)
      ? body.editMode
      : DEFAULT_ESSAY_EDIT_MODE;

  if (!prompt) {
    return NextResponse.json(
      { error: "Essay prompt is required." },
      { status: 400 },
    );
  }
  if (!draft) {
    return NextResponse.json(
      { error: "Essay draft is required." },
      { status: 400 },
    );
  }
  if (draft.length > 30_000) {
    return NextResponse.json(
      { error: "Draft is too long for this preview (30k char limit)." },
      { status: 413 },
    );
  }

  // Pull the student profile when linked, so the Ai can tailor advice.
  let studentBlock: string | null = null;
  if (body?.studentId) {
    const { data: stu } = await supabase
      .from("students")
      .select(
        "first_name, grade_level, gpa, sat_total, act_composite, major_interest",
      )
      .eq("id", body.studentId)
      .maybeSingle();
    const s = stu as StudentProfileRow | null;
    if (s) {
      const lines = [
        s.first_name ? `First name: ${s.first_name}` : null,
        s.grade_level ? `Grade: ${s.grade_level}` : null,
        s.gpa != null ? `GPA: ${s.gpa}` : null,
        s.sat_total != null ? `SAT: ${s.sat_total}` : null,
        s.act_composite != null ? `ACT: ${s.act_composite}` : null,
        s.major_interest ? `Stated interest: ${s.major_interest}` : null,
      ].filter(Boolean);
      if (lines.length) studentBlock = lines.join("\n");
    }
  }

  const audienceLines = [
    body?.schoolOrScholarship
      ? `School / scholarship: ${body.schoolOrScholarship}`
      : null,
    body?.applicationType
      ? `Application type: ${humanType(body.applicationType)}`
      : null,
    body?.wordLimit ? `Word limit: ${body.wordLimit}` : null,
    body?.notes ? `Counselor notes: ${body.notes}` : null,
  ].filter(Boolean);

  const userMessage = [
    studentBlock
      ? `Student profile (CONTEXT ONLY — for tone/register awareness; do NOT introduce any of these facts into the revised draft):\n${studentBlock}`
      : null,
    `Essay prompt the student is answering:\n${prompt}`,
    audienceLines.length ? `Application context:\n${audienceLines.join("\n")}` : null,
    `Student's draft (the ONLY source of facts for the revision):\n---\n${draft}\n---`,
    "Return the JSON object only. Do not invent any content not present in the draft.",
  ]
    .filter(Boolean)
    .join("\n\n");

  let parsed: {
    revisedDraft: string;
    summaryOfChanges: string;
    comments: EssayComment[];
  };
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "https://class101.ai",
        "X-Title": "Class 101 Ai Hub",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildEssaySystemPrompt(editMode) },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenRouter essay error", res.status, detail.slice(0, 300));
      return NextResponse.json(
        { error: "Essay edit failed. Please try again." },
        { status: 500 },
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    parsed = parseEssayJson(content);
    if (!parsed.revisedDraft) {
      console.error(
        "Essay parse: empty revisedDraft. Raw content sample:",
        content.slice(0, 1200),
      );
    }
  } catch (err) {
    console.error("OpenRouter essay fetch failed", err);
    return NextResponse.json(
      { error: "Could not reach the essay service." },
      { status: 502 },
    );
  }

  if (!parsed.revisedDraft) {
    return NextResponse.json(
      { error: "Empty revision from model." },
      { status: 500 },
    );
  }

  const userId = claims.sub as string | undefined;
  let essayId: string | null = body?.essayId ?? null;

  if (userId) {
    if (essayId) {
      const { error: updateError } = await supabase
        .from("essays")
        .update({
          prompt,
          audience_context: serializeAudience(body),
          original_draft: draft,
          revised_draft: parsed.revisedDraft,
          summary_of_changes: parsed.summaryOfChanges,
          comments_json: parsed.comments,
          model: MODEL,
          updated_at: new Date().toISOString(),
        })
        .eq("id", essayId);
      if (updateError) {
        console.warn("essays update failed:", updateError.message);
      }
    } else {
      const franchiseId = await getActiveFranchiseId();
      if (!franchiseId) {
        return NextResponse.json(
          { error: "No active franchise. Refresh and try again." },
          { status: 400 },
        );
      }
      const { data: inserted, error: insertError } = await supabase
        .from("essays")
        .insert({
          user_id: userId,
          franchise_id: franchiseId,
          student_id: body?.studentId ?? null,
          title: body?.title?.trim() || null,
          prompt,
          audience_context: serializeAudience(body),
          original_draft: draft,
          revised_draft: parsed.revisedDraft,
          summary_of_changes: parsed.summaryOfChanges,
          comments_json: parsed.comments,
          model: MODEL,
        })
        .select("id")
        .single();
      if (insertError) {
        console.warn("essays insert failed:", insertError.message);
      } else {
        essayId = inserted?.id ?? null;
      }
    }
  }

  const payload: EssayEditResponse = {
    essayId,
    revisedDraft: parsed.revisedDraft,
    summaryOfChanges: parsed.summaryOfChanges,
    comments: parsed.comments,
  };
  return NextResponse.json(payload);
}

function humanType(t: string): string {
  switch (t) {
    case "common-app":
      return "Common App personal statement";
    case "supplement":
      return "College supplement";
    case "scholarship":
      return "Scholarship essay";
    default:
      return t;
  }
}

function serializeAudience(b: Body | null): string | null {
  if (!b) return null;
  const parts = [
    b.schoolOrScholarship ? `School: ${b.schoolOrScholarship}` : null,
    b.applicationType ? `Type: ${humanType(b.applicationType)}` : null,
    b.wordLimit ? `Word limit: ${b.wordLimit}` : null,
    b.notes ? `Notes: ${b.notes}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : null;
}

function parseEssayJson(content: string): {
  revisedDraft: string;
  summaryOfChanges: string;
  comments: EssayComment[];
} {
  const empty = { revisedDraft: "", summaryOfChanges: "", comments: [] };
  const cleaned = stripJsonWrapper(content);
  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>;
    const revised =
      typeof obj.revisedDraft === "string"
        ? obj.revisedDraft
        : typeof obj.revised_draft === "string"
          ? obj.revised_draft
          : "";
    const summary =
      typeof obj.summaryOfChanges === "string"
        ? obj.summaryOfChanges
        : typeof obj.summary_of_changes === "string"
          ? obj.summary_of_changes
          : "";
    const rawComments = Array.isArray(obj.comments) ? obj.comments : [];
    const comments: EssayComment[] = rawComments
      .map((c): EssayComment | null => {
        if (!c || typeof c !== "object") return null;
        const rec = c as Record<string, unknown>;
        const kind =
          rec.kind === "strength" || rec.kind === "fix" || rec.kind === "consider"
            ? rec.kind
            : "consider";
        const title = typeof rec.title === "string" ? rec.title : "";
        const detail = typeof rec.detail === "string" ? rec.detail : "";
        if (!title && !detail) return null;
        return { kind, title, detail };
      })
      .filter((c): c is EssayComment => c !== null);
    return { revisedDraft: revised, summaryOfChanges: summary, comments };
  } catch (err) {
    console.error("parseEssayJson failed:", (err as Error).message);
    return empty;
  }
}

/**
 * Some models wrap JSON in ```json … ``` fences or include leading prose
 * even when asked for a raw JSON object. Strip the wrapper and isolate the
 * first balanced {...} block so JSON.parse succeeds.
 */
function stripJsonWrapper(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return s.slice(start, end + 1);
  }
  return s;
}
