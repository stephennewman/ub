import Image from "next/image";
import Link from "next/link";

type Props = {
  href?: string;
  /** When true, inverts the logo for use on dark backgrounds. */
  light?: boolean;
  /** Use the pre-built white footer logo (for dark backgrounds). */
  variant?: "default" | "footer";
  /** Logo height in pixels. Aspect ratio is preserved. */
  size?: number;
};

const LOGO_ASPECT = 168 / 61;

export function Wordmark({
  href = "/",
  light = false,
  variant = "default",
  size = 36,
}: Props) {
  const width = Math.round(size * LOGO_ASPECT);
  const src = variant === "footer" ? "/class101-logo-footer.svg" : "/class101-logo.png";

  const img = (
    <Image
      src={src}
      alt="Class 101"
      width={width}
      height={size}
      priority
      unoptimized={variant === "footer"}
      className={light ? "w-auto brightness-0 invert" : "w-auto"}
      style={{ height: size, width }}
    />
  );

  if (!href) return img;
  return (
    <Link
      href={href}
      className="inline-flex items-center"
      aria-label="Class 101 home"
    >
      {img}
    </Link>
  );
}
