import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchSchools, type ScorecardSchool } from "@/lib/college-scorecard/client";
import { buildShortlist, type StudentStats } from "@/lib/college-scorecard/fit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "anthropic/claude-sonnet-4.5";

type Body = {
  studentFirstName?: string;
  gpa?: number | null;
  satTotal?: number | null;
  actComposite?: number | null;
  majorInterest?: string;
  states?: string[];
  control?: "public" | "private" | "either";
  sizeBucket?: "small" | "medium" | "large" | "any";
  maxNetPrice?: number | null;
};

type ResultSchool = ScorecardSchool & { tier: "reach" | "target" | "likely"; blurb: string };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let raw: ScorecardSchool[];
  try {
    raw = await searchSchools({
      states: body.states,
      control: body.control,
      sizeBucket: body.sizeBucket,
      maxNetPrice: body.maxNetPrice ?? null,
      perPage: 80,
    });
  } catch (err) {
    console.error("Scorecard search failed", err);
    return NextResponse.json(
      { error: "College Scorecard lookup failed. Try again in a minute." },
      { status: 502 },
    );
  }

  const student: StudentStats = {
    satTotal: body.satTotal ?? null,
    actComposite: body.actComposite ?? null,
  };
  const shortlist = buildShortlist(raw, student, 4);

  const flat: Array<ScorecardSchool & { tier: "reach" | "target" | "likely" }> = [
    ...shortlist.reach.map((s) => ({ ...s, tier: "reach" as const })),
    ...shortlist.target.map((s) => ({ ...s, tier: "target" as const })),
    ...shortlist.likely.map((s) => ({ ...s, tier: "likely" as const })),
  ];

  if (flat.length === 0) {
    return NextResponse.json({
      studentFirstName: body.studentFirstName ?? "",
      schools: [] as ResultSchool[],
      sourceNote:
        "No schools matched those filters. Try widening states, size, or net-price cap.",
    });
  }

  const blurbs = await generateBlurbs(flat, body);

  const schools: ResultSchool[] = flat.map((s, i) => ({
    ...s,
    blurb: blurbs[i] ?? "",
  }));

  return NextResponse.json({
    studentFirstName: body.studentFirstName ?? "",
    schools,
    sourceNote:
      "Data: U.S. Department of Education College Scorecard (latest available year).",
  });
}

async function generateBlurbs(
  schools: Array<ScorecardSchool & { tier: string }>,
  body: Body,
): Promise<string[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    return schools.map(() => "");
  }

  const profile = [
    body.studentFirstName ? `First name: ${body.studentFirstName}` : null,
    body.gpa ? `GPA: ${body.gpa}` : null,
    body.satTotal ? `SAT: ${body.satTotal}` : null,
    body.actComposite ? `ACT: ${body.actComposite}` : null,
    body.majorInterest ? `Stated interest: ${body.majorInterest}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const numbered = schools
    .map(
      (s, i) =>
        `${i + 1}. ${s.name} (${s.city}, ${s.state}) — tier:${s.tier}, ` +
        `admit_rate:${pct(s.admissionRate)}, SAT_mid:${s.satMidpoint ?? "n/a"}, ` +
        `ACT_mid:${s.actMidpoint ?? "n/a"}, size:${s.size ?? "n/a"}, ` +
        `net_price:${dollars(s.avgNetPrice)}, grad_4yr:${pct(s.completionRate4yr)}`,
    )
    .join("\n");

  const system = `You are the Class 101 College List assistant.
For each numbered school, write ONE concise sentence (max 22 words) explaining why it could fit the student, grounded ONLY in the data provided for that school and the student's profile.

STRICT RULES
- Do NOT invent majors, programs, rankings, vibes, or selectivity tiers not implied by the numbers.
- If the student has a stated interest, you may say "for a student exploring <interest>" — but never claim the school is strong in that field.
- No marketing adjectives ("prestigious", "world-class"). Stick to what the numbers show: selectivity, size, cost, outcomes.
- Output format: a JSON array of exactly ${schools.length} strings, in the same order. No prose around it.`;

  const user = `Student profile: ${profile || "(no profile fields provided)"}

Schools:
${numbered}

Return JSON only.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://class101.ai",
        "X-Title": "Class 101 Ai Hub",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("OpenRouter blurb error", res.status, detail.slice(0, 200));
      return schools.map(() => "");
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = parseBlurbArray(content, schools.length);
    return parsed;
  } catch (err) {
    console.warn("Blurb fetch failed", err);
    return schools.map(() => "");
  }
}

function parseBlurbArray(content: string, expected: number): string[] {
  // Models in JSON-mode sometimes wrap in {"blurbs":[...]} or {"results":[...]}
  // Accept either an array directly or a single key holding an array.
  try {
    const obj = JSON.parse(content) as unknown;
    const arr = Array.isArray(obj)
      ? obj
      : typeof obj === "object" && obj !== null
        ? Object.values(obj as Record<string, unknown>).find(Array.isArray)
        : null;
    if (Array.isArray(arr)) {
      const out = arr.map((v) => (typeof v === "string" ? v : "")).slice(0, expected);
      while (out.length < expected) out.push("");
      return out;
    }
  } catch {
    // fall through
  }
  return Array(expected).fill("");
}

function pct(n: number | null | undefined): string {
  if (typeof n !== "number") return "n/a";
  return `${Math.round(n * 100)}%`;
}
function dollars(n: number | null | undefined): string {
  if (typeof n !== "number") return "n/a";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
