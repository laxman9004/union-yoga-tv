export type MarianaFileKind =
  | "customers_details"
  | "customer_frequency"
  | "customer_birthdays"
  | "reservations"
  | "class_utilization"
  | "orders"
  | "generic_members"
  | "generic_class_sessions"
  | "generic_check_ins"
  | "unknown";

export const MARIANA_FILE_LABELS: Record<MarianaFileKind, string> = {
  customers_details: "Customers – Details",
  customer_frequency: "Customer Frequency",
  customer_birthdays: "Customer Birthdays",
  reservations: "Reservations",
  class_utilization: "Class Session Utilization Details",
  orders: "Orders – Local Time",
  generic_members: "members.csv (generic)",
  generic_class_sessions: "class_sessions.csv (generic)",
  generic_check_ins: "check_ins.csv (generic)",
  unknown: "Unknown",
};
