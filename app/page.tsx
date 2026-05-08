import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = Boolean(data?.claims);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader isAuthed={isAuthed} />

      <main className="flex-1">
        <Hero isAuthed={isAuthed} />
        <SocialProof />
        <Modules isAuthed={isAuthed} />
        <HowItWorks />
        <FAQ />
        <CTA isAuthed={isAuthed} />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/85 backdrop-blur supports-backdrop-filter:bg-white/70">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3.5 sm:px-8">
        <Wordmark />
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
          <a href="#modules" className="hover:text-ink">
            Modules
          </a>
          <a href="#how" className="hover:text-ink">
            How it works
          </a>
          <a href="#faq" className="hover:text-ink">
            FAQ
          </a>
        </nav>
        <Link
          href={isAuthed ? "/hub" : "/login"}
          className="cta-primary"
        >
          {isAuthed ? "View Ai Hub" : "Sign in"}
        </Link>
      </div>
    </header>
  );
}

function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 45% at 50% 0%, rgba(255,188,0,0.18) 0%, rgba(225,37,27,0.06) 45%, transparent 75%)",
        }}
      />
      <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-6 sm:px-8 sm:pt-10 sm:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="text-base font-medium text-ink-soft sm:text-lg">
              Say hello to
            </p>
            <h1 className="mt-2 text-balance leading-[0.95] tracking-tight text-ink text-4xl sm:text-5xl md:text-6xl xl:text-7xl">
              <span style={{ color: "var(--brand-red)" }}>
                Student-counselor sessions modernized,
              </span>
              <br />
              and much more.
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-lg text-ink-soft sm:text-xl">
              Record the meeting or paste a transcript. Get a polished Class 101
              summary — with next steps, decisions, and pillar gap analysis — in
              seconds. Eyes on the student, not on your laptop.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={isAuthed ? "/hub" : "/login"}
                className="cta-primary-lg"
              >
                {isAuthed ? "View Ai Hub" : "Sign in to the Ai Hub"}
              </Link>
              <a
                href="#modules"
                className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-white px-7 text-base font-semibold text-ink hover:bg-surface-soft"
              >
                See what&rsquo;s inside
              </a>
            </div>
            <p className="mt-4 text-xs text-muted">
              Private demo · Access by invitation only
            </p>
          </div>

          <div className="lg:col-span-5">
            <HeroPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="mt-2 lg:mt-0">
      <div
        className="relative rounded-2xl border border-line bg-white shadow-xl shadow-slate-900/5"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
        }}
      >
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="ml-3 text-xs font-medium text-muted">
            Notes Synthesizer · Junior check-in
          </span>
        </div>
        <div className="grid gap-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Recording
            </p>
            <div
              className="mt-2 flex items-center gap-3 rounded-xl border px-4 py-3.5"
              style={{
                background: "var(--brand-red-soft)",
                borderColor: "rgba(225,37,27,0.25)",
              }}
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-full text-white"
                style={{ background: "var(--brand-red)" }}
              >
                <RecordIcon />
              </span>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-semibold text-ink">
                  Live session
                </span>
                <span className="text-xs text-ink-soft">
                  47:12 · auto-transcribing
                </span>
              </div>
              <Waveform />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
              Pillars discussed
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                ["Academics", true],
                ["Test Prep", true],
                ["Essays", true],
                ["College List", true],
                ["Activities", false],
                ["Scholarships", false],
              ].map(([label, on]) => (
                <span
                  key={String(label)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    on
                      ? "border-transparent text-white"
                      : "border border-dashed border-line text-muted"
                  }`}
                  style={
                    on
                      ? { background: "var(--brand-ink)" }
                      : undefined
                  }
                >
                  {on ? "✓" : "·"} {label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Class 101 summary
            </p>
            <div className="mt-2 space-y-3 rounded-xl border border-line bg-white p-4 text-sm leading-6 text-ink">
              <p>
                <span className="font-semibold">Discussed today:</span> ACT
                schedule, essay topic shortlist, narrowed reach schools to 3.
              </p>
              <p>
                <span className="font-semibold">Decisions:</span> retake ACT in
                December; commit to UNC essay topic on community service.
              </p>
              <p>
                <span className="font-semibold">Next steps for student:</span>
                {" "}draft UNC essay (1st pass); finish ACT practice test #4.
              </p>
              <p className="text-xs text-muted">
                Generated in 9 seconds · Class 101 house style
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function Waveform() {
  const bars = [3, 6, 4, 8, 5, 7, 4, 9, 5, 7, 3, 6];
  return (
    <div className="flex items-end gap-0.5">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full"
          style={{
            height: `${h * 2}px`,
            background: "var(--brand-red)",
            opacity: 0.4 + (h / 10) * 0.6,
          }}
        />
      ))}
    </div>
  );
}

function SocialProof() {
  const wins = [
    {
      title: "Hours back, every week",
      body: "No more 30-minute note synthesis after every session. Get a polished summary the moment the meeting ends.",
    },
    {
      title: "In your house style",
      body: "Class 101 voice, structure, and next-steps format — every time. No more starting from a blank page.",
    },
    {
      title: "Eyes on the student",
      body: "Stop clicking through a meeting. Record naturally and let the synthesizer do the rest.",
    },
  ];
  return (
    <section className="border-y border-line bg-surface-soft">
      <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Why counselors will use this
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {wins.map((w) => (
            <div
              key={w.title}
              className="rounded-2xl border border-line bg-white p-5"
            >
              <h3 className="text-base font-bold tracking-tight text-ink">
                {w.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Modules({ isAuthed }: { isAuthed: boolean }) {
  const modules = [
    {
      name: "Notes Synthesizer",
      status: "live" as const,
      blurb:
        "Record or paste a session transcript. Get a structured Class 101 summary with next steps and a gap analysis across planning pillars.",
      icon: <NotesIcon />,
    },
    {
      name: "Essay Editor",
      status: "next" as const,
      blurb:
        "Upload an essay draft and the prompt. Get house-style edits with a side-by-side diff, ready for export.",
      icon: <EssayIcon />,
    },
    {
      name: "College List",
      status: "soon" as const,
      blurb:
        "Generate a grounded, cited list of fit schools — backed by College Scorecard and a curated knowledge base.",
      icon: <ListIcon />,
    },
    {
      name: "Scholarship Search",
      status: "soon" as const,
      blurb:
        "Match the student profile to active, eligible scholarships with tailored application guidance.",
      icon: <ScholarshipIcon />,
    },
  ];
  return (
    <section
      id="modules"
      className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          One hub. Every advising workflow.
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          Start with the workflow that gives back the most counselor time.
          Add modules as the team is ready.
        </p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {modules.map((m) => {
          const isLive = m.status === "live";
          const Card = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{
                    background: isLive
                      ? "var(--brand-red-soft)"
                      : "var(--brand-surface-soft)",
                    color: isLive
                      ? "var(--brand-red)"
                      : "var(--brand-ink-soft)",
                  }}
                >
                  {m.icon}
                </span>
                <ModuleBadge status={m.status} />
              </div>
              <h3
                className={`text-xl font-semibold tracking-tight ${
                  isLive ? "text-ink" : "text-ink-soft"
                }`}
              >
                {m.name}
              </h3>
              <p className="text-sm leading-6 text-ink-soft">{m.blurb}</p>
              {isLive ? (
                <span
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: "var(--brand-red)" }}
                >
                  Try it now <span aria-hidden>→</span>
                </span>
              ) : null}
            </>
          );

          return isLive ? (
            <Link
              key={m.name}
              href={
                isAuthed
                  ? "/hub/notes-synthesizer"
                  : "/login?next=/hub/notes-synthesizer"
              }
              className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 transition-colors hover:border-slate-300"
            >
              {Card}
            </Link>
          ) : (
            <div
              key={m.name}
              aria-disabled
              className="relative flex cursor-default flex-col gap-3 rounded-2xl border border-line bg-white p-6 opacity-80"
            >
              {Card}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ModuleBadge({ status }: { status: "live" | "next" | "soon" }) {
  if (status === "live") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
        style={{ background: "var(--brand-red)" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        Live
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

function HowItWorks() {
  const steps = [
    {
      title: "Counselor leads the session",
      body: "Eyes on the student, not the laptop. Record on your phone or in the browser, or paste a transcript afterward.",
    },
    {
      title: "Ai does the synthesis",
      body: "Class 101 house style, structured sections, and a gap analysis across the planning pillars — every time.",
    },
    {
      title: "Counselor reviews and ships",
      body: "Verify against the raw transcript, copy to the platform, or export to share with the family.",
    },
  ];
  return (
    <section id="how" className="border-y border-line bg-surface-soft">
      <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            We don&rsquo;t replace the counselor. We get them to a great
            starting point in seconds, so their expertise can take it the rest
            of the way.
          </p>
        </div>
        <ol className="mx-auto mt-12 grid gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="rounded-2xl border border-line bg-white p-6"
            >
              <div
                className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: "var(--brand-red)" }}
              >
                {i + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Will this replace what I do?",
      a: "No. The Ai gets you to a great starting point in seconds — your judgment, your relationship with the family, and your expertise still drive the meeting. Think of it as the assistant you never had time to hire.",
    },
    {
      q: "Can I edit what the Ai gives me?",
      a: "Always. Every summary is a starting draft. You can edit the transcript and re-synthesize, copy and paste into your platform, or download as a Markdown file and tweak in any editor.",
    },
    {
      q: "Will my notes still sound like Class 101?",
      a: "Yes — that’s the whole point. The synthesizer is tuned to the Class 101 voice and section structure. As we onboard your franchise, we’ll codify your exact phrasing, pillar definitions, and next-steps format.",
    },
    {
      q: "What if I don’t want to record the meeting?",
      a: "You don’t have to. Paste a transcript instead — from your phone’s recorder app, from Zoom, or from typed notes you took during the session. The synthesizer treats both inputs the same way.",
    },
    {
      q: "What happens to the audio?",
      a: "Nothing — it’s never stored. Audio is transcribed in the browser session and discarded. Only the transcript and the final summary are saved, and only to your account.",
    },
    {
      q: "Does it work on my phone?",
      a: "Yes. The hub runs in any modern mobile browser, including in-browser recording on iPhone and Android.",
    },
  ];
  return (
    <section id="faq" className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Common questions
        </h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {faqs.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left text-base font-semibold text-ink">
              {f.q}
              <span
                className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p
              className="mt-3 text-sm leading-7 text-ink-soft"
              dangerouslySetInnerHTML={{ __html: f.a }}
            />
          </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="mx-auto max-w-[1400px] px-5 pb-20 sm:px-8 sm:pb-28">
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-red) 0%, #a01911 100%)",
        }}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ background: "var(--brand-gold)" }}
        />
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Try it on your next session.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/85 sm:text-lg">
          Record, paste, or upload a transcript. See if a Class 101 summary in
          10 seconds beats spending 30 minutes typing one up.
        </p>
        <Link
          href={isAuthed ? "/hub" : "/login"}
          className="mt-8 inline-flex h-12 items-center justify-center bg-white px-7 text-base font-semibold uppercase tracking-wide shadow-sm transition-colors hover:bg-white/90"
          style={{ color: "var(--brand-red)" }}
        >
          {isAuthed ? "View Ai Hub" : "Sign in to try it"}
        </Link>
      </div>
    </section>
  );
}

/* Module icons */
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