import { parseCsv } from "./csv";
import { detectKindFromColumns, detectMarianaFileKind } from "./mariana/detect";
import type { IncomingFile } from "./load-incoming";

export function parseIncomingContent(
  filename: string,
  raw: string
): IncomingFile {
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

  return { filename, kind, rows };
}

export async function parseFormDataFiles(formData: FormData): Promise<IncomingFile[]> {
  const out: IncomingFile[] = [];
  for (const value of formData.values()) {
    if (!(value instanceof File)) continue;
    const name = value.name;
    if (!name.endsWith(".csv") && !name.endsWith(".json")) continue;
    const raw = await value.text();
    out.push(parseIncomingContent(name, raw));
  }
  return out;
}
