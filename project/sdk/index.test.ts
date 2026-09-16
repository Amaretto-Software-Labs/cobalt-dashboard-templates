// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { bridge, safeUrl } from "./index";
afterEach(() => {
  delete window.cobaltDashboard;
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
