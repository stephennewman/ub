"use client";

import { useMemo, useState } from "react";
import { useActiveStudent } from "@/lib/students/context";

type Tier = "reach" | "target" | "likely";

type ResultSchool = {
  id: number;
  name: string;
  city: string;
  state: string;
  controlLabel: string;
  size: number | null;
  admissionRate: number | null;
  satMidpoint: number | null;
  actMidpoint: number | null;
  avgNetPrice: number | null;
  completionRate4yr: number | null;
  medianEarnings10yr: number | null;
  schoolUrl: string | null;
  scorecardUrl: string;
  tier: Tier;
  blurb: string;
};

type ApiResponse = {
  studentFirstName: string;
  schools: ResultSchool[];
  sourceNote: string;
};

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function CollegeListBuilder() {
  const activeStudent = useActiveStudent();

  const [states, setStates] = useState<string[]>([]);
  const [control, setControl] = useState<"public" | "private" | "either">("either");
  const [sizeBucket, setSizeBucket] = useState<"small" | "medium" | "large" | "any">("any");
  const [maxNetPrice, setMaxNetPrice] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function onGenerate() {
    if (!activeStudent) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/college-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentFirstName: activeStudent.firstName,
          gpa: activeStudent.gpa,
          satTotal: activeStudent.satTotal,
          actComposite: activeStudent.actComposite,
          majorInterest: activeStudent.majorInterest ?? undefined,
          states: states.length ? states : undefined,
          control,
          sizeBucket,
          maxNetPrice: maxNetPrice ? Number(maxNetPrice) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not generate list.");
      }
      const data = (await res.json()) as ApiResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const out = { reach: [] as ResultSchool[], target: [] as ResultSchool[], likely: [] as ResultSchool[] };
    if (!result) return out;
    for (const s of result.schools) out[s.tier].push(s);
    return out;
  }, [result]);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink">Student profile</h2>
        <p className="mt-1 text-xs text-muted">
          Pulled from the active student. Edit on the student record to change.
        </p>

        <div className="mt-5">
          {activeStudent ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-line bg-surface-soft p-4">
              <ProfileStat
                label="Name"
                value={
                  activeStudent.lastName
                    ? `${activeStudent.firstName} ${activeStudent.lastName}`
                    : activeStudent.firstName
                }
              />
              <ProfileStat
                label="Grade"
                value={activeStudent.gradeLevel ?? "—"}
              />
              <ProfileStat
                label="GPA"
                value={
                  activeStudent.gpa !== null ? activeStudent.gpa.toFixed(2) : "—"
                }
              />
              <ProfileStat
                label="Test score"
                value={
                  activeStudent.satTotal
                    ? `SAT ${activeStudent.satTotal}`
                    : activeStudent.actComposite
                      ? `ACT ${activeStudent.actComposite}`
                      : "—"
                }
              />
              <div className="col-span-2">
                <ProfileStat
                  label="Major interest"
                  value={activeStudent.majorInterest ?? "—"}
                />
              </div>
            </dl>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-surface-soft px-4 py-6 text-center">
              <p className="text-sm font-medium text-ink">
                No student selected.
              </p>
              <p className="mt-1 text-xs text-muted">
                Use the picker at the top of the page to choose a student.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <Field label="States (optional)" htmlFor="cl-states">
            <select
              id="cl-states"
              multiple
              value={states}
              onChange={(e) =>
                setStates(Array.from(e.target.selectedOptions, (o) => o.value))
              }
              className={`${inputClass} h-32`}
              style={inputRing}
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-muted">
              Hold ⌘ / Ctrl to multi-select. Leave empty for nationwide.
            </span>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Control" htmlFor="cl-control">
              <select
                id="cl-control"
                value={control}
                onChange={(e) => setControl(e.target.value as typeof control)}
                className={inputClass}
                style={inputRing}
              >
                <option value="either">Either</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </Field>
            <Field label="Size" htmlFor="cl-size">
              <select
                id="cl-size"
                value={sizeBucket}
                onChange={(e) => setSizeBucket(e.target.value as typeof sizeBucket)}
                className={inputClass}
                style={inputRing}
              >
                <option value="any">Any</option>
                <option value="small">Small (&lt;3k)</option>
                <option value="medium">Medium (3–10k)</option>
                <option value="large">Large (10k+)</option>
              </select>
            </Field>
          </div>

          <Field label="Max annual net price ($)" htmlFor="cl-cost">
            <input
              id="cl-cost"
              inputMode="numeric"
              value={maxNetPrice}
              onChange={(e) => setMaxNetPrice(e.target.value)}
              placeholder="35000"
              className={inputClass}
              style={inputRing}
            />
          </Field>

          <button
            type="button"
            onClick={onGenerate}
            disabled={loading || !activeStudent}
            className="cta-primary w-full"
          >
            {loading
              ? "Generating…"
              : !activeStudent
                ? "Select a student first"
                : "Generate list"}
          </button>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      <section>
        {!result && !loading ? (
          <EmptyState />
        ) : loading ? (
          <LoadingState />
        ) : result && result.schools.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white px-5 py-6 text-sm text-ink-soft">
            {result.sourceNote}
          </p>
        ) : result ? (
          <div className="space-y-6">
            <SourceBanner note={result.sourceNote} count={result.schools.length} />
            <TierGroup title="Reach" tone="reach" schools={grouped.reach} />
            <TierGroup title="Target" tone="target" schools={grouped.target} />
            <TierGroup title="Likely" tone="likely" schools={grouped.likely} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function TierGroup({
  title,
  tone,
  schools,
}: {
  title: string;
  tone: Tier;
  schools: ResultSchool[];
}) {
  if (schools.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <TierPill tone={tone} />
        <span className="text-xs text-muted">{schools.length}</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {schools.map((s) => (
          <SchoolCard key={s.id} school={s} />
        ))}
      </ul>
    </div>
  );
}

function SchoolCard({ school: s }: { school: ResultSchool }) {
  return (
    <li className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-ink">{s.name}</h4>
          <p className="mt-0.5 text-xs text-muted">
            {s.city}, {s.state} · {s.controlLabel}
            {s.size ? ` · ${formatNum(s.size)} undergrads` : ""}
          </p>
        </div>
        <a
          href={s.scorecardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
          aria-label={`${s.name} on College Scorecard`}
        >
          Source ↗
        </a>
      </div>

      {s.blurb ? (
        <p className="mt-3 text-sm leading-6 text-ink">{s.blurb}</p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Stat label="Admit rate" value={pct(s.admissionRate)} />
        <Stat
          label="Test midpoint"
          value={
            s.satMidpoint
              ? `SAT ${s.satMidpoint}`
              : s.actMidpoint
                ? `ACT ${s.actMidpoint}`
                : "n/a"
          }
        />
        <Stat label="Avg net price" value={dollars(s.avgNetPrice)} />
        <Stat label="4-yr grad rate" value={pct(s.completionRate4yr)} />
      </dl>

      {s.schoolUrl ? (
        <a
          href={s.schoolUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          School website ↗
        </a>
      ) : null}
    </li>
  );
}

function TierPill({ tone }: { tone: Tier }) {
  const map: Record<Tier, { bg: string; fg: string }> = {
    reach: { bg: "var(--brand-red-soft)", fg: "var(--brand-red-hover)" },
    target: { bg: "var(--brand-gold-soft)", fg: "#7a5a00" },
    likely: { bg: "rgba(16,185,129,0.12)", fg: "#0f766e" },
  };
  const { bg, fg } = map[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: bg, color: fg }}
    >
      {tone}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function SourceBanner({ note, count }: { note: string; count: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface-soft px-4 py-3 text-xs text-ink-soft">
      <span className="font-semibold text-ink">{count} schools</span> — {note}{" "}
      This list is a starting draft from public data. Verify with the
      counselor&rsquo;s judgment before sharing.
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <p className="text-sm font-semibold text-ink">No list yet</p>
      <p className="mt-1 text-sm text-ink-soft">
        Choose your search filters and press <em>Generate list</em>.
      </p>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="truncate text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center">
      <span
        className="inline-block h-9 w-9 animate-spin rounded-full border-[3px] border-line"
        style={{ borderTopColor: "var(--brand-red)" }}
        aria-hidden
      />
      <p className="mt-5 text-sm font-semibold text-ink">
        Querying College Scorecard…
      </p>
      <p className="mt-1 text-xs text-muted">
        Pulling schools and grading fit. Usually 5–10 seconds.
      </p>
    </div>
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
    <label htmlFor={htmlFor} className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm focus:outline-none focus:ring-2";
const inputRing = { ["--tw-ring-color" as string]: "var(--brand-red)" };

function pct(n: number | null | undefined): string {
  if (typeof n !== "number") return "n/a";
  return `${Math.round(n * 100)}%`;
}
function dollars(n: number | null | undefined): string {
  if (typeof n !== "number") return "n/a";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}
