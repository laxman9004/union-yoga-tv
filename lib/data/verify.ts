import { loadIncomingFiles } from "./load-incoming";
import { parseMtDate, isOnOrBeforeToday, combineClassDateTime } from "./dates";
import { MT } from "./mariana/fields";
import type { MarianaFileKind } from "./mariana/types";
import { MARIANA_FILE_LABELS } from "./mariana/types";

export type SceneReadiness = {
  sceneGroup: string;
  status: "ready" | "partial" | "blocked";
  note: string;
};

export type FileReport = {
  filename: string;
  kind: MarianaFileKind;
  label: string;
  rowCount: number;
  columnsFound: string[];
  warnings: string[];
};

export type DataVerificationReport = {
  scannedAt: string;
  incomingDir: string;
  files: FileReport[];
  crossFile: {
    memberCount: number;
    sessionCountPast: number;
    sessionCountFuture: number;
    frequencyRowCount: number;
    hasReservationsExport: boolean;
    checkInCount: number;
    dateRange: { earliest: string | null; latest: string | null };
  };
  sceneReadiness: SceneReadiness[];
  summary: string;
  sufficientForMvp: boolean;
  sufficientForImport: boolean;
};

function analyzeMarianaFile(
  filename: string,
  kind: MarianaFileKind,
  rows: Record<string, string>[]
): FileReport {
  const columnsFound = rows.length ? Object.keys(rows[0]) : [];
  const warnings: string[] = [];

  if (rows.length === 0) warnings.push("File is empty.");

  switch (kind) {
    case "customers_details":
      if (!columnsFound.includes("customer_id"))
        warnings.push("Missing Customer ID column.");
      if (!columnsFound.includes("first_name"))
        warnings.push("Missing First Name column.");
      break;
    case "customer_frequency":
      if (!columnsFound.includes("customer_id"))
        warnings.push("Missing Customer ID.");
      if (!columnsFound.includes("checkins"))
        warnings.push("Missing Check-Ins column.");
      break;
    case "reservations":
      if (!columnsFound.includes("reservation_id"))
        warnings.push("Missing Reservation ID.");
      if (!columnsFound.includes("customer_id"))
        warnings.push("Missing Customer ID.");
      if (!columnsFound.includes("class_id"))
        warnings.push("Missing Class ID.");
      break;
    case "class_utilization":
      if (!columnsFound.includes("class_date"))
        warnings.push("Missing Class Date.");
      if (!columnsFound.includes("class_type"))
        warnings.push("Missing Class Type.");
      break;
    case "orders":
      warnings.push("Imported for reference only — not used on TV.");
      break;
    case "unknown":
      warnings.push("Unrecognized file — see data/README.md.");
      break;
    default:
      break;
  }

  return {
    filename,
    kind,
    label: MARIANA_FILE_LABELS[kind],
    rowCount: rows.length,
    columnsFound: columnsFound.slice(0, 12),
    warnings,
  };
}

export async function verifyIncomingFiles(): Promise<DataVerificationReport> {
  const parsed = await loadIncomingFiles();
  const files = parsed.map((p) => analyzeMarianaFile(p.filename, p.kind, p.rows));

  const details = parsed.filter((p) => p.kind === "customers_details");
  const frequency = parsed.filter((p) => p.kind === "customer_frequency");
  const utilization = parsed.filter((p) => p.kind === "class_utilization");

  let memberCount = 0;
  for (const f of details) {
    for (const r of f.rows) {
      if (MT.customerId(r) && MT.firstName(r)) memberCount++;
    }
  }

  let sessionCountPast = 0;
  let sessionCountFuture = 0;
  const classDates: Date[] = [];

  for (const f of utilization) {
    for (const r of f.rows) {
      const start = combineClassDateTime(MT.classDate(r), MT.classTime(r));
      if (!start) continue;
      classDates.push(start);
      if (isOnOrBeforeToday(start)) sessionCountPast++;
      else sessionCountFuture++;
    }
  }

  let frequencyRowCount = 0;
  for (const f of frequency) frequencyRowCount += f.rows.length;

  let checkInCount = 0;
  for (const f of parsed.filter((p) => p.kind === "reservations")) {
    for (const r of f.rows) {
      const status = (r.status || "").trim().toLowerCase();
      if (status === "check in") checkInCount++;
    }
  }

  const hasReservationsExport = parsed.some(
    (p) => p.kind === "reservations" || p.kind === "generic_check_ins"
  );

  classDates.sort((a, b) => a.getTime() - b.getTime());

  const hasDetails =
    details.length > 0 &&
    files
      .filter((f) => f.kind === "customers_details")
      .every((f) => !f.warnings.some((w) => w.startsWith("Missing")));

  const hasReservationsFile = parsed.some(
    (p) => p.kind === "reservations" && p.rows.length > 0
  );
  const sufficientForImport =
    (hasDetails && memberCount > 0) ||
    (hasReservationsFile && checkInCount > 0);
  const sufficientForMvp =
    sufficientForImport && (sessionCountPast > 0 || checkInCount > 0);

  const sceneReadiness: SceneReadiness[] = [
    {
      sceneGroup: "Ambient art + studio anniversary",
      status: "ready",
      note: "No import required beyond config.",
    },
    {
      sceneGroup: "Milestones + membership anniversary + birthdays",
      status: hasDetails ? "ready" : "blocked",
      note: hasDetails
        ? "From Customers – Details (Birth Date, Join Date, all-time check-ins)."
        : "Need report-customers-details.csv.",
    },
    {
      sceneGroup: "Whiteboard / top attendees (period)",
      status:
        hasDetails && frequencyRowCount > 0 ? "ready" : hasDetails ? "partial" : "blocked",
      note:
        frequencyRowCount > 0
          ? "Customer Frequency check-ins for your MT date range (2025–2026)."
          : "Add Customer Frequency export.",
    },
    {
      sceneGroup: "Popular class / fill rate / instructor",
      status: sessionCountPast > 0 ? "ready" : "partial",
      note:
        sessionCountPast > 0
          ? `${sessionCountPast} past classes imported; ${sessionCountFuture} future rows skipped.`
          : "Need Class Session Utilization Details.",
    },
    {
      sceneGroup: "Walk-in welcome + roster by name",
      status: checkInCount > 0 ? "ready" : hasReservationsExport ? "partial" : "blocked",
      note:
        checkInCount > 0
          ? `${checkInCount.toLocaleString()} check-in rows in Reservations export.`
          : "Needs Reservations report with check-in rows.",
    },
    {
      sceneGroup: "Week streaks (exact)",
      status: "partial",
      note: "Only last visit + period totals until Reservations history exists.",
    },
  ];

  let summary: string;
  if (parsed.length === 0) {
    summary = "No CSV files in data/incoming/.";
  } else if (!hasDetails) {
    summary = "Missing Customers – Details export.";
  } else if (!sufficientForMvp) {
    summary = `${memberCount} members found. Add utilization (or more data) for full MVP import.`;
  } else {
    summary = `Ready to import: ${memberCount} members, ${sessionCountPast} past classes (${sessionCountFuture} future skipped). Data through today.`;
  }

  return {
    scannedAt: new Date().toISOString(),
    incomingDir: process.cwd() + "/data/incoming",
    files,
    crossFile: {
      memberCount,
      sessionCountPast,
      sessionCountFuture,
      frequencyRowCount,
      hasReservationsExport,
      checkInCount,
      dateRange: {
        earliest: classDates[0]?.toISOString() ?? null,
        latest: classDates[classDates.length - 1]?.toISOString() ?? null,
      },
    },
    sceneReadiness,
    summary,
    sufficientForMvp,
    sufficientForImport,
  };
}
