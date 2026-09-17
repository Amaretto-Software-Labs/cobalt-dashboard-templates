import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Card, SearchField } from "./index";
import { useLiveDataset, type StreamDataset } from "@cobalt-code/dashboard";

export function DataTable<T>({ rows, columns, rowKey, complete = true, onSelect, onLoadMore, loadingMore = false }: {
  rows: T[];
  columns: { key: string; label: string; render: (row: T) => ReactNode }[];
  rowKey: (row: T) => string;
  complete?: boolean;
  onSelect?: (row: T) => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}) {
  return <Card className="data-view">
    {!complete && <p role="status" className="preview-banner">Partial results · Some source data is unavailable or more pages remain.</p>}
    <div className="data-scroll"><table className="data-table"><thead><tr>{columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}{onSelect && <th scope="col">Details</th>}</tr></thead>
      <tbody>{rows.map(row => <tr key={rowKey(row)}>{columns.map(column => <td key={column.key}>{column.render(row)}</td>)}{onSelect && <td><Button onClick={() => onSelect(row)}>Open details</Button></td>}</tr>)}</tbody></table></div>
    {!rows.length && <p className="empty-state">No results for this view.</p>}
    {onLoadMore && <Button disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "Loading…" : "Load more"}</Button>}
  </Card>;
}

export function TimeSeries({ points, label, unit = "", complete = true }: {
  points: { time: string; value: number }[]; label: string; unit?: string; complete?: boolean;
}) {
  const values = points.filter(point => Number.isFinite(point.value) && Number.isFinite(Date.parse(point.time))).sort((a, b) => Date.parse(a.time) - Date.parse(b.time)).slice(-500);
  if (!values.length) return <Card className="chart"><h2>{label}</h2><p className="empty-state">No observations available.</p></Card>;
  const minimum = Math.min(...values.map(point => point.value));
  const maximum = Math.max(...values.map(point => point.value));
  const start = Math.min(...values.map(point => Date.parse(point.time)));
  const end = Math.max(...values.map(point => Date.parse(point.time)));
  const coordinates = values.map(point => `${8 + (Date.parse(point.time) - start) / Math.max(1, end - start) * 584},${152 - (point.value - minimum) / Math.max(1, maximum - minimum) * 140}`).join(" ");
  return <Card className="chart"><h2>{label}</h2>{!complete && <p role="status">Partial observations</p>}
    <svg className="time-series" viewBox="0 0 600 160" role="img" aria-label={`${label}: ${minimum} to ${maximum} ${unit}`}><polyline points={coordinates} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
    <div className="toolbar muted"><span>{new Date(start).toLocaleString()}</span><span>{new Date(end).toLocaleString()} · {unit}</span></div>
  </Card>;
}

export type LogEvent = { id: string; timestamp: string; message: string; level?: string; [key: string]: unknown };
export function LogStream({ datasetKey, params = {} }: { datasetKey: string; params?: Record<string, unknown> }) {
  const live = useLiveDataset<StreamDataset<LogEvent>>(datasetKey, params);
  const [paused, setPaused] = useState(false);
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState("");
  const [since, setSince] = useState("");
  const [displayed, setDisplayed] = useState<StreamDataset<LogEvent>>();
  const tail = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!paused) setDisplayed(live.data); }, [paused, live.data]);
  const events = useMemo(() => (displayed?.events ?? []).filter(event =>
    `${event.level ?? ""} ${event.message}`.toLowerCase().includes(query.toLowerCase()) &&
    (!since || Date.parse(event.timestamp) >= Date.parse(since))), [displayed, query, since]);
  useEffect(() => { if (follow && !paused) tail.current?.scrollIntoView({ block: "nearest" }); }, [events, follow, paused]);
  return <Card className="data-view">
    <div className="toolbar"><SearchField value={query} onChange={setQuery} placeholder="Filter displayed logs…" />
      <label>Show since <input className="field" type="datetime-local" value={since} onChange={event => setSince(event.target.value)} /></label>
      <Button onClick={() => setPaused(value => !value)}>{paused ? "Resume display" : "Pause display"}</Button>
      <label><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} /> Follow tail</label></div>
    <p className="muted" role="status">{paused ? "Display paused · Collection continues" : live.loading ? "Loading history…" : "Incremental polling · 5s after each response"}{displayed && ` · Updated ${new Date(displayed.observedAt).toLocaleTimeString()}`}</p>
    {live.error && <p role="alert">{live.error} · Retrying; displayed events may be stale.</p>}
    {displayed?.gap && <p role="alert">Gap in source history: {displayed.gap}</p>}
    {Boolean(displayed?.droppedEvents) && <p role="status">{displayed?.droppedEvents} events fell outside the retained buffer.</p>}
    {displayed && !displayed.complete && <p role="status">This feed is incomplete; counts describe only the retained events.</p>}
    <div className="log-stream" role="region" aria-label="Log events" tabIndex={0}>
      {events.map(event => <div className="log-event" key={event.id}><time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time><span className="badge">{event.level ?? "info"}</span><pre>{event.message}</pre></div>)}
      {!live.loading && !events.length && <p className="empty-state">No matching events.</p>}<div ref={tail} />
    </div>
  </Card>;
}
