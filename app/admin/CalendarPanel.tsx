"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BoardEditor } from "./BoardEditor";

type CalendarDay = {
  date: string;
  classCount: number;
  lineupDraftCount: number;
  lineupPublishedCount: number;
  studioMessageCount: number;
  status: "published" | "draft" | "empty";
  isPast: boolean;
  isToday: boolean;
};

/** Shift a YYYY-MM-DD calendar string by n days (timezone-safe). */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const t = Date.UTC(y, m - 1, d) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

function formatDayLabel(dateStr: string): { weekday: string; rest: string } {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    weekday: dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    rest: dt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  };
}

const STATUS_STYLE: Record<CalendarDay["status"], string> = {
  published: "bg-forest/10 text-forest",
  draft: "bg-clay/15 text-clay",
  empty: "bg-moss/10 text-moss/70",
};

export function CalendarPanel() {
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCalendar = useCallback(async () => {
    const res = await fetch("/api/calendar");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    const list: CalendarDay[] = data.days ?? [];
    setDays(list);
    setSelected((prev) => prev ?? list.find((d) => d.isToday)?.date ?? list[0]?.date ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const today = useMemo(() => days.find((d) => d.isToday)?.date ?? null, [days]);
  const selectedDay = useMemo(
    () => days.find((d) => d.date === selected) ?? null,
    [days, selected]
  );
  const isPast = selectedDay ? selectedDay.isPast : today != null && selected != null && selected < today;

  if (loading) {
    return <p className="text-moss text-sm">Loading calendar…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl text-forest-deep">Calendar</h2>
        <p className="mt-2 text-moss text-sm leading-relaxed">
          Browse what aired on past days (read-only) and set or edit messages for upcoming days.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => selected && setSelected(addDays(selected, -1))}
            className="rounded-full border border-forest-deep px-4 py-2 text-sm font-semibold text-forest-deep"
          >
            ← Prev
          </button>
          <input
            type="date"
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value || null)}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-ink"
          />
          <button
            type="button"
            onClick={() => selected && setSelected(addDays(selected, 1))}
            className="rounded-full border border-forest-deep px-4 py-2 text-sm font-semibold text-forest-deep"
          >
            Next →
          </button>
          {today && (
            <button
              type="button"
              onClick={() => setSelected(today)}
              className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream"
            >
              Today
            </button>
          )}
        </div>
      </section>

      <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {days.map((d) => {
            const label = formatDayLabel(d.date);
            const active = d.date === selected;
            return (
              <li key={d.date}>
                <button
                  type="button"
                  onClick={() => setSelected(d.date)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                    active ? "bg-cream-soft" : "hover:bg-cream/40"
                  } ${d.isPast ? "opacity-70" : ""}`}
                >
                  <span className="w-20 shrink-0 text-sm">
                    <span className="font-semibold text-forest-deep">{label.weekday}</span>{" "}
                    <span className="text-moss">{label.rest}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${STATUS_STYLE[d.status]}`}
                  >
                    {d.status}
                  </span>
                  <span className="text-moss text-xs">
                    {d.classCount} {d.classCount === 1 ? "class" : "classes"}
                    {d.studioMessageCount > 0 ? ` · ${d.studioMessageCount} studio` : ""}
                  </span>
                  {d.isToday && (
                    <span className="ml-auto rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold text-forest">
                      Today
                    </span>
                  )}
                  {d.isPast && !d.isToday && (
                    <span className="ml-auto text-[10px] uppercase text-moss/60">Audit</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selected && (
        <BoardEditor
          key={selected}
          date={selected === today ? null : selected}
          readOnly={isPast}
          onPublished={loadCalendar}
        />
      )}
    </div>
  );
}
