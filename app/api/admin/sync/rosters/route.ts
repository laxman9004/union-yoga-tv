import { NextResponse } from "next/server";
import { syncRostersFromMariana } from "@/lib/data/mariana-api/sync-rosters";

export const dynamic = "force-dynamic";
// Roster sync hits the Mariana API once per class in the window (~70 calls
// at this studio) and does ~hundreds of DB upserts. Give it room.
export const maxDuration = 60;

/**
 * POST /api/admin/sync/rosters
 *
 * Admin-protected. Pulls per-class reservations + users from the Mariana
 * Admin API for the date window (default -2..+14 days), upserts Member /
 * CheckIn / ClassSession rows, then recomputes per-member rolling counters.
 *
 * Optional JSON body:
 *   { daysBack?: number, daysAhead?: number }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const daysBack =
    typeof body?.daysBack === "number" && body.daysBack >= 0 ? body.daysBack : undefined;
  const daysAhead =
    typeof body?.daysAhead === "number" && body.daysAhead > 0
      ? body.daysAhead
      : undefined;

  if (!process.env.MARIANATEK_API_TOKEN || !process.env.MARIANATEK_BASE_URL) {
    return NextResponse.json(
      {
        error:
          "Mariana API not configured. Set MARIANATEK_API_TOKEN and MARIANATEK_BASE_URL in environment.",
      },
      { status: 503 }
    );
  }

  const stats = await syncRostersFromMariana({ daysBack, daysAhead });
  const status = stats.errors.length > 0 ? 207 : 200;
  return NextResponse.json(stats, { status });
}
