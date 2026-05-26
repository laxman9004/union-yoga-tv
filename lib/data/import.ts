import { mkdir, rename, readdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/client";
import { loadIncomingFiles } from "./load-incoming";
import { runMarianaImport } from "./mariana/import-run";
import { verifyIncomingFiles, type DataVerificationReport } from "./verify";

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

export async function importIncomingFiles(): Promise<ImportResult> {
  const verification = await verifyIncomingFiles();
  const errors: string[] = [];
  const movedFiles: string[] = [];
  const emptyStats = {
    members: 0,
    sessions: 0,
    checkIns: 0,
    frequencyUpdates: 0,
    birthdayUpdates: 0,
    sessionsSkippedFuture: 0,
    orderRowsIgnored: 0,
  };

  if (!verification.sufficientForImport && !verification.sufficientForMvp) {
    return {
      verification,
      imported: emptyStats,
      movedFiles,
      errors: [verification.summary],
    };
  }

  const files = await loadIncomingFiles();
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
    await prisma.$transaction(async (tx) => {
      imported = await runMarianaImport(tx, files);

      for (const { filename, kind, rows } of files) {
        if (kind === "orders") {
          await tx.importRun.create({
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

        await tx.importRun.create({
          data: {
            filename,
            fileType: kind,
            rowCount: rows.length,
            status: "success",
          },
        });
      }
    });
  } catch (e) {
    return {
      verification,
      imported: emptyStats,
      movedFiles,
      errors: [e instanceof Error ? e.message : "Import failed"],
    };
  }

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

  return {
    verification: await verifyIncomingFiles(),
    imported,
    movedFiles,
    errors,
  };
}
