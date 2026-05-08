import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";
import { HubSidebar } from "./sidebar";
import {
  ensureSeededStudents,
  getActiveStudent,
  listStudents,
} from "@/lib/students/queries";
import { ensureSeededSessions } from "@/lib/sessions/seed";
import { ensureSeededEssays } from "@/lib/essays/seed";
import { ActiveStudentProvider } from "@/lib/students/context";
import { ActiveFranchiseProvider } from "@/lib/franchises/context";
import {
  ensureBootstrapMembership,
  getActiveFranchise,
  listMyMemberships,
} from "@/lib/franchises/queries";
import { StudentPicker } from "@/components/student-picker";
import { FranchiseChip } from "@/components/franchise-chip";
import { TopBarBreadcrumb } from "./top-bar-breadcrumb";

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login?next=/hub");

  const email = String(claims.email ?? "");
  const userId = String(claims.sub ?? "");
  const initials =
    email
      .split("@")[0]
      .split(/[._-]/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  // Day-1 bootstrap: any signed-in user without a franchise gets a personal
  // workspace. No-op once they've been added to one (or seeded by migration).
  if (userId) await ensureBootstrapMembership(userId, email);

  const memberships = await listMyMemberships();
  const active = await getActiveFranchise(memberships);

  // Seed demo data into the active franchise the first time a user
  // lands in it. Set DISABLE_DEMO_SEED=1 in the environment to skip all
  // three seeders (e.g. for production tenants who don't want demo
  // content). Existing rows always short-circuit each seeder regardless.
  const demoSeedDisabled = /^(1|true|yes)$/i.test(
    process.env.DISABLE_DEMO_SEED ?? "",
  );
  if (userId && active && !demoSeedDisabled) {
    await ensureSeededStudents(userId, active.franchise.id);
    await ensureSeededSessions(userId, active.franchise.id);
    await ensureSeededEssays(userId, active.franchise.id);
  }

  const [students, activeStudent] = await Promise.all([
    listStudents(),
    getActiveStudent(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-surface-soft lg:flex-row">
      <ActiveFranchiseProvider active={active} memberships={memberships}>
        <HubSidebar email={email} initials={initials} signOutAction={logout} />
        <ActiveStudentProvider activeStudent={activeStudent} students={students}>
          <div className="flex flex-1 min-w-0 flex-col">
            <div className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-white/85 px-5 backdrop-blur supports-backdrop-filter:bg-white/70 sm:px-8">
              <TopBarBreadcrumb />
              <div className="flex items-center gap-2">
                <FranchiseChip />
                <StudentPicker />
              </div>
            </div>
            <main className="flex-1">{children}</main>
          </div>
        </ActiveStudentProvider>
      </ActiveFranchiseProvider>
    </div>
  );
}
