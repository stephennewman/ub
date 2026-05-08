import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudent } from "@/lib/students/queries";
import { getActiveFranchiseId, getActiveFranchise, listMyMemberships } from "@/lib/franchises/queries";

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
    blurb: "Synthesize a session transcript into a Class 101 summary.",
    href: "/hub/notes-synthesizer",
    icon: <NotesIcon />,
  },
  {
    slug: "college-list",
    name: "College List",
    status: "live",
    blurb: "Generate a fit-driven, cited list of schools.",
    href: "/hub/college-list",
    icon: <ListIcon />,
  },
  {
    slug: "essay-editor",
    name: "Essay Editor",
    status: "live",
    blurb: "Polish a draft with a side-by-side diff and comments.",
    href: "/hub/essay-editor",
    icon: <EssayIcon />,
  },
  {
    slug: "scholarship-search",
    name: "Scholarship Search",
    status: "soon",
    blurb: "Match the student profile to active, eligible scholarships.",
    icon: <ScholarshipIcon />,
  },
];

type RecentSession = {
  id: string;
  studentName: string | null;
  meetingDate: string | null;
  createdAt: string;
};

type RecentEssay = {
  id: string;
  title: string | null;
  studentName: string | null;
  prompt: string;
  updatedAt: string;
};

export default async function HubHome() {
  const supabase = await createClient();
  const [activeStudent, franchiseId, memberships] = await Promise.all([
    getActiveStudent(),
    getActiveFranchiseId(),
    listMyMemberships(),
  ]);
  const active = await getActiveFranchise(memberships);

  // Fetch recent activity scoped to the active franchise (and active student
  // if one is selected). Both queries are best-effort: empty arrays on error.
  let recentSessions: RecentSession[] = [];
  let recentEssays: RecentEssay[] = [];

  if (franchiseId) {
    let sessionsQuery = supabase
      .from("sessions")
      .select("id, student_first_name, meeting_date, created_at")
      .eq("franchise_id", franchiseId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (activeStudent) sessionsQuery = sessionsQuery.eq("student_id", activeStudent.id);
    const { data: sData } = await sessionsQuery;
    type SRow = {
      id: string;
      student_first_name: string | null;
      meeting_date: string | null;
      created_at: string;
    };
    recentSessions = ((sData ?? []) as SRow[]).map((r) => ({
      id: r.id,
      studentName: r.student_first_name,
      meetingDate: r.meeting_date,
      createdAt: r.created_at,
    }));

    let essaysQuery = supabase
      .from("essays")
      .select("id, title, prompt, student_id, updated_at")
      .eq("franchise_id", franchiseId)
      .order("updated_at", { ascending: false })
      .limit(5);
    if (activeStudent) essaysQuery = essaysQuery.eq("student_id", activeStudent.id);
    const { data: eData } = await essaysQuery;
    type ERow = {
      id: string;
      title: string | null;
      prompt: string;
      student_id: string | null;
      updated_at: string;
    };
    const essayRows = (eData ?? []) as ERow[];

    // Resolve student first names for the recent essays in one follow-up.
    const ids = Array.from(
      new Set(essayRows.map((e) => e.student_id).filter((x): x is string => !!x)),
    );
    const namesById = new Map<string, string | null>();
    if (ids.length) {
      const { data: students } = await supabase
        .from("students")
        .select("id, first_name")
        .in("id", ids);
      type StuRow = { id: string; first_name: string | null };
      for (const s of (students ?? []) as StuRow[]) {
        namesById.set(s.id, s.first_name);
      }
    }
    recentEssays = essayRows.map((r) => ({
      id: r.id,
      title: r.title,
      studentName: r.student_id ? (namesById.get(r.student_id) ?? null) : null,
      prompt: r.prompt,
      updatedAt: r.updated_at,
    }));
  }

  const isFirstRun = recentSessions.length === 0 && recentEssays.length === 0;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-5 sm:px-8 sm:py-6">
      {/* Active context strip */}
      <ContextStrip
        franchiseName={active?.franchise.name ?? null}
        franchiseCity={active?.franchise.city ?? null}
        franchiseState={active?.franchise.state ?? null}
        studentName={
          activeStudent
            ? `${activeStudent.firstName}${activeStudent.lastName ? " " + activeStudent.lastName : ""}`
            : null
        }
        studentGrade={activeStudent?.gradeLevel ?? null}
      />

      {isFirstRun ? (
        <FirstRunCard />
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <RecentSessionsCard rows={recentSessions} />
          <RecentEssaysCard rows={recentEssays} />
        </div>
      )}

      {/* Workflows */}
      <div className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Workflows
          </h2>
          <p className="text-xs text-muted">
            {modules.filter((m) => m.status === "live").length} live ·{" "}
            {modules.filter((m) => m.status !== "live").length} coming soon
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((m) => (
            <ModuleCard key={m.slug} module={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContextStrip({
  franchiseName,
  franchiseCity,
  franchiseState,
  studentName,
  studentGrade,
}: {
  franchiseName: string | null;
  franchiseCity: string | null;
  franchiseState: string | null;
  studentName: string | null;
  studentGrade: string | null;
}) {
  const locationLabel = franchiseName
    ? franchiseName.replace(/^Class 101\s*[—-]\s*/, "")
    : "No location selected";
  const locationSub =
    franchiseCity && franchiseState ? `${franchiseCity}, ${franchiseState}` : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-6 sm:px-5">
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{
            background: "var(--brand-red-soft)",
            color: "var(--brand-red)",
          }}
          aria-hidden
        >
          <PinIcon />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Working in
          </p>
          <p className="truncate text-sm font-semibold text-ink">{locationLabel}</p>
          {locationSub ? (
            <p className="truncate text-xs text-ink-soft">{locationSub}</p>
          ) : null}
        </div>
      </div>

      <div className="hidden h-8 w-px bg-line sm:block" aria-hidden />

      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{
            background: studentName ? "var(--brand-red-soft)" : "var(--brand-surface-soft)",
            color: studentName ? "var(--brand-red)" : "var(--brand-ink-soft)",
          }}
          aria-hidden
        >
          <UserIcon />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Active student
          </p>
          <p className="truncate text-sm font-semibold text-ink">
            {studentName ?? "All students"}
          </p>
          {studentGrade ? (
            <p className="truncate text-xs text-ink-soft">{studentGrade}</p>
          ) : null}
        </div>
      </div>

      <p className="ml-auto text-xs text-muted sm:text-right">
        Change either from the top bar.
      </p>
    </div>
  );
}

function FirstRunCard() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center shadow-sm sm:py-14">
      <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        Welcome to the Class 101 AI Hub.
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-soft sm:text-base">
        A working set of AI tools for college counselors — synthesize a meeting,
        polish an essay, or build a fit-driven college list. Recent work will
        show here once you start using the modules below.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/hub/notes-synthesizer?new=1"
          className="cta-primary"
        >
          Synthesize a session
        </Link>
        <Link
          href="/hub/essay-editor?new=1"
          className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-surface-soft"
        >
          Polish an essay
        </Link>
      </div>
    </div>
  );
}

function RecentSessionsCard({ rows }: { rows: RecentSession[] }) {
  return (
    <RecentCard
      title="Recent sessions"
      emptyTitle="No sessions yet"
      emptyHint="Synthesize a transcript to see it here."
      newHref="/hub/notes-synthesizer?new=1"
      newLabel="+ New"
      seeAllHref="/hub/notes-synthesizer"
      isEmpty={rows.length === 0}
    >
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/hub/notes-synthesizer?session=${r.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-soft"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {r.studentName?.trim() || "Untitled session"}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {r.meetingDate ? formatDate(r.meetingDate) : "No meeting date"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {formatRelative(r.createdAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </RecentCard>
  );
}

function RecentEssaysCard({ rows }: { rows: RecentEssay[] }) {
  return (
    <RecentCard
      title="Recent essays"
      emptyTitle="No essays yet"
      emptyHint="Polish a draft to see it here."
      newHref="/hub/essay-editor?new=1"
      newLabel="+ New"
      seeAllHref="/hub/essay-editor"
      isEmpty={rows.length === 0}
    >
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/hub/essay-editor?essay=${r.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-soft"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {r.title?.trim() || "Untitled essay"}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {r.studentName ? `${r.studentName} · ` : ""}
                  {truncate(r.prompt, 90)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {formatRelative(r.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </RecentCard>
  );
}

function RecentCard({
  title,
  newHref,
  newLabel,
  seeAllHref,
  emptyTitle,
  emptyHint,
  isEmpty,
  children,
}: {
  title: string;
  newHref: string;
  newLabel: string;
  seeAllHref: string;
  emptyTitle: string;
  emptyHint: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={newHref}
            className="text-xs font-semibold text-ink-soft hover:text-ink"
          >
            {newLabel}
          </Link>
          <span className="text-line" aria-hidden>·</span>
          <Link
            href={seeAllHref}
            className="text-xs font-semibold"
            style={{ color: "var(--brand-red)" }}
          >
            See all →
          </Link>
        </div>
      </div>
      {isEmpty ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-ink">{emptyTitle}</p>
          <p className="mt-1 text-xs text-ink-soft">{emptyHint}</p>
          <Link
            href={newHref}
            className="mt-3 inline-flex items-center rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-soft"
          >
            {newLabel}
          </Link>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function ModuleCard({ module: m }: { module: Module }) {
  const isLive = m.status === "live";
  const baseRow =
    "group relative flex h-full flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5";

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
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
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
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-sm font-semibold tracking-tight ${
            isLive ? "text-ink" : "text-ink-soft"
          }`}
        >
          {m.name}
        </h3>
        <Badge status={m.status} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-soft">
        {m.blurb}
      </p>
      {showOpen ? (
        <div
          className="mt-auto pt-3 inline-flex items-center gap-1.5 text-xs font-semibold"
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
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
        style={{ background: "#2563eb" }}
      >
        <span className="h-1 w-1 rounded-full bg-white" />
        Beta
      </span>
    );
  }
  if (status === "next") {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: "var(--brand-gold-soft)", color: "#7a5a00" }}
      >
        Up next
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-muted">
      Soon
    </span>
  );
}

// ---- Helpers --------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day}d ago`;
  return new Date(then).toLocaleDateString();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}

// ---- Icons ----------------------------------------------------------------

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
    </svg>
  );
}
function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h12l4 4v12a0 0 0 0 1 0 0H4z" />
      <path d="M16 4v4h4" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  );
}
function EssayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 3l7 7-11 11H3v-7z" />
      <path d="M13 4l7 7" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h12" />
    </svg>
  );
}
function ScholarshipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}
