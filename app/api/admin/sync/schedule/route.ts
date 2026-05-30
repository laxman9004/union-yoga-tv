import { NextResponse } from "next/server";
import { syncScheduleToTurso } from "@/lib/data/mariana-api/sync-schedule";

// This endpoint reads the Mariana API and writes to Turso — must run at
// request time, never prerender or cache.
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sync/schedule
 *
 * Admin-protected (middleware enforces the session cookie). Pulls the next
 * `daysAhead` of classes (defaults to ~14) from Mariana and upserts them into
 * the active DB. Idempotent; safe to call repeatedly.
 *
 * Optional JSON body:
 *   { daysBack?: number, daysAhead?: number, includeCancelled?: boolean }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const daysBack =
    typeof body?.daysBack === "number" && body.daysBack >= 0 ? body.daysBack : undefined;
  const daysAhead =
    typeof body?.daysAhead === "number" && body.daysAhead > 0
      ? body.daysAhead
      : undefined;
  const includeCancelled = body?.includeCancelled === true;

  if (!process.env.MARIANATEK_API_TOKEN || !process.env.MARIANATEK_BASE_URL) {
    return NextResponse.json(
      {
        error:
          "Mariana API not configured. Set MARIANATEK_API_TOKEN and MARIANATEK_BASE_URL in environment.",
      },
      { status: 503 }
    );
  }

  const stats = await syncScheduleToTurso({
    daysBack,
    daysAhead,
    includeCancelled,
  });

  const status = stats.errors.length > 0 ? 207 : 200;
  return NextResponse.json(stats, { status });
}
