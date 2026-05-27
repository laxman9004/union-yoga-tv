import { mkdir, rename, readdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/client";
import { loadIncomingFiles, type IncomingFile } from "./load-incoming";
import { runMarianaImport } from "./mariana/import-run";
import { refreshTodayLineupDrafts } from "./lineup/store";
import {
  verifyFileSet,
  verifyIncomingFiles,
  type DataVerificationReport,
} from "./verify";

const INCOMING = path.join(process.cwd(), "data", "incoming");
const PROCESSED = path.join(process.cwd(), "data", "processed");

export type ImportResult = {
  verification: DataVerificationReport;
  imported: {
    members: number;
    sessions: number;
    checkIns: number;
    frequencyUpdates: number;
    birthdayUpdates: number;
    sessionsSkippedFuture: number;
    orderRowsIgnored: number;
  };
  movedFiles: string[];
  errors: string[];
};

const emptyStats = {
  members: 0,
  sessions: 0,
  checkIns: 0,
  frequencyUpdates: 0,
  birthdayUpdates: 0,
  sessionsSkippedFuture: 0,
  orderRowsIgnored: 0,
};

export async function importFileSet(
  files: IncomingFile[],
  opts?: { archiveToDisk?: boolean; sourceLabel?: string }
): Promise<ImportResult> {
  const verification = verifyFileSet(files, { sourceLabel: opts?.sourceLabel });
  const errors: string[] = [];
  const movedFiles: string[] = [];

  if (!verification.sufficientForImport && !verification.sufficientForMvp) {
    return {
      verification,
      imported: emptyStats,
      movedFiles,
      errors: [verification.summary],
    };
  }

  if (files.length === 0) {
    return {
      verification,
      imported: emptyStats,
      movedFiles,
      errors: ["No files to import."],
    };
  }

  let imported = emptyStats;

  try {
    imported = await runMarianaImport(prisma, files);

    for (const { filename, kind, rows } of files) {
      if (kind === "orders") {
        await prisma.importRun.create({
          data: {
            filename,
            fileType: "orders_skipped",
            rowCount: rows.length,
            status: "skipped",
          },
        });
        continue;
      }
      if (kind === "unknown") continue;

      await prisma.importRun.create({
        data: {
          filename,
          fileType: kind,
          rowCount: rows.length,
          status: "success",
        },
      });
    }

    try {
      await refreshTodayLineupDrafts();
    } catch {
      /* lineup tables optional until migration applied */
    }
  } catch (e) {
    return {
      verification,
      imported: emptyStats,
      movedFiles,
      errors: [e instanceof Error ? e.message : "Import failed"],
    };
  }

  if (opts?.archiveToDisk) {
    await mkdir(PROCESSED, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const names = (await readdir(INCOMING)).filter(
      (f) => f.endsWith(".csv") || f.endsWith(".json")
    );

    for (const filename of names) {
      try {
        await rename(
          path.join(INCOMING, filename),
          path.join(PROCESSED, `${stamp}__${filename}`)
        );
        movedFiles.push(filename);
      } catch (e) {
        errors.push(`Could not archive ${filename}: ${e}`);
      }
    }
  }

  return {
    verification: verifyFileSet(files, { sourceLabel: opts?.sourceLabel }),
    imported,
    movedFiles,
    errors,
  };
}

export async function importIncomingFiles(): Promise<ImportResult> {
  const verification = await verifyIncomingFiles();
  const files = await loadIncomingFiles();
  return importFileSet(files, { archiveToDisk: true });
}
