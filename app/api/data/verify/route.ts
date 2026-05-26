import { NextResponse } from "next/server";
import { verifyIncomingFiles } from "@/lib/data/verify";

export async function GET() {
  const report = await verifyIncomingFiles();
  return NextResponse.json(report);
}
