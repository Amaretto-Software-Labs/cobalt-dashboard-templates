import type { ReactNode, PropsWithChildren } from "react";
import { Inbox, LoaderCircle, ExternalLink, ArrowUpRight } from "lucide-react";
import { safeUrl } from "@cobalt-code/dashboard";
import {
  Button,
  Notice,
  Select,
  SearchField,
  Tooltip,
  type Tone,
} from "./Controls";
export function Card({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return <section className={`cobalt-card ${className}`}>{children}</section>;
}
export function Panel({
  title,
  children,
  actions,
  className = "",
}: PropsWithChildren<{
  title: string;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <Card className={`panel ${className}`}>
      <header className="panel-heading">
        <h2>{title}</h2>
        {actions}
      </header>
      {children}
    </Card>
  );
}
export function Dashboard({
  title,
  description,
  children,
  actions,
}: PropsWithChildren<{
  title: string;
  description: string;
  actions?: ReactNode;
}>) {
  return (
    <main className="dashboard">
      {window.cobaltDashboardDemo && (
        <Notice tone="accent">
          Sample preview · Changes here do not affect live data
        </Notice>
      )}
      <header className="dashboard-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="toolbar">{actions}</div>
      </header>
      {children}
    </main>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: PropsWithChildren<{ tone?: Tone }>) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}
export function State({
  loading,
  error,
  configured = true,
  retry,
}: {
  loading: boolean;
  error?: string;
  configured?: boolean;
  retry: () => void;
}) {
  if (error)
    return (
      <Notice tone="danger" action={<Button onClick={retry}>Try again</Button>}>
        {error}
      </Notice>
    );
  if (loading)
    return (
      <div className="empty-state" role="status">
        <LoaderCircle className="spin" />
        <h2>Loading your dashboard…</h2>
        <div className="skeleton" />
      </div>
    );
  if (!configured)
    return (
      <div className="empty-state">
        <Inbox />
        <h2>Choose what this dashboard shows</h2>
        <p>
          Ask Cobalt to connect the data sources, scope and actions you need.
        </p>
      </div>
    );
  return null;
}
export function Metric({
  label,
  value,
  unit,
  change,
  tone = "neutral",
  trend = [],
  onSelect,
  actionLabel,
  selected,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  change?: string;
  tone?: Tone;
  trend?: number[];
} & (
  | { onSelect: () => void; actionLabel: string; selected?: boolean }
  | { onSelect?: undefined; actionLabel?: undefined; selected?: undefined }
)) {
  const valid = trend.filter(Number.isFinite),
    min = Math.min(...valid),
    range = Math.max(...valid) - min || 1;
  const content = (
    <>
      <span className="muted">{label}</span>
      <strong>
        {value ?? "—"}
        {unit && <small> {unit}</small>}
      </strong>
      {change && <span className={`tone-${tone}`}>{change}</span>}
      {valid.length > 1 && (
        <svg viewBox="0 0 160 28" aria-hidden="true" className="sparkline">
          <polyline
            points={valid
              .map(
                (v, i) =>
                  `${(i / (valid.length - 1)) * 160},${25 - ((v - min) / range) * 22}`,
              )
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )}
    </>
  );
  return onSelect ? (
    <Tooltip label={actionLabel}>
      <button
        type="button"
        className="cobalt-card metric metric-action"
        onClick={onSelect}
        aria-label={`${label}: ${actionLabel}`}
        aria-pressed={selected}
      >
        {content}
        <ArrowUpRight
          size={15}
          className="metric-action-icon"
          aria-hidden="true"
        />
      </button>
    </Tooltip>
  ) : (
    <Card className="metric">{content}</Card>
  );
}
export function FilterBar({
  query,
  onQuery,
  range,
  onRange,
  source,
  onSource,
  sources = [],
}: {
  query: string;
  onQuery: (query: string) => void;
  range: string;
  onRange: (range: string) => void;
  source?: string;
  onSource?: (source: string) => void;
  sources?: string[];
}) {
  return (
    <div className="toolbar filter-bar">
      <SearchField value={query} onChange={onQuery} />
      {onSource && (
        <Select
          label="Source"
          value={source || "all"}
          onChange={onSource}
          options={[
            { value: "all", label: "All sources" },
            ...sources.map((value) => ({ value, label: value })),
          ]}
        />
      )}
      <Select
        label="Time range"
        value={range}
        onChange={onRange}
        options={[
          { value: "24h", label: "Last 24 hours" },
          { value: "7d", label: "Last 7 days" },
          { value: "30d", label: "Last 30 days" },
        ]}
      />
      <Button
        variant="quiet"
        onClick={() => {
          onQuery("");
          onSource?.("all");
          onRange("24h");
        }}
      >
        Reset filters
      </Button>
    </div>
  );
}
export type SourceStatus = {
  id: string;
  name: string;
  status: "ready" | "stale" | "error" | "unknown";
  observedAt?: string;
  detail?: string;
};
export function SourceFreshness({
  sources,
  onRetry,
}: {
  sources: SourceStatus[];
  onRetry?: (id: string) => void;
}) {
  return (
    <Panel title="Data sources">
      {sources.length ? (
        sources.map((source) => (
          <div className="status-row" key={source.id}>
            <div>
              {source.name}
              <small className="muted">
                {source.observedAt
                  ? new Date(source.observedAt).toLocaleString()
                  : "Not observed"}
                {source.detail && ` · ${source.detail}`}
              </small>
            </div>
            <Badge
              tone={
                source.status === "ready"
                  ? "success"
                  : source.status === "error"
                    ? "danger"
                    : source.status === "stale"
                      ? "warning"
                      : "neutral"
              }
            >
              {source.status}
            </Badge>
            {onRetry && source.status !== "ready" && (
              <Button onClick={() => onRetry(source.id)}>Retry</Button>
            )}
          </div>
        ))
      ) : (
        <p className="empty-state">No sources configured.</p>
      )}
    </Panel>
  );
}
export function SourceLink({
  url,
  children = "Open source",
}: {
  url?: string;
  children?: ReactNode;
}) {
  const safe = safeUrl(url);
  return safe ? (
    <a href={safe} target="_blank" rel="noreferrer" className="source-link">
      {children}
      <ExternalLink size={13} />
    </a>
  ) : null;
}
