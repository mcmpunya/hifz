"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Tiny fetch hook with loading/error state and manual refetch */
export function useApi<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as T;
      if (seq.current === id) {
        setData(json);
        setError(null);
      }
    } catch (e) {
      if (seq.current === id) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    } finally {
      if (seq.current === id) setLoading(false);
    }
  }, [url, ...deps]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refetch: load };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
