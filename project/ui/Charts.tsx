import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Brush,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import { Button, useReducedMotion } from "./Controls";
import { Panel, Badge } from "./Layout";
export type Observation = { time: string; value: number | null };
export type Series = {
  id: string;
  label: string;
  points: Observation[];
  color?: string;
};
const colors = [
  "var(--color-accent)",
  "var(--color-warning)",
  "var(--color-success)",
  "var(--color-info)",
];
export function TimeSeries({
  series,
  label,
  unit = "",
  complete = true,
  annotations = [],
  onRangeChange,
}: {
  series: Series[];
  label: string;
  unit?: string;
  complete?: boolean;
  annotations?: { time: string; label: string }[];
  onRangeChange?: (start: string, end: string) => void;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const reduce = useReducedMotion();
  const data = useMemo(() => {
    const rows = new Map<string, Record<string, string | number | null>>();
    for (const s of series)
      for (const p of s.points) {
        if (!Number.isFinite(Date.parse(p.time))) continue;
        const time = new Date(p.time).toISOString();
        const row = rows.get(time) || { time };
        row[s.id] =
          p.value !== null && Number.isFinite(p.value) ? p.value : null;
        rows.set(time, row);
      }
    return [...rows.values()].sort((a, b) =>
      String(a.time).localeCompare(String(b.time)),
    );
  }, [series]);
  const formatTime = (value: string) =>
    new Date(value).toLocaleString(
      undefined,
      data.length &&
        Date.parse(String(data.at(-1)!.time)) -
          Date.parse(String(data[0].time)) <
          48 * 3600000
        ? { hour: "2-digit", minute: "2-digit" }
        : { month: "short", day: "numeric" },
    );
  return (
    <Panel
      title={label}
      actions={
        !complete ? (
          <Badge tone="warning">Partial observations</Badge>
        ) : (
          <small className="muted">{unit}</small>
        )
      }
    >
      <div className="chart-legend">
        {series.map((s, i) => (
          <Button
            key={s.id}
            variant="quiet"
            aria-pressed={!hidden.includes(s.id)}
            onClick={() =>
              setHidden((h) =>
                h.includes(s.id) ? h.filter((id) => id !== s.id) : [...h, s.id],
              )
            }
          >
            <span
              className="color-dot"
              style={{
                background: s.color || colors[i % colors.length],
                opacity: hidden.includes(s.id) ? 0.3 : 1,
              }}
            />
            {s.label}
          </Button>
        ))}
      </div>
      {data.length ? (
        <div className="chart-frame">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 260 }}
          >
            <LineChart
              data={data}
              accessibilityLayer
              margin={{ top: 15, right: 24, bottom: 4, left: 4 }}
            >
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                minTickGap={50}
              />
              <YAxis width={46} tick={{ fontSize: 10 }} />
              <ChartTooltip
                contentStyle={{
                  background: "var(--color-panel)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  color: "var(--color-text)",
                }}
                labelFormatter={(v) => new Date(String(v)).toLocaleString()}
                formatter={(v) => [`${v ?? "Unknown"} ${unit}`]}
              />
              {series.map((s, i) => (
                <Line
                  key={s.id}
                  dataKey={s.id}
                  name={s.label}
                  stroke={s.color || colors[i % colors.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  hide={hidden.includes(s.id)}
                  connectNulls={false}
                  isAnimationActive={!reduce}
                />
              ))}
              {annotations.map((a) => (
                <ReferenceLine
                  key={a.time}
                  x={new Date(a.time).toISOString()}
                  stroke="var(--color-text-muted)"
                  strokeDasharray="3 3"
                  label={{
                    value: a.label,
                    fill: "var(--color-text-muted)",
                    fontSize: 10,
                  }}
                />
              ))}
              <Brush
                ariaLabel={`Select time range for ${label}. Use arrow keys to adjust.`}
                dataKey="time"
                height={22}
                stroke="var(--color-border)"
                fill="var(--color-panel)"
                tickFormatter={formatTime}
                onChange={(r) => {
                  if (r.startIndex !== undefined && r.endIndex !== undefined)
                    onRangeChange?.(
                      String(data[r.startIndex].time),
                      String(data[r.endIndex].time),
                    );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="empty-state">No observations available.</p>
      )}
    </Panel>
  );
}
export type Category = { id: string; label: string; value: number };
export function Breakdown({
  title = "Breakdown",
  categories,
  unit = "",
  onSelect,
}: {
  title?: string;
  categories: Category[];
  unit?: string;
  onSelect?: (id: string) => void;
}) {
  const [share, setShare] = useState(false);
  const values = categories
    .filter((c) => Number.isFinite(c.value) && c.value >= 0)
    .sort((a, b) => b.value - a.value);
  const total = values.reduce((s, c) => s + c.value, 0),
    max = Math.max(1, ...values.map((c) => c.value));
  return (
    <Panel
      title={title}
      actions={
        <Button variant="quiet" onClick={() => setShare(!share)}>
          {share ? "Show values" : "Show shares"}
        </Button>
      }
    >
      <p className="large-number">
        {total.toLocaleString()} <small>{unit}</small>
      </p>
      {values.map((c) => (
        <button
          key={c.id}
          type="button"
          className="breakdown-row"
          disabled={!onSelect}
          onClick={() => onSelect?.(c.id)}
        >
          <span>{c.label}</span>
          <span className="bar-track">
            <span style={{ width: `${(c.value / max) * 100}%` }} />
          </span>
          <b>
            {share
              ? `${total ? ((c.value / total) * 100).toFixed(1) : 0}%`
              : c.value.toLocaleString()}
          </b>
        </button>
      ))}
      {!values.length && (
        <p className="empty-state">No categories available.</p>
      )}
    </Panel>
  );
}
export type HistogramBin = { label: string; count: number };
export function Distribution({
  bins,
  unit = "",
  percentiles = {},
  onSelect,
}: {
  bins: HistogramBin[];
  unit?: string;
  percentiles?: Record<string, number>;
  onSelect?: (bin: HistogramBin) => void;
}) {
  const reduce = useReducedMotion();
  const validBins = bins.filter(
    (b) => b.count >= 0 && Number.isFinite(b.count),
  );
  return (
    <Panel title="Distribution">
      <div className="chart-frame">
        <ResponsiveContainer
          initialDimension={{ width: 600, height: 260 }}
          width="100%"
          height="100%"
        >
          <BarChart data={validBins} accessibilityLayer>
            <XAxis dataKey="label" minTickGap={20} />
            <YAxis width={35} />
            <ChartTooltip
              contentStyle={{
                background: "var(--color-panel)",
                border: "1px solid var(--color-border)",
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--color-accent)"
              isAnimationActive={!reduce}
              onClick={(_, i) => onSelect?.(validBins[i])}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="toolbar">
        {Object.entries(percentiles).map(([key, value]) => (
          <Badge key={key}>
            {key} {value} {unit}
          </Badge>
        ))}
      </div>
    </Panel>
  );
}
export type HeatCell = { row: string; column: string; value: number | null };
export function Heatmap({
  title = "Heatmap",
  rows,
  columns,
  cells,
  onSelect,
}: {
  title?: string;
  rows: string[];
  columns: string[];
  cells: HeatCell[];
  onSelect?: (cell: HeatCell) => void;
}) {
  const max = Math.max(1, ...cells.map((c) => c.value ?? 0));
  const map = new Map(cells.map((c) => [`${c.row}\0${c.column}`, c]));
  return (
    <Panel title={title}>
      <div className="heat-scroll">
        <div
          className="heat-grid"
          style={{
            gridTemplateColumns: `80px repeat(${columns.length},minmax(24px,1fr))`,
          }}
        >
          <span />
          {columns.map((c) => (
            <small key={c}>{c}</small>
          ))}
          {rows.map((row) => (
            <div className="heat-row" key={row}>
              <small>{row}</small>
              {columns.map((column) => {
                const cell = map.get(`${row}\0${column}`) || {
                  row,
                  column,
                  value: null,
                };
                return (
                  <Button
                    key={column}
                    className="heat-cell"
                    style={{
                      background:
                        cell.value === null
                          ? "var(--color-input)"
                          : `color-mix(in srgb,var(--color-accent) ${15 + (Math.max(0, cell.value) / max) * 85}%,var(--color-panel))`,
                    }}
                    aria-label={`${row}, ${column}: ${cell.value ?? "No data"}`}
                    onClick={() => onSelect?.(cell)}
                    disabled={!onSelect}
                  >
                    {cell.value === null ? "—" : cell.value}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <small className="muted">
        Lower intensity → higher value · “—” means no data
      </small>
    </Panel>
  );
}
export function Funnel({
  steps,
  onSelect,
}: {
  steps: Category[];
  onSelect?: (id: string) => void;
}) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <Panel title="Conversion funnel">
      {steps.map((step, i) => (
        <button
          key={step.id}
          type="button"
          className="funnel-step"
          disabled={!onSelect}
          onClick={() => onSelect?.(step.id)}
          style={{ width: `${50 + (Math.max(0, step.value) / max) * 50}%` }}
        >
          <span>
            {step.label}
            <small>
              {i
                ? `${steps[i - 1].value ? ((step.value / steps[i - 1].value) * 100).toFixed(1) : "—"}% of previous step`
                : "Cohort entry"}
            </small>
          </span>
          <b>{step.value.toLocaleString()}</b>
        </button>
      ))}
      {!steps.length && <p className="empty-state">No funnel observations.</p>}
    </Panel>
  );
}
