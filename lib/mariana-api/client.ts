/**
 * Mariana Tek API client.
 *
 * Tenant subdomain (e.g. https://unionyogastudio.marianatek.com) exposes two
 * surfaces:
 *  - Customer API at /api/customer/v1/* (documented filters, simpler shape)
 *  - Admin API at /api/* (JSON:API, broader access, less-discoverable filters)
 *
 * Both authenticate with the same bearer token.
 *
 * Configure with env vars:
 *   MARIANATEK_API_TOKEN  (static bearer token)
 *   MARIANATEK_BASE_URL   (https://<tenant>.marianatek.com, no trailing slash)
 */
export type MarianaSurface = "customer" | "admin";

export class MarianaApiError extends Error {
  status: number;
  body: string;
  url: string;
  constructor(status: number, body: string, url: string) {
    super(`Mariana API ${status} at ${url}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

type RequestOptions = {
  surface?: MarianaSurface;
  query?: Record<string, string | number | undefined>;
  /** Override the default Accept header. Customer API uses JSON; Admin uses JSON:API. */
  accept?: string;
  /** AbortSignal — currently used only for timeouts. */
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;

function envOr(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var (set in .env.local and Netlify).`);
  return v;
}

function buildUrl(base: string, surface: MarianaSurface, path: string): string {
  const root = base.replace(/\/$/, "");
  const prefix = surface === "customer" ? "/api/customer/v1" : "/api";
  // Allow callers to pass either a bare resource ("classes") or a leading slash.
  const tail = path.startsWith("/") ? path : `/${path}`;
  return `${root}${prefix}${tail}`;
}

function appendQuery(url: string, query?: Record<string, string | number | undefined>): string {
  if (!query) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function marianaFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const token = envOr("MARIANATEK_API_TOKEN");
  const base = envOr("MARIANATEK_BASE_URL");
  const surface = opts.surface ?? "admin";
  const accept =
    opts.accept ??
    (surface === "admin" ? "application/vnd.api+json" : "application/json");

  const url = appendQuery(buildUrl(base, surface, path), opts.query);

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: accept,
        },
        signal: opts.signal ?? controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? "", 10);
        const wait = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : Math.min(2000 * attempt, 8000);
        if (attempt < MAX_RETRIES) {
          await sleep(wait);
          continue;
        }
        const body = await res.text().catch(() => "");
        throw new MarianaApiError(res.status, body, url);
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new MarianaApiError(res.status, body, url);
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err;
      if (err instanceof MarianaApiError) throw err;
      if (attempt < MAX_RETRIES) {
        await sleep(Math.min(1000 * attempt, 4000));
        continue;
      }
      throw err;
    }
  }
  // Unreachable but satisfies TS.
  throw lastErr ?? new Error("marianaFetch: exhausted retries");
}

/**
 * Walk through a paginated Mariana endpoint and yield every item.
 *
 * Both surfaces report `meta.pagination = { count, pages, page, per_page }`.
 * The Customer API uses `page_size` for size and `page` for index. The Admin
 * API accepts the same params (we verified `?page_size=N&page=N`).
 */
export async function* paginate<TItem>(
  path: string,
  opts: RequestOptions & { pageSize?: number } = {}
): AsyncGenerator<TItem, void, void> {
  const pageSize = opts.pageSize ?? 100;
  let page = 1;
  // Hard cap to avoid runaway pagination on a misbehaving filter.
  for (let safety = 0; safety < 500; safety++) {
    const query = { ...(opts.query ?? {}), page_size: pageSize, page };
    const res = await marianaFetch<{
      data?: TItem[];
      results?: TItem[];
      meta?: { pagination?: { count: number; pages: number; page: number } };
    }>(path, { ...opts, query });

    const items = (res.data ?? res.results ?? []) as TItem[];
    for (const item of items) yield item;

    const pages = res.meta?.pagination?.pages;
    if (!items.length) return;
    if (pages != null && page >= pages) return;
    if (pages == null && items.length < pageSize) return;
    page++;
  }
}
