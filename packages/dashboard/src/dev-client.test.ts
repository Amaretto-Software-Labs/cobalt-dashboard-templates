// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { installDevelopmentBridge } from "./dev-client";

afterEach(() => { delete window.cobaltDashboard; document.body.replaceChildren(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
test("preview actions require confirmation and cancelling never performs the write", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event("close")); };
  const fetch = vi.fn(async (path: string) => ({ ok: true, json: async () => path.endsWith("action-grant") ? { grantId: "granted" } : { result: { saved: true } } }));
  vi.stubGlobal("fetch", fetch);
  installDevelopmentBridge();
  const cancelled = window.cobaltDashboard!.requestAction("save", { recordId: "card" });
  const rejected = expect(cancelled).rejects.toThrow("Action cancelled");
  await waitFor(() => expect(document.querySelector("dialog")).not.toBeNull());
  (document.querySelector("button") as HTMLButtonElement).click();
  await rejected;
  expect(fetch).toHaveBeenCalledTimes(1);
  const confirmed = window.cobaltDashboard!.requestAction("save", { recordId: "card" });
  await waitFor(() => expect(document.querySelector("dialog")).not.toBeNull());
  (document.querySelectorAll("button")[1] as HTMLButtonElement).click();
  expect(await confirmed).toEqual({ saved: true });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch.mock.calls[2][0]).toBe("/__cobalt/dashboard/action-run");
});
