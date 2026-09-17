import { useCallback, useEffect, useRef, useState } from "react";
export type Item = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  assignee?: string;
  project?: string;
  description?: string;
  due?: string;
  url?: string;
  count?: number;
  updatedAt?: string;
  [key: string]: unknown;
};
export type Dataset = {
  configured: boolean;
  mode?: "records" | "connected";
  items: Item[];
  columns?: string[];
  metrics?: { label: string; value: string | number; change?: string }[];
  series?: { label: string; value: number }[];
  updatedAt?: string;
};
export type StoredRecord = { recordId: string; version: number; values: Item };
declare global {
  interface Window {
    cobaltDashboard?: {
      getDataset<T = Dataset>(
        key: string,
        params?: Record<string, unknown>,
      ): Promise<T>;
      getRecords(collection: string): Promise<{ items: StoredRecord[] }>;
      requestAction(
        key: string,
        input: Record<string, unknown>,
      ): Promise<unknown>;
    };
    cobaltDashboardDemo?: boolean;
  }
}
export function bridge() {
  if (!window.cobaltDashboard)
    throw new Error(
      "Open this dashboard in Cobalt to use live data. For sample preview only, add ?demo=1.",
    );
  return window.cobaltDashboard;
}
export const datasets = {
  run<T = unknown>(key: string, parameters: Record<string, unknown> = {}) {
    return bridge().getDataset<T>(key, parameters);
  },
};
export function useDataset<T = Dataset>(key = "main", params: Record<string, unknown> = {}) {
  const draftChange = useDraftChanges();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const serialized = JSON.stringify(params);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(undefined);
    try {
      const next = await bridge().getDataset<T>(
        key,
        JSON.parse(serialized),
      );
      if (current === generation.current) setData(next);
    } catch (reason) {
      if (current === generation.current)
        setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [key, serialized, draftChange]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);
  return { data, error, loading, refresh };
}
export function safeUrl(url: unknown) {
  if (typeof url !== "string") return undefined;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}

export type StreamDataset<T> = {
  events: T[];
  complete: boolean;
  checkpoint: unknown;
  observedAt: string;
  windowStart: string;
  deliveryMode: "incremental_polling";
  droppedEvents: number;
  duplicateEvents: number;
  gap?: string | null;
};

/** Collect while mounted. Pausing a visualization does not pause this collector. */
export function useLiveDataset<T>(
  key: string,
  params: Record<string, unknown> = {},
  { intervalMs = 5000, enabled = true } = {},
) {
  const draftChange = useDraftChanges();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(enabled);
  const serialized = JSON.stringify(params);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    setData(undefined);
    setError(undefined);
    setLoading(enabled);
    async function collect() {
      try {
        const next = await bridge().getDataset<T>(key, JSON.parse(serialized));
        if (cancelled) return;
        setData(next);
        setError(undefined);
        failures = 0;
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        failures++;
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(collect, Math.min(60_000, Math.max(5000, intervalMs) * 2 ** Math.min(failures, 4)));
        }
      }
    }
    if (enabled) void collect();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, serialized, intervalMs, enabled, draftChange]);
  return { data, error, loading };
}

function useDraftChanges() {
  const [change, setChange] = useState(0);
  useEffect(() => {
    const changed = () => setChange(value => value + 1);
    window.addEventListener("cobalt:datasets", changed);
    return () => window.removeEventListener("cobalt:datasets", changed);
  }, []);
  return change;
}
