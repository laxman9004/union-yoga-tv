# Where to put Mariana Tek (or other) exports

Drop files here **before** importing in Admin → Data, or call `POST /api/data/import`.

```
union-yoga-tv/
└── data/
    ├── incoming/          ← YOU drop files here (CSV or JSON)
    │   ├── members.csv
    │   ├── class_sessions.csv
    │   └── check_ins.csv
    ├── processed/         ← app moves files here after successful import
    └── samples/           ← column templates (copy & fill from your export)
```

## From home (Tailscale / SSH)

On the studio player machine:

```bash
# Example: copy from your laptop
scp members.csv class_sessions.csv check_ins.csv \
  you@union-tv-player:~/union-yoga-tv/data/incoming/
```

Then open **http://&lt;player-ip&gt;:3000/admin** → **Data** → **Scan & import**.

---

## Required files (minimum for lobby TV)

| File | Required? | Powers |
|------|-----------|--------|
| `members.csv` | **Yes** | Names, milestones, streaks, whiteboard, opt-out |
| `check_ins.csv` | **Yes** | Welcome scenes, composition, streaks, favorites |
| `class_sessions.csv` | **Strongly recommended** | Tonight’s class, instructor, pre-class composition |

Without `check_ins`, only **ambient + approved LLM copy** scenes run.

---

## Column reference

See `data/samples/*.csv` for headers. Aliases are accepted (e.g. `first_name` / `firstName`).

### members.csv

| Column | Required | Notes |
|--------|----------|-------|
| `id` | Yes | Stable Mariana Tek user id |
| `first_name` | Yes | First name only on TV |
| `last_initial` | No | If omitted, derived from `last_name` |
| `member_since` | Recommended | ISO date — streaks, anniversaries |
| `birthday` | No | ISO date — birthday scene |
| `lifetime_class_count` | Recommended | Integer — milestones |
| `opt_out` | No | `true` / `1` / `yes` hides name |

### class_sessions.csv

| Column | Required | Notes |
|--------|----------|-------|
| `id` | Yes | Session id |
| `class_type` | Yes | e.g. `26 & 2 Hot Yoga` |
| `start_time` | Yes | ISO datetime |
| `instructor_name` | Recommended | Welcome + composition |
| `classroom_name` | No | |
| `capacity` | No | Fill rate / sold out |
| `available_spots` | No | |

### check_ins.csv

| Column | Required | Notes |
|--------|----------|-------|
| `id` | Yes | Unique check-in / reservation id |
| `member_id` | Yes | Matches `members.id` |
| `class_session_id` | Yes | Matches `class_sessions.id` |
| `checked_in_at` | Yes | ISO datetime |
| `is_guest` | No | Bring-a-friend scenes |
| `guest_first_name` | No | |

---

## Mariana Tek exports (current pipeline)

Typical files in `incoming/`:

| File | MT report |
|------|-----------|
| `report-customers-details.csv` | Customers – Details |
| `report-customer-frequency.csv` | Customer Frequency |
| `report-customer-birthdays.csv` | Customer Birthdays (one calendar month per export) |
| `report-class-session-utilization-details*.csv` | Class Session Utilization Details |
| `report-orders-local-time*.csv` | Orders – Local Time (optional) |

Row-level **Reservations** is still separate from Utilization Details if you add walk-in welcome / roster scenes later.

---

## Date range convention (Union standard)

In Mariana Tek, set the same window on every report:

**Jan 1, 2025 → Dec 31, 2026**

Only rows **on or before today** are treated as real for stats and copy. Future-dated class rows (scheduled sessions) may appear in utilization exports through year-end; the importer will ignore **class dates after today** for attendance-style metrics. Re-run the same MT date range daily so “through today” grows without changing filters.

**Suggested daily routine**

1. Generate all reports (same 2025–2026 range).
2. Drop CSVs into `data/incoming/` (overwrite previous).
3. Admin → **Scan** → **Import**.
4. TV shows **as of last import** (timestamp on Data tab).

**Birthdays:** `Customers – Details` includes `Birth Date` year-round. The monthly Birthdays report is optional; re-export each month if you use it for admin review.

**Customer Frequency:** `Check-Ins` counts only inside your MT date range (2025–2026). With a daily refresh, “top attendees” reflects activity through yesterday/today, not fake future data.

---

## Snapshot vs live data

Exports are a **point-in-time snapshot**. The TV will:

- Show stats **as of last import**
- **Not** auto-refresh until you import again (or we add API / a scheduled import job later)

Admin → **Verify data** runs without importing and tells you what’s missing for each scene group.
