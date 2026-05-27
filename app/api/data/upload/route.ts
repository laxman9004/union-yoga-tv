import { NextResponse } from "next/server";
import { importFileSet } from "@/lib/data/import";
import { parseFormDataFiles } from "@/lib/data/parse-upload";
import { verifyFileSet } from "@/lib/data/verify";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "verify");

    for (const value of formData.values()) {
      if (value instanceof File && value.size > MAX_BYTES) {
        return NextResponse.json(
          {
            error: `${value.name} is too large for browser upload (${Math.round(value.size / 1024 / 1024)}MB). Use npm run sync on your Mac for files over 5MB.`,
          },
          { status: 413 }
        );
      }
    }

    const files = await parseFormDataFiles(formData);
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No CSV files selected. Pick your Mariana exports first." },
        { status: 400 }
      );
    }

    if (action === "verify") {
      return NextResponse.json(
        verifyFileSet(files, { sourceLabel: "browser upload" })
      );
    }

    if (action === "import") {
      const result = await importFileSet(files, { sourceLabel: "browser upload" });
      const status = result.errors.length ? 400 : 200;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
