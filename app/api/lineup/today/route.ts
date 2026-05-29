import { NextResponse } from "next/server";
import {
  getTodayLineupAdmin,
  publishTodayLineup,
  refreshTodayLineupDrafts,
  saveLineupDraft,
} from "@/lib/data/lineup/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("refresh") === "1") {
    await refreshTodayLineupDrafts();
  }
  const day = await getTodayLineupAdmin();
  if (!day.classes.some((c) => c.items.length > 0)) {
    await refreshTodayLineupDrafts();
    return NextResponse.json(await getTodayLineupAdmin());
  }
  return NextResponse.json(day);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.action === "refresh") {
    await refreshTodayLineupDrafts();
    return NextResponse.json(await getTodayLineupAdmin());
  }

  const toggles = Array.isArray(body.toggles) ? body.toggles : [];

  if (body.action === "publish") {
    await publishTodayLineup(toggles);
    return NextResponse.json({ ok: true, ...(await getTodayLineupAdmin()) });
  }

  if (body.action === "save") {
    await saveLineupDraft(toggles);
    return NextResponse.json({ ok: true, ...(await getTodayLineupAdmin()) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
