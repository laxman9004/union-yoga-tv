/**
 * Fetch one class session's full roster (reservations + users) from the
 * Mariana Admin API.
 *
 * GET /api/class_sessions/{id}?include=reservations,reservations.user returns
 * the class + every reservation and every involved user in a single JSON:API
 * response — sidestepping the broken filter syntax on /api/reservations.
 *
 * Use `check_in_date != null` to mean "actually attended" (status="check in").
 * Statuses observed: "check in", "pending", "standard cancel", "penalty cancel".
 */
import { marianaFetch } from "./client";

export type ApiAdminClassSession = {
  id: string; // Mariana class session id (string)
  type: "class_sessions";
  attributes: {
    start_date: string; // "2026-05-29"
    start_time: string; // "07:00:00"
    start_datetime: string; // ISO instant
    end_datetime: string; // ISO instant
    capacity: number;
    checked_in_user_count: number;
    first_time_user_count: number;
    vip_user_count: number;
    standard_reservation_user_count: number;
    waitlist_reservation_user_count: number;
    cancellation_datetime: string | null;
    instructor_names: string[];
    classroom_display: string | null;
    class_type_display: string;
    location_display: string;
    public_waitlist_count: number;
  };
  relationships?: {
    reservations?: { data: Array<{ id: string; type: "reservations" }> };
  };
};

export type ApiReservation = {
  id: string;
  type: "reservations";
  attributes: {
    cancel_date: string | null;
    check_in_date: string | null;
    creation_date: string;
    guest_email: string;
    guest_name: string | null;
    reservation_type: string;
    reserved_for_guest: boolean;
    status: string;
    used_geo_checkin: boolean | null;
    waitlist_weight: number | null;
  };
  relationships: {
    user?: { data: { id: string; type: "users" } | null };
    class_session?: { data: { id: string; type: "class_sessions" } | null };
    spot?: { data: { id: string; type: "spots" } | null };
  };
};

export type ApiAdminUser = {
  id: string;
  type: "users";
  attributes: {
    first_name: string;
    last_name: string | null;
    email: string | null;
    birth_date: string | null; // "yyyy-mm-dd"
    date_joined: string | null; // ISO instant
    marketing_opt_in: boolean;
    has_vip_tag_cache: boolean;
    completed_class_count: number;
    archived_at: string | null;
    is_minimal: boolean;
    merged_into_id: string | null;
    is_external_user: boolean;
    full_name: string;
  };
};

export type RosterResponse = {
  classSession: ApiAdminClassSession;
  reservations: ApiReservation[];
  users: Map<string, ApiAdminUser>;
};

type RawResponse = {
  data: ApiAdminClassSession;
  included?: Array<ApiReservation | ApiAdminUser>;
};

/**
 * Fetch a single class session + its reservations + their users.
 * The Mariana id (e.g. "12118") is the same `id` field on the API class object,
 * NOT the synthetic mt-* key we use for our DB rows.
 */
export async function fetchRoster(marianaClassId: string): Promise<RosterResponse> {
  const res = await marianaFetch<RawResponse>(
    `/class_sessions/${encodeURIComponent(marianaClassId)}`,
    {
      surface: "admin",
      query: { include: "reservations,reservations.user" },
    }
  );

  const reservations: ApiReservation[] = [];
  const users = new Map<string, ApiAdminUser>();
  for (const inc of res.included ?? []) {
    if (inc.type === "reservations") reservations.push(inc as ApiReservation);
    else if (inc.type === "users") {
      const u = inc as ApiAdminUser;
      users.set(u.id, u);
    }
  }
  return { classSession: res.data, reservations, users };
}
