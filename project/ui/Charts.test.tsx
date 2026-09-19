// @vitest-environment jsdom
import "./test-setup";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import {
  ComparisonChart,
  DonutChart,
  CorrelationChart,
  HierarchyChart,
} from "./AdvancedCharts";
import { ChartExplorer } from "./compositions/ChartExplorer";
import { chartFixture } from "./library/chartFixtures";
afterEach(cleanup);

test("controlled category selection emits IDs and reset, without changing props", async () => {
  const select = vi.fn();
  render(
    <ComparisonChart
      rows={[{ id: "a", label: "Team A", values: { value: 10 } }]}
      series={[{ id: "value", label: "Usage" }]}
      selectedId="a"
      onSelect={select}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Team A" }));
  expect(select).toHaveBeenLastCalledWith(undefined);
  expect(
    screen.getByRole("button", { name: "Team A" }).getAttribute("aria-pressed"),
  ).toBe("true");
  await userEvent.click(
    screen.getByRole("button", { name: "Clear chart selection" }),
  );
  expect(select).toHaveBeenLastCalledWith(undefined);
});

test("invalid observations and empty proportion charts explain missing data", () => {
  render(
    <>
      <DonutChart
        categories={[
          { id: "bad", label: "Invalid", value: NaN },
          { id: "zero", label: "Zero", value: 0 },
        ]}
      />
      <CorrelationChart
        points={[{ id: "bad", label: "Invalid", x: Infinity, y: 2 }]}
        xLabel="X"
        yLabel="Y"
      />
      <HierarchyChart nodes={[]} />
    </>,
  );
  expect(screen.getAllByText("No positive values to display.")).toHaveLength(2);
  expect(screen.getByText("No observations available.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Invalid" })).toBeNull();
});

test("linked chart filter survives source refresh and preserves explicit zero results", async () => {
  const records = chartFixture();
  const view = render(<ChartExplorer records={records} />);
  const primary = view.container.querySelector(
    ".chart-explorer-primary",
  )! as HTMLElement;
  await userEvent.click(
    within(primary).getByRole("button", { name: "Billing" }),
  );
  expect(screen.getByText(/Billing · 6 of 24/)).toBeTruthy();
  view.rerender(
    <ChartExplorer records={records.filter((r) => r.group !== "Billing")} />,
  );
  expect(screen.getByText(/Billing · 0 of 18/)).toBeTruthy();
  expect(screen.getByText("No matching records.")).toBeTruthy();
  await userEvent.click(
    screen.getByRole("button", { name: "Clear all chart filters" }),
  );
  expect(screen.getByText(/All observations · 18 of 18/)).toBeTruthy();
});
