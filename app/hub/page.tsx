import Link from "next/link";
import { FranchiseChip } from "@/components/franchise-chip";
import { StudentPicker } from "@/components/student-picker";

type ModuleStatus = "live" | "next" | "soon";

type Module = {
  slug: string;
  name: string;
  status: ModuleStatus;
  blurb: string;
  href?: string;
  icon: React.ReactNode;
};

const modules: Module[] = [
  {
    slug: "notes-synthesizer",
    name: "Notes Synthesizer",
    status: "live",
    blurb:
      "Record or paste a session transcript. Get a Class 101 summary with next steps and pillar gap analysis.",
    href: "/hub/notes-synthesizer",
    icon: <NotesIcon />,
  },
  {
    slug: "college-list",
    name: "College List",
    status: "live",
    blurb:
      "Generate a grounded, cited list of fit schools — backed by U.S. Dept. of Education College Scorecard data.",
    href: "/hub/college-list",
    icon: <ListIcon />,
  },
  {
    slug: "essay-editor",
    name: "Essay Editor",
    status: "live",
    blurb:
      "Paste a draft and prompt. Get house-style edits with a side-by-side diff and teaching comments.",
    href: "/hub/essay-editor",
    icon: <EssayIcon />,
  },
  {
    slug: "scholarship-search",
    name: "Scholarship Search",
    status: "soon",
    blurb:
      "Match the student profile to active, eligible scholarships with tailored application guidance.",
    icon: <ScholarshipIcon />,
  },
];

export default function HubHome() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-5 sm:px-8 sm:py-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5">
          <WelcomeCard />
        </section>

        <section className="lg:col-span-7">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Workflows
            </h2>
            <p className="text-xs text-muted">
              {modules.filter((m) => m.status === "live").length} live ·{" "}
              {modules.filter((m) => m.status !== "live").length} coming soon
            </p>
          </div>
          <div className="space-y-3">
            {modules.map((m) => (
              <ModuleCard key={m.slug} module={m} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function WelcomeCard() {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Welcome
      </p>
      <h1 className="mt-1.5 text-2xl tracking-tight text-ink sm:text-3xl">
        Class 101 AI Hub
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-soft sm:text-base">
        A working set of AI tools for college counselors — built around how
        Class 101 actually advises. Synthesize a meeting in seconds, polish an
        essay in your house style, and build a fit-driven college list grounded
        in real Scorecard data.
      </p>

      <div className="mt-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Get set up
        </p>

        <div className="flex flex-col gap-2">
          <SetupRow
            step={1}
            label="Pick your location"
            hint="The franchise everything below scopes to."
          >
            <FranchiseChip />
          </SetupRow>
          <SetupRow
            step={2}
            label="Pick a student"
            hint="Optional — narrows tools to a single student."
          >
            <StudentPicker />
          </SetupRow>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted">
        You can change either at any time from the top bar.
      </p>
    </div>
  );
}

function SetupRow({
  step,
  label,
  hint,
  children,
}: {
  step: number;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-soft/50 px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: "var(--brand-red)" }}
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{label}</p>
          {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
        </div>
      </div>
      <div className="mt-3 pl-10">{children}</div>
    </div>
  );
}

function ModuleCard({ module: m }: { module: Module }) {
  const isLive = m.status === "live";
  const baseRow =
    "group relative flex items-start gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5";

  if (isLive && m.href) {
    return (
      <Link
        href={m.href}
        className={`${baseRow} transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md`}
      >
        <CardIcon module={m} isLive />
        <CardBody module={m} isLive showOpen />
      </Link>
    );
  }

  return (
    <div aria-disabled className={`${baseRow} cursor-default opacity-80`}>
      <CardIcon module={m} isLive={false} />
      <CardBody module={m} isLive={false} showOpen={false} />
    </div>
  );
}

function CardIcon({ module: m, isLive }: { module: Module; isLive: boolean }) {
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
      style={{
        background: isLive
          ? "var(--brand-red-soft)"
          : "var(--brand-surface-soft)",
        color: isLive ? "var(--brand-red)" : "var(--brand-ink-soft)",
      }}
    >
      {m.icon}
    </span>
  );
}

function CardBody({
  module: m,
  isLive,
  showOpen,
}: {
  module: Module;
  isLive: boolean;
  showOpen: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <h3
          className={`text-base font-semibold tracking-tight ${
            isLive ? "text-ink" : "text-ink-soft"
          }`}
        >
          {m.name}
        </h3>
        <Badge status={m.status} />
      </div>
      <p className="mt-1 text-sm leading-6 text-ink-soft">{m.blurb}</p>
      {showOpen ? (
        <div
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--brand-red)" }}
        >
          Open
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Badge({ status }: { status: ModuleStatus }) {
  if (status === "live") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ background: "#2563eb" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        Beta
      </span>
    );
  }
  if (status === "next") {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ background: "var(--brand-gold-soft)", color: "#7a5a00" }}
      >
        Up next
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted">
      Coming soon
    </span>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h12l4 4v12a0 0 0 0 1 0 0H4z" />
      <path d="M16 4v4h4" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  );
}
function EssayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 3l7 7-11 11H3v-7z" />
      <path d="M13 4l7 7" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h12" />
    </svg>
  );
}
function ScholarshipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}
