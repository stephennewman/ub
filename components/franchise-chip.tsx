"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  useActiveFranchise,
  useMemberships,
} from "@/lib/franchises/context";
import { setActiveFranchise } from "@/lib/franchises/actions";

/**
 * Compact franchise switcher for the top bar. Shows location name + role.
 * Always renders when the user has at least one membership; only opens a
 * dropdown if they have more than one.
 */
export function FranchiseChip() {
  const active = useActiveFranchise();
  const memberships = useMemberships();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!active) return null;
  const multi = memberships.length > 1;
  const subtitle =
    active.franchise.city && active.franchise.state
      ? `${active.franchise.city}, ${active.franchise.state}`
      : active.role.replace("_", " ");

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => multi && setOpen((v) => !v)}
        disabled={!multi}
        className={`inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white pl-2.5 pr-3 text-sm font-medium text-ink shadow-sm ${
          multi ? "hover:bg-surface-soft cursor-pointer" : "cursor-default"
        }`}
        aria-haspopup={multi ? "listbox" : undefined}
        aria-expanded={multi ? open : undefined}
        title={multi ? "Switch location" : active.franchise.name}
      >
        <PinIcon />
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted">
            Location
          </span>
          <span className="max-w-[180px] truncate text-xs text-ink">
            {displayName(active.franchise.name)}
          </span>
        </span>
        <span className="sm:hidden text-xs text-ink">
          {displayName(active.franchise.name)}
        </span>
        {multi ? <Chevron /> : null}
        <span className="sr-only">{subtitle}</span>
      </button>

      {multi && open ? (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-30 mt-2 w-[300px] overflow-hidden rounded-xl border border-line bg-white shadow-lg"
          role="listbox"
        >
          <div className="border-b border-line px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Switch location
            </p>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {memberships.map((m) => {
              const isActive = m.franchise.id === active.franchise.id;
              return (
                <li key={m.franchise.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={pending}
                    onClick={() => {
                      if (isActive) {
                        setOpen(false);
                        return;
                      }
                      startTransition(async () => {
                        await setActiveFranchise(m.franchise.id);
                        setOpen(false);
                      });
                    }}
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left ${
                      isActive ? "bg-surface-soft" : "hover:bg-surface-soft"
                    }`}
                  >
                    <span
                      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-semibold text-white"
                      style={{ background: "var(--brand-red)" }}
                    >
                      {initialsOf(m.franchise.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {displayName(m.franchise.name)}
                      </span>
                      <span className="block truncate text-xs text-ink-soft">
                        {m.franchise.city && m.franchise.state
                          ? `${m.franchise.city}, ${m.franchise.state} · `
                          : ""}
                        <span className="capitalize">
                          {m.role.replace("_", " ")}
                        </span>
                      </span>
                    </span>
                    {isActive ? <CheckIcon /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function displayName(name: string): string {
  // "Class 101 — Lexington KY" → "Lexington KY"
  return name.replace(/^Class 101\s*[—-]\s*/, "");
}

function initialsOf(name: string): string {
  const cleaned = displayName(name);
  return (
    cleaned
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·"
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-ink-soft"
    >
      <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-muted"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-ink-soft"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
