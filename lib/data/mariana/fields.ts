import { pick } from "../csv";

/** MT headers normalize with odd punctuation — try several keys. */
export function col(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = pick(row, k);
    if (v) return v;
  }
  return "";
}

export function intCol(row: Record<string, string>, ...keys: string[]): number {
  const v = col(row, ...keys);
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Customers – Details */
export const MT = {
  customerId: (r: Record<string, string>) => col(r, "customer_id", "customerid"),
  email: (r: Record<string, string>) => col(r, "email", "customer_email"),
  firstName: (r: Record<string, string>) => col(r, "first_name", "firstname"),
  lastName: (r: Record<string, string>) => col(r, "last_name", "lastname"),
  joinDate: (r: Record<string, string>) => col(r, "join_date", "joindate"),
  birthDate: (r: Record<string, string>) => col(r, "birth_date", "birthdate"),
  checkInsAllTime: (r: Record<string, string>) =>
    intCol(r, "total_checkins__all_time"),
  checkIns1Week: (r: Record<string, string>) =>
    intCol(r, "total_checkins__1_week"),
  checkIns1Month: (r: Record<string, string>) =>
    intCol(r, "total_checkins__1_month"),
  firstCheckIn: (r: Record<string, string>) => col(r, "first_checkin"),
  lastCheckIn: (r: Record<string, string>) => col(r, "last_checkin"),
  guestCheckInsAllTime: (r: Record<string, string>) =>
    intCol(r, "total_guest_checkins__all_time"),

  /** Customer Frequency */
  freqCustomerId: (r: Record<string, string>) => col(r, "customer_id"),
  freqCheckIns: (r: Record<string, string>) => col(r, "checkins", "check_ins"),
  freqLastClass: (r: Record<string, string>) =>
    col(r, "date_of_last_class", "dateoflastclass"),

  /** Utilization */
  classDate: (r: Record<string, string>) => col(r, "class_date", "classdate"),
  classTime: (r: Record<string, string>) => col(r, "class_time", "classtime"),
  classType: (r: Record<string, string>) => col(r, "class_type", "classtype"),
  instructors: (r: Record<string, string>) => col(r, "instructors"),
  classroom: (r: Record<string, string>) => col(r, "classroom"),
  location: (r: Record<string, string>) => col(r, "location"),
  layoutCapacity: (r: Record<string, string>) =>
    col(r, "layout_capacity", "layoutcapacity"),
  actualCapacity: (r: Record<string, string>) =>
    col(r, "actual_capacity", "actualcapacity"),
  checkedInReservations: (r: Record<string, string>) =>
    col(r, "checked_in_reservations", "checkedinreservations"),
  utilizationPct: (r: Record<string, string>) =>
    col(r, "_utilization", "utilization"),

  /** Reservations */
  reservationId: (r: Record<string, string>) =>
    col(r, "reservation_id", "reservationid"),
  reservationStatus: (r: Record<string, string>) => col(r, "status"),
  classId: (r: Record<string, string>) => col(r, "class_id", "classid"),
  classStartDate: (r: Record<string, string>) =>
    col(r, "class_start_date", "classstartdate"),
  classStartTime: (r: Record<string, string>) =>
    col(r, "class_start_time", "classstarttime"),
  reservationCustomerId: (r: Record<string, string>) =>
    col(r, "customer_id", "customerid"),
  reservationCustomerEmail: (r: Record<string, string>) =>
    col(r, "customer_email", "customeremail"),
  reservationCustomerName: (r: Record<string, string>) =>
    col(r, "customer_name", "customername"),
  reservationInstructors: (r: Record<string, string>) =>
    col(r, "instructor_names", "instructornames"),
  reservationClassType: (r: Record<string, string>) =>
    col(r, "class_type", "classtype"),
  reservationClassroom: (r: Record<string, string>) =>
    col(r, "classroom"),
  reservationClassCapacity: (r: Record<string, string>) =>
    col(r, "class_capacity", "classcapacity"),
  reservationLayoutCapacity: (r: Record<string, string>) =>
    col(r, "layout_capacity", "layoutcapacity"),
  reservationGuest: (r: Record<string, string>) => col(r, "guest"),
  reservationUpdatedDate: (r: Record<string, string>) =>
    col(r, "updated_date", "updateddate"),
} as const;

export function parsePersonName(full: string): {
  firstName: string;
  lastInitial: string | null;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Friend", lastInitial: null };
  const firstName = parts[0];
  const lastInitial =
    parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() ?? null : null;
  return { firstName, lastInitial };
}

export function isCheckedInStatus(status: string): boolean {
  return status.trim().toLowerCase() === "check in";
}

export function marianaClassSessionId(classId: string): string {
  return `mt-class-${classId}`;
}
