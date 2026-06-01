import { NextResponse } from "next/server";
import { polishScene } from "@/lib/ai/polish-scene";

export const dynamic = "force-dynamic";

/**
 * POST /api/copy/polish
 *
 * Admin-protected (middleware enforces session). Body:
 *   {
 *     sceneKey: string,
 *     category: "class" | "student",
 *     payload: Record<string, unknown>,
 *     classType?: string,
 *     instructorName?: string,
 *     currentHeadline: string,
 *     currentSubline: string,
 *   }
 *
 * Response: { headline, subline } on success, { error } otherwise.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.sceneKey !== "string") {
    return NextResponse.json({ error: "sceneKey required" }, { status: 400 });
  }

  const result = await polishScene({
    sceneKey: body.sceneKey,
    category: body.category === "student" ? "student" : "class",
    payload: (body.payload && typeof body.payload === "object" ? body.payload : {}) as Record<
      string,
      unknown
    >,
    classType: typeof body.classType === "string" ? body.classType : null,
    instructorName:
      typeof body.instructorName === "string" ? body.instructorName : null,
    currentHeadline:
      typeof body.currentHeadline === "string" ? body.currentHeadline : "",
    currentSubline:
      typeof body.currentSubline === "string" ? body.currentSubline : "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ headline: result.headline, subline: result.subline });
}
