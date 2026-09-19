// @vitest-environment jsdom
import "./test-setup";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Kanban from "./Kanban";
afterEach(() => {
  cleanup();
  delete window.cobaltDashboard;
});
test("local board writes use the real host action and current record version", async () => {
  const action = vi.fn().mockResolvedValue({});
  window.cobaltDashboard = {
    getDataset: vi
      .fn()
      .mockResolvedValue({ configured: true, mode: "records", items: [] }),
    getRecords: vi.fn().mockResolvedValue({
      items: [
        {
          recordId: "card-1",
          version: 7,
          values: {
            title: "Ship dashboard",
            status: "To do",
            position: 1000,
          },
        },
      ],
    }),
    requestAction: action,
  };
  render(<Kanban />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Ship dashboard" }),
  );
  await user.click(screen.getByRole("combobox", { name: "Card status" }));
  await user.click(await screen.findByRole("option", { name: "Done" }));
  await user.click(screen.getByRole("button", { name: "Save card" }));
  await waitFor(() =>
    expect(action).toHaveBeenCalledWith("save-card", {
      recordId: "card-1",
      expectedVersion: 7,
      values: {
        id: "card-1",
        title: "Ship dashboard",
        status: "Done",
        position: 1000,
      },
    }),
  );
});
test("connected boards expose source details without unsupported writes", async () => {
  const action = vi.fn();
  window.cobaltDashboard = {
    getDataset: vi.fn().mockResolvedValue({
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
    requestAction: action,
  };
  render(<Kanban />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Real issue" }));
  expect(screen.queryByRole("button", { name: "New card" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Move Real issue" })).toBeNull();
  expect(
    screen.getByRole("link", { name: "Open source" }).getAttribute("href"),
  ).toBe("https://example.com/1");
  expect(action).not.toHaveBeenCalled();
});
