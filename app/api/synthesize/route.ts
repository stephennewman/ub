import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NOTES_SYSTEM_PROMPT } from "@/lib/ai/house-style";
import { getActiveFranchiseId } from "@/lib/franchises/queries";

export const runtime = "nodejs";
export const maxDuration = 120;

// Claude Sonnet 4.5 on OpenRouter
const MODEL = "anthropic/claude-sonnet-4.5";

type Body = {
  transcript: string;
  studentFirstName?: string;
  gradeLevel?: string;
  meetingDate?: string;
  // Optional link to a Students row. When present, the session row will
  // also reference the student profile.
  studentId?: string;
  // If provided, updates the existing session row in place rather than
  // creating a new one (used for "Re-synthesize" from the detail page).
  sessionId?: string;
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
  const transcript = (body?.transcript ?? "").trim();
  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript is required." },
      { status: 400 },
    );
  }
  if (transcript.length > 200_000) {
    return NextResponse.json(
      { error: "Transcript is too long for this preview." },
      { status: 413 },
    );
  }

  const context = [
    body?.studentFirstName
      ? `Student first name: ${body.studentFirstName}`
      : null,
    body?.gradeLevel ? `Grade level: ${body.gradeLevel}` : null,
    body?.meetingDate ? `Meeting date: ${body.meetingDate}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userMessage = [
    context ? `Session context:\n${context}` : null,
    "Transcript of the advising session:",
    "---",
    transcript,
    "---",
    "Produce the post-session notes following the required format and grounding rules.",
  ]
    .filter(Boolean)
    .join("\n\n");

  let summary = "";
  try {
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          // OpenRouter likes these headers for attribution / rate limit tiering.
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL ?? "https://class101.ai",
          "X-Title": "Class 101 AI Hub",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.3,
          max_tokens: 2000,
          messages: [
            { role: "system", content: NOTES_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenRouter error", res.status, detail);
      return NextResponse.json(
        { error: "Synthesis failed. Please try again." },
        { status: 500 },
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    summary = json.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("OpenRouter fetch failed", err);
    return NextResponse.json(
      { error: "Could not reach the synthesis service." },
      { status: 502 },
    );
  }

  if (!summary) {
    return NextResponse.json(
      { error: "Empty response from synthesis model." },
      { status: 500 },
    );
  }

  // Persist (best-effort; never block the response on storage). Either
  // update the existing row (re-synthesize) or insert a new one.
  const userId = claims.sub;
  let sessionId: string | null = body?.sessionId ?? null;
  if (userId) {
    if (sessionId) {
      const { error: updateError } = await supabase
        .from("sessions")
        .update({ transcript, summary, model: MODEL })
        .eq("id", sessionId);
      if (updateError) {
        console.warn("sessions update failed:", updateError.message);
      }
    } else {
      const franchiseId = await getActiveFranchiseId();
      if (!franchiseId) {
        // RLS would reject anyway; surface a clearer error.
        return NextResponse.json(
          { error: "No active franchise. Refresh and try again." },
          { status: 400 },
        );
      }
      const { data: inserted, error: insertError } = await supabase
        .from("sessions")
        .insert({
          user_id: userId,
          franchise_id: franchiseId,
          student_id: body?.studentId ?? null,
          student_first_name: body?.studentFirstName ?? null,
          grade_level: body?.gradeLevel ?? null,
          meeting_date: body?.meetingDate ?? null,
          transcript,
          summary,
          model: MODEL,
        })
        .select("id")
        .single();
      if (insertError) {
        console.warn("sessions insert failed:", insertError.message);
      } else {
        sessionId = inserted?.id ?? null;
      }
    }
  }

  return NextResponse.json({ summary, sessionId });
}
