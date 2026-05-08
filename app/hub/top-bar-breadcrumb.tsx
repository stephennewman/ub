"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Crumb = { label: string; href?: string };

/**
 * Maps the current pathname to a breadcrumb trail. Keep this list in sync
 * as new hub routes are added; unknown sub-paths fall back to "AI Hub".
 */
function trailFor(pathname: string): Crumb[] {
  if (pathname === "/hub") {
    return [{ label: "AI Hub" }];
  }
  if (pathname.startsWith("/hub/notes-synthesizer")) {
    return [
      { label: "AI Hub", href: "/hub" },
      { label: "Notes Synthesizer" },
    ];
  }
  if (pathname.startsWith("/hub/college-list")) {
    return [
      { label: "AI Hub", href: "/hub" },
      { label: "College List" },
    ];
  }
  if (pathname.startsWith("/hub/essay-editor")) {
    return [
      { label: "AI Hub", href: "/hub" },
      { label: "Essay Editor" },
    ];
  }
  if (pathname.startsWith("/hub/students")) {
    return [
      { label: "AI Hub", href: "/hub" },
      { label: "Students" },
    ];
  }
  if (pathname.startsWith("/hub/admin")) {
    return [
      { label: "AI Hub", href: "/hub" },
      { label: "Admin" },
    ];
  }
  return [{ label: "AI Hub", href: "/hub" }];
}

export function TopBarBreadcrumb() {
  const pathname = usePathname();
  const trail = trailFor(pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-2 text-sm"
    >
      <Link
        href="/"
        aria-label="Class 101 home"
        className="inline-flex shrink-0 items-center text-muted hover:text-ink"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M10 21v-6h4v6" />
        </svg>
      </Link>
      {trail.map((c, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span
            key={`${c.label}-${i}`}
            className="inline-flex min-w-0 items-center gap-2"
          >
            <span className="text-muted" aria-hidden>
              /
            </span>
            {c.href && !isLast ? (
              <Link
                href={c.href}
                className="truncate text-muted hover:text-ink"
              >
                {c.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-ink">{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
