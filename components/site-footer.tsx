import { Wordmark } from "@/components/wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-center gap-3">
          <Wordmark />
        </div>
        <p>© {new Date().getFullYear()} Class 101 · Internal demo</p>
      </div>
    </footer>
  );
}
