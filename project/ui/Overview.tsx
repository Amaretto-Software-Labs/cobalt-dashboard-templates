import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { useDataset, safeUrl } from "../sdk";
import {
  Badge,
  Card,
  Dashboard,
  Metric,
  Refresh,
  SearchField,
  State,
} from "./index";
const descriptions = {
  issues: ["My issues", "Your work, organized by priority and status."],
  errors: [
    "Recent errors",
    "Investigate recurring failures and affected services.",
  ],
  metrics: ["Metrics", "Track outcomes and understand changes over time."],
  project: [
    "Project overview",
    "Delivery health, milestones and work in one place.",
  ],
  blank: ["Your dashboard", "Build the view your team needs."],
} as const;
export default function Overview({
  kind,
}: {
  kind: keyof typeof descriptions;
}) {
  const [range, setRange] = useState("7d");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("title");
  const { data, loading, error, refresh } = useDataset("main", { range });
  const items = [...(data?.items ?? [])]
    .filter(
      (item) =>
        (!status || item.status === status) &&
        `${item.title} ${item.assignee ?? ""} ${item.project ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), undefined, {
        numeric: true,
      }),
    );
  const series = data?.series ?? [];
  const max = Math.max(1, ...series.map((point) => point.value));
  return (
    <Dashboard
      title={descriptions[kind][0]}
      description={descriptions[kind][1]}
      actions={
        <>
          <select
            aria-label="Time range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <Refresh loading={loading} onClick={refresh} />
        </>
      }
    >
      <State
        loading={loading && !data}
        error={error}
        configured={data?.configured}
        retry={refresh}
      />
      {data?.configured && (
        <>
          {!!data.metrics?.length && (
            <div className="metric-grid">
              {data.metrics.map((metric) => (
                <Metric key={metric.label} {...metric} />
              ))}
            </div>
          )}
          {!!series.length && (
            <Card className="chart">
              <div className="dashboard-heading">
                <h2>
                  {kind === "errors"
                    ? "Error frequency"
                    : kind === "project"
                      ? "Delivery trend"
                      : "Trend"}
                </h2>
                <Badge>{range}</Badge>
              </div>
              <svg
                viewBox="0 0 700 200"
                role="img"
                aria-label={series
                  .map((point) => `${point.label}: ${point.value}`)
                  .join(", ")}
              >
                <line
                  x1="0"
                  x2="700"
                  y1="190"
                  y2="190"
                  stroke="var(--color-border)"
                />
                {series.map((point, index) => (
                  <g key={point.label}>
                    <rect
                      x={(index * 700) / series.length + 12}
                      y={190 - (point.value / max) * 165}
                      width={Math.max(4, 700 / series.length - 24)}
                      height={(point.value / max) * 165}
                      rx="4"
                      fill="var(--color-accent)"
                      opacity=".8"
                    >
                      <title>
                        {point.label}: {point.value}
                      </title>
                    </rect>
                  </g>
                ))}
              </svg>
              <div className="chart-labels">
                {series.map((point) => (
                  <span key={point.label}>{point.label}</span>
                ))}
              </div>
            </Card>
          )}
          <div className="toolbar">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={
                kind === "errors"
                  ? "Search errors or services"
                  : "Search work, people or projects"
              }
            />
            <select
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {[...new Set(data.items.map((item) => item.status))].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
            <select
              aria-label="Sort by"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="title">Sort by title</option>
              <option value="status">Sort by status</option>
              <option value="priority">Sort by priority</option>
              <option value="assignee">Sort by assignee</option>
            </select>
          </div>
          <Card className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{kind === "errors" ? "Error" : "Work"}</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>{kind === "errors" ? "Service" : "Owner"}</th>
                  <th>{kind === "errors" ? "Occurrences" : "Project"}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {safeUrl(item.url) ? (
                        <a
                          href={safeUrl(item.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.title} <ExternalLink size={12} />
                        </a>
                      ) : (
                        item.title
                      )}
                      <div className="muted">{item.id}</div>
                    </td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                    <td>{item.priority ?? "—"}</td>
                    <td>{item.assignee ?? "Unassigned"}</td>
                    <td>
                      {kind === "errors"
                        ? (item.count ?? "—")
                        : (item.project ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && (
              <div className="empty-state">
                {search || status
                  ? "No work matches these filters."
                  : "No work in this view yet."}
              </div>
            )}
          </Card>
          {data.updatedAt && (
            <p className="muted">
              Updated {new Date(data.updatedAt).toLocaleString()}
            </p>
          )}
        </>
      )}
    </Dashboard>
  );
}
