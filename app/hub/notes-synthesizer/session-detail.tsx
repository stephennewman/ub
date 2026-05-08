"use client";

import { useEffect, useRef, useState } from "react";
import { RenderedSummary } from "./rendered-summary";

type Initial = {
  id: string;
  studentFirstName: string;
  gradeLevel: string;
  meetingDate: string;
  transcript: string;
  summary: string;
};

export function SessionDetail({
  initial,
  onSavedChange,
}: {
  initial: Initial;
  onSavedChange?: (savedAt: number) => void;
}) {
  const [studentFirstName, setStudentFirstName] = useState(
    initial.studentFirstName,
  );
  const [gradeLevel, setGradeLevel] = useState(initial.gradeLevel);
  const [meetingDate, setMeetingDate] = useState(initial.meetingDate);
  const [transcript, setTranscript] = useState(initial.transcript);
  const [summary, setSummary] = useState(initial.summary);

  const [showTranscript, setShowTranscript] = useState(false);
  const [resynthesizing, setResynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Debounced metadata save. Bubbles "saved" pulse up so the drawer chrome
  // can show it.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sessions/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentFirstName: studentFirstName.trim() || null,
            gradeLevel: gradeLevel || null,
            meetingDate: meetingDate || null,
          }),
        });
        if (res.ok) onSavedChange?.(Date.now());
      } catch {
        /* noop */
      }
    }, 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    initial.id,
    studentFirstName,
    gradeLevel,
    meetingDate,
    onSavedChange,
  ]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  function downloadSummary() {
    const blob = new Blob([summary], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName =
      studentFirstName.trim().replace(/\W+/g, "-") || "session";
    a.download = `class101-${safeName}-${meetingDate || "notes"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function resynthesize() {
    if (transcript.trim().length < 50) {
      setError("Transcript is too short.");
      return;
    }
    setError(null);
    setResynthesizing(true);
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, sessionId: initial.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Re-synthesis failed");
      }
      const data = (await res.json()) as { summary: string };
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setResynthesizing(false);
    }
  }

  return (
    <article className="rounded-2xl border border-line bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <input
              value={studentFirstName}
              onChange={(e) => setStudentFirstName(e.target.value)}
              placeholder="Student first name"
              className="min-w-0 max-w-[180px] rounded-md border border-transparent bg-transparent px-1.5 py-1 text-base font-semibold text-ink placeholder:text-muted hover:border-line focus:border-line focus:bg-surface-soft focus:outline-none"
            />
            <span aria-hidden className="text-line">·</span>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-ink-soft hover:border-line focus:border-line focus:bg-surface-soft focus:outline-none"
            >
              <option value="">Grade level</option>
              {[
                "9th grade",
                "10th grade",
                "11th grade",
                "12th grade",
                "Super Junior",
                "Other",
              ].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <span aria-hidden className="text-line">·</span>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-ink-soft hover:border-line focus:border-line focus:bg-surface-soft focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton onClick={copySummary}>
              {copied ? "Copied ✓" : "Copy"}
            </ToolbarButton>
            <ToolbarButton onClick={downloadSummary}>
              Download .md
            </ToolbarButton>
          </div>
        </header>

        <div className="px-5 py-6 sm:px-7 sm:py-7">
          {resynthesizing ? (
            <SkeletonSummary />
          ) : (
            <div className="markdown space-y-4 text-[15px] leading-7 text-ink">
              <RenderedSummary markdown={summary} />
            </div>
          )}

          {error ? (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-line px-5 py-3 sm:px-7">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="flex w-full items-center justify-between text-left text-sm font-medium text-ink-soft hover:text-ink"
            aria-expanded={showTranscript}
          >
            <span>
              {showTranscript ? "Hide raw transcript" : "Show raw transcript"}
            </span>
            <span
              className={`text-muted transition-transform ${
                showTranscript ? "rotate-180" : ""
              }`}
              aria-hidden
            >
              ▾
            </span>
          </button>
          {showTranscript ? (
            <div className="mt-4 space-y-3 pb-2">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
                className="block w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm leading-6 text-ink shadow-sm focus:outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as string]: "var(--brand-red)" }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={resynthesize}
                  disabled={resynthesizing}
                  className="cta-primary"
                >
                  {resynthesizing ? "Re-synthesizing…" : "Re-synthesize"}
                </button>
                <span className="text-xs text-muted">
                  Edits to the transcript are saved when you re-synthesize.
                </span>
              </div>
            </div>
          ) : null}
        </footer>
      </article>
  );
}

function ToolbarButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center rounded-full border border-line bg-white px-3 text-xs font-medium text-ink-soft hover:bg-surface-soft"
    >
      {children}
    </button>
  );
}

function SkeletonSummary() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      <div className="h-3 w-full rounded bg-slate-100" />
      <div className="h-3 w-5/6 rounded bg-slate-100" />
      <div className="h-3 w-4/6 rounded bg-slate-100" />
    </div>
  );
}
