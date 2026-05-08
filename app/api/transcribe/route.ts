import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json(
      { error: "No audio file provided." },
      { status: 400 },
    );
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Audio is over the 25MB limit. Try a shorter clip." },
      { status: 400 },
    );
  }

  const upstreamForm = new FormData();
  upstreamForm.append("file", audio);
  upstreamForm.append("model", "whisper-1");
  upstreamForm.append("language", "en");
  upstreamForm.append("response_format", "verbose_json");

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: upstreamForm,
    });
  } catch (err) {
    console.error("Whisper fetch failed", err);
    return NextResponse.json(
      { error: "Could not reach the transcription service." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Whisper error", res.status, detail);
    return NextResponse.json(
      { error: "Transcription failed." },
      { status: 500 },
    );
  }

  const result = (await res.json()) as {
    text?: string;
    duration?: number;
    language?: string;
  };

  return NextResponse.json({
    transcript: result.text ?? "",
    duration_seconds: result.duration ? Math.round(result.duration) : null,
    language: result.language ?? null,
  });
}
