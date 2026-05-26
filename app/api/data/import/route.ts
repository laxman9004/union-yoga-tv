import { NextResponse } from "next/server";
import { importIncomingFiles } from "@/lib/data/import";

export async function POST() {
  try {
    const result = await importIncomingFiles();
    const status = result.errors.length ? 400 : 200;
    return NextResponse.json(result, { status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 }
    );
  }
}
