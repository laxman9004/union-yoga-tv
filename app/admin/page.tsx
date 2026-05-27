"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyPanel } from "./CopyPanel";
import { SyncPanel } from "./SyncPanel";

type Tab = "sync" | "copy";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("sync");

  return (
    <div className="min-h-full bg-cream text-ink">
      <header className="border-b border-[var(--line)] bg-cream-soft/80 px-6 py-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-clay uppercase">
          Union Yoga · The Frame
        </p>
        <h1 className="mt-2 font-serif text-4xl text-forest-deep">Admin</h1>
        <p className="mt-2 max-w-xl text-moss text-sm">
          Upload Mariana data → publish copy → lobby TV updates automatically.
        </p>
        <nav className="mt-4 flex flex-wrap items-center gap-4 text-sm font-medium text-forest">
          {(
            [
              ["sync", "Sync"],
              ["copy", "Copy"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={tab === id ? "font-bold text-forest-deep" : "underline"}
            >
              {label}
            </button>
          ))}
          <Link href="/display" className="underline">
            Open display →
          </Link>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              window.location.href = "/admin/login";
            }}
            className="text-moss underline"
          >
            Sign out
          </button>
        </nav>
      </header>

      <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        {tab === "sync" && <SyncPanel />}
        {tab === "copy" && <CopyPanel />}
      </div>
    </div>
  );
}
