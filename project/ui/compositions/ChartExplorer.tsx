import { useMemo, useState } from "react";
import { Button, Select } from "../Controls";
import { Metric } from "../Layout";
import {
  TimeSeries,
  Breakdown,
  Distribution,
  Heatmap,
  Funnel,
} from "../Charts";
import {
  ComparisonChart,
  CorrelationChart,
  DonutChart,
  HierarchyChart,
} from "../AdvancedCharts";
import { DataTable } from "../DataViews";
import { RecordDetail, type DetailRecord } from "../SummaryViews";

export type ChartRecord = {
  id: string;
  label: string;
  group: string;
  time: string;
  value: number;
  comparison: number;
  size: number;
  stage: number;
  url?: string;
};
export const explorerViews = [
  { value: "series", label: "Time series" },
  { value: "area", label: "Area" },
  { value: "comparison", label: "Grouped / stacked bars" },
  { value: "scatter", label: "Scatter / bubbles" },
  { value: "donut", label: "Donut" },
  { value: "treemap", label: "Treemap" },
  { value: "breakdown", label: "Ranked bars" },
  { value: "distribution", label: "Histogram" },
  { value: "heatmap", label: "Heatmap" },
  { value: "funnel", label: "Funnel" },
];
type Selection = {
  kind: "group" | "point" | "bin" | "cell" | "stage";
  id: string;
};
export function ChartExplorer({
  records,
  initialView = "comparison",
  measureLabel = "Usage",
  comparisonLabel = "Baseline",
  unit = "units",
  stageLabels = ["Observed", "Investigated", "Resolved"],
}: {
  records: ChartRecord[];
  initialView?: string;
  measureLabel?: string;
  comparisonLabel?: string;
  unit?: string;
  stageLabels?: string[];
}) {
  const [view, setView] = useState(initialView);
  const [selection, setSelection] = useState<Selection>();
  const [range, setRange] = useState<{ start: string; end: string }>();
  const [areaMode, setAreaMode] = useState("area");
  const [detail, setDetail] = useState<DetailRecord>();
  const valid = useMemo(
    () =>
      records
        .filter(
          (r) =>
            Number.isFinite(Date.parse(r.time)) &&
            Number.isFinite(r.value) &&
            Number.isFinite(r.comparison),
        )
        .map((r) => ({ ...r, time: new Date(r.time).toISOString() })),
    [records],
  );
  const timeRows = valid.filter(
    (r) => !range || (r.time >= range.start && r.time <= range.end),
  );
  const groups = [...new Set(valid.map((r) => r.group))];
  const dates = [...new Set(valid.map((r) => r.time))].sort();
  const binStart = Math.min(0, ...valid.map((r) => r.value));
  const binWidth = Math.max(
    1,
    Math.ceil((Math.max(1, ...valid.map((r) => r.value)) - binStart) / 4),
  );
  const bucket = (value: number) =>
    Math.min(3, Math.max(0, Math.floor((value - binStart) / binWidth)));
  const binLabel = (i: number) =>
    `${binStart + i * binWidth}–${binStart + (i + 1) * binWidth}`;
  const stages = stageLabels;
  const timeLabel = (time: string) =>
    time.slice(0, 16).replace("T", " ") + " UTC";
  const cellId = (r: ChartRecord) => r.group + ":" + timeLabel(r.time);
  const matches = (r: ChartRecord) =>
    !selection ||
    (selection.kind === "group"
      ? r.group === selection.id
      : selection.kind === "point"
        ? r.id === selection.id
        : selection.kind === "bin"
          ? binLabel(bucket(r.value)) === selection.id
          : selection.kind === "cell"
            ? cellId(r) === selection.id
            : r.stage >= Number(selection.id));
  const filtered = timeRows.filter(matches);
  const sum = (rows: ChartRecord[], key: "value" | "comparison" = "value") =>
    rows.reduce((n, r) => n + r[key], 0);
  const categories = groups.map((group) => ({
    id: group,
    label: group,
    value: sum(timeRows.filter((r) => r.group === group)),
  }));
  const comparisons = groups.map((group) => ({
    id: group,
    label: group,
    values: {
      actual: sum(timeRows.filter((r) => r.group === group)),
      baseline: sum(
        timeRows.filter((r) => r.group === group),
        "comparison",
      ),
    },
  }));
  const times = [...new Set(timeRows.map((r) => r.time))].sort();
  const trends = groups.map((group) => ({
    id: group,
    label: group,
    points: dates.map((time) => ({
      time,
      value: valid.some((r) => r.group === group && r.time === time)
        ? sum(valid.filter((r) => r.group === group && r.time === time))
        : null,
    })),
  }));
  const toggle = (kind: Selection["kind"], id: string | undefined) =>
    setSelection(
      id === undefined || (selection?.kind === kind && selection.id === id)
        ? undefined
        : { kind, id },
    );
  const selected = (kind: Selection["kind"]) =>
    selection?.kind === kind ? selection.id : undefined;
  const groupProps = {
    selectedId: selected("group"),
    onSelect: (id: string | undefined) => toggle("group", id),
  };
  const scope = selection
    ? selection.kind === "point"
      ? valid.find((r) => r.id === selection.id)?.label || selection.id
      : selection.kind === "stage"
        ? stages[Number(selection.id)]
        : selection.id
    : "All observations";
  const bins = Array.from({ length: 4 }, (_, i) => ({
    label: binLabel(i),
    count: timeRows.filter((r) => bucket(r.value) === i).length,
  }));
  const charts: Record<string, () => React.ReactNode> = {
    series: () => (
      <TimeSeries
        label={measureLabel + " over time"}
        series={trends}
        unit={unit}
        range={range}
        onRangeChange={(start, end) => {
          setRange(
            start === dates[0] && end === dates.at(-1)
              ? undefined
              : { start, end },
          );
        }}
      />
    ),
    area: () => (
      <>
        <Select
          label="Area layout"
          value={areaMode}
          onChange={setAreaMode}
          options={[
            { value: "area", label: "Overlaid" },
            { value: "stacked-area", label: "Stacked" },
          ]}
        />
        <TimeSeries
          label={measureLabel + " over time"}
          series={trends}
          unit={unit}
          variant={areaMode as "area" | "stacked-area"}
          range={range}
          onRangeChange={(start, end) =>
            setRange(
              start === dates[0] && end === dates.at(-1)
                ? undefined
                : { start, end },
            )
          }
        />
      </>
    ),
    comparison: () => (
      <ComparisonChart
        title={measureLabel + " by group"}
        rows={comparisons}
        series={[
          { id: "actual", label: measureLabel },
          { id: "baseline", label: comparisonLabel },
        ]}
        unit={unit}
        {...groupProps}
      />
    ),
    donut: () => (
      <DonutChart categories={categories} unit={unit} {...groupProps} />
    ),
    breakdown: () => (
      <Breakdown categories={categories} unit={unit} {...groupProps} />
    ),
    scatter: () => (
      <CorrelationChart
        points={timeRows.map((r) => ({
          id: r.id,
          label: r.label,
          x: r.comparison,
          y: r.value,
          size: r.size,
        }))}
        xLabel={comparisonLabel}
        yLabel={measureLabel}
        selectedId={selected("point")}
        onSelect={(id) => toggle("point", id)}
      />
    ),
    treemap: () => (
      <HierarchyChart
        nodes={groups.map((group) => ({
          id: group,
          label: group,
          children: timeRows
            .filter((r) => r.group === group)
            .map((r) => ({ id: r.id, label: r.label, value: r.value })),
        }))}
        selectedId={selected("point")}
        onSelect={(id) => toggle("point", id)}
      />
    ),
    distribution: () => (
      <Distribution
        bins={bins}
        unit={unit}
        selectedId={selected("bin")}
        onSelect={(bin) => toggle("bin", bin.label)}
      />
    ),
    heatmap: () => (
      <Heatmap
        rows={groups}
        columns={times.map(timeLabel)}
        cells={groups.flatMap((group) =>
          times.map((time) => ({
            row: group,
            column: timeLabel(time),
            value: timeRows.some((r) => r.group === group && r.time === time)
              ? sum(
                  timeRows.filter((r) => r.group === group && r.time === time),
                )
              : null,
          })),
        )}
        selectedId={selected("cell")}
        onSelect={(cell) => toggle("cell", cell.row + ":" + cell.column)}
      />
    ),
    funnel: () => (
      <Funnel
        steps={stages.map((label, i) => ({
          id: String(i),
          label,
          value: timeRows.filter((r) => r.stage >= i).length,
        }))}
        selectedId={selected("stage")}
        onSelect={(id) => toggle("stage", id)}
      />
    ),
  };
  return (
    <section className="chart-explorer" aria-label="Linked chart explorer">
      <div className="toolbar">
        <Select
          label="Chart type"
          value={view}
          onChange={(value) => {
            setView(value);
            setSelection(undefined);
          }}
          options={explorerViews}
        />
        <span role="status" className="chart-scope">
          {scope} · {filtered.length} of {valid.length} observations
          {range ? " · Selected time range" : ""}
        </span>
        {(selection || range) && (
          <Button
            variant="quiet"
            onClick={() => {
              setSelection(undefined);
              setRange(undefined);
            }}
          >
            Clear all chart filters
          </Button>
        )}
      </div>
      <div className="chart-explorer-grid">
        <div className="chart-explorer-primary">
          {(charts[view] || charts.comparison)()}
        </div>
        <div className="chart-explorer-linked">
          <Metric
            label={"Selected " + measureLabel.toLowerCase()}
            value={sum(filtered)}
            unit={unit}
          />
          <Breakdown
            title="Filtered contribution"
            categories={groups.map((group) => ({
              id: group,
              label: group,
              value: sum(filtered.filter((r) => r.group === group)),
            }))}
            unit={unit}
            {...groupProps}
          />
        </div>
      </div>
      <DataTable
        rows={filtered}
        rowKey={(r) => r.id}
        columns={[
          {
            key: "label",
            label: "Observation",
            render: (r) => r.label,
            sortValue: (r) => r.label,
          },
          {
            key: "group",
            label: "Group",
            render: (r) => r.group,
            sortValue: (r) => r.group,
          },
          {
            key: "time",
            label: "Time",
            render: (r) => new Date(r.time).toLocaleString(),
            sortValue: (r) => r.time,
          },
          {
            key: "value",
            label: measureLabel,
            render: (r) => `${r.value} ${unit}`,
            sortValue: (r) => r.value,
          },
          {
            key: "comparison",
            label: comparisonLabel,
            render: (r) => `${r.comparison} ${unit}`,
            sortValue: (r) => r.comparison,
          },
        ]}
        onSelect={(r) =>
          setDetail({
            id: r.id,
            title: r.label,
            url: r.url,
            fields: {
              Group: r.group,
              Time: r.time,
              [measureLabel]: r.value,
              [comparisonLabel]: r.comparison,
              Size: r.size,
            },
          })
        }
      />
      <RecordDetail record={detail} onClose={() => setDetail(undefined)} />
    </section>
  );
}
