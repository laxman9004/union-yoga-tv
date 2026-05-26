import { ImageResponse } from "next/og";
import { buildFrameSnapshot } from "@/lib/data/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scene = searchParams.get("scene") || "whiteboard";
  const snapshot = await buildFrameSnapshot();

  if (scene === "welcome" && snapshot.todaysCheckIns[0]) {
    const c = snapshot.todaysCheckIns[0];
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#F4EFE6",
            padding: "80px",
            fontFamily: "Georgia, serif",
          }}
        >
          <div style={{ fontSize: 24, letterSpacing: "0.2em", color: "#B5764B" }}>
            WELCOME BACK
          </div>
          <div
            style={{
              fontSize: 96,
              color: "#1F2A22",
              marginTop: 24,
              lineHeight: 1.05,
            }}
          >
            {c.firstName}
            {c.lastInitial ? ` ${c.lastInitial}.` : ""}
          </div>
          <div style={{ fontSize: 36, color: "#5C7060", marginTop: 32 }}>
            Class #{c.lifetimeClassCount}
            {c.instructorName ? ` · ${c.instructorName}` : ""}
          </div>
        </div>
      ),
      { width: 1920, height: 1080 }
    );
  }

  if (scene === "milestone" && snapshot.nearMilestones[0]) {
    const m = snapshot.nearMilestones[0];
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#F4EFE6",
            padding: "80px",
          }}
        >
          <div style={{ fontSize: 24, letterSpacing: "0.2em", color: "#B5764B" }}>
            {m.classesUntil === 0 ? "MILESTONE" : "ALMOST THERE"}
          </div>
          <div style={{ fontSize: 96, color: "#1F2A22", marginTop: 24 }}>
            {m.firstName}
            {m.lastInitial ? ` ${m.lastInitial}.` : ""}
          </div>
          <div style={{ fontSize: 40, color: "#5C7060", marginTop: 28 }}>
            {m.classesUntil === 0
              ? `Class #${m.target}.`
              : `${m.classesUntil} more to #${m.target}.`}
          </div>
        </div>
      ),
      { width: 1920, height: 1080 }
    );
  }

  if (scene === "popular" && snapshot.popularClassThisWeek) {
    const p = snapshot.popularClassThisWeek;
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#F4EFE6",
            padding: "80px",
          }}
        >
          <div style={{ fontSize: 24, color: "#B5764B", letterSpacing: "0.15em" }}>
            THIS WEEK
          </div>
          <div style={{ fontSize: 72, color: "#1F2A22", marginTop: 24, maxWidth: 1600 }}>
            {p.classType} won.
          </div>
        </div>
      ),
      { width: 1920, height: 1080 }
    );
  }

  const rows = snapshot.topThisWeek.slice(0, 6);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#F4EFE6",
          padding: "80px",
        }}
      >
        <div style={{ fontSize: 22, color: "#B5764B", letterSpacing: "0.2em" }}>
          THIS WEEK
        </div>
        <div style={{ fontSize: 64, color: "#1F2A22", marginTop: 16 }}>
          The whiteboard.
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 48,
            gap: 20,
          }}
        >
          {rows.map((r, i) => (
            <div
              key={r.memberId}
              style={{ display: "flex", fontSize: 36, color: "#1F2A22" }}
            >
              <span style={{ width: 48, color: "#B5764B" }}>{i + 1}</span>
              <span style={{ flex: 1 }}>
                {r.firstName}
                {r.lastInitial ? ` ${r.lastInitial}.` : ""}
              </span>
              <span style={{ color: "#5C7060" }}>{r.count}</span>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 48, left: 80, fontSize: 18, color: "#5C7060" }}>
          {snapshot.dataThrough ? `As of ${snapshot.dataThrough}` : "Union Yoga · Powell"}
        </div>
      </div>
    ),
    { width: 1920, height: 1080 }
  );
}
