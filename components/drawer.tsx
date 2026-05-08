"use client";

import { useEffect } from "react";

/**
 * Right-side slide-in drawer. Handles overlay click, ESC, and body scroll
 * lock. Caller provides header content and body content.
 */
export function Drawer({
  open,
  onClose,
  header,
  children,
  ariaLabel,
  maxWidthClass = "max-w-3xl",
}: {
  open: boolean;
  onClose: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  ariaLabel: string;
  maxWidthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`absolute right-0 top-0 flex h-dvh w-full flex-col bg-surface-soft shadow-2xl transition-transform duration-200 ease-out ${maxWidthClass} ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">{header}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink-soft hover:bg-surface-soft"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
      </aside>
    </div>
  );
}
