import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Treemap,
} from "recharts";
import { Panel } from "./Layout";
import { Select, Button, useReducedMotion } from "./Controls";
import {
  ChartFrame,
  ChartSelection,
  chartColors,
  chartTooltipStyle,
  type ChartSelectionProps,
} from "./ChartPrimitives";
import type { Category } from "./Charts";

export type ComparisonRow = {
  id: string;
  label: string;
  values: Record<string, number | null>;
};
export function ComparisonChart({
  title = "Category comparison",
  rows,
  series,
  unit = "",
  selectedId,
  onSelect,
}: ChartSelectionProps & {
  title?: string;
  rows: ComparisonRow[];
  series: { id: string; label: string }[];
  unit?: string;
}) {
  const [mode, setMode] = useState("grouped");
  const [hidden, setHidden] = useState<string[]>([]);
  const reduce = useReducedMotion();
  const data = rows.map((row) => ({
    ...row,
    values: Object.fromEntries(
      Object.entries(row.values).map(([key, value]) => [
        key,
        value !== null && Number.isFinite(value) ? value : null,
      ]),
    ),
  }));
  return (
    <Panel
      title={title}
      actions={
        <Select
          label="Bar layout"
          value={mode}
          onChange={setMode}
          options={[
            { value: "grouped", label: "Grouped" },
            { value: "stacked", label: "Stacked" },
          ]}
        />
      }
    >
      <div className="chart-legend">
        {series.map((s, i) => (
          <Button
            key={s.id}
            variant="quiet"
            aria-pressed={!hidden.includes(s.id)}
            onClick={() =>
              setHidden((current) =>
                current.includes(s.id)
                  ? current.filter((id) => id !== s.id)
                  : [...current, s.id],
              )
            }
          >
            <span
              className="color-dot"
              style={{ background: chartColors[i % chartColors.length] }}
            />
            {s.label}
          </Button>
        ))}
      </div>
      {rows.length ? (
        <ChartFrame>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis width={48} />
            <Tooltip
              cursor={false}
              contentStyle={chartTooltipStyle}
              formatter={(v, name) => [`${v ?? "Unknown"} ${unit}`, name]}
            />
            {series.map((s, i) => (
              <Bar
                key={s.id}
                dataKey={(row) => row.values[s.id]}
                name={s.label}
                hide={hidden.includes(s.id)}
                stackId={mode === "stacked" ? "total" : undefined}
                fill={chartColors[i % chartColors.length]}
                isAnimationActive={!reduce}
                animationDuration={350}
                onClick={(_, index) =>
                  onSelect?.(
                    rows[index].id === selectedId ? undefined : rows[index].id,
                  )
                }
                cursor={onSelect ? "pointer" : undefined}
              >
                {rows.map((row) => (
                  <Cell
                    key={row.id}
                    opacity={!selectedId || row.id === selectedId ? 1 : 0.25}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ChartFrame>
      ) : (
        <p className="empty-state">No categories available.</p>
      )}
      <ChartSelection
        showColors={false}
        options={rows}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </Panel>
  );
}
export type ScatterPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  size?: number;
  group?: string;
};
export function CorrelationChart({
  points,
  title = "Correlation & outliers",
  xLabel,
  yLabel,
  selectedId,
  onSelect,
}: ChartSelectionProps & {
  points: ScatterPoint[];
  title?: string;
  xLabel: string;
  yLabel: string;
}) {
  const reduce = useReducedMotion();
  const valid = points
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({
      ...p,
      size:
        p.size !== undefined && Number.isFinite(p.size)
          ? Math.max(0, p.size)
          : 1,
    }));
  return (
    <Panel title={title}>
      <p className="muted chart-caption">
        {xLabel} → · {yLabel} ↑ · Bubble area represents size
      </p>
      {valid.length ? (
        <ChartFrame>
          <ScatterChart
            accessibilityLayer
            margin={{ left: 8, right: 24, top: 10, bottom: 12 }}
          >
            <CartesianGrid stroke="var(--color-border)" />
            <XAxis type="number" dataKey="x" name={xLabel} />
            <YAxis type="number" dataKey="y" name={yLabel} />
            <ZAxis dataKey="size" range={[50, 450]} name="Size" />
            <Tooltip
              contentStyle={chartTooltipStyle}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Scatter
              data={valid}
              name="Observations"
              fill="var(--color-accent)"
              isAnimationActive={!reduce}
              animationDuration={350}
              onClick={(_, i) =>
                onSelect?.(selectedId === valid[i].id ? undefined : valid[i].id)
              }
              cursor={onSelect ? "pointer" : undefined}
            >
              {valid.map((p, i) => (
                <Cell
                  key={p.id}
                  fill={chartColors[i % chartColors.length]}
                  opacity={!selectedId || selectedId === p.id ? 1 : 0.25}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ChartFrame>
      ) : (
        <p className="empty-state">No observations available.</p>
      )}
      <ChartSelection
        options={valid.map((p) => ({
          id: p.id,
          label: p.label,
          value: `${p.x}, ${p.y}`,
        }))}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </Panel>
  );
}
export function DonutChart({
  categories,
  title = "Share of total",
  unit = "",
  selectedId,
  onSelect,
}: ChartSelectionProps & {
  categories: Category[];
  title?: string;
  unit?: string;
}) {
  const reduce = useReducedMotion();
  const data = categories.filter(
    (c) => Number.isFinite(c.value) && c.value >= 0,
  );
  const total = data.reduce((sum, c) => sum + c.value, 0);
  return (
    <Panel title={title}>
      <p className="large-number">
        {total.toLocaleString()} <small>{unit}</small>
      </p>
      {total > 0 ? (
        <ChartFrame>
          <PieChart accessibilityLayer>
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v) => [`${v} ${unit}`, "Value"]}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              rootTabIndex={-1}
              activeShape={{ stroke: "var(--color-text)", strokeWidth: 2 }}
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="var(--color-panel)"
              isAnimationActive={!reduce}
              animationDuration={350}
              onClick={(_, i) =>
                onSelect?.(selectedId === data[i].id ? undefined : data[i].id)
              }
              cursor={onSelect ? "pointer" : undefined}
            >
              {data.map((c, i) => (
                <Cell
                  key={c.id}
                  fill={chartColors[i % chartColors.length]}
                  opacity={!selectedId || selectedId === c.id ? 1 : 0.25}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartFrame>
      ) : (
        <p className="empty-state">No positive values to display.</p>
      )}
      <ChartSelection
        options={data.map((c) => ({
          ...c,
          value: `${c.value.toLocaleString()} · ${total ? ((c.value / total) * 100).toFixed(1) : 0}%`,
        }))}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </Panel>
  );
}
export type TreeCategory = {
  id: string;
  label: string;
  value?: number;
  children?: TreeCategory[];
};
export function HierarchyChart({
  nodes,
  title = "Hierarchical breakdown",
  selectedId,
  onSelect,
}: ChartSelectionProps & { nodes: TreeCategory[]; title?: string }) {
  const reduce = useReducedMotion();
  const [path, setPath] = useState<string[]>([]);
  let visible = nodes;
  const crumbs: { id: string; label: string }[] = [];
  for (const id of path) {
    const node = visible.find((n) => n.id === id);
    if (!node?.children) break;
    crumbs.push(node);
    visible = node.children;
  }
  const sum = (node: TreeCategory): number =>
    node.children
      ? node.children.reduce((v, n) => v + sum(n), 0)
      : Math.max(0, Number.isFinite(node.value) ? node.value! : 0);
  const data = visible
    .map((n) => ({ ...n, children: undefined, value: sum(n) }))
    .filter((n) => n.value > 0);
  function choose(id: string | undefined) {
    if (id === undefined) {
      onSelect?.(undefined);
      return;
    }
    const node = visible.find((n) => n.id === id);
    if (node?.children) {
      setPath([...crumbs.map((c) => c.id), id]);
      onSelect?.(undefined);
    } else onSelect?.(id);
  }
  return (
    <Panel title={title}>
      <nav className="toolbar chart-breadcrumbs" aria-label="Chart hierarchy">
        <Button
          variant="quiet"
          onClick={() => {
            setPath([]);
            onSelect?.(undefined);
          }}
        >
          All groups
        </Button>
        {crumbs.map((c, i) => (
          <Button
            key={c.id}
            variant="quiet"
            onClick={() => {
              setPath(crumbs.slice(0, i + 1).map((c) => c.id));
              onSelect?.(undefined);
            }}
          >
            {c.label}
          </Button>
        ))}
      </nav>
      {data.length ? (
        <ChartFrame>
          <Treemap
            data={data}
            dataKey="value"
            nameKey="label"
            nodeGap={4}
            isAnimationActive={!reduce}
            animationDuration={350}
            content={(node) => {
              if (node.depth !== 1) return <g />;
              const id = String(node.id),
                label = String(node.label);
              return (
                <g
                  role="button"
                  aria-label={`Explore ${label}`}
                  tabIndex={0}
                  aria-pressed={id === selectedId}
                  onClick={() => choose(id === selectedId ? undefined : id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      choose(id === selectedId ? undefined : id);
                    }
                  }}
                  className="treemap-node"
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx={4}
                    fill={chartColors[node.index % chartColors.length]}
                    opacity={!selectedId || selectedId === id ? 0.8 : 0.25}
                  />
                  <title>
                    {label}: {node.value}
                  </title>
                  {node.width > 80 && node.height > 38 && (
                    <text
                      x={node.x + 10}
                      y={node.y + 22}
                      fill="var(--color-canvas)"
                      fontSize={12}
                      pointerEvents="none"
                    >
                      {label.length > Math.floor(node.width / 8)
                        ? label.slice(
                            0,
                            Math.max(1, Math.floor(node.width / 8) - 2),
                          ) + "…"
                        : label}
                    </text>
                  )}
                </g>
              );
            }}
          />
        </ChartFrame>
      ) : (
        <p className="empty-state">No positive values to display.</p>
      )}
      <ChartSelection
        options={data.map((n) => ({
          id: n.id,
          label:
            n.label +
            (visible.find((v) => v.id === n.id)?.children ? " ›" : ""),
          value: n.value,
        }))}
        selectedId={selectedId}
        onSelect={choose}
      />
    </Panel>
  );
}
