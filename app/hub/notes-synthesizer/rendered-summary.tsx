import * as React from "react";

/**
 * Tiny markdown renderer for our prompted output shape (## headings,
 * - / 1. bullets, **bold**). Avoids pulling a markdown lib for a single
 * controlled format.
 */
export function RenderedSummary({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul
        key={`ul-${key++}`}
        className="ml-5 list-disc space-y-1.5 marker:text-slate-400"
      >
        {bullets.map((b, i) => (
          <li key={i}>
            <Inline text={b} />
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushBullets();
      continue;
    }
    if (line.startsWith("## ")) {
      flushBullets();
      blocks.push(
        <h3
          key={`h-${key++}`}
          className="mt-5 text-base font-bold tracking-tight text-ink first:mt-0"
        >
          {line.slice(3)}
        </h3>,
      );
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    const ordered = line.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      bullets.push(ordered[1]);
      continue;
    }
    flushBullets();
    blocks.push(
      <p key={`p-${key++}`}>
        <Inline text={line} />
      </p>,
    );
  }
  flushBullets();
  return <>{blocks}</>;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
