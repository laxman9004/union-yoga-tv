import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { publishCopy } from "@/lib/ai/generate";
import { createCopyDraft } from "@/lib/data/copy";
import { studioDayKey, studioLocalDate } from "@/lib/data/dates";
import {
  getTodayLineupAdmin,
  publishTodayLineup,
  refreshTodayLineupDrafts,
  type LineupDraftRow,
} from "@/lib/data/lineup/store";
import { buildStudioSuggestions } from "@/lib/data/studio-suggestions";

export const dynamic = "force-dynamic";

/** Parse a YYYY-MM-DD param into a studio day-start instant (defaults to today). */
function parseDateParam(raw: string | null | undefined): Date {
  if (raw) {
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      return studioLocalDate(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
    }
  }
  return studioLocalDate(...todayParts());
}

function todayParts(): [number, number, number] {
  const key = studioDayKey(new Date());
  const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
  return [y, m, d];
}

function isPast(date: Date): boolean {
  return studioDayKey(date) < studioDayKey(new Date());
}

async function loadBoard(date: Date) {
  let lineup = await getTodayLineupAdmin(date);
  // Only (re)generate drafts for today/future — never rewrite a past day.
  if (!isPast(date) && !lineup.classes.some((c) => c.items.length > 0)) {
    await refreshTodayLineupDrafts(date);
    lineup = await getTodayLineupAdmin(date);
  }

  // Suggestions are computed from the live snapshot, which is only meaningful
  // for today/future. Past days show stored items only.
  const studio = isPast(date) ? [] : await buildStudioSuggestions();

  if (!isPast(date)) {
    const aiDrafts = await prisma.generatedCopy.findMany({
      where: { status: "draft", templateId: "reverse-testimonial" },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    for (const d of aiDrafts) {
      studio.push({
        suggestionKey: `draft-${d.id}`,
        templateId: "reverse-testimonial",
        label: "Reverse testimonial",
        content: d.content,
        reason: "AI draft — edit or skip",
      });
    }
  }

  return { studio, lineup, date: studioDayKey(date), readOnly: isPast(date) };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = parseDateParam(searchParams.get("date"));
  return NextResponse.json(await loadBoard(date));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const date = parseDateParam(typeof body.date === "string" ? body.date : null);

  if ((body.action === "refresh" || body.action === "publish") && isPast(date)) {
    return NextResponse.json(
      { error: "Past dates are read-only." },
      { status: 403 }
    );
  }

  if (body.action === "refresh") {
    await refreshTodayLineupDrafts(date);
    return NextResponse.json(await loadBoard(date));
  }

  if (body.action === "publish") {
    const lineupRows = Array.isArray(body.lineup) ? (body.lineup as LineupDraftRow[]) : [];
    const studioRows = Array.isArray(body.studio) ? body.studio : [];

    await publishTodayLineup(lineupRows, date);

    const studioErrors: string[] = [];
    let studioPublished = 0;
    for (const row of studioRows) {
      if (!row.accepted || typeof row.content !== "string" || !row.templateId) continue;
      try {
        const draftId =
          typeof row.suggestionKey === "string" && row.suggestionKey.startsWith("draft-") ?
            row.suggestionKey.slice("draft-".length)
          : null;
        if (draftId) {
          await publishCopy(draftId, row.content, { validFor: date });
        } else {
          await createCopyDraft(String(row.templateId), row.content, {
            publish: true,
            validFor: date,
          });
        }
        studioPublished++;
      } catch (e) {
        studioErrors.push(
          e instanceof Error ? e.message : `Could not publish ${row.templateId}`
        );
      }
    }

    const board = await loadBoard(date);
    const lineupOn = lineupRows.filter((r) => r.enabled).length;
    return NextResponse.json({
      ok: true,
      lineupPublished: lineupOn,
      studioPublished,
      studioErrors,
      ...board,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
