import Link from "next/link";

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
      "Record or paste a session transcript. Get a structured Class 101 summary with next steps and pillar gap analysis.",
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
      <div className="space-y-1.5">
        <h1 className="text-2xl tracking-tight text-ink sm:text-3xl">
          Pick a workflow.
        </h1>
        <p className="max-w-4xl text-sm text-ink-soft sm:text-base">
          Three modules are live for this preview. More are on the way.
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {modules.map((m) => (
          <ModuleCard key={m.slug} module={m} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ module: m }: { module: Module }) {
  const isLive = m.status === "live";

  if (isLive && m.href) {
    return (
      <Link
        href={m.href}
        className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      >
        <CardHeader module={m} isLive />
        <CardBody module={m} isLive />
        <div
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--brand-red)" }}
        >
          Open module
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div
      aria-disabled
      className="relative flex cursor-default flex-col gap-3 rounded-2xl border border-line bg-white p-6 opacity-80"
    >
      <CardHeader module={m} isLive={false} />
      <CardBody module={m} isLive={false} />
    </div>
  );
}

function CardHeader({ module: m, isLive }: { module: Module; isLive: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span
        className="grid h-11 w-11 place-items-center rounded-xl"
        style={{
          background: isLive
            ? "var(--brand-red-soft)"
            : "var(--brand-surface-soft)",
          color: isLive ? "var(--brand-red)" : "var(--brand-ink-soft)",
        }}
      >
        {m.icon}
      </span>
      <Badge status={m.status} />
    </div>
  );
}

function CardBody({ module: m, isLive }: { module: Module; isLive: boolean }) {
  return (
    <>
      <h3
        className={`text-xl font-semibold tracking-tight ${
          isLive ? "text-ink" : "text-ink-soft"
        }`}
      >
        {m.name}
      </h3>
      <p className="text-sm leading-6 text-ink-soft">{m.blurb}</p>
    </>
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
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4h12l4 4v12a0 0 0 0 1 0 0H4z" />
      <path d="M16 4v4h4" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  );
}
function EssayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 3l7 7-11 11H3v-7z" />
      <path d="M13 4l7 7" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h12" />
    </svg>
  );
}
function ScholarshipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}
