"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LineupAdminDay, LineupAdminItem } from "@/lib/data/lineup/types";
import { SCENE_LABELS } from "@/lib/data/lineup/types";

type StudioSuggestion = {
  suggestionKey: string;
  templateId: string;
  label: string;
  content: string;
  reason: string;
};

type StudioState = StudioSuggestion & { accepted: boolean; content: string };

type ItemState = {
  enabled: boolean;
  headline: string;
  subline: string;
};

function itemId(classSessionId: string, itemKey: string) {
  return `${classSessionId}:${itemKey}`;
}

export function BoardEditor({
  date = null,
  readOnly = false,
  onPublished,
}: {
  /** YYYY-MM-DD studio day; null = today. */
  date?: string | null;
  readOnly?: boolean;
  onPublished?: () => void;
}) {
  const [lineup, setLineup] = useState<LineupAdminDay | null>(null);
  const [studio, setStudio] = useState<StudioState[]>([]);
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const boardUrl = date ? `/api/copy/board?date=${date}` : "/api/copy/board";

  const applyBoard = useCallback(
    (data: { lineup: LineupAdminDay; studio: StudioSuggestion[] }) => {
      setLineup(data.lineup);
      setStudio(
        data.studio.map((s) => ({ ...s, accepted: true, content: s.content }))
      );
      const next: Record<string, ItemState> = {};
      for (const c of data.lineup.classes) {
        for (const item of c.items) {
          next[itemId(c.classSessionId, item.itemKey)] = {
            enabled: item.enabled,
            headline: item.headline,
            subline: item.subline,
          };
        }
      }
      setItems(next);
    },
    []
  );

  const load = useCallback(async () => {
    setLineup(null);
    const res = await fetch(boardUrl);
    if (!res.ok) {
      setMessage("Could not load suggestions.");
      return;
    }
    applyBoard(await res.json());
  }, [boardUrl, applyBoard]);

  useEffect(() => {
    load();
  }, [load]);

  const lineupRows = useMemo(() => {
    if (!lineup) return [];
    const rows: Array<{
      classSessionId: string;
      itemKey: string;
      enabled: boolean;
      headline: string;
      subline: string;
    }> = [];
    for (const c of lineup.classes) {
      for (const item of c.items) {
        const key = itemId(c.classSessionId, item.itemKey);
        const state = items[key];
        rows.push({
          classSessionId: c.classSessionId,
          itemKey: item.itemKey,
          enabled: state?.enabled ?? item.enabled,
          headline: state?.headline ?? item.headline,
          subline: state?.subline ?? item.subline,
        });
      }
    }
    return rows;
  }, [lineup, items]);

  const selectedLineup = lineupRows.filter((r) => r.enabled).length;
  const selectedStudio = studio.filter((s) => s.accepted).length;

  const setItem = (classSessionId: string, item: LineupAdminItem, patch: Partial<ItemState>) => {
    const key = itemId(classSessionId, item.itemKey);
    setItems((prev) => ({
      ...prev,
      [key]: {
        enabled: patch.enabled ?? prev[key]?.enabled ?? item.enabled,
        headline: patch.headline ?? prev[key]?.headline ?? item.headline,
        subline: patch.subline ?? prev[key]?.subline ?? item.subline,
      },
    }));
  };

  const refresh = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/copy/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh", date }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Refresh failed.");
      return;
    }
    applyBoard(await res.json());
    setMessage("Rebuilt from latest data.");
  };

  const publish = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/copy/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        date,
        lineup: lineupRows,
        studio: studio.map((s) => ({
          suggestionKey: s.suggestionKey,
          templateId: s.templateId,
          content: s.content,
          accepted: s.accepted,
        })),
      }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Publish failed.");
      return;
    }
    applyBoard(data);
    const err =
      data.studioErrors?.length ? ` Studio issues: ${data.studioErrors.join(" · ")}` : "";
    setMessage(
      `Published ${data.lineupPublished} class scenes + ${data.studioPublished} studio lines to TV.${err}`
    );
    onPublished?.();
  };

  const generateTestimonials = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/copy/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: "reverse-testimonial", count: 3 }),
    });
    setBusy(false);
    const data = await res.json();
    if (data.created > 0) {
      setMessage(`Added ${data.created} AI testimonial draft(s) — refresh to see in publish batch.`);
      await load();
    } else {
      setMessage(data.errors?.join(" · ") ?? "Generate failed.");
    }
  };

  if (!lineup) {
    return <p className="text-moss text-sm">Loading board…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-2xl text-forest-deep">
            {readOnly ? "What aired" : "Board"}
          </h2>
          {readOnly && (
            <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold tracking-wide text-moss uppercase">
              Read-only audit
            </span>
          )}
        </div>
        <p className="mt-2 text-moss text-sm leading-relaxed">
          {readOnly
            ? "A record of the scenes and studio lines that were published for this day."
            : "Suggestions are auto-picked per class and studio-wide. Accept, edit, or skip each line, then publish in one shot."}
        </p>
        {message && (
          <p className="mt-4 rounded-lg bg-cream-soft px-4 py-3 text-sm text-forest">{message}</p>
        )}
        {!readOnly && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
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
              disabled={busy || (!selectedLineup && !selectedStudio)}
              onClick={publish}
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
            >
              Publish {selectedLineup + selectedStudio} to TV
            </button>
            <span className="text-moss text-xs">
              {selectedLineup} class · {selectedStudio} studio
            </span>
          </div>
        )}
        {lineup.lastPublishedAt && (
          <p className="mt-3 text-moss text-xs">
            Last class publish {new Date(lineup.lastPublishedAt).toLocaleString()}
          </p>
        )}
      </section>

      {studio.length > 0 && (
        <section className="rounded-[14px] border border-[var(--line)] bg-white p-6">
          <h3 className="font-serif text-xl text-forest-deep">Between classes</h3>
          <p className="mt-1 text-moss text-xs">
            Rotates when no class is in its 45-min pre-show window.
          </p>
          <ul className="mt-4 space-y-3">
            {studio.map((s) => (
              <li
                key={s.suggestionKey}
                className={`rounded-lg border px-4 py-3 ${
                  s.accepted ? "border-forest/25 bg-cream/40" : "border-[var(--line)] opacity-60"
                }`}
              >
                <div className="flex gap-3">
                  {!readOnly && (
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-forest"
                      checked={s.accepted}
                      disabled={busy}
                      onChange={(e) =>
                        setStudio((prev) =>
                          prev.map((row) =>
                            row.suggestionKey === s.suggestionKey
                              ? { ...row, accepted: e.target.checked }
                              : row
                          )
                        )
                      }
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-moss/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-moss uppercase">
                        {s.label}
                      </span>
                      {!s.accepted && !readOnly && (
                        <span className="text-moss/60 text-[10px] uppercase">Skipped</span>
                      )}
                    </div>
                    {readOnly ? (
                      <p className="mt-2 font-serif text-base text-ink">{s.content}</p>
                    ) : (
                      <textarea
                        className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 font-serif text-base text-ink"
                        rows={2}
                        value={s.content}
                        disabled={busy}
                        onChange={(e) =>
                          setStudio((prev) =>
                            prev.map((row) =>
                              row.suggestionKey === s.suggestionKey
                                ? { ...row, content: e.target.value }
                                : row
                            )
                          )
                        }
                      />
                    )}
                    <p className="mt-1 text-moss text-xs">{s.reason}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {!readOnly && (
            <button
              type="button"
              disabled={busy}
              onClick={generateTestimonials}
              className="mt-4 rounded-full border border-forest/30 px-4 py-2 text-xs font-semibold text-forest-deep hover:bg-cream-soft disabled:opacity-40"
            >
              + Generate reverse testimonials (AI)
            </button>
          )}
        </section>
      )}

      {!lineup.classes.length && (
        <section className="rounded-[14px] border border-dashed border-[var(--line)] bg-cream-soft/40 p-6">
          <p className="text-moss text-sm">
            No classes for this day in Turso.{" "}
            {!readOnly && (
              <>
                Run <code className="rounded bg-white px-1">npm run sync</code> on your Mac, then
                refresh.
              </>
            )}
          </p>
        </section>
      )}

      {lineup.classes.map((c) => {
        const time = new Date(c.startTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const classItems = c.items.filter((i) => i.category === "class");
        const studentItems = c.items.filter((i) => i.category === "student");
        const onCount = c.items.filter((item) => {
          const key = itemId(c.classSessionId, item.itemKey);
          return items[key]?.enabled ?? item.enabled;
        }).length;

        return (
          <section
            key={c.classSessionId}
            className="rounded-[14px] border border-[var(--line)] bg-white p-6"
          >
            <div className="border-b border-[var(--line)] pb-4">
              <p className="font-serif text-2xl text-forest-deep">
                {time} · {c.classType}
              </p>
              <p className="mt-1 text-moss text-sm">
                {c.instructorName ?? "Instructor TBD"} · {c.checkedInCount} checked in · {onCount} of{" "}
                {c.items.length} on
                {c.status === "published" && (
                  <span className="ml-2 rounded-full bg-forest/10 px-2 py-0.5 text-xs font-semibold text-forest">
                    on TV
                  </span>
                )}
              </p>
            </div>

            {classItems.length > 0 && (
              <SuggestionGroup
                title="This class"
                hint="Whole-room scenes before this class starts."
                classSessionId={c.classSessionId}
                items={classItems}
                itemsState={items}
                busy={busy}
                readOnly={readOnly}
                setItem={setItem}
              />
            )}
            {studentItems.length > 0 ? (
              <SuggestionGroup
                title="Students in this class"
                hint="Only people checked into this class."
                classSessionId={c.classSessionId}
                items={studentItems}
                itemsState={items}
                busy={busy}
                readOnly={readOnly}
                setItem={setItem}
              />
            ) : (
              <p className="mt-4 text-moss text-sm">No student scenes for this class yet.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function SuggestionGroup({
  title,
  hint,
  classSessionId,
  items,
  itemsState,
  busy,
  readOnly,
  setItem,
}: {
  title: string;
  hint: string;
  classSessionId: string;
  items: LineupAdminItem[];
  itemsState: Record<string, ItemState>;
  busy: boolean;
  readOnly: boolean;
  setItem: (
    classSessionId: string,
    item: LineupAdminItem,
    patch: Partial<ItemState>
  ) => void;
}) {
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold tracking-wide text-clay uppercase">{title}</p>
      <p className="mt-1 text-moss text-xs">{hint}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const key = itemId(classSessionId, item.itemKey);
          const state = itemsState[key] ?? {
            enabled: item.enabled,
            headline: item.headline,
            subline: item.subline,
          };
          const sceneLabel = SCENE_LABELS[item.sceneKey] ?? item.sceneKey;
          return (
            <li
              key={item.itemKey}
              className={`rounded-lg border px-4 py-3 ${
                state.enabled
                  ? "border-forest/25 bg-cream/40"
                  : "border-[var(--line)] opacity-60"
              }`}
            >
              <div className="flex gap-3">
                {!readOnly && (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-forest"
                    checked={state.enabled}
                    disabled={busy}
                    onChange={(e) => setItem(classSessionId, item, { enabled: e.target.checked })}
                  />
                )}
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
                    {readOnly && !state.enabled && (
                      <span className="text-moss/60 text-[10px] uppercase">Off</span>
                    )}
                  </div>
                  {readOnly ? (
                    <>
                      <p className="mt-2 text-sm font-medium text-ink">{state.headline}</p>
                      <p className="mt-0.5 text-moss text-sm">{state.subline}</p>
                    </>
                  ) : (
                    <>
                      <input
                        className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium text-ink"
                        value={state.headline}
                        disabled={busy}
                        onChange={(e) => setItem(classSessionId, item, { headline: e.target.value })}
                      />
                      <input
                        className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-moss text-sm"
                        value={state.subline}
                        disabled={busy}
                        onChange={(e) => setItem(classSessionId, item, { subline: e.target.value })}
                      />
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
