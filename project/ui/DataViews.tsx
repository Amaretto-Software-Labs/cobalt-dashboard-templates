import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Pause,
  Play,
} from "lucide-react";
import { useLiveDataset, type StreamDataset } from "@cobalt-code/dashboard";
import {
  Button,
  SearchField,
  Checkbox,
  Menu,
  Select,
  Notice,
} from "./Controls";
import { Panel, Badge } from "./Layout";
export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null;
};
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  complete = true,
  onSelect,
  onLoadMore,
  loadingMore = false,
  pageSize = 8,
  title = "Records",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  complete?: boolean;
  onSelect?: (row: T) => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  pageSize?: number;
  title?: string;
}) {
  const [sort, setSort] = useState<{ key: string; descending: boolean }>(),
    [page, setPage] = useState(0),
    [hidden, setHidden] = useState<string[]>([]);
  const size = Math.max(1, pageSize);
  const sorted = useMemo(() => {
    const result = [...rows],
      column = columns.find((c) => c.key === sort?.key);
    if (column?.sortValue)
      result.sort((a, b) => {
        const x = column.sortValue!(a),
          y = column.sortValue!(b);
        return (
          (typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x ?? "").localeCompare(String(y ?? ""), undefined, {
                numeric: true,
              })) * (sort?.descending ? -1 : 1)
        );
      });
    return result;
  }, [rows, columns, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / size)),
    current = Math.min(page, pages - 1),
    shown = columns.filter((c) => !hidden.includes(c.key));
  useEffect(() => setPage(0), [rows, sort]);
  return (
    <Panel
      title={title}
      actions={
        <Menu
          label="Visible columns"
          items={columns.map((c) => ({
            id: c.key,
            label: `${hidden.includes(c.key) ? "Show" : "Hide"} ${c.label}`,
            icon: <Columns3 size={14} />,
            disabled: shown.length === 1 && !hidden.includes(c.key),
            onSelect: () =>
              setHidden((h) =>
                h.includes(c.key)
                  ? h.filter((k) => k !== c.key)
                  : [...h, c.key],
              ),
          }))}
        />
      }
    >
      {!complete && (
        <Notice tone="warning">
          Partial results · Counts describe the loaded records.
        </Notice>
      )}
      <div className="data-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {shown.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sort?.key === c.key
                      ? sort.descending
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                >
                  {c.sortValue ? (
                    <Button
                      variant="quiet"
                      onClick={() =>
                        setSort({
                          key: c.key,
                          descending: sort?.key === c.key && !sort.descending,
                        })
                      }
                    >
                      {c.label}
                      {sort?.key === c.key ? (
                        sort.descending ? (
                          <ArrowDown size={13} />
                        ) : (
                          <ArrowUp size={13} />
                        )
                      ) : null}
                    </Button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {onSelect && <th scope="col">Details</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(current * size, (current + 1) * size).map((row) => (
              <tr key={rowKey(row)}>
                {shown.map((c) => (
                  <td key={c.key}>{c.render(row)}</td>
                ))}
                {onSelect && (
                  <td>
                    <Button
                      variant="quiet"
                      aria-label={`Open ${rowKey(row)}`}
                      onClick={() => onSelect(row)}
                    >
                      Details
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="empty-state">No matching records.</p>}
      <footer className="table-footer">
        <span className="muted">
          {rows.length ? current * size + 1 : 0}–
          {Math.min((current + 1) * size, rows.length)} of {rows.length}
        </span>
        <div className="toolbar">
          <Button
            aria-label="Previous page"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={15} />
          </Button>
          <span>
            {current + 1} / {pages}
          </span>
          <Button
            aria-label="Next page"
            disabled={current + 1 === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={15} />
          </Button>
          {onLoadMore && (
            <Button busy={loadingMore} onClick={onLoadMore}>
              Load more
            </Button>
          )}
        </div>
      </footer>
    </Panel>
  );
}
export type LogEvent = {
  id: string;
  timestamp: string;
  message: string;
  level?: string;
  service?: string;
  [key: string]: unknown;
};
export function LogExplorer({
  events,
  loading = false,
  error,
  observedAt,
  gap,
  complete = true,
  droppedEvents = 0,
  onSelect,
}: {
  events: LogEvent[];
  loading?: boolean;
  error?: string;
  observedAt?: string;
  gap?: string;
  complete?: boolean;
  droppedEvents?: number;
  onSelect?: (event: LogEvent) => void;
}) {
  const [paused, setPaused] = useState(false),
    [follow, setFollow] = useState(true),
    [query, setQuery] = useState(""),
    [level, setLevel] = useState("all"),
    [snapshot, setSnapshot] = useState(events);
  const tail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!paused) setSnapshot(events);
  }, [events, paused]);
  const filtered = snapshot.filter(
    (e) =>
      (level === "all" || (e.level || "info").toLowerCase() === level) &&
      `${e.service ?? ""} ${e.message}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  useEffect(() => {
    if (follow && !paused) tail.current?.scrollIntoView?.({ block: "nearest" });
  }, [snapshot, follow, paused]);
  return (
    <Panel title="Event stream">
      <div className="toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search events…"
        />
        <Select
          label="Severity"
          value={level}
          onChange={setLevel}
          options={["all", "error", "warn", "info", "debug"].map((value) => ({
            value,
            label: value === "all" ? "All severities" : value.toUpperCase(),
          }))}
        />
        <Button
          icon={paused ? <Play size={14} /> : <Pause size={14} />}
          onClick={() => setPaused(!paused)}
        >
          {paused ? "Resume display" : "Pause display"}
        </Button>
        <Checkbox label="Follow tail" checked={follow} onChange={setFollow} />
      </div>
      <p className="muted" role="status">
        {paused
          ? "Display paused · Incoming data is retained by the caller"
          : loading
            ? "Loading history…"
            : `${filtered.length} displayed events`}
        {observedAt &&
          ` · Observed ${new Date(observedAt).toLocaleTimeString()}`}
      </p>
      {error && (
        <Notice tone="danger">{error} · Retained events may be stale.</Notice>
      )}
      {gap && <Notice tone="warning">History gap: {gap}</Notice>}
      {(!complete || droppedEvents > 0) && (
        <Notice tone="warning">
          Incomplete history
          {droppedEvents > 0 &&
            ` · ${droppedEvents} events outside the retained buffer`}
        </Notice>
      )}
      <div
        className="log-stream"
        role="region"
        aria-label="Log events"
        tabIndex={0}
      >
        {filtered.map((e) => (
          <button
            type="button"
            className="log-event"
            key={e.id}
            disabled={!onSelect}
            onClick={() => onSelect?.(e)}
          >
            <time dateTime={e.timestamp}>
              {new Date(e.timestamp).toLocaleTimeString()}
            </time>
            <Badge
              tone={
                e.level === "error"
                  ? "danger"
                  : e.level === "warn"
                    ? "warning"
                    : "neutral"
              }
            >
              {e.level || "info"}
            </Badge>
            <span>
              <b>{e.service} </b>
              {e.message}
            </span>
          </button>
        ))}
        {!loading && !filtered.length && (
          <p className="empty-state">No matching events.</p>
        )}
        <div ref={tail} />
      </div>
    </Panel>
  );
}
export function LogStream({
  datasetKey,
  params = {},
  onSelect,
}: {
  datasetKey: string;
  params?: Record<string, unknown>;
  onSelect?: (event: LogEvent) => void;
}) {
  const live = useLiveDataset<StreamDataset<LogEvent>>(datasetKey, params);
  return (
    <LogExplorer
      events={live.data?.events ?? []}
      loading={live.loading}
      error={live.error}
      observedAt={live.data?.observedAt}
      gap={live.data?.gap ?? undefined}
      complete={live.data?.complete}
      droppedEvents={live.data?.droppedEvents}
      onSelect={onSelect}
    />
  );
}
