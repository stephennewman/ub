"use client";

import { useEffect, useState } from "react";
import { Drawer } from "./drawer";
import { SessionDetail } from "./session-detail";

type SessionData = {
  id: string;
  studentFirstName: string;
  gradeLevel: string;
  meetingDate: string;
  transcript: string;
  summary: string;
};

export function SessionDrawer({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const open = sessionId !== null;
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionId}`)
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Failed (${res.status})`);
        }
        return res.json();
      })
      .then((d: SessionData) => {
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
  }, [sessionId]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Session detail"
      header={
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Session
          </h2>
          <SavedIndicator savedAt={savedAt} />
        </>
      }
    >
      {loading ? <SkeletonDetail /> : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {!loading && !error && data ? (
        <SessionDetail
          key={data.id}
          initial={data}
          onSavedChange={setSavedAt}
        />
      ) : null}
    </Drawer>
  );
}

function SavedIndicator({ savedAt }: { savedAt: number | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (savedAt === null) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(t);
  }, [savedAt]);
  return (
    <span
      className={`text-xs text-muted transition-opacity ${
        show ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
    >
      Saved
    </span>
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
