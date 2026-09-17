// @vitest-environment jsdom
import "./test-setup";
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, ConfirmAction } from "./Controls";
import { DataTable, LogExplorer } from "./DataViews";
import { WorkBoard, applyBoardMove } from "./Board";
import { ComponentDemo } from "./library/ComponentDemo";
import { fixture } from "./library/fixtures";
import { DashboardComposition } from "./compositions/DashboardComposition";
import { dashboards } from "./compositions/catalog";
afterEach(cleanup);
test("selection is keyboard accessible and skips unavailable choices", async () => {
  const change = vi.fn();
  render(
    <Select
      label="Environment"
      value="prod"
      onChange={change}
      options={[
        { value: "prod", label: "Production" },
        { value: "locked", label: "Unavailable", disabled: true },
        { value: "stage", label: "Staging" },
      ]}
    />,
  );
  const user = userEvent.setup();
  await user.tab();
  await user.keyboard("{Enter}{ArrowDown}{Enter}");
  expect(change).toHaveBeenCalledWith("stage");
});
test("confirm action retains an error and permits retry without calling before confirmation", async () => {
  const action = vi
    .fn()
    .mockRejectedValueOnce(new Error("Version conflict"))
    .mockResolvedValue(undefined);
  render(
    <ConfirmAction
      label="Delete record"
      description="Confirm deletion"
      onConfirm={action}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Delete record" }));
  expect(action).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Confirm" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByText("Version conflict")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(action).toHaveBeenCalledTimes(2);
});
test("table sorts and paginates data, keeping partial results explicit", async () => {
  render(
    <DataTable
      rows={[
        { id: "b", value: 2 },
        { id: "a", value: 1 },
      ]}
      columns={[
        {
          key: "value",
          label: "Value",
          render: (r) => r.value,
          sortValue: (r) => r.value,
        },
      ]}
      rowKey={(r) => r.id}
      pageSize={1}
      complete={false}
    />,
  );
  const user = userEvent.setup();
  expect(screen.getByText(/Partial results/)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Value" }));
  expect(within(screen.getAllByRole("row")[1]).getByText("1")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Next page" }));
  expect(within(screen.getAllByRole("row")[1]).getByText("2")).toBeTruthy();
});
test("paused logs retain their snapshot while incoming events continue", async () => {
  const one = {
      id: "1",
      timestamp: new Date().toISOString(),
      message: "First event",
      level: "info",
    },
    two = { ...one, id: "2", message: "Second event" };
  const view = render(<LogExplorer events={[one]} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Pause display" }));
  view.rerender(<LogExplorer events={[one, two]} />);
  expect(screen.queryByText("Second event")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Resume display" }));
  expect(await screen.findByText("Second event")).toBeTruthy();
});
test("board move supports reordering and empty lanes without mutating caller data", () => {
  const items = [
    { id: "1", title: "One", status: "A" },
    { id: "2", title: "Two", status: "A" },
  ];
  expect(
    applyBoardMove(items, { id: "2", status: "A", beforeId: "1" }).map(
      (i) => i.id,
    ),
  ).toEqual(["2", "1"]);
  expect(applyBoardMove(items, { id: "1", status: "B" })[1].status).toBe("B");
  expect(items[0].status).toBe("A");
});
test("failed board write shows failure and does not enable undo", async () => {
  const save = vi.fn().mockRejectedValue(new Error("Permission denied"));
  render(
    <WorkBoard
      items={[{ id: "1", title: "One", status: "A" }]}
      lanes={["A", "B"]}
      onSelect={() => {}}
      onMove={save}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "Status for One" }));
  await user.click(screen.getByRole("option", { name: "B" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled"),
  ).toBe(true);
  expect(
    screen.getByRole("combobox", { name: "Status for One" }).textContent,
  ).toBe("A");
});
test("form validation remains inline and preserves typed input", async () => {
  render(<ComponentDemo id="forms" />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Save preferences" }));
  expect(screen.getByText("Enter a dashboard name.")).toBeTruthy();
  await user.type(screen.getByLabelText(/Dashboard name/), "Release health");
  await user.type(screen.getByLabelText("Notification email"), "invalid");
  await user.click(screen.getByRole("button", { name: "Save preferences" }));
  expect(screen.getByText("Enter a valid email.")).toBeTruthy();
  expect(
    (screen.getByLabelText(/Dashboard name/) as HTMLInputElement).value,
  ).toBe("Release health");
});
for (const sample of dashboards)
  test(`composition ${sample.id} renders real controls and empty data`, () => {
    const view = render(
      <DashboardComposition kind={sample.id} data={fixture(sample.id)} />,
    );
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(1);
    view.rerender(
      <DashboardComposition
        kind={sample.id}
        data={{ configured: true, items: [] }}
      />,
    );
    expect(screen.getByText("No sources configured.")).toBeTruthy();
  });
