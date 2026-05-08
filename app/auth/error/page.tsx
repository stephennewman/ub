type SearchParams = Promise<{ error?: string }>;

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-sm space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Authentication error
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {error ?? "Something went wrong."}
        </p>
        <a
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-black"
        >
          Back to sign in
        </a>
      </div>
    </div>
  );
}
