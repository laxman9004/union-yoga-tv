"use client";

import { useCallback, useEffect, useState } from "react";
import { COPY_TEMPLATES } from "@/lib/ai/templates";

type CopyRow = {
  id: string;
  templateId: string;
  content: string;
  status: string;
  updatedAt: string;
};

export function CopyPanel() {
  const [items, setItems] = useState<CopyRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [newTemplate, setNewTemplate] = useState<string>(COPY_TEMPLATES[0].id);
  const [newContent, setNewContent] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/copy");
      if (!res.ok) throw new Error(`Could not load copy (${res.status})`);
      const data = await res.json();
      setItems(data.items ?? []);
      const next: Record<string, string> = {};
      for (const row of data.items ?? []) {
        next[row.id] = row.content;
      }
      setEdits(next);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Could not load copy. Is npm run dev running?"
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addDraft = async (publish: boolean) => {
    if (!newContent.trim()) {
      setMessage("Paste or type copy first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: newTemplate,
          content: newContent,
          publish,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not save");
        return;
      }
      setNewContent("");
      setMessage(publish ? "Published to display." : "Draft saved.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const generate = async (templateId: string, count?: number) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/copy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, count }),
      });
      const data = await res.json();
      if (data.errors?.length) {
        setMessage(`Created ${data.created}. Issues: ${data.errors.join(" · ")}`);
      } else if (data.created === 0 && data.errors?.length) {
        setMessage(data.errors.join(" · "));
      } else {
        setMessage(`Created ${data.created} draft(s).`);
      }
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/copy/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: edits[id] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Save failed");
        return;
      }
      setMessage("Draft saved.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const publish = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/copy/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", content: edits[id] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Publish failed");
        return;
      }
      setMessage("Published to display.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  };

  const archive = async (id: string) => {
    setBusy(true);
    try {
      await fetch(`/api/copy/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setBusy(false);
    }
  };

  const drafts = items.filter((i) => i.status === "draft");
  const published = items.filter((i) => i.status === "published");
  const selectedTemplate = COPY_TEMPLATES.find((t) => t.id === newTemplate);

  return (
    <div className="space-y-8">
      <section className="rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl text-forest-deep">Copy · paste → publish</h2>
        <p className="mt-2 text-moss text-sm leading-relaxed">
          Draft lines here in Cursor (or anywhere), paste below, and publish when it&apos;s
          right. Nothing hits the lobby TV until you publish.
        </p>
        {message && <p className="mt-4 text-sm font-medium text-forest">{message}</p>}

        <div className="mt-6 space-y-3">
          <label className="block text-xs font-semibold tracking-wide text-clay uppercase">
            Template
          </label>
          <select
            className="w-full max-w-md rounded-lg border border-[var(--line)] bg-cream/50 px-3 py-2 text-sm"
            value={newTemplate}
            onChange={(e) => setNewTemplate(e.target.value)}
          >
            {COPY_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — {t.description}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="text-moss text-xs">Max ~{selectedTemplate.maxWords} words</p>
          )}
          <textarea
            className="w-full rounded-lg border border-[var(--line)] bg-cream/50 p-3 font-serif text-lg text-ink"
            rows={4}
            placeholder="Paste copy from chat…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => addDraft(false)}
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => addDraft(true)}
              className="rounded-full border border-clay px-5 py-2.5 text-sm font-semibold text-clay disabled:opacity-50"
            >
              Publish to TV
            </button>
          </div>
        </div>

        <details className="mt-8 border-t border-[var(--line)] pt-6">
          <summary className="cursor-pointer text-sm font-medium text-moss">
            Optional: auto-generate in app (needs Anthropic API key)
          </summary>
          <p className="mt-2 text-moss text-xs">
            Skip this if you draft in Cursor. Set{" "}
            <code className="rounded bg-cream-soft px-1">ANTHROPIC_API_KEY</code> in{" "}
            <code className="rounded bg-cream-soft px-1">.env.local</code> only if you want
            one-click generation here.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {COPY_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={busy}
                onClick={() =>
                  generate(t.id, t.id === "reverse-testimonial" ? 5 : 1)
                }
                className="rounded-full border border-forest/30 px-4 py-2 text-xs font-semibold text-forest-deep hover:bg-cream-soft disabled:opacity-40"
              >
                Generate · {t.label}
              </button>
            ))}
          </div>
        </details>
      </section>

      <CopyList
        title="Drafts"
        rows={drafts}
        edits={edits}
        setEdits={setEdits}
        busy={busy}
        onSave={saveDraft}
        onPublish={publish}
        onArchive={archive}
      />
      <CopyList
        title="Published (on display today)"
        rows={published}
        edits={edits}
        setEdits={setEdits}
        busy={busy}
        onSave={saveDraft}
        onPublish={publish}
        onArchive={archive}
        publishedOnly
      />
    </div>
  );
}

function CopyList({
  title,
  rows,
  edits,
  setEdits,
  busy,
  onSave,
  onPublish,
  onArchive,
  publishedOnly,
}: {
  title: string;
  rows: CopyRow[];
  edits: Record<string, string>;
  setEdits: (v: Record<string, string>) => void;
  busy: boolean;
  onSave: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  publishedOnly?: boolean;
}) {
  if (!rows.length) {
    return (
      <section className="rounded-[14px] border border-dashed border-[var(--line)] bg-cream-soft/40 p-6">
        <h3 className="font-serif text-xl text-forest-deep">{title}</h3>
        <p className="mt-2 text-moss text-sm">None yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[14px] border border-[var(--line)] bg-white p-6">
      <h3 className="font-serif text-xl text-forest-deep">{title}</h3>
      <ul className="mt-4 space-y-6">
        {rows.map((row) => (
          <li key={row.id} className="border-b border-[var(--line)] pb-6 last:border-0">
            <p className="text-xs font-semibold tracking-wide text-clay uppercase">
              {row.templateId.replace(/-/g, " ")}
            </p>
            <textarea
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-cream/50 p-3 font-serif text-lg text-ink"
              rows={3}
              value={edits[row.id] ?? row.content}
              onChange={(e) =>
                setEdits({ ...edits, [row.id]: e.target.value })
              }
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {!publishedOnly && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSave(row.id)}
                    className="rounded-full bg-forest px-4 py-2 text-xs font-semibold text-cream disabled:opacity-50"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPublish(row.id)}
                    className="rounded-full border border-clay px-4 py-2 text-xs font-semibold text-clay disabled:opacity-50"
                  >
                    Publish to TV
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onArchive(row.id)}
                className="rounded-full px-4 py-2 text-xs text-moss underline disabled:opacity-50"
              >
                Archive
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
