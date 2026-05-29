#!/usr/bin/env npx tsx
/**
 * Read-only diagnostic for the Turso (TV) database. Pinpoints why "today" has
 * no classes / lineups. Usage: npx tsx scripts/diagnose-turso.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { getTursoPrisma } from "../lib/db/sync-clients";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local.");
    process.exit(1);
  }
  const turso = getTursoPrisma();
  const now = new Date();
  console.log(`now: ${now.toString()}  (UTC ${now.toISOString()})`);

  // Sessions per local-day for the last 10 + next 5 days.
  const from = new Date(now);
  from.setDate(from.getDate() - 10);
  const to = new Date(now);
  to.setDate(to.getDate() + 5);
  const sessions = await turso.classSession.findMany({
    where: { startTime: { gte: from, lte: to } },
    select: { id: true, startTime: true },
    orderBy: { startTime: "asc" },
  });
  const perDay = new Map<string, number>();
  for (const s of sessions) {
    const key = ymd(
      new Date(s.startTime.getFullYear(), s.startTime.getMonth(), s.startTime.getDate())
    );
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  console.log("\nSessions per local-day (last 10 / next 5):");
  for (const [day, count] of [...perDay.entries()].sort()) {
    console.log(`  ${day}: ${count}`);
  }

  // All lineups by validFor.
  const lineups = await turso.classLineup.findMany({
    select: { id: true, validFor: true, status: true, classSessionId: true },
    orderBy: { validFor: "asc" },
  });
  console.log(`\nLineups (${lineups.length} total):`);
  for (const l of lineups) {
    console.log(
      `  validFor=${l.validFor.toISOString()} status=${l.status} session=${l.classSessionId}`
    );
  }

  await turso.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
