import { NextResponse } from "next/server";
import { getCalendarSummary, listScheduledCopy } from "@/lib/data/calendar";
import { studioLocalDate, studioYmd } from "@/lib/data/dates";

export const dynamic = "force-dynamic";

function parseDate(raw: string | null, fallbackOffsetDays: number): Date {
  if (raw) {
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      return studioLocalDate(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
    }
  }
  const { year, month, day } = studioYmd(new Date());
  return studioLocalDate(year, month, day + fallbackOffsetDays);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"), -14);
  const to = parseDate(searchParams.get("to"), 14);

  const [days, scheduledCopy] = await Promise.all([
    getCalendarSummary(from, to),
    listScheduledCopy(from, to),
  ]);

  return NextResponse.json({ days, scheduledCopy });
}
