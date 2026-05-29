#!/usr/bin/env npx tsx
/**
 * Local-only: import CSVs from data/incoming/ → local SQLite, push to Turso,
 * then rebuild today's lineup drafts.
 *
 * Requires in .env.local:
 *   TURSO_DATABASE_URL
 *   TURSO_AUTH_TOKEN
 */
import { config } from "dotenv";
import { resolve } from "path";
import { loadIncomingFiles } from "../lib/data/load-incoming";
import { runMarianaImport } from "../lib/data/mariana/import-run";
import { pushImportedDataToTurso } from "../lib/data/push-to-turso";
import { verifyIncomingFiles } from "../lib/data/verify";
import { refreshTodayLineupDrafts } from "../lib/data/lineup/store";
import { getLocalPrisma, getTursoPrisma } from "../lib/db/sync-clients";
import { mkdir, rename, readdir } from "fs/promises";
import path from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const INCOMING = path.join(process.cwd(), "data", "incoming");
const PROCESSED = path.join(process.cwd(), "data", "processed");

async function main() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error(
      "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local (same as Netlify)."
    );
    process.exit(1);
  }

  const pushOnly = process.argv.includes("--push-only");
  const lineupOnly = process.argv.includes("--lineup-only");
  const local = getLocalPrisma();

  if (!pushOnly && !lineupOnly) {
    const verification = await verifyIncomingFiles();
    if (!verification.sufficientForImport && !verification.sufficientForMvp) {
      console.error(verification.summary);
      process.exit(1);
    }

    const files = await loadIncomingFiles();
    if (files.length === 0) {
      console.error("No files in data/incoming/");
      process.exit(1);
    }

    console.log("Importing to local database …");
    const t0 = Date.now();
    const imported = await runMarianaImport(local, files);
    console.log(
      `Imported locally in ${Math.round((Date.now() - t0) / 1000)}s: ${imported.members} members · ${imported.checkIns} check-ins · ${imported.sessions} classes`
    );

    for (const { filename, kind, rows } of files) {
      if (kind === "unknown") continue;
      await local.importRun.create({
        data: {
          filename,
          fileType: kind === "orders" ? "orders_skipped" : kind,
          rowCount: rows.length,
          status: kind === "orders" ? "skipped" : "success",
        },
      });
    }
  } else if (pushOnly) {
    console.log("Skipping import (--push-only), using existing local database …");
  } else {
    console.log("Skipping import and push (--lineup-only) …");
  }

  if (!lineupOnly) {
    const remote = getTursoPrisma();
    await pushImportedDataToTurso(local, remote);
  }

  console.log("Building today's lineup drafts on Turso …");
  await refreshTodayLineupDrafts();

  if (!pushOnly && !lineupOnly) {
    await mkdir(PROCESSED, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const names = (await readdir(INCOMING)).filter(
      (f) => f.endsWith(".csv") || f.endsWith(".json")
    );
    for (const filename of names) {
      await rename(
        path.join(INCOMING, filename),
        path.join(PROCESSED, `${stamp}__${filename}`)
      );
    }
    console.log(`Done. Archived ${names.length} file(s). Open admin → Lineup → Publish to TV.`);
  } else {
    console.log("Done. Open admin → Lineup → Publish to TV.");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
