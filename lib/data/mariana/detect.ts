import type { MarianaFileKind } from "./types";

export function detectMarianaFileKind(filename: string): MarianaFileKind {
  const n = filename.toLowerCase();

  if (n.includes("birthday")) return "customer_birthdays";
  if (n.includes("frequency")) return "customer_frequency";
  if (n.includes("customers-details") || n.includes("customer-details"))
    return "customers_details";
  if (n.includes("reservation")) return "reservations";
  if (n.includes("utilization") || n.includes("class-session"))
    return "class_utilization";
  if (n.includes("orders")) return "orders";

  if (n.includes("check") || n.includes("reservation")) return "generic_check_ins";
  if (n.includes("session") || n.includes("schedule")) return "generic_class_sessions";
  if (n.includes("member") || n.includes("customer")) return "generic_members";

  return "unknown";
}

export function detectKindFromColumns(
  keys: string[]
): MarianaFileKind | "unknown" {
  if (keys.includes("reservation_id") && keys.includes("class_id"))
    return "reservations";
  if (keys.includes("customer_id") && keys.includes("first_name"))
    return "customers_details";
  if (keys.includes("customer_id") && keys.includes("checkins"))
    return "customer_frequency";
  if (keys.includes("customer_id") && keys.includes("date_of_last_class"))
    return "customer_frequency";
  if (keys.includes("class_date") && keys.includes("class_type"))
    return "class_utilization";
  if (keys.includes("order_number")) return "orders";
  if (keys.includes("member_id") && keys.includes("checked_in_at"))
    return "generic_check_ins";
  if (keys.includes("class_type") && keys.includes("start_time"))
    return "generic_class_sessions";
  if (keys.includes("first_name") && keys.includes("id")) return "generic_members";
  return "unknown";
}
