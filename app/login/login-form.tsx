"use client";

import { useActionState } from "react";
import { login, type AuthState } from "./actions";

type Props = {
  next?: string;
  notice?: string | null;
};

export function LoginForm({ next = "/hub", notice }: Props) {
  const [loginState, loginAction, loginPending] = useActionState<
    AuthState,
    FormData
  >(login, undefined);

  return (
    <div className="w-full space-y-4">
      {notice ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <form action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-ink"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@class101.com"
            className="block w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2"
            style={{ ['--tw-ring-color' as string]: 'var(--brand-red)' }}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-ink"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            placeholder="••••••••"
            className="block w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2"
            style={{ ['--tw-ring-color' as string]: 'var(--brand-red)' }}
          />
        </div>

        {loginState?.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {loginState.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loginPending}
          className="cta-primary-lg w-full"
        >
          {loginPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
