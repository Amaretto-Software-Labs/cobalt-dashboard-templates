// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { bridge, safeUrl, useLiveDataset, useDataset } from "./index";
afterEach(() => {
  delete window.cobaltDashboard;
});

test("a dataset edit invalidates pending results without selecting a revision", async () => {
  const pending: ((value: unknown) => void)[] = [];
  const getDataset = vi.fn(() => new Promise(resolve => pending.push(resolve)));
  window.cobaltDashboard = { getDataset, getRecords: vi.fn(), requestAction: vi.fn() } as typeof window.cobaltDashboard;
  const hook = renderHook(() => useDataset<{ count: number }>("metrics"));
  await act(async () => { window.dispatchEvent(new Event("cobalt:datasets")); });
  expect(getDataset).toHaveBeenCalledTimes(2);
  await act(async () => { pending[1]({ count: 2 }); });
  await act(async () => { pending[0]({ count: 1 }); });
  expect(hook.result.current.data).toEqual({ count: 2 });
  hook.unmount();
});
test("production bridge never silently substitutes fixtures", () => {
  expect(() => bridge()).toThrow("Open this dashboard in Cobalt");
});
test("provider links cannot execute script or navigate to local files", () => {
  expect(safeUrl("javascript:alert(1)")).toBeUndefined();
  expect(safeUrl("file:///etc/passwd")).toBeUndefined();
  expect(safeUrl("https://example.com/issues/1")).toBe(
    "https://example.com/issues/1",
  );
});

test("live collection waits for a response and stops after unmount", async () => {
  vi.useFakeTimers();
  let resolve!: (value: unknown) => void;
  const getDataset = vi.fn(() => new Promise(value => { resolve = value; }));
  window.cobaltDashboard = { getDataset, getRecords: vi.fn(), requestAction: vi.fn() } as typeof window.cobaltDashboard;
  const hook = renderHook(() => useLiveDataset<{ events: unknown[] }>("logs"));
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(getDataset).toHaveBeenCalledTimes(1);
  await act(async () => { resolve({ events: [] }); });
  expect(hook.result.current.loading).toBe(false);
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(getDataset).toHaveBeenCalledTimes(2);
  hook.unmount();
  await act(async () => { resolve({ events: ["late response"] }); await vi.advanceTimersByTimeAsync(60_000); });
  expect(getDataset).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});
