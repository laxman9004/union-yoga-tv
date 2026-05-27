"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setup = params.get("setup") === "1";
  const next = params.get("next") || "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <main className="flex min-h-full items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md rounded-[14px] border border-[var(--line)] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-clay uppercase">
          Union Yoga · Admin
        </p>
        <h1 className="mt-2 font-serif text-3xl text-forest-deep">Sign in</h1>
        {setup ? (
          <p className="mt-3 text-moss text-sm leading-relaxed">
            Admin password is not set on the server yet. Add{" "}
            <code className="rounded bg-cream-soft px-1">ADMIN_PASSWORD</code> in Netlify
            environment variables, then redeploy.
          </p>
        ) : (
          <p className="mt-3 text-moss text-sm">
            Data import and copy publishing are owner-only.
          </p>
        )}
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold tracking-wide text-clay uppercase"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-cream/50 px-3 py-2.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={setup}
            />
          </div>
          {error && <p className="text-sm text-terra">{error}</p>}
          <button
            type="submit"
            disabled={busy || setup}
            className="w-full rounded-full bg-forest py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
