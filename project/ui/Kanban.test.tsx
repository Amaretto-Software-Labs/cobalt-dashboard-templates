// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Kanban from "./Kanban";
afterEach(() => {
  cleanup();
  delete window.cobaltDashboard;
});
test("local card writes use the real host record contract and optimistic version", async () => {
  const requestAction = vi.fn().mockResolvedValue({});
  window.cobaltDashboard = {
    getDataset: vi
      .fn()
      .mockResolvedValue({ configured: true, mode: "records", items: [] }),
    getRecords: vi
      .fn()
      .mockResolvedValue({
        items: [
          {
            recordId: "card-1",
            version: 7,
            values: { title: "Ship dashboard", status: "To do" },
          },
        ],
      }),
    requestAction,
  };
  render(<Kanban />);
  const status = await screen.findByLabelText("Status for Ship dashboard");
  fireEvent.change(status, { target: { value: "Done" } });
  await waitFor(() =>
    expect(requestAction).toHaveBeenCalledWith("save-card", {
      recordId: "card-1",
      expectedVersion: 7,
      values: { id: "card-1", title: "Ship dashboard", status: "Done" },
    }),
  );
});
test("connected boards have source details and no unsupported local mutation controls", async () => {
  window.cobaltDashboard = {
    getDataset: vi
      .fn()
      .mockResolvedValue({
        configured: true,
        mode: "connected",
        items: [
          {
            id: "issue-1",
            title: "Real issue",
            status: "To do",
            url: "https://example.com/1",
          },
        ],
      }),
    getRecords: vi.fn(),
    requestAction: vi.fn(),
  };
  render(<Kanban />);
  await screen.findByText("Real issue");
  expect(screen.queryByText("New card")).toBeNull();
  expect(screen.queryByLabelText("Status for Real issue")).toBeNull();
  fireEvent.click(screen.getByText("Real issue"));
  expect(screen.getByText("Open source").getAttribute("href")).toBe(
    "https://example.com/1",
  );
});
