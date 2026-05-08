"use client";

import { useEffect, useRef, useState } from "react";
import { diffWordsWithSpace, type Change } from "diff";
import { useActiveStudent } from "@/lib/students/context";
import type { EssayComment, EssayEditResponse } from "@/app/api/essay-edit/route";
import type { EssayEditMode } from "@/lib/ai/house-style";

type Status = "idle" | "submitting" | "success" | "error";

type AppType = "" | "common-app" | "supplement" | "scholarship" | "other";

const EDIT_MODES: Array<{
  value: EssayEditMode;
  label: string;
  hint: string;
}> = [
  {
    value: "proofread",
    label: "Proofread",
    hint: "Grammar, spelling, punctuation only. Voice and content untouched.",
  },
  {
    value: "line-edit",
    label: "Line edit",
    hint: "Tighten sentences, cut clichés and filler. Keeps all content and structure.",
  },
  {
    value: "developmental",
    label: "Developmental edit",
    hint: "Reshape structure and arc. Surfaces gaps as comments — won't invent content.",
  },
  {
    value: "house-style",
    label: "Class 101 house-style polish",
    hint: "Line edit plus Class 101 voice. (Style guide still being codified.)",
  },
];

const SAMPLE = {
  prompt:
    "Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, please share your story.",
  draft:
    "Ever since I was little, I have always loved to play soccer. Soccer has taught me so many important life lessons like teamwork, hard work, and never giving up. When I was 12, I joined my first travel team and I learned that being part of a team is one of the most important things in life. We won a lot of games and we lost a lot of games, but through it all, I kept going. I think soccer has shaped me into the person I am today and I am very grateful for everything it has given me. In conclusion, soccer is more than just a sport to me — it is a way of life.",
};

export type EssayEditorInitial = {
  essayId: string;
  title: string | null;
  prompt: string;
  schoolOrScholarship?: string | null;
  applicationType?: AppType;
  wordLimit?: number | null;
  notes?: string | null;
  originalDraft: string;
  revisedDraft: string;
  summaryOfChanges: string;
  comments: EssayComment[];
};

export function EssayEditor({ initial }: { initial?: EssayEditorInitial }) {
  const activeStudent = useActiveStudent();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [schoolOrScholarship, setSchoolOrScholarship] = useState(
    initial?.schoolOrScholarship ?? "",
  );
  const [applicationType, setApplicationType] = useState<AppType>(
    initial?.applicationType ?? "",
  );
  const [wordLimit, setWordLimit] = useState<string>(
    initial?.wordLimit != null ? String(initial.wordLimit) : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [draft, setDraft] = useState(initial?.originalDraft ?? "");
  const [editMode, setEditMode] = useState<EssayEditMode>("line-edit");
  const [diffMode, setDiffMode] = useState<"diff" | "clean">("diff");

  const [status, setStatus] = useState<Status>(initial ? "success" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EssayEditResponse | null>(
    initial
      ? {
          essayId: initial.essayId,
          revisedDraft: initial.revisedDraft,
          summaryOfChanges: initial.summaryOfChanges,
          comments: initial.comments,
        }
      : null,
  );
  const [resultOriginal, setResultOriginal] = useState<string>(
    initial?.originalDraft ?? "",
  );
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const polishingRef = useRef<HTMLDivElement | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");
    requestAnimationFrame(() => {
      polishingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const limit = wordLimit ? parseInt(wordLimit, 10) : null;

    try {
      const res = await fetch("/api/essay-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          prompt: prompt.trim(),
          schoolOrScholarship: schoolOrScholarship.trim() || null,
          applicationType: applicationType || null,
          wordLimit: Number.isFinite(limit) && limit && limit > 0 ? limit : null,
          notes: notes.trim() || null,
          draft: draft.trim(),
          studentId: activeStudent?.id ?? null,
          studentFirstName: activeStudent?.firstName ?? null,
          essayId: result?.essayId ?? null,
          editMode,
        }),
      });
      const json = (await res.json()) as
        | EssayEditResponse
        | { error: string };
      if (!res.ok || "error" in json) {
        const message = "error" in json ? json.error : "Something went wrong.";
        setError(message);
        setStatus("error");
        return;
      }
      setResult(json);
      setResultOriginal(draft);
      setStatus("success");
      // Smooth-scroll the result into view on first render.
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  function handleStartOver() {
    setResult(null);
    setResultOriginal("");
    setStatus("idle");
    setError(null);
  }

  function loadSample() {
    setTitle("Common App personal statement");
    setPrompt(SAMPLE.prompt);
    setApplicationType("common-app");
    setWordLimit("650");
    setNotes("Voice should stay reflective; the cliché-heavy draft needs tightening.");
    setDraft(SAMPLE.draft);
  }

  async function handleFile(file: File) {
    setError(null);
    setUploadInfo(null);
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".txt") || file.type === "text/plain") {
        const text = await file.text();
        setDraft(text);
        setUploadInfo(`Loaded ${file.name}`);
      } else if (name.endsWith(".docx")) {
        const mammoth = (await import("mammoth/mammoth.browser")) as {
          extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{
            value: string;
            messages: unknown[];
          }>;
        };
        const buf = await file.arrayBuffer();
        const out = await mammoth.extractRawText({ arrayBuffer: buf });
        setDraft(out.value.trim());
        setUploadInfo(`Loaded ${file.name}`);
      } else {
        setError("Only .txt and .docx files are supported.");
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't read that file.");
    }
  }

  const submitting = status === "submitting";
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const limitNum = wordLimit ? parseInt(wordLimit, 10) : null;
  const overLimit =
    limitNum && Number.isFinite(limitNum) && wordCount > limitNum;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {activeStudent
              ? `For ${activeStudent.firstName}${activeStudent.lastName ? " " + activeStudent.lastName : ""}`
              : "No active student selected"}
          </p>
          {initial ? null : (
            <button
              type="button"
              onClick={loadSample}
              className="text-xs font-medium text-ink-soft hover:text-ink"
            >
              Load sample
            </button>
          )}
        </div>

        <Field label="Essay title (optional)">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Common App personal statement"
            className={inputClass}
          />
        </Field>

        <Field label="Prompt the student is answering" required>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={3}
            placeholder="Paste the full prompt the student is responding to."
            className={textareaClass}
          />
        </Field>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="School or scholarship">
            <input
              type="text"
              value={schoolOrScholarship}
              onChange={(e) => setSchoolOrScholarship(e.target.value)}
              placeholder="e.g. Northwestern Medill"
              className={inputClass}
            />
          </Field>
          <Field label="Application type">
            <select
              value={applicationType}
              onChange={(e) => setApplicationType(e.target.value as AppType)}
              className={inputClass}
            >
              <option value="">Choose…</option>
              <option value="common-app">Common App personal statement</option>
              <option value="supplement">College supplement</option>
              <option value="scholarship">Scholarship essay</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Word limit">
            <input
              type="number"
              min={1}
              value={wordLimit}
              onChange={(e) => setWordLimit(e.target.value)}
              placeholder="e.g. 650"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Counselor notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything the AI should know about voice, audience, or what to focus on."
            className={textareaClass}
          />
        </Field>

        <Field
          label="Editing depth"
          hint={
            <span className="text-xs text-muted">
              {EDIT_MODES.find((m) => m.value === editMode)?.hint}
            </span>
          }
        >
          <div className="flex flex-wrap gap-2">
            {EDIT_MODES.map((m) => {
              const active = m.value === editMode;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setEditMode(m.value)}
                  aria-pressed={active}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-transparent bg-ink text-white"
                      : "border-line bg-white text-ink-soft hover:bg-surface-soft hover:text-ink",
                  ].join(" ")}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Student's draft"
          required
          hint={
            <span className={overLimit ? "text-red-600" : undefined}>
              {wordCount} word{wordCount === 1 ? "" : "s"}
              {limitNum ? ` / ${limitNum} limit` : ""}
            </span>
          }
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-soft"
            >
              <UploadIcon /> Upload .docx or .txt
            </button>
            {uploadInfo ? (
              <span className="text-xs text-muted">{uploadInfo}</span>
            ) : (
              <span className="text-xs text-muted">…or paste below</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            required
            rows={14}
            placeholder="Paste the draft here, or upload a file above."
            className={textareaClass}
          />
        </Field>

        {error ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !prompt.trim() || !draft.trim()}
            className="cta-primary"
          >
            {submitting ? (
              <>
                <Spinner /> {result ? "Re-polishing…" : "Polishing…"}
              </>
            ) : result ? (
              "Re-polish"
            ) : (
              "Polish draft"
            )}
          </button>
          {result ? (
            <button
              type="button"
              onClick={handleStartOver}
              className="text-xs font-medium text-ink-soft hover:text-ink"
            >
              Start over
            </button>
          ) : null}
          <p className="ml-auto text-xs text-muted">
            Powered by Claude Sonnet 4.5 · ~10–25s per essay
          </p>
        </div>
      </form>

      {submitting ? (
        <div ref={polishingRef}>
          <PolishingView
            modeLabel={
              EDIT_MODES.find((m) => m.value === editMode)?.label ?? "Polishing"
            }
          />
        </div>
      ) : null}

      {result && !submitting ? (
        <div ref={resultRef}>
          <ResultView
            original={resultOriginal}
            result={result}
            studentName={activeStudent?.firstName}
            title={title}
            diffMode={diffMode}
            setDiffMode={setDiffMode}
          />
        </div>
      ) : null}
    </div>
  );
}

function PolishingView({ modeLabel }: { modeLabel: string }) {
  // Cosmetic progress: fills toward 95% over ~28s, then holds. The actual
  // backend latency varies; this gives the user a sense of motion instead of
  // a frozen spinner. We never claim 100% until the response arrives and the
  // component unmounts.
  const TARGET_MS = 28_000;
  const STAGES = [
    "Reading the prompt and the draft…",
    `Applying ${modeLabel.toLowerCase()}…`,
    "Drafting counselor comments…",
    "Tightening sentences and finalizing…",
  ];
  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(95, (elapsed / TARGET_MS) * 95);
      setProgress(pct);
      const idx = Math.min(
        STAGES.length - 1,
        Math.floor((elapsed / TARGET_MS) * STAGES.length),
      );
      setStageIdx(idx);
      if (elapsed < TARGET_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [STAGES.length]);

  return (
    <section
      className="rounded-2xl border border-line bg-white px-6 py-12 shadow-sm sm:py-16"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <Spinner large />
        <p className="mt-5 text-base font-semibold text-ink">
          Polishing the draft…
        </p>
        <p className="mt-1.5 text-sm text-ink-soft">{STAGES[stageIdx]}</p>
        <div className="mt-6 w-full">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-linear"
              style={{
                width: `${progress}%`,
                background: "var(--brand-red)",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Usually 20–35 seconds · {modeLabel}
          </p>
        </div>
      </div>
    </section>
  );
}

export function ResultView({
  original,
  result,
  studentName,
  title,
  diffMode,
  setDiffMode,
}: {
  original: string;
  result: EssayEditResponse;
  studentName?: string;
  title?: string;
  diffMode: "diff" | "clean";
  setDiffMode: (m: "diff" | "clean") => void;
}) {
  const origWords = original.trim().split(/\s+/).filter(Boolean).length;
  const newWords = result.revisedDraft.trim().split(/\s+/).filter(Boolean).length;
  const changes = diffWordsWithSpace(original, result.revisedDraft);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {title || "Revised draft"}
          </h2>
          <p className="text-sm text-ink-soft">
            {studentName ? `${studentName} · ` : ""}
            {origWords} → {newWords} words
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={diffMode} onChange={setDiffMode} />
          <button
            type="button"
            onClick={() => copyToClipboard(result.revisedDraft)}
            className="inline-flex items-center rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-surface-soft"
          >
            Copy revised
          </button>
          <button
            type="button"
            onClick={() => downloadText(result.revisedDraft, title)}
            className="inline-flex items-center rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-surface-soft"
          >
            Download .txt
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DraftPanel label="Original">
          {diffMode === "diff" ? (
            <DiffText changes={changes} side="original" />
          ) : (
            <PlainText body={original} />
          )}
        </DraftPanel>
        <DraftPanel label="Revised (AI)">
          {diffMode === "diff" ? (
            <DiffText changes={changes} side="revised" />
          ) : (
            <PlainText body={result.revisedDraft} />
          )}
        </DraftPanel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card title="Summary of changes">
          {result.summaryOfChanges ? (
            <div
              className="prose prose-sm max-w-none text-ink-soft"
              dangerouslySetInnerHTML={{
                __html: renderBullets(result.summaryOfChanges),
              }}
            />
          ) : (
            <p className="text-sm text-muted">No summary returned.</p>
          )}
        </Card>

        <Card title="Counselor comments">
          {result.comments.length === 0 ? (
            <p className="text-sm text-muted">No comments returned.</p>
          ) : (
            <ul className="space-y-3">
              {result.comments.map((c, i) => (
                <CommentItem key={i} comment={c} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: "diff" | "clean";
  onChange: (m: "diff" | "clean") => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-line bg-white text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange("diff")}
        className={`px-3 py-2 ${value === "diff" ? "bg-surface-soft text-ink" : "text-ink-soft hover:bg-surface-soft/60"}`}
        aria-pressed={value === "diff"}
      >
        Diff
      </button>
      <button
        type="button"
        onClick={() => onChange("clean")}
        className={`px-3 py-2 ${value === "clean" ? "bg-surface-soft text-ink" : "text-ink-soft hover:bg-surface-soft/60"}`}
        aria-pressed={value === "clean"}
      >
        Clean
      </button>
    </div>
  );
}

function DiffText({
  changes,
  side,
}: {
  changes: Change[];
  side: "original" | "revised";
}) {
  return (
    <p className="whitespace-pre-wrap font-serif text-[15px] leading-7 text-ink">
      {changes.map((c, i) => {
        if (c.added) {
          // Added words only show on the revised side.
          if (side === "revised") {
            return (
              <span
                key={i}
                style={{ background: "#dcfce7", color: "#14532d" }}
              >
                {c.value}
              </span>
            );
          }
          return null;
        }
        if (c.removed) {
          if (side === "original") {
            return (
              <span
                key={i}
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  textDecoration: "line-through",
                  textDecorationColor: "rgba(153,27,27,0.5)",
                }}
              >
                {c.value}
              </span>
            );
          }
          return null;
        }
        return <span key={i}>{c.value}</span>;
      })}
    </p>
  );
}

function PlainText({ body }: { body: string }) {
  return (
    <p className="whitespace-pre-wrap font-serif text-[15px] leading-7 text-ink">
      {body}
    </p>
  );
}

function DraftPanel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <h3 className="mb-3 text-sm font-semibold tracking-tight text-ink">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CommentItem({ comment }: { comment: EssayComment }) {
  const palette =
    comment.kind === "strength"
      ? { bg: "#ecfdf5", text: "#047857", label: "Strength" }
      : comment.kind === "fix"
        ? { bg: "#fef2f2", text: "#b91c1c", label: "Fix" }
        : { bg: "#fefce8", text: "#854d0e", label: "Consider" };
  return (
    <li className="rounded-lg border border-line p-3">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: palette.bg, color: palette.text }}
        >
          {palette.label}
        </span>
        <p className="text-sm font-semibold text-ink">{comment.title}</p>
      </div>
      <p className="text-sm leading-6 text-ink-soft">{comment.detail}</p>
    </li>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">
          {label}
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

const inputClass =
  "block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-slate-400 focus:outline-none";
const textareaClass = `${inputClass} resize-y`;

function Spinner({ large = false }: { large?: boolean }) {
  return (
    <svg
      className={`${large ? "h-8 w-8" : "h-4 w-4"} animate-spin`}
      style={large ? { color: "var(--brand-red)" } : undefined}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function renderBullets(markdown: string): string {
  const lines = markdown.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = lines
    .filter((l) => l.startsWith("- ") || l.startsWith("* "))
    .map((l) => `<li>${escapeHtml(l.replace(/^[-*]\s+/, ""))}</li>`)
    .join("");
  if (!items) return `<p>${escapeHtml(markdown)}</p>`;
  return `<ul class="list-disc pl-5 space-y-1">${items}</ul>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function downloadText(text: string, title?: string) {
  const filename = `${(title || "essay-revised").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "essay-revised"}.txt`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
