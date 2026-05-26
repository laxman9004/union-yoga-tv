/** Minimal CSV parser — no extra dependency */

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    if (Object.values(row).some((v) => v.length > 0)) rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const norm = normalizeHeader(key);
    if (row[norm] !== undefined && row[norm] !== "") return row[norm];
  }
  return "";
}

export function parseBool(v: string): boolean {
  const s = v.toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

export function parseDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
