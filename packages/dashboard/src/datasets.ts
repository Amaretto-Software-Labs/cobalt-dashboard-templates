/** Types for scripts executed by Cobalt's dataset runtime in both editing and published sessions. */
export type DatasetInput<Parameters extends Record<string, unknown> = Record<string, unknown>, Checkpoint = unknown> = {
  parameters: Parameters;
  params: Parameters;
  checkpoint: Checkpoint | null;
};
export type DatasetTable<T> = {
  rows(): T[];
  map<U>(selector: (row: T) => U): DatasetTable<U>;
  filter(predicate: (row: T) => boolean): DatasetTable<T>;
  limit(count: number): DatasetTable<T>;
  take(count: number): DatasetTable<T>;
  join<U, K, R>(other: U[], leftKey: (row: T) => K, rightKey: (row: U) => K, project: (left: T, right: U) => R): DatasetTable<R>;
  groupBy(selector: keyof T | ((row: T) => unknown)): DatasetGroupedTable<T>;
  bucketByDate(field: keyof T, granularity?: "day" | "week" | "month"): DatasetGroupedTable<T>;
};
export type DatasetGroupedTable<T> = {
  aggregate(spec: Record<string, "sum" | "avg" | ((row: T) => number)>): DatasetTable<Record<string, unknown>>;
};
export type DatasetContext<Parameters extends Record<string, unknown> = Record<string, unknown>> = {
  params: Readonly<Parameters>;
  now: string;
  table<T>(rows: T[]): DatasetTable<T>;
  combine<T extends Record<string, () => Promise<unknown>>>(queries: T): Promise<{
    values: Partial<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>;
    errors: Partial<Record<keyof T, { code: string; message: string }>>;
    complete: boolean; observedAt: string;
  }>;
  sources: {
    call<T = unknown>(alias: string, operation: string, args: Record<string, unknown>): Promise<T>;
    pages<T = unknown>(alias: string, operation: string, args: Record<string, unknown>, options: {
      items: (page: any) => T[]; cursor: (page: any) => unknown; cursorArgument?: string; maxPages?: number; maxRows?: number;
    }): Promise<{ items: T[]; complete: boolean; nextCursor: unknown; pages: number; reason?: string }>;
  };
};
