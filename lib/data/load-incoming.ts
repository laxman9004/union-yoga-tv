import { readdir, readFile } from "fs/promises";
import path from "path";
import { parseCsv } from "./csv";
import { detectKindFromColumns, detectMarianaFileKind } from "./mariana/detect";
import type { MarianaFileKind } from "./mariana/types";

const INCOMING = path.join(process.cwd(), "data", "incoming");

export type IncomingFile = {
  filename: string;
  kind: MarianaFileKind;
  rows: Record<string, string>[];
};

export async function loadIncomingFiles(): Promise<IncomingFile[]> {
  let entries: string[] = [];
  try {
    entries = await readdir(INCOMING);
  } catch {
    return [];
  }

  const out: IncomingFile[] = [];

  for (const filename of entries.filter(
    (f) => f.endsWith(".csv") || f.endsWith(".json")
  )) {
    const raw = await readFile(path.join(INCOMING, filename), "utf-8");
    let rows: Record<string, string>[] = [];

    if (filename.endsWith(".json")) {
      const data = JSON.parse(raw) as unknown;
      if (Array.isArray(data)) {
        rows = data.map((r) =>
          Object.fromEntries(
            Object.entries(r as Record<string, unknown>).map(([k, v]) => [
              k.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
              String(v ?? ""),
            ])
          )
        );
      }
    } else {
      rows = parseCsv(raw);
    }

    let kind = detectMarianaFileKind(filename);
    if (kind === "unknown" && rows.length) {
      kind = detectKindFromColumns(Object.keys(rows[0]));
    }

    out.push({ filename, kind, rows });
  }

  return out;
}

export function getIncomingDir(): string {
  return INCOMING;
}
