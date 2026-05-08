"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  setActiveStudent,
  createStudent,
  type CreateStudentResult,
} from "@/lib/students/actions";
import {
  useActiveStudent,
  useStudentList,
} from "@/lib/students/context";
import type { Student } from "@/lib/students/types";

export function StudentPicker() {
  const active = useActiveStudent();
  const students = useStudentList();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "new">("list");
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

  // Reset to list view whenever the popover closes.
  useEffect(() => {
    if (!open) setMode("list");
  }, [open]);

  function pick(id: string) {
    startTransition(async () => {
      await setActiveStudent(id);
      setOpen(false);
    });
  }

  function clear() {
    startTransition(async () => {
      await setActiveStudent(null);
      setOpen(false);
    });
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white pl-1.5 pr-3 text-sm font-medium text-ink shadow-sm hover:bg-surface-soft"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white"
          style={{ background: "var(--brand-red)" }}
          aria-hidden
        >
          {active ? initials(active) : "—"}
        </span>
        <span className="hidden sm:inline text-xs uppercase tracking-wider text-muted">
          Working on
        </span>
        <span className="truncate max-w-[180px]">
          {active ? displayName(active) : "No student selected"}
        </span>
        <ChevronDown />
      </button>

      {open ? (
        <div
          ref={popoverRef}
          className="absolute right-0 z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-line bg-white shadow-lg"
          role="dialog"
        >
          {mode === "list" ? (
            <ListView
              students={students}
              activeId={active?.id ?? null}
              onPick={pick}
              onClear={clear}
              onNew={() => setMode("new")}
              pending={pending}
            />
          ) : (
            <NewView
              onCancel={() => setMode("list")}
              onCreated={() => setOpen(false)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function ListView({
  students,
  activeId,
  onPick,
  onClear,
  onNew,
  pending,
}: {
  students: Student[];
  activeId: string | null;
  onPick: (id: string) => void;
  onClear: () => void;
  onNew: () => void;
  pending: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered =
    query.trim().length === 0
      ? students
      : students.filter((s) =>
          displayName(s).toLowerCase().includes(query.trim().toLowerCase()),
        );

  return (
    <div>
      <div className="border-b border-line px-3 py-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students…"
          className="block w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>

      <ul className="max-h-[260px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-xs text-muted">
            No students match.
          </li>
        ) : (
          filtered.map((s) => {
            const isActive = s.id === activeId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPick(s.id)}
                  disabled={pending}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-soft ${
                    isActive ? "bg-surface-soft" : ""
                  } disabled:opacity-60`}
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold text-white"
                    style={{ background: "var(--brand-red)" }}
                    aria-hidden
                  >
                    {initials(s)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {displayName(s)}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {[s.gradeLevel, s.majorInterest].filter(Boolean).join(" · ") ||
                        "No profile yet"}
                    </p>
                  </div>
                  {isActive ? (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--brand-red)" }}
                    >
                      Active
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>

      <div className="flex items-center justify-between border-t border-line px-2 py-2 text-xs">
        {activeId ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2 py-1 text-muted hover:bg-surface-soft hover:text-ink"
            disabled={pending}
          >
            Clear selection
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-ink hover:bg-surface-soft"
        >
          + New student
        </button>
      </div>
    </div>
  );
}

function NewView({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [gpa, setGpa] = useState("");
  const [satTotal, setSatTotal] = useState("");
  const [actComposite, setActComposite] = useState("");
  const [majorInterest, setMajorInterest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result: CreateStudentResult = await createStudent({
        firstName,
        lastName: lastName || undefined,
        gradeLevel: gradeLevel || undefined,
        gpa: gpa ? Number(gpa) : null,
        satTotal: satTotal ? Number(satTotal) : null,
        actComposite: actComposite ? Number(actComposite) : null,
        majorInterest: majorInterest || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated();
    });
  }

  return (
    <form onSubmit={submit} className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">New student</h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="First name *"
          value={firstName}
          onChange={setFirstName}
          autoFocus
        />
        <Input label="Last name" value={lastName} onChange={setLastName} />
        <div className="col-span-2">
          <Field label="Grade level">
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className={inputCss}
              style={inputRing}
            >
              <option value="">Select…</option>
              {[
                "9th grade",
                "10th grade",
                "11th grade",
                "12th grade",
                "Super Junior",
                "Other",
              ].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Input label="GPA" value={gpa} onChange={setGpa} placeholder="3.7" />
        <Input
          label="Major interest"
          value={majorInterest}
          onChange={setMajorInterest}
          placeholder="e.g. CS"
        />
        <Input label="SAT" value={satTotal} onChange={setSatTotal} />
        <Input label="ACT" value={actComposite} onChange={setActComposite} />
      </div>

      {error ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !firstName.trim()}
        className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md text-sm font-semibold uppercase tracking-wide text-white shadow-sm disabled:opacity-50"
        style={{ background: "var(--brand-red)" }}
      >
        {pending ? "Creating…" : "Create student"}
      </button>
    </form>
  );
}

// ---- Helpers -----------------------------------------------------------

function displayName(s: Student): string {
  return s.lastName ? `${s.firstName} ${s.lastName[0]}.` : s.firstName;
}

function initials(s: Student): string {
  const a = s.firstName[0] ?? "";
  const b = s.lastName?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

const inputCss =
  "block w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink shadow-sm focus:outline-none focus:ring-2";
const inputRing = { ["--tw-ring-color" as string]: "var(--brand-red)" };

function Input({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCss}
        style={inputRing}
      />
    </Field>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
