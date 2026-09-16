import { useCallback, useEffect, useRef, useState } from 'react';
export type Item = { id: string; title: string; status: string; priority?: string; assignee?: string; project?: string; description?: string; due?: string; url?: string; count?: number; updatedAt?: string; [key: string]: unknown };
export type Dataset = { configured: boolean; mode?: 'records' | 'connected'; items: Item[]; columns?: string[]; metrics?: { label: string; value: string | number; change?: string }[]; series?: { label: string; value: number }[]; updatedAt?: string };
export type StoredRecord = { recordId: string; version: number; values: Item };
declare global { interface Window { cobaltDashboard?: {
  getDataset<T = Dataset>(key: string, params?: Record<string, unknown>): Promise<T>;
  getRecords(collection: string): Promise<{ items: StoredRecord[] }>;
  requestAction(key: string, input: Record<string, unknown>): Promise<unknown>;
}; cobaltDashboardDemo?: boolean; } }
export function bridge() {
  if (!window.cobaltDashboard) throw new Error('Open this dashboard in Cobalt to use live data. For sample preview only, add ?demo=1.');
  return window.cobaltDashboard;
}
export function useDataset(key = 'main', params: Record<string, unknown> = {}) {
  const [data, setData] = useState<Dataset>(); const [error, setError] = useState<string>(); const [loading, setLoading] = useState(true);
  const generation = useRef(0); const serialized = JSON.stringify(params);
  const refresh = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError(undefined);
    try { const next = await bridge().getDataset<Dataset>(key, JSON.parse(serialized)); if (current === generation.current) setData(next); }
    catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [key, serialized]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);
  return { data, error, loading, refresh };
}
export function safeUrl(url: unknown) { if (typeof url !== 'string') return undefined; try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : undefined; } catch { return undefined; } }
