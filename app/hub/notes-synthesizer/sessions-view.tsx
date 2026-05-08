"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionDrawer } from "./session-drawer";
import { NewSessionDrawer } from "./new-session-drawer";

export type SessionRow = {
  id: string;
  student_first_name: string | null;
  grade_level: string | null;
  meeting_date: string | null;
  summary: string;
  created_at: string;
};

export function SessionsView({ rows }: { rows: SessionRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const isNew = searchParams.get("new") === "1";

  // Local state mirrors URL so close animations don't flash on param removal.
  const [openId, setOpenId] = useState<string | null>(sessionId);
  useEffect(() => {
    setOpenId(sessionId);
  }, [sessionId]);

  const updateParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const q = params.toString();
      router.replace(
        `/hub/notes-synthesizer${q ? `?${q}` : ""}`,
        { scroll: false },
      );
    },
    [router, searchParams],
  );

  const openSession = useCallback(
    (id: string) => updateParams((p) => p.set("session", id)),
    [updateParams],
  );
  const closeSession = useCallback(
    () => updateParams((p) => p.delete("session")),
    [updateParams],
  );
  const openNew = useCallback(
    () =>
      updateParams((p) => {
        p.set("new", "1");
        p.delete("session");
      }),
    [updateParams],
  );
  const closeNew = useCallback(
    () => updateParams((p) => p.delete("new")),
    [updateParams],
  );

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState onNew={openNew} />
      ) : (
        <SessionsTable rows={rows} onRowClick={openSession} />
      )}
      <NewSessionDrawer open={isNew} onClose={closeNew} />
      <SessionDrawer sessionId={openId} onClose={closeSession} />
    </>
  );
}

export function NewSessionButton({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  return (
    <button
      type="button"
      onClick={() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("new", "1");
        params.delete("session");
        router.replace(`/hub/notes-synthesizer?${params.toString()}`, {
          scroll: false,
        });
      }}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}

function SessionsTable({
  rows,
  onRowClick,
}: {
  rows: SessionRow[];
  onRowClick: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-surface-soft">
          <tr>
            <Th>Student</Th>
            <Th>Grade</Th>
            <Th>Meeting date</Th>
            <Th>Summary</Th>
            <Th className="text-right">Created</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onRowClick(r.id)}
              className="cursor-pointer hover:bg-surface-soft"
            >
              <Td>
                <span className="font-medium text-ink">
                  {r.student_first_name?.trim() || (
                    <span className="text-muted">Untitled</span>
                  )}
                </span>
              </Td>
              <Td>
                <span className="text-ink-soft">
                  {r.grade_level || <span className="text-muted">—</span>}
                </span>
              </Td>
              <Td>
                <span className="text-ink-soft">
                  {r.meeting_date ? (
                    formatDate(r.meeting_date)
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </span>
              </Td>
              <Td className="max-w-[520px]">
                <span className="line-clamp-2 text-ink-soft">
                  {firstMeaningfulLine(r.summary)}
                </span>
              </Td>
              <Td className="text-right">
                <span className="text-muted">
                  {formatRelative(r.created_at)}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-ink">No sessions yet.</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Click <span className="font-medium text-ink">+ New session</span> to
        record or paste a transcript and get your first Class 101 summary.
      </p>
      <button type="button" onClick={onNew} className="cta-primary mt-5">
        + New session
      </button>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 text-sm align-top ${className}`}>{children}</td>
  );
}

function firstMeaningfulLine(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    return line.replace(/^[-*]\s+/, "").replace(/\*\*/g, "");
  }
  return "—";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime();
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
