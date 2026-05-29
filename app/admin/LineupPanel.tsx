"use client";

import { useCallback, useEffect, useState } from "react";
import type { LineupAdminDay, LineupAdminItem } from "@/lib/data/lineup/types";
import { SCENE_LABELS } from "@/lib/data/lineup/types";

export function LineupPanel() {
  const [day, setDay] = useState<LineupAdminDay | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/lineup/today");
    if (!res.ok) {
      setMessage("Could not load today's lineup.");
      return;
    }
    const data: LineupAdminDay = await res.json();
    setDay(data);
    const next: Record<string, boolean> = {};
    for (const c of data.classes) {
      for (const item of c.items) {
        next[`${c.classSessionId}:${item.itemKey}`] = item.enabled;
      }
    }
    setEnabled(next);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggles = () => {
    const rows: Array<{ classSessionId: string; itemKey: string; enabled: boolean }> = [];
    if (!day) return rows;
    for (const c of day.classes) {
      for (const item of c.items) {
        rows.push({
          classSessionId: c.classSessionId,
          itemKey: item.itemKey,
          enabled: enabled[`${c.classSessionId}:${item.itemKey}`] ?? item.enabled,
        });
      }
    }
    return rows;
  };

  const setItem = (classSessionId: string, itemKey: string, on: boolean) => {
    setEnabled((prev) => ({ ...prev, [`${classSessionId}:${itemKey}`]: on }));
  };

  const refresh = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/lineup/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh" }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Refresh failed.");
      return;
    }
    const data = await res.json();
    setDay(data);
    const next: Record<string, boolean> = {};
    for (const c of data.classes) {
      for (const item of c.items) {
        next[`${c.classSessionId}:${item.itemKey}`] = item.enabled;
      }
    }
    setEnabled(next);
    setMessage("Rebuilt from latest check-ins. Review and publish when ready.");
  };

  const publish = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/lineup/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", toggles: toggles() }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Publish failed.");
      return;
    }
    setDay(data);
    setMessage("Published — TV will show these scenes before each class (45 min window).");
  };

  if (!day) {
    return <p className="text-moss text-sm">Loading today&apos;s classes…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl text-forest-deep">Today&apos;s lineup</h2>
        <p className="mt-2 text-moss text-sm leading-relaxed">
          Each class gets its own picks. Student scenes only include people checked into{" "}
          <em>that</em> class. After you publish, the lobby TV rotates these automatically
          starting 45 minutes before class.
        </p>
        {message && (
          <p className="mt-4 rounded-lg bg-cream-soft px-4 py-3 text-sm text-forest">{message}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={refresh}
            className="rounded-full border border-forest-deep px-5 py-2.5 text-sm font-semibold text-forest-deep disabled:opacity-50"
          >
            Refresh from data
          </button>
          <button
            type="button"
            disabled={busy || !day.classes.length}
            onClick={publish}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
          >
            Publish to TV
          </button>
        </div>
        {day.lastPublishedAt && (
          <p className="mt-3 text-moss text-xs">
            Last published {new Date(day.lastPublishedAt).toLocaleString()}
          </p>
        )}
      </section>

      {!day.classes.length && (
        <section className="rounded-[14px] border border-dashed border-[var(--line)] bg-cream-soft/40 p-6">
          <p className="text-moss text-sm">
            No classes scheduled for today in the database. Run{" "}
            <code className="rounded bg-white px-1">npm run sync</code> on your Mac after
            dropping Mariana CSVs, then refresh here.
          </p>
        </section>
      )}

      {day.classes.map((c) => {
        const time = new Date(c.startTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const classItems = c.items.filter((i) => i.category === "class");
        const studentItems = c.items.filter((i) => i.category === "student");
        const isOn = (item: LineupAdminItem) =>
          enabled[`${c.classSessionId}:${item.itemKey}`] ?? item.enabled;
        const onCount = c.items.filter(isOn).length;

        return (
          <section
            key={c.classSessionId}
            className="rounded-[14px] border border-[var(--line)] bg-white p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] pb-4">
              <div>
                <p className="font-serif text-2xl text-forest-deep">
                  {time} · {c.classType}
                </p>
                <p className="mt-1 text-moss text-sm">
                  {c.instructorName ?? "Instructor TBD"} · {c.checkedInCount} checked in
                  {c.status === "published" && (
                    <span className="ml-2 rounded-full bg-forest/10 px-2 py-0.5 text-xs font-semibold text-forest">
                      on TV
                    </span>
                  )}
                </p>
                <p className="mt-2 text-moss text-xs">
                  {onCount} of {c.items.length} scenes selected for this class
                </p>
              </div>
            </div>

            {classItems.length > 0 && (
              <ItemGroup
                title="About this class"
                hint="Shows once for the whole room before this class."
                classSessionId={c.classSessionId}
                items={classItems}
                enabled={enabled}
                setItem={setItem}
                disabled={busy}
              />
            )}

            {studentItems.length > 0 ? (
              <ItemGroup
                title="Students in this class"
                hint="Only people checked into this specific class."
                classSessionId={c.classSessionId}
                items={studentItems}
                enabled={enabled}
                setItem={setItem}
                disabled={busy}
              />
            ) : (
              <p className="mt-4 text-moss text-sm">No student-specific scenes for this class yet.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ItemGroup({
  title,
  hint,
  classSessionId,
  items,
  enabled,
  setItem,
  disabled,
}: {
  title: string;
  hint: string;
  classSessionId: string;
  items: LineupAdminItem[];
  enabled: Record<string, boolean>;
  setItem: (classSessionId: string, itemKey: string, on: boolean) => void;
  disabled: boolean;
}) {
  const onCount = items.filter(
    (item) => enabled[`${classSessionId}:${item.itemKey}`] ?? item.enabled
  ).length;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-clay uppercase">{title}</p>
          <p className="mt-1 text-moss text-xs">{hint}</p>
        </div>
        <p className="text-moss text-xs">
          {onCount} of {items.length} on
        </p>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const key = `${classSessionId}:${item.itemKey}`;
          const on = enabled[key] ?? item.enabled;
          const sceneLabel = SCENE_LABELS[item.sceneKey] ?? item.sceneKey;
          return (
            <li
              key={item.itemKey}
              className={`flex gap-3 rounded-lg border px-4 py-3 ${
                on ? "border-forest/25 bg-cream/40" : "border-[var(--line)] bg-white opacity-70"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1.5 h-4 w-4 shrink-0 accent-forest"
                checked={on}
                disabled={disabled}
                aria-label={`${on ? "Remove" : "Add"} ${sceneLabel}: ${item.headline}`}
                onChange={(e) => setItem(classSessionId, item.itemKey, e.target.checked)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                      item.category === "class"
                        ? "bg-forest/10 text-forest"
                        : "bg-clay/15 text-clay"
                    }`}
                  >
                    {item.category === "class" ? "Whole class" : "One student"}
                  </span>
                  <span className="rounded-full bg-moss/10 px-2 py-0.5 text-[10px] font-medium text-moss">
                    {sceneLabel}
                  </span>
                  {!on && (
                    <span className="text-moss/60 text-[10px] font-medium uppercase">Skipped</span>
                  )}
                </div>
                <p className="mt-2 font-medium text-ink">{item.headline}</p>
                <p className="mt-0.5 text-moss text-sm">{item.subline}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
