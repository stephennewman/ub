import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  HubIcon,
  NotesIcon,
  ListIcon,
  EssayIcon,
  ScholarshipIcon,
} from "@/components/module-icons";

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

export default function HubHome() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-5 sm:px-8 sm:py-6">
      <PageHeader
        icon={<HubIcon size={22} />}
        title="Ai Hub"
        subtitle="A working set of Ai tools for Class 101 counselors. Pick a workflow to get started."
      />
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          Workflows
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <ModuleCard key={m.slug} module={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ module: m }: { module: Module }) {
  const isLive = m.status === "live";
  const baseRow =
    "group relative flex h-full flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7";

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
      className="grid h-14 w-14 shrink-0 place-items-center rounded-xl"
      style={{
        background: isLive
          ? "var(--brand-red-soft)"
          : "var(--brand-surface-soft)",
        color: isLive ? "var(--brand-red)" : "var(--brand-ink-soft)",
      }}
    >
      <span className="[&>svg]:h-7 [&>svg]:w-7">{m.icon}</span>
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
          className={`text-lg font-semibold tracking-tight ${
            isLive ? "text-ink" : "text-ink-soft"
          }`}
        >
          {m.name}
        </h3>
        <Badge status={m.status} />
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {m.blurb}
      </p>
      {showOpen ? (
        <div
          className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
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
