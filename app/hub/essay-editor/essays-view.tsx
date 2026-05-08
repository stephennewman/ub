"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Drawer } from "@/components/drawer";
import {
  EssayEditor,
  ResultView,
  type EssayEditorInitial,
} from "./essay-editor";
import type { EssayDetail } from "@/app/api/essays/[id]/route";

export type EssayRow = {
  id: string;
  title: string | null;
  prompt: string;
  audience_context: string | null;
  student_first_name: string | null;
  word_count: number | null;
  updated_at: string;
};

export function EssaysView({ rows }: { rows: EssayRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const essayId = searchParams.get("essay");
  const isNew = searchParams.get("new") === "1";

  const [openId, setOpenId] = useState<string | null>(essayId);
  useEffect(() => {
    setOpenId(essayId);
  }, [essayId]);

  const updateParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const q = params.toString();
      router.replace(`/hub/essay-editor${q ? `?${q}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  const openEssay = useCallback(
    (id: string) => updateParams((p) => p.set("essay", id)),
    [updateParams],
  );
  const closeEssay = useCallback(() => {
    updateParams((p) => p.delete("essay"));
    router.refresh();
  }, [router, updateParams]);
  const openNew = useCallback(
    () =>
      updateParams((p) => {
        p.set("new", "1");
        p.delete("essay");
      }),
    [updateParams],
  );
  const closeNew = useCallback(() => {
    // Refresh the list so a freshly-polished essay shows up.
    updateParams((p) => p.delete("new"));
    router.refresh();
  }, [router, updateParams]);

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState onNew={openNew} />
      ) : (
        <EssaysTable rows={rows} onRowClick={openEssay} />
      )}
      <NewEssayDrawer open={isNew} onClose={closeNew} />
      <EssayDrawer essayId={openId} onClose={closeEssay} />
    </>
  );
}

export function NewEssayButton({
  className,
  children,
}: {
  className?: string;
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
        params.delete("essay");
        router.replace(`/hub/essay-editor?${params.toString()}`, {
          scroll: false,
        });
      }}
      className={className}
    >
      {children}
    </button>
  );
}

function NewEssayDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Polish a new essay"
      maxWidthClass="max-w-6xl"
      header={
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          New essay polish
        </h2>
      }
    >
      {/* Mounted only when open so each new-session attempt starts fresh. */}
      {open ? <EssayEditor /> : null}
    </Drawer>
  );
}

function EssayDrawer({
  essayId,
  onClose,
}: {
  essayId: string | null;
  onClose: () => void;
}) {
  const open = essayId !== null;
  const [data, setData] = useState<EssayDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [diffMode, setDiffMode] = useState<"diff" | "clean">("diff");

  useEffect(() => {
    if (!essayId) {
      setData(null);
      setError(null);
      setMode("view");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMode("view");
    fetch(`/api/essays/${essayId}`)
      .then(async (res) => {
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `Failed (${res.status})`);
        }
        return res.json();
      })
      .then((d: EssayDetail) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [essayId]);

  const initial: EssayEditorInitial | null = data
    ? {
        essayId: data.id,
        title: data.title,
        prompt: data.prompt,
        schoolOrScholarship: extractSchool(data.audienceContext),
        applicationType: extractAppType(data.audienceContext),
        wordLimit: extractWordLimit(data.audienceContext),
        notes: extractNotes(data.audienceContext),
        originalDraft: data.originalDraft,
        revisedDraft: data.revisedDraft,
        summaryOfChanges: data.summaryOfChanges,
        comments: data.comments,
      }
    : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Essay detail"
      maxWidthClass="max-w-6xl"
      header={
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Essay
            </h2>
            {data?.title ? (
              <p className="truncate text-xs text-ink-soft">{data.title}</p>
            ) : null}
          </div>
          {data && !loading && !error ? (
            <div className="ml-auto flex items-center gap-2">
              {mode === "view" ? (
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-soft"
                >
                  Edit &amp; re-polish
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-soft hover:text-ink"
                >
                  Back to result
                </button>
              )}
            </div>
          ) : null}
        </div>
      }
    >
      {loading ? <SkeletonDetail /> : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {!loading && !error && data && initial ? (
        mode === "view" ? (
          <ResultView
            original={data.originalDraft}
            result={{
              essayId: data.id,
              revisedDraft: data.revisedDraft,
              summaryOfChanges: data.summaryOfChanges,
              comments: data.comments,
            }}
            studentName={data.studentFirstName ?? undefined}
            title={data.title ?? undefined}
            diffMode={diffMode}
            setDiffMode={setDiffMode}
          />
        ) : (
          <EssayEditor key={initial.essayId} initial={initial} />
        )
      ) : null}
    </Drawer>
  );
}

function EssaysTable({
  rows,
  onRowClick,
}: {
  rows: EssayRow[];
  onRowClick: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-surface-soft">
          <tr>
            <Th>Student</Th>
            <Th>Title</Th>
            <Th>Prompt</Th>
            <Th>Words</Th>
            <Th className="text-right">Updated</Th>
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
                    <span className="text-muted">—</span>
                  )}
                </span>
              </Td>
              <Td>
                <span className="text-ink-soft">
                  {r.title?.trim() || (
                    <span className="text-muted">Untitled essay</span>
                  )}
                </span>
              </Td>
              <Td className="max-w-[420px]">
                <span className="line-clamp-2 text-ink-soft">
                  {truncate(r.prompt, 220)}
                </span>
              </Td>
              <Td>
                <span className="text-ink-soft">
                  {r.word_count != null ? r.word_count : (
                    <span className="text-muted">—</span>
                  )}
                </span>
              </Td>
              <Td className="text-right">
                <span className="text-muted">
                  {formatRelative(r.updated_at)}
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
      <h2 className="text-lg font-semibold text-ink">No essays yet.</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Click <span className="font-medium text-ink">+ New essay polish</span>
        {" "}to paste a draft and see a Class 101 revision side-by-side.
      </p>
      <button type="button" onClick={onNew} className="cta-primary mt-5">
        + New essay polish
      </button>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 rounded-2xl bg-white" />
      <div className="space-y-3 rounded-2xl bg-white p-6">
        <div className="h-4 w-1/3 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
        <div className="h-3 w-4/6 rounded bg-slate-100" />
      </div>
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

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
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

// audience_context is currently stored as a flat pipe-delimited string like:
//   "School: UNC | Type: Common App personal statement | Word limit: 650 | Notes: …"
// These helpers read it back into the editor's structured fields.
function readAudiencePart(ctx: string | null, key: string): string | null {
  if (!ctx) return null;
  const parts = ctx.split("|").map((p) => p.trim());
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim().toLowerCase() === key.toLowerCase()) {
      return part.slice(idx + 1).trim();
    }
  }
  return null;
}

function extractSchool(ctx: string | null): string | null {
  return readAudiencePart(ctx, "School");
}

function extractWordLimit(ctx: string | null): number | null {
  const v = readAudiencePart(ctx, "Word limit");
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractNotes(ctx: string | null): string | null {
  return readAudiencePart(ctx, "Notes");
}

function extractAppType(
  ctx: string | null,
): "" | "common-app" | "supplement" | "scholarship" | "other" {
  const v = readAudiencePart(ctx, "Type");
  if (!v) return "";
  const lower = v.toLowerCase();
  if (lower.includes("common app")) return "common-app";
  if (lower.includes("supplement")) return "supplement";
  if (lower.includes("scholarship")) return "scholarship";
  if (lower.includes("other")) return "other";
  return "";
}
