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
import { shiftMilestone } from "./MilestoneTimeline";
import { MilestoneTimeline, ProgressTarget } from "./SummaryViews";
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
test("lanes collapse and expand without changing cards or showing lane dropdowns", async () => {
  const save = vi.fn();
  render(
    <WorkBoard
      items={[{ id: "1", title: "One", status: "A" }]}
      lanes={["A", "B"]}
      onSelect={() => {}}
      onMove={save}
    />,
  );
  const user = userEvent.setup();
  expect(screen.queryByRole("combobox")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Collapse A lane" }));
  expect(screen.queryByRole("button", { name: "One" })).toBeNull();
  const expand = screen.getByRole("button", { name: "Expand A lane" });
  expect(expand.getAttribute("aria-expanded")).toBe("false");
  expect(within(expand).getByText("1")).toBeTruthy();
  expand.focus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("button", { name: "One" })).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
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

test("review metrics filter real records, toggle off and follow refreshed results", async () => {
  const data = fixture("reviews");
  const view = render(<DashboardComposition kind="reviews" data={data} />);
  const user = userEvent.setup();
  const blocked = screen.getByRole("button", { name: "Blocked: Show blocked" });
  await user.click(blocked);
  expect(blocked.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Blocked · 8 matching records")).toBeTruthy();
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  expect(rows).toHaveLength(8);
  expect(
    rows.every((r) => /Checks failing|Changes requested/.test(r.textContent!)),
  ).toBe(true);
  await user.click(blocked);
  expect(screen.queryByText(/· \d+ matching records/)).toBeNull();
  blocked.focus();
  await user.keyboard("{Enter}");
  view.rerender(
    <DashboardComposition
      kind="reviews"
      data={{
        ...data,
        items: [],
        metrics: [
          {
            label: "Blocked",
            value: 0,
            drilldown: { label: "Show blocked", itemIds: [] },
          },
        ],
      }}
    />,
  );
  expect(screen.getByText("Blocked · 0 matching records")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Clear metric filter" }));
  expect(screen.queryByText(/· \d+ matching records/)).toBeNull();
});

test("oldest PR opens the actual record with keyboard activation", async () => {
  render(<DashboardComposition kind="reviews" data={fixture("reviews")} />);
  const user = userEvent.setup();
  const oldest = screen.getByRole("button", {
    name: "Oldest PR: Open oldest pull request",
  });
  oldest.focus();
  await user.keyboard(" ");
  const dialog = await screen.findByRole("dialog", {
    name: "Add dashboard runtime",
  });
  expect(within(dialog).getByText("#284")).toBeTruthy();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.queryByRole("dialog")).toBeNull();
});

for (const sample of dashboards) {
  test(`${sample.title} metric cards have working drill-downs`, async () => {
    const data = fixture(sample.id);
    render(<DashboardComposition kind={sample.id} data={data} />);
    const user = userEvent.setup();
    for (const metric of data.metrics || []) {
      expect(metric.drilldown).toBeDefined();
      await user.click(
        screen.getByRole("button", {
          name: `${metric.label}: ${metric.drilldown!.label}`,
        }),
      );
      if ("itemIds" in metric.drilldown!) {
        expect(screen.getByText(/matching records/)).toBeTruthy();
        await user.click(
          screen.getByRole("button", { name: "Clear metric filter" }),
        );
      } else {
        expect(await screen.findByRole("dialog")).toBeTruthy();
        await user.click(
          within(screen.getByRole("dialog")).getByRole("button", {
            name: "Close",
          }),
        );
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      }
    }
  });
}

test("milestone selection follows dependencies, highlights downstream work and clears", async () => {
  render(<MilestoneTimeline items={fixture("release").milestones!} />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Inspect Release checks" }),
  );
  const inspector = screen.getByRole("region", { name: "Selected milestone" });
  expect(
    within(inspector).getByText("This milestone is blocked."),
  ).toBeTruthy();
  await user.click(
    within(inspector).getByRole("button", { name: "Dashboard UI" }),
  );
  expect(
    within(inspector).getByRole("heading", { name: "Dashboard UI" }),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "Inspect API & schema" })
      .closest(".milestone-related"),
  ).toBeTruthy();
  await user.click(
    within(inspector).getByRole("button", { name: "Clear selection" }),
  );
  expect(
    screen.queryByRole("region", { name: "Selected milestone" }),
  ).toBeNull();
  await user.click(screen.getByRole("combobox", { name: "Milestone filter" }));
  await user.click(screen.getByRole("option", { name: "Blocked (1)" }));
  expect(
    screen.queryByRole("button", { name: "Inspect API & schema" }),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Inspect Release checks" }),
  ).toBeTruthy();
});

test("progress checks filter and show details without presenting unsupported writes", async () => {
  render(<ProgressTarget {...fixture("release").progress!} />);
  const user = userEvent.setup();
  expect(screen.queryByRole("checkbox")).toBeNull();
  await user.click(screen.getByRole("combobox", { name: "Check status" }));
  await user.click(screen.getByRole("option", { name: "Pending (2)" }));
  expect(
    screen.queryByRole("button", { name: "Inspect Integration suite" }),
  ).toBeNull();
  await user.click(screen.getByRole("button", { name: "Inspect Load test" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("Owner: Luca")).toBeTruthy();
  expect(screen.getByText(/peak traffic/)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Inspect Load test" }));
  expect(screen.queryByText(/peak traffic/)).toBeNull();
});

test("failed check updates retain the source status and allow retry", async () => {
  const save = vi.fn().mockRejectedValue(new Error("Check update denied"));
  render(
    <ProgressTarget {...fixture("release").progress!} onCheckChange={save} />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Inspect Load test" }));
  const check = screen.getByRole("checkbox", {
    name: "Mark Load test as passed",
  });
  await user.click(check);
  expect(save).toHaveBeenCalledWith("load", true);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(check.getAttribute("aria-checked")).toBe("false");
  expect(check.hasAttribute("disabled")).toBe(false);
});

test("milestone editing rejects dependency cycles, supports cancel and retains failed drafts", async () => {
  const save = vi.fn().mockRejectedValue(new Error("Schedule update denied"));
  render(
    <MilestoneTimeline
      items={fixture("release").milestones!}
      onChange={save}
    />,
  );
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Inspect API & schema" }),
  );
  await user.click(screen.getByRole("checkbox", { name: "Dashboard UI" }));
  await user.click(screen.getByRole("button", { name: "Save milestone" }));
  expect(screen.getByRole("alert").textContent).toContain("cycle");
  expect(save).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Cancel changes" }));
  expect(screen.queryByRole("alert")).toBeNull();
  await user.clear(screen.getByRole("textbox", { name: "Milestone owner" }));
  await user.type(
    screen.getByRole("textbox", { name: "Milestone owner" }),
    "Sam",
  );
  await user.click(screen.getByRole("button", { name: "Save milestone" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("Schedule update denied"),
  );
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ owner: "Sam" }));
  expect(
    (
      screen.getByRole("textbox", {
        name: "Milestone owner",
      }) as HTMLInputElement
    ).value,
  ).toBe("Sam");
  expect(
    screen
      .getByRole("button", { name: "Save milestone" })
      .hasAttribute("disabled"),
  ).toBe(false);
});

test("timeline date shifts preserve duration and keep resize edges a day apart", () => {
  const item = {
    id: "a",
    title: "Release",
    start: "2026-09-20T00:00:00.000Z",
    end: "2026-09-24T00:00:00.000Z",
  };
  expect(shiftMilestone(item, "move", 2)).toMatchObject({
    start: "2026-09-22T00:00:00.000Z",
    end: "2026-09-26T00:00:00.000Z",
  });
  expect(shiftMilestone(item, "start", 20).start).toBe(
    "2026-09-23T00:00:00.000Z",
  );
  expect(shiftMilestone(item, "end", -20).end).toBe("2026-09-21T00:00:00.000Z");
  expect(shiftMilestone(item, "move", 0)).toBe(item);
});
