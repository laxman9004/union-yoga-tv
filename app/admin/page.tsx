"use client";

import { useCallback, useEffect, useState } from "react";
import type { DataVerificationReport } from "@/lib/data/verify";
import type { ImportResult } from "@/lib/data/import";
import Link from "next/link";
import { CopyPanel } from "./CopyPanel";

type DbStatus = {
  lastImportAt: string | null;
  dataThroughDate: string | null;
  memberCount: number;
  sessionCount: number;
};

export default function AdminPage() {
  const [tab, setTab] = useState<"data" | "copy">("data");
  const [report, setReport] = useState<DataVerificationReport | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [busy, setBusy] = useState<"scan" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setBusy("scan");
    setError(null);
    setImportResult(null);
    try {
      const [verifyRes, statusRes] = await Promise.all([
        fetch("/api/data/verify"),
        fetch("/api/data/status"),
      ]);
      if (!verifyRes.ok) {
        throw new Error(`Scan failed (${verifyRes.status})`);
      }
      if (!statusRes.ok) {
        throw new Error(`Status failed (${statusRes.status})`);
      }
      setReport(await verifyRes.json());
      setDbStatus(await statusRes.json());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach the server. Run npm run dev in union-yoga-tv."
      );
    } finally {
      setBusy(null);
    }
  }, []);

  const runImport = async () => {
    setBusy("import");
    setError(null);
    try {
      const res = await fetch("/api/data/import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Import failed (${res.status})`);
      }
      setImportResult(data);
      setReport(data.verification);
      const statusRes = await fetch("/api/data/status");
      if (statusRes.ok) {
        setDbStatus(await statusRes.json());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    scan();
  }, [scan]);

  const canImport = report?.sufficientForImport ?? report?.sufficientForMvp;
  const scanning = busy === "scan";
  const importing = busy === "import";

  return (
    <div className="min-h-full bg-cream text-ink">
      <header className="border-b border-[var(--line)] bg-cream-soft/80 px-6 py-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-clay uppercase">
          Union Yoga · The Frame
        </p>
        <h1 className="mt-2 font-serif text-4xl text-forest-deep">Admin</h1>
        <nav className="mt-4 flex flex-wrap items-center gap-4 text-sm font-medium text-forest">
          <button
            type="button"
            onClick={() => setTab("data")}
            className={tab === "data" ? "font-bold text-forest-deep" : "underline"}
          >
            Data
          </button>
          <button
            type="button"
            onClick={() => setTab("copy")}
            className={tab === "copy" ? "font-bold text-forest-deep" : "underline"}
          >
            Copy
          </button>
          <Link href="/display" className="underline">
            Open display →
          </Link>
        </nav>
        {dbStatus?.lastImportAt && (
          <p className="mt-3 text-moss text-sm">
            Last import: {new Date(dbStatus.lastImportAt).toLocaleString()} ·{" "}
            {dbStatus.memberCount} members · {dbStatus.sessionCount} classes in DB
            {dbStatus.dataThroughDate && ` · through ${dbStatus.dataThroughDate}`}
          </p>
        )}
      </header>

      <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        {error && (
          <p className="rounded-lg border border-terra/40 bg-terra/10 px-4 py-3 text-sm text-terra">
            {error}
          </p>
        )}

        {tab === "copy" && <CopyPanel />}

        {tab === "data" && (
          <>
            <section className="rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-sm">
              <h2 className="font-serif text-2xl text-forest-deep">Mariana Tek data</h2>
              <p className="mt-2 text-moss text-sm leading-relaxed">
                Drop exports into{" "}
                <code className="rounded bg-cream-soft px-1.5 py-0.5 text-ink">
                  union-yoga-tv/data/incoming/
                </code>{" "}
                then scan and import. Future class dates in utilization are skipped
                automatically.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={scan}
                  disabled={scanning || importing}
                  className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
                >
                  {scanning ? "Scanning…" : "Scan incoming"}
                </button>
                <button
                  type="button"
                  onClick={runImport}
                  disabled={scanning || importing || !canImport}
                  className="rounded-full border border-forest-deep px-5 py-2.5 text-sm font-semibold text-forest-deep disabled:opacity-40"
                  title={
                    !canImport
                      ? "Drop CSV exports in data/incoming/ first"
                      : undefined
                  }
                >
                  {importing ? "Importing…" : "Import to database"}
                </button>
              </div>
              {!canImport && !scanning && report && (
                <p className="mt-3 text-moss text-xs">
                  Import stays disabled until recognized CSVs are in{" "}
                  <code className="rounded bg-cream-soft px-1">data/incoming/</code>.
                </p>
              )}
              {report && (
                <p
                  className={`mt-4 text-sm font-medium ${
                    canImport ? "text-forest" : "text-terra"
                  }`}
                >
                  {report.summary}
                </p>
              )}
              {importResult && !importResult.errors.length && (
                <p className="mt-2 text-sm text-moss">
                  {importResult.imported.members} members ·{" "}
                  {importResult.imported.sessions} classes ·{" "}
                  {importResult.imported.checkIns} check-ins ·{" "}
                  {importResult.imported.frequencyUpdates} frequency updates
                  {importResult.movedFiles.length > 0 &&
                    ` · archived ${importResult.movedFiles.length} file(s)`}
                </p>
              )}
              {importResult?.errors?.map((e) => (
                <p key={e} className="mt-2 text-sm text-terra">
                  {e}
                </p>
              ))}
            </section>

            {report && (
              <>
                <section className="rounded-[14px] border border-[var(--line)] bg-white p-6">
                  <h3 className="font-serif text-xl text-forest-deep">Files in incoming</h3>
                  <ul className="mt-4 space-y-4">
                    {report.files.map((f) => (
                      <li
                        key={f.filename}
                        className="border-b border-[var(--line)] pb-4 last:border-0"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium">{f.filename}</span>
                          <span className="text-moss text-xs">
                            {f.label} · {f.rowCount} rows
                          </span>
                        </div>
                        {f.warnings.map((w) => (
                          <p key={w} className="mt-1 text-moss text-sm">
                            {w}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-moss text-sm">
                    {report.crossFile.memberCount} members ·{" "}
                    {report.crossFile.sessionCountPast} past classes ·{" "}
                    {report.crossFile.sessionCountFuture} future skipped ·{" "}
                    {report.crossFile.frequencyRowCount} frequency rows
                  </p>
                </section>

                <section className="rounded-[14px] border border-[var(--line)] bg-white p-6">
                  <h3 className="font-serif text-xl text-forest-deep">Scene readiness</h3>
                  <ul className="mt-4 space-y-3">
                    {report.sceneReadiness.map((s) => (
                      <li key={s.sceneGroup} className="flex gap-3 text-sm">
                        <StatusDot status={s.status} />
                        <div>
                          <p className="font-medium text-ink">{s.sceneGroup}</p>
                          <p className="text-moss">{s.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "ready"
      ? "bg-forest"
      : status === "partial"
        ? "bg-clay"
        : "bg-terra";
  return (
    <span
      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
      aria-hidden
    />
  );
}
