"use client";

import { useCallback, useState } from "react";
import type { DataVerificationReport } from "@/lib/data/verify";
import type { ImportResult } from "@/lib/data/import";

type ScheduleSyncResult = {
  fetched: number;
  upserted: number;
  cancelledSkipped: number;
  errors: string[];
  windowStart: string;
  windowEnd: string;
  durationMs: number;
};

export function SyncPanel() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [report, setReport] = useState<DataVerificationReport | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<ScheduleSyncResult | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const formBody = useCallback(() => {
    const body = new FormData();
    if (files) {
      for (let i = 0; i < files.length; i++) {
        body.append("files", files[i]);
      }
    }
    return body;
  }, [files]);

  const scan = async () => {
    if (!files?.length) {
      setMessage("Choose your Mariana CSV exports first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setImportResult(null);
    try {
      const body = formBody();
      body.set("action", "verify");
      const res = await fetch("/api/data/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Scan failed");
        setReport(null);
        return;
      }
      setReport(data);
    } catch {
      setMessage("Scan failed — check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!files?.length) {
      setMessage("Choose your Mariana CSV exports first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const body = formBody();
      body.set("action", "import");
      const res = await fetch("/api/data/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? data.errors?.[0] ?? "Import failed");
        if (data.verification) setReport(data.verification);
        return;
      }
      setImportResult(data);
      setReport(data.verification);
      setMessage("Imported. Open Copy → Refresh → Publish to TV.");
    } catch {
      setMessage("Import failed — if Reservations is huge, use npm run sync on your Mac.");
    } finally {
      setBusy(false);
    }
  };

  const canImport = report?.sufficientForImport ?? report?.sufficientForMvp;

  const refreshSchedule = async () => {
    setScheduleBusy(true);
    setScheduleError(null);
    setScheduleResult(null);
    try {
      const res = await fetch("/api/admin/sync/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        setScheduleError(data.error ?? `Refresh failed (${res.status}).`);
        return;
      }
      setScheduleResult(data);
      if (data.errors?.length) {
        setScheduleError(
          `Pulled ${data.fetched} classes but ${data.errors.length} upsert error(s).`
        );
      }
    } catch (e) {
      setScheduleError(
        e instanceof Error ? e.message : "Refresh failed — check your connection."
      );
    } finally {
      setScheduleBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl text-forest-deep">Schedule from Mariana API</h2>
        <p className="mt-2 text-moss text-sm leading-relaxed">
          Pull today&apos;s and the next two weeks&apos; class schedule directly from
          Mariana — no CSV export needed. Idempotent; safe to run repeatedly.
        </p>
        <p className="mt-2 text-moss text-xs">
          Doesn&apos;t touch check-ins or member stats yet; those still come from CSV
          imports below.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={scheduleBusy}
            onClick={refreshSchedule}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
          >
            {scheduleBusy ? "Refreshing…" : "Refresh schedule from Mariana"}
          </button>
          {scheduleResult && (
            <span className="text-moss text-xs">
              {scheduleResult.upserted}/{scheduleResult.fetched} classes ·{" "}
              {scheduleResult.windowStart} → {scheduleResult.windowEnd} ·{" "}
              {Math.round(scheduleResult.durationMs / 100) / 10}s
            </span>
          )}
        </div>
        {scheduleError && (
          <p className="mt-4 rounded-lg bg-cream-soft px-4 py-3 text-sm text-terra">
            {scheduleError}
          </p>
        )}
      </section>

      <section className="rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl text-forest-deep">Upload Mariana exports</h2>
        <p className="mt-2 text-moss text-sm leading-relaxed">
          Netlify has no folder on disk — pick CSVs here. After import, go to{" "}
          <strong>Copy</strong> → Refresh → Publish.
        </p>
        <p className="mt-2 text-moss text-xs">
          Files over 5MB (often Reservations) must use Mac sync below instead.
        </p>

        <input
          type="file"
          accept=".csv,.json"
          multiple
          className="mt-6 block w-full text-sm text-moss file:mr-4 file:rounded-full file:border-0 file:bg-forest file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cream"
          onChange={(e) => {
            setFiles(e.target.files);
            setReport(null);
            setImportResult(null);
            setMessage(null);
          }}
        />

        {files && files.length > 0 && (
          <p className="mt-3 text-moss text-xs">
            {files.length} file(s):{" "}
            {Array.from(files)
              .map((f) => f.name)
              .slice(0, 4)
              .join(", ")}
            {files.length > 4 ? "…" : ""}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-lg bg-cream-soft px-4 py-3 text-sm text-forest">
            {message}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || !files?.length}
            onClick={scan}
            className="rounded-full border border-forest-deep px-5 py-2.5 text-sm font-semibold text-forest-deep disabled:opacity-40"
          >
            {busy ? "Working…" : "Scan files"}
          </button>
          <button
            type="button"
            disabled={busy || !files?.length || !canImport}
            onClick={runImport}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-40"
          >
            Import to cloud
          </button>
        </div>

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
            {importResult.imported.checkIns} check-ins
          </p>
        )}
      </section>

      {report && report.files.length > 0 && (
        <section className="rounded-[14px] border border-[var(--line)] bg-white p-6">
          <h3 className="font-serif text-xl text-forest-deep">Scanned files</h3>
          <ul className="mt-4 space-y-3">
            {report.files.map((f) => (
              <li key={f.filename} className="border-b border-[var(--line)] pb-3 last:border-0">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium">{f.filename}</span>
                  <span className="text-moss text-xs">
                    {f.label} · {f.rowCount} rows
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl text-forest-deep">Mac sync (large exports)</h2>
        <p className="mt-2 text-moss text-sm leading-relaxed">
          For full Reservations files or batch updates, use your Mac:
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink">
          <li>
            Drop CSVs into{" "}
            <code className="rounded bg-cream-soft px-1.5 py-0.5">
              union-yoga-tv/data/incoming/
            </code>
          </li>
          <li>
            Run{" "}
            <code className="rounded bg-cream-soft px-1.5 py-0.5">npm run sync</code>{" "}
            (needs Turso vars in <code className="rounded bg-cream-soft px-1">.env.local</code>)
          </li>
        </ol>
      </section>
    </div>
  );
}
