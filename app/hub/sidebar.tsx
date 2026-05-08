"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import {
  HubIcon,
  NotesIcon,
  ListIcon,
  EssayIcon,
  ScholarshipIcon,
  StudentsIcon,
  AdminIcon,
} from "@/components/module-icons";

type NavItem = {
  label: string;
  href: string;
  status: "live" | "soon";
  icon: React.ReactNode;
  /** When the route also matches sub-paths, set true so children stay active. */
  matchPrefix?: boolean;
};

type NavGroup = {
  /** Optional section label shown above the group when expanded. */
  label?: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    items: [
      { label: "Ai Hub", href: "/hub", icon: <HubIcon />, status: "live" },
      {
        label: "Notes Synthesizer",
        href: "/hub/notes-synthesizer",
        icon: <NotesIcon />,
        status: "live",
        matchPrefix: true,
      },
      {
        label: "College List",
        href: "/hub/college-list",
        icon: <ListIcon />,
        status: "live",
        matchPrefix: true,
      },
      {
        label: "Essay Editor",
        href: "/hub/essay-editor",
        icon: <EssayIcon />,
        status: "live",
        matchPrefix: true,
      },
      {
        label: "Scholarship Search",
        href: "/hub/scholarship-search",
        icon: <ScholarshipIcon />,
        status: "soon",
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        label: "Students",
        href: "/hub/students",
        icon: <StudentsIcon />,
        status: "soon",
      },
      {
        label: "Admin",
        href: "/hub/admin",
        icon: <AdminIcon />,
        status: "soon",
      },
    ],
  },
];

const STORAGE_KEY = "hub.sidebar.collapsed";
const BORDER = "rgba(255,255,255,0.08)";
const ACTIVE_BG = "rgba(225,37,27,0.16)";

export function HubSidebar({
  email,
  initials,
  signOutAction,
}: {
  email: string;
  initials: string;
  signOutAction: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // localStorage unavailable; default to expanded
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed, hydrated]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (item: NavItem) => {
    if (item.href === "/hub") return pathname === "/hub";
    return item.matchPrefix
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : pathname === item.href;
  };

  const widthClass = collapsed ? "lg:w-[64px]" : "lg:w-[232px]";

  return (
    <>
      {/* Mobile top bar — only visible <lg */}
      <div className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-white/90 px-4 backdrop-blur supports-backdrop-filter:bg-white/75">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink hover:bg-surface-soft"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <Link href="/hub" className="text-sm font-semibold tracking-tight text-ink">
          Class 101 · Ai Hub
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3 text-xs font-medium text-ink-soft hover:bg-surface-soft"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
        />
      ) : null}

      <aside
        className={[
          "z-50 flex flex-col bg-black text-white",
          // mobile: drawer
          "fixed inset-y-0 left-0 w-[260px] transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // desktop: sticky column pinned to viewport height with right border
          "lg:sticky lg:top-0 lg:h-dvh lg:max-h-dvh lg:self-start lg:z-auto lg:translate-x-0 lg:transition-[width] lg:duration-200 lg:border-r",
          widthClass,
        ].join(" ")}
        style={{ borderColor: BORDER }}
        aria-label="Hub navigation"
      >
        {/* Brand row */}
        <div
          className={`flex h-14 items-center border-b ${
            collapsed ? "justify-center px-2" : "px-3"
          }`}
          style={{ borderColor: BORDER }}
        >
          {collapsed ? (
            <Wordmark href="/hub" variant="footer" size={22} />
          ) : (
            <Wordmark href="/hub" variant="footer" size={32} />
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV.map((group, groupIdx) => (
            <div key={group.label ?? `group-${groupIdx}`} className={groupIdx > 0 ? "mt-4" : ""}>
              {group.label && !collapsed ? (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  {group.label}
                </p>
              ) : null}
              {group.label && collapsed ? (
                <div
                  className="mx-2 mb-2 border-t"
                  style={{ borderColor: BORDER }}
                  aria-hidden
                />
              ) : null}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item);
                  const disabled = item.status === "soon";
                  const content = (
                    <span
                      className="flex items-center gap-3"
                      style={{ minWidth: 0 }}
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-md"
                        style={{
                          color: disabled ? "rgba(255,255,255,0.35)" : "var(--brand-red)",
                          background: active ? ACTIVE_BG : "transparent",
                        }}
                      >
                        {item.icon}
                      </span>
                      {!collapsed ? (
                        <span
                          className={`truncate text-sm ${
                            active
                              ? "font-semibold text-white"
                              : disabled
                                ? "text-white/40"
                                : "text-white"
                          }`}
                        >
                          {item.label}
                        </span>
                      ) : null}
                      {!collapsed && disabled ? (
                        <span
                          className="ml-auto rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50"
                          style={{ borderColor: BORDER }}
                        >
                          Soon
                        </span>
                      ) : null}
                    </span>
                  );

                  const baseRow =
                    "relative block rounded-lg px-1.5 py-1.5 transition-colors";

                  if (disabled) {
                    return (
                      <li key={item.href}>
                        <span
                          className={`${baseRow} cursor-not-allowed opacity-80`}
                          title={`${item.label} — coming soon`}
                          aria-disabled
                        >
                          {content}
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={[
                          baseRow,
                          "hover:bg-white/5",
                          active ? "bg-white/[0.07]" : "",
                        ].join(" ")}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        {active ? (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                            style={{ background: "var(--brand-red)" }}
                          />
                        ) : null}
                        {content}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div>
          {collapsed ? (
            <div className="flex flex-col items-center gap-1 p-2">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="hidden h-9 w-9 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white lg:grid"
              >
                <ChevronRight />
              </button>
              <div
                className="my-1 h-px w-6"
                style={{ background: BORDER }}
                aria-hidden
              />
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                style={{ background: "var(--brand-red)" }}
                title={`Signed in as ${email}`}
                aria-label={`Signed in as ${email}`}
              >
                {initials}
              </span>
            </div>
          ) : (
            <div className="p-2">
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="hidden h-8 w-full items-center justify-start gap-2 rounded-md px-3 text-[11px] font-medium text-white/60 hover:bg-white/10 hover:text-white lg:inline-flex"
              >
                <ChevronLeft />
                <span>Collapse</span>
              </button>

              <div
                className="my-2 h-px w-full"
                style={{ background: BORDER }}
                aria-hidden
              />

              <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: "var(--brand-red)" }}
                  aria-hidden
                >
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white/50">Signed in</p>
                  <p className="truncate text-xs font-medium text-white">
                    {email}
                  </p>
                </div>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    title="Sign out"
                    aria-label="Sign out"
                    className="grid h-8 w-8 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <SignOutIcon />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ---- Icons ---------------------------------------------------------------

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v9" />
      <path d="M5.5 7.5a8 8 0 1 0 13 0" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
