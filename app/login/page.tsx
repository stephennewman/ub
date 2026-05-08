import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/wordmark";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ next?: string; status?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next, status } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const dest = next && next.startsWith("/") ? next : "/hub";
    redirect(dest);
  }

  const notice =
    status === "check-email"
      ? "Check your email to confirm your account, then sign in."
      : null;

  return (
    <div className="grid min-h-dvh flex-1 grid-cols-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Wordmark />

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-6 py-12">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-ink">
                Welcome back
              </h1>
              <p className="text-sm text-ink-soft">
                Sign in to access the Ai Hub.
              </p>
            </div>
            <LoginForm next={next ?? "/hub"} notice={notice} />
            <p className="text-xs text-muted">Access by invitation only.</p>
          </div>
        </div>

        <p className="text-xs text-muted">© {new Date().getFullYear()} Class 101</p>
      </div>

      {/* Brand side */}
      <div
        className="relative hidden flex-col justify-between p-12 text-white lg:flex"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-red) 0%, #a01911 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(60% 60% at 100% 0%, rgba(255,188,0,0.18) 0%, transparent 50%), radial-gradient(50% 50% at 0% 100%, rgba(255,255,255,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Internal demo
          </span>
        </div>
        <div className="relative max-w-md space-y-6">
          <h2 className="text-balance text-4xl font-bold leading-tight">
            College planning, made simple — and made faster.
          </h2>
          <p className="text-white/85">
            Class 101 Ai Hub turns recorded sessions, essay drafts, and college
            research into polished work product — in your house style. So
            counselors can keep their eyes on the student.
          </p>
          <ul className="space-y-2.5 text-sm text-white/90">
            {[
              { label: "Notes Synthesizer", state: "live" },
              { label: "Essay Editor", state: "soon" },
              { label: "College List", state: "soon" },
              { label: "Scholarship Search", state: "soon" },
            ].map((m) => (
              <li key={m.label} className="flex items-center gap-2">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-xs ${
                    m.state === "live" ? "bg-white text-brand" : "bg-white/20"
                  }`}
                  aria-hidden
                >
                  {m.state === "live" ? "✓" : "·"}
                </span>
                <span className={m.state === "live" ? "" : "text-white/70"}>
                  {m.label}
                  {m.state === "live" ? (
                    <span className="ml-2 text-xs uppercase tracking-wider text-white/70">
                      live
                    </span>
                  ) : (
                    <span className="ml-2 text-xs uppercase tracking-wider text-white/60">
                      coming soon
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/70">
          Class 101 · Powering 80+ locations across 28 states
        </p>
      </div>
    </div>
  );
}
