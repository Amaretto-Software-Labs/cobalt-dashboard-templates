import { ChartExplorer } from "./ChartExplorer";
import { Button } from "../Controls";
import { useState } from "react";
import { type Item } from "@cobalt-code/dashboard";
import { Metric, Panel, SourceFreshness, SourceLink, Badge } from "../Layout";
import { DataTable, LogExplorer, LogStream } from "../DataViews";
import {
  TimeSeries,
  Breakdown,
  Distribution,
  Heatmap,
  Funnel,
} from "../Charts";
import {
  ActivityTimeline,
  StatusMatrix,
  MilestoneTimeline,
  ProgressTarget,
  Narrative,
  RecordDetail,
  type DetailRecord,
  type Milestone,
} from "../SummaryViews";
import { WorkBoard, type BoardMove } from "../Board";
import type { DashboardKind } from "./catalog";
import type { DashboardData } from "./types";
export const compositionPanels: Record<DashboardKind, string[]> = {
  work: ["board", "activity", "progress"],
  reviews: ["table", "activity"],
  release: ["timeline", "progress", "table"],
  service: ["series", "status", "breakdown"],
  incident: ["series", "logs", "activity", "status"],
  "logs-view": ["logs", "distribution", "breakdown"],
  flow: ["board", "distribution", "heatmap"],
  impact: ["series", "activity", "table"],
  cost: ["series", "breakdown", "progress", "table"],
  customers: ["table", "heatmap", "activity"],
  analytics: ["funnel", "heatmap", "series"],
  brief: ["narrative", "table", "breakdown", "activity"],
};
export function DashboardComposition({
  kind,
  data,
  query = "",
  params = {},
  onMove,
  onEdit,
  onRetry,
  onCheckChange,
  onMilestoneChange,
}: {
  kind: DashboardKind;
  data: DashboardData;
  query?: string;
  params?: Record<string, unknown>;
  onMove?: (change: BoardMove) => Promise<void>;
  onEdit?: (item: Item) => void;
  onRetry?: () => void;
  onMilestoneChange?: (item: Milestone) => Promise<void>;
  onCheckChange?: (id: string, done: boolean) => Promise<void>;
}) {
  const [detail, setDetail] = useState<DetailRecord>();
  const [metricFilter, setMetricFilter] = useState<string>();
  const activeMetric = data.metrics?.find((m) => m.label === metricFilter);
  const drilldown = activeMetric?.drilldown;
  const selectedIds =
    drilldown && "itemIds" in drilldown ? drilldown.itemIds : undefined;
  const inspect = (
    id: string,
    title: string,
    fields: Record<string, unknown>,
    url?: string,
  ) => setDetail({ id, title, fields, url });
  const items = (data.items || []).filter(
    (i) =>
      (selectedIds === undefined || selectedIds.includes(i.id)) &&
      `${i.id} ${i.title} ${i.assignee ?? ""} ${i.project ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const lanes = [
    ...new Set([
      ...(data.columns || ["To do", "In progress", "Done"]),
      ...(data.items || []).map((i) => i.status),
    ]),
  ];
  const openItem = (item: Item) =>
    onEdit ? onEdit(item) : inspect(item.id, item.title, item, item.url);
  const panels: Record<string, () => React.ReactNode> = {
    board: () => (
      <Panel title="Work by status">
        <WorkBoard
          items={items}
          lanes={lanes}
          onSelect={(item) => openItem(item as Item)}
          onMove={onMove}
        />
      </Panel>
    ),
    table: () => (
      <DataTable
        title={
          kind === "reviews"
            ? "Review queue"
            : kind === "customers"
              ? "Accounts"
              : kind === "cost"
                ? "Cost records"
                : "Work records"
        }
        rows={items}
        columns={[
          {
            key: "title",
            label: "Record",
            sortValue: (i) => i.title,
            render: (i) => (
              <div>
                <b>{i.title}</b>
                <div className="muted">{i.id}</div>
                <SourceLink url={i.url} />
              </div>
            ),
          },
          {
            key: "status",
            label: "Status",
            sortValue: (i) => i.status,
            render: (i) => <Badge>{i.status}</Badge>,
          },
          {
            key: "assignee",
            label: "Owner",
            sortValue: (i) => i.assignee || "",
            render: (i) => i.assignee || "—",
          },
          {
            key: "project",
            label: kind === "cost" ? "Amount" : "Scope",
            sortValue: (i) =>
              kind === "cost" ? Number(i.count || 0) : i.project || "",
            render: (i) =>
              kind === "cost"
                ? `${data.categoryUnit || ""}${Number(i.count || 0).toLocaleString()}`
                : i.project || "—",
          },
        ]}
        rowKey={(i) => i.id}
        complete={data.complete}
        onSelect={openItem}
      />
    ),
    series: () => (
      <TimeSeries
        label={
          kind === "cost"
            ? "Spend over time"
            : kind === "analytics"
              ? "Adoption over time"
              : "Request latency"
        }
        series={data.trends || []}
        unit={data.trendUnit}
        complete={data.complete}
        annotations={data.annotations}
      />
    ),
    logs: () =>
      data.eventsDatasetKey ? (
        <LogStream
          datasetKey={data.eventsDatasetKey}
          params={params}
          onSelect={(e) => inspect(e.id, e.message, e)}
        />
      ) : (
        <LogExplorer
          events={(data.events || []).filter((e) =>
            `${e.message} ${e.service}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )}
          observedAt={data.updatedAt}
          gap={data.gap}
          complete={data.complete}
          onSelect={(e) => inspect(e.id, e.message, e)}
        />
      ),
    activity: () => (
      <ActivityTimeline
        events={data.activities || []}
        onSelect={(id) => {
          const e = data.activities?.find((e) => e.id === id);
          if (e) inspect(id, e.title, e, e.url);
        }}
      />
    ),
    status: () => (
      <StatusMatrix
        entities={data.services || []}
        onSelect={(id) => {
          const e = data.services?.find((e) => e.id === id);
          if (e) inspect(id, e.name, e);
        }}
      />
    ),
    breakdown: () => (
      <Breakdown
        title={kind === "cost" ? "Spend by service" : "Breakdown by service"}
        categories={data.categories || []}
        unit={data.categoryUnit}
        onSelect={(id) => {
          const e = data.categories?.find((e) => e.id === id);
          if (e) inspect(id, e.label, e);
        }}
      />
    ),
    distribution: () => (
      <Distribution
        bins={data.bins || []}
        unit={data.trendUnit}
        percentiles={data.percentiles}
        onSelect={(bin) => inspect(bin.label, "Distribution bucket", bin)}
      />
    ),
    heatmap: () => (
      <Heatmap
        title={
          kind === "customers"
            ? "Account engagement"
            : kind === "analytics"
              ? "Cohort retention"
              : "Activity density"
        }
        rows={data.heatmap?.rows || []}
        columns={data.heatmap?.columns || []}
        cells={data.heatmap?.cells || []}
        onSelect={(cell) =>
          inspect(`${cell.row}:${cell.column}`, "Observation", cell)
        }
      />
    ),
    funnel: () => (
      <Funnel
        steps={data.funnel || []}
        onSelect={(id) => {
          const e = data.funnel?.find((e) => e.id === id);
          if (e) inspect(id, e.label, e);
        }}
      />
    ),
    timeline: () => (
      <MilestoneTimeline
        items={data.milestones || []}
        onChange={onMilestoneChange}
        onSelect={(id) => {
          const e = data.milestones?.find((e) => e.id === id);
          if (e) inspect(id, e.title, e);
        }}
      />
    ),
    progress: () =>
      data.progress ? (
        <ProgressTarget {...data.progress} onCheckChange={onCheckChange} />
      ) : (
        <Panel title="Progress">
          <p className="empty-state">No target configured.</p>
        </Panel>
      ),
    narrative: () => (
      <Narrative title="Workspace briefing" sections={data.sections || []} />
    ),
  };
  return (
    <>
      <div className="metric-grid">
        {data.metrics?.map((m) =>
          m.drilldown ? (
            <Metric
              key={m.label}
              {...m}
              actionLabel={m.drilldown.label}
              selected={
                "itemIds" in m.drilldown ? m.label === metricFilter : undefined
              }
              onSelect={() => {
                const target = m.drilldown!;
                if ("itemIds" in target)
                  setMetricFilter(
                    m.label === metricFilter ? undefined : m.label,
                  );
                else if ("itemId" in target) {
                  const item = data.items?.find((i) => i.id === target.itemId);
                  if (item) openItem(item);
                } else inspect(`metric:${m.label}`, m.label, target.fields);
              }}
            />
          ) : (
            <Metric key={m.label} {...m} />
          ),
        )}
      </div>
      {selectedIds !== undefined && (
        <div className="toolbar metric-filter">
          <span role="status">
            {activeMetric!.label} · {items.length} matching records
            {data.complete === false ? " · Partial results" : ""}
          </span>
          <Button variant="quiet" onClick={() => setMetricFilter(undefined)}>
            Clear metric filter
          </Button>
        </div>
      )}
      <div className="composition-grid">
        {compositionPanels[kind].map((key) => (
          <div
            key={key}
            className={
              [
                "board",
                "table",
                "series",
                "logs",
                "timeline",
                "narrative",
              ].includes(key)
                ? "wide"
                : ""
            }
          >
            {panels[key]()}
          </div>
        ))}
      </div>
      {data.analysis && (
        <ChartExplorer
          {...data.analysis}
          initialView={
            kind === "cost"
              ? "treemap"
              : kind === "analytics"
                ? "funnel"
                : kind === "impact"
                  ? "area"
                  : "scatter"
          }
        />
      )}
      <SourceFreshness
        sources={data.sources || []}
        onRetry={onRetry ? () => onRetry() : undefined}
      />
      <RecordDetail
        record={detail}
        onClose={() => setDetail(undefined)}
        onPrevious={
          detail && items.findIndex((i) => i.id === detail.id) > 0
            ? () =>
                openItem(items[items.findIndex((i) => i.id === detail.id) - 1])
            : undefined
        }
        onNext={
          detail &&
          items.findIndex((i) => i.id === detail.id) >= 0 &&
          items.findIndex((i) => i.id === detail.id) < items.length - 1
            ? () =>
                openItem(items[items.findIndex((i) => i.id === detail.id) + 1])
            : undefined
        }
      />
    </>
  );
}
