"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceRecorder } from "@/components/voice-recorder";
import { useActiveStudent } from "@/lib/students/context";

type Stage = "details" | "capture" | "paste" | "working";

export function CaptureFlow() {
  const router = useRouter();
  const activeStudent = useActiveStudent();
  const [stage, setStage] = useState<Stage>("details");

  const [studentFirstName, setStudentFirstName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => isoToday());

  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from the active student when one is selected. Counselor can
  // still edit before continuing.
  useEffect(() => {
    if (!activeStudent) return;
    setStudentFirstName(activeStudent.firstName);
    if (activeStudent.gradeLevel) setGradeLevel(activeStudent.gradeLevel);
  }, [activeStudent]);

  async function synthesize(text: string) {
    if (text.trim().length < 50) {
      setError("Transcript is too short. Record or paste a longer session.");
      return;
    }
    setError(null);
    setStage("working");
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          studentFirstName: studentFirstName.trim() || undefined,
          gradeLevel: gradeLevel || undefined,
          meetingDate: meetingDate || undefined,
          studentId: activeStudent?.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Synthesis failed");
      }
      const data = (await res.json()) as { sessionId: string | null };
      if (!data.sessionId) {
        throw new Error(
          "Couldn’t save the session. Please refresh and try again.",
        );
      }
      router.replace(`/hub/notes-synthesizer?session=${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage(text === transcript && transcript ? "paste" : "capture");
    }
  }

  if (stage === "working") return <WorkingView />;

  if (stage === "details") {
    return (
      <DetailsView
        studentFirstName={studentFirstName}
        gradeLevel={gradeLevel}
        meetingDate={meetingDate}
        onStudentFirstName={setStudentFirstName}
        onGradeLevel={setGradeLevel}
        onMeetingDate={setMeetingDate}
        onContinue={() => setStage("capture")}
      />
    );
  }

  if (stage === "paste") {
    return (
      <PasteView
        transcript={transcript}
        onTranscript={setTranscript}
        onBack={() => {
          setError(null);
          setStage("capture");
        }}
        onSynthesize={() => synthesize(transcript)}
        error={error}
      />
    );
  }

  return (
    <CaptureView
      onTranscription={(text) => {
        setTranscript(text);
        void synthesize(text);
      }}
      onPaste={() => {
        setError(null);
        setStage("paste");
      }}
      onBack={() => {
        setError(null);
        setStage("details");
      }}
      error={error}
    />
  );
}

function DetailsView(props: {
  studentFirstName: string;
  gradeLevel: string;
  meetingDate: string;
  onStudentFirstName: (v: string) => void;
  onGradeLevel: (v: string) => void;
  onMeetingDate: (v: string) => void;
  onContinue: () => void;
}) {
  const canContinue = props.studentFirstName.trim().length > 0;
  return (
    <section className="rounded-2xl border border-line bg-white px-6 py-12 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-md">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Step 1 of 2
        </p>
        <h2 className="mt-2 text-3xl tracking-tight text-ink sm:text-4xl">
          Who&rsquo;s this session with?
        </h2>
        <p className="mt-3 text-sm text-ink-soft">
          We&rsquo;ll attach this to the summary so it&rsquo;s easy to find later.
        </p>

        <div className="mt-7 space-y-4">
          <Field label="Student first name" htmlFor="student">
            <input
              id="student"
              autoFocus
              value={props.studentFirstName}
              onChange={(e) => props.onStudentFirstName(e.target.value)}
              placeholder="e.g. Maya"
              className={inputClass}
              style={inputRing}
              autoComplete="off"
            />
          </Field>
          <Field label="Grade level" htmlFor="grade">
            <select
              id="grade"
              value={props.gradeLevel}
              onChange={(e) => props.onGradeLevel(e.target.value)}
              className={inputClass}
              style={inputRing}
            >
              <option value="">Select…</option>
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
          </Field>
          <Field label="Meeting date" htmlFor="date">
            <input
              id="date"
              type="date"
              value={props.meetingDate}
              onChange={(e) => props.onMeetingDate(e.target.value)}
              className={inputClass}
              style={inputRing}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={props.onContinue}
          disabled={!canContinue}
          className="cta-primary mt-7 w-full sm:w-auto"
        >
          Continue →
        </button>
      </div>
    </section>
  );
}

function CaptureView({
  onTranscription,
  onPaste,
  onBack,
  error,
}: {
  onTranscription: (t: string) => void;
  onPaste: () => void;
  onBack: () => void;
  error: string | null;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white px-6 py-12 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-xl text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          ← Back
        </button>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
          Step 2 of 2
        </p>
        <h2 className="mt-2 text-3xl tracking-tight text-ink sm:text-4xl">
          Record this session.
        </h2>
        <p className="mt-3 text-base text-ink-soft">
          Press record and put your laptop down. We&rsquo;ll synthesize a
          Class 101 summary the moment you stop.
        </p>

        <div className="mt-8">
          <VoiceRecorder onTranscription={onTranscription} />
        </div>

        <button
          type="button"
          onClick={onPaste}
          className="mt-6 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          or paste a transcript instead
        </button>

        {error ? <ErrorBanner message={error} /> : null}
      </div>
    </section>
  );
}

function PasteView({
  transcript,
  onTranscript,
  onBack,
  onSynthesize,
  error,
}: {
  transcript: string;
  onTranscript: (t: string) => void;
  onBack: () => void;
  onSynthesize: () => void;
  error: string | null;
}) {
  const canSubmit = transcript.trim().length >= 50;
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          ← Back
        </button>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
          Step 2 of 2
        </p>
        <h2 className="mt-2 text-3xl tracking-tight text-ink sm:text-4xl">
          Paste your transcript.
        </h2>
        <textarea
          value={transcript}
          onChange={(e) => onTranscript(e.target.value)}
          rows={14}
          placeholder="Paste a session transcript here…"
          className="mt-6 block w-full rounded-xl border border-line bg-white px-4 py-3 text-sm leading-6 text-ink shadow-sm focus:outline-none focus:ring-2"
          style={{ ["--tw-ring-color" as string]: "var(--brand-red)" }}
        />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSynthesize}
            disabled={!canSubmit}
            className="cta-primary"
          >
            Synthesize summary
          </button>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
      </div>
    </section>
  );
}

function WorkingView() {
  return (
    <section className="rounded-2xl border border-line bg-white px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-md text-center">
        <Spinner />
        <p className="mt-6 text-base font-semibold text-ink">
          Synthesizing your Class 101 summary…
        </p>
        <p className="mt-2 text-sm text-muted">
          Usually 5–15 seconds. Hang tight.
        </p>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1.5 text-left">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink shadow-sm focus:outline-none focus:ring-2";
const inputRing = { ["--tw-ring-color" as string]: "var(--brand-red)" };

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-line"
      style={{ borderTopColor: "var(--brand-red)" }}
      aria-hidden
    />
  );
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
