/**
 * Shared icons for hub modules. Used by the sidebar, page headers, and
 * dashboard cards so the visual identity for each tool is consistent.
 *
 * All icons share the same viewBox + stroke style. Pass `size` to scale.
 */

type IconProps = { size?: number; className?: string };

function base({ size = 18, className }: IconProps) {
  return {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
}

export function HubIcon(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function NotesIcon(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M4 4h12l4 4v12H4z" />
      <path d="M16 4v4h4" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  );
}

export function ListIcon(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M3 6h18M3 12h18M3 18h12" />
    </svg>
  );
}

export function EssayIcon(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M14 3l7 7-11 11H3v-7z" />
      <path d="M13 4l7 7" />
    </svg>
  );
}

export function ScholarshipIcon(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}

export function StudentsIcon(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.3 2.9-5.6 6.5-5.6S15.5 16.7 15.5 20" />
      <circle cx="17" cy="9.5" r="2.6" />
      <path d="M15.5 14.5c3 0 6 1.7 6 4.5" />
    </svg>
  );
}

export function AdminIcon(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
