"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetch server data every 10 minutes so the board tracks Mariana. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10 * 60_000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
